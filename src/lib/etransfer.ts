import type { Invoice } from './invoice';
import { markInvoicePaid } from './invoice';
import { createServiceClient } from './supabase/service';

/**
 * Parse an Interac e-transfer notification email (as forwarded by Kiril from
 * kingequipmentrental.ca@gmail.com to kiril-payments@forward.hivekit.ai).
 *
 * The bank notification usually contains one of the following recognizable patterns:
 *
 *   "You have received a money transfer for $500.00 (CAD) from Jane Doe"
 *   "INTERAC e-Transfer: A deposit of $250.00 has been Auto Deposited to your account"
 *   "You've received $150.00 CAD via Interac e-Transfer from JOHN SMITH"
 *   "$500.00 has been deposited from JANE DOE"
 *
 * The message body may also contain the sender's optional memo/note.
 *
 * Returns null if no amount can be extracted.
 */
export interface ParsedETransfer {
  amount_cents: number;
  sender_name: string | null;
  sender_email: string | null;
  memo: string | null;
  invoice_id_hint: string | null; // extracted from memo when present
  raw_snippet: string;
}

const AMOUNT_PATTERNS: RegExp[] = [
  /\$\s?([0-9]{1,6}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)\s*(?:CAD)?/gi,
  /([0-9]{1,6}(?:,[0-9]{3})*(?:\.[0-9]{2}))\s*(?:CAD|dollars)/gi,
];

const SENDER_PATTERNS: RegExp[] = [
  /from\s+([A-Z][A-Z\s'.-]{1,60}[A-Z])/g,
  /from\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/g,
  /sent\s+by\s+([A-Z][A-Z\s'.-]{1,60}[A-Z])/gi,
  /d[eé]pot\s+de\s+([A-Z][A-Z\s'.-]{1,60}[A-Z])/gi,
];

const EMAIL_PATTERN = /([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i;

// 8-hex-char invoice ID snippet (matches our #XXXXXXXX invoice-id-prefix).
const INVOICE_HINT_PATTERN = /#([a-f0-9]{8})/i;

function parseAmountToCents(s: string): number {
  const cleaned = s.replace(/,/g, '').trim();
  const n = parseFloat(cleaned);
  if (Number.isNaN(n) || n <= 0) return 0;
  return Math.round(n * 100);
}

export function parseETransferEmail(subject: string, body: string): ParsedETransfer | null {
  const combined = `${subject}\n${body}`;
  const snippet = combined.slice(0, 500);

  // Amount: pick the largest reasonable dollar-amount in the message (bank notifications
  // usually include only one; multiple guards against false positives from e.g. phone numbers).
  let amount_cents = 0;
  for (const pat of AMOUNT_PATTERNS) {
    pat.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = pat.exec(combined)) !== null) {
      const cents = parseAmountToCents(m[1]);
      if (cents > amount_cents) amount_cents = cents;
    }
  }
  if (amount_cents === 0) return null;

  // Sender name: first match wins.
  let sender_name: string | null = null;
  for (const pat of SENDER_PATTERNS) {
    pat.lastIndex = 0;
    const m = pat.exec(combined);
    if (m && m[1]) {
      sender_name = m[1].trim().replace(/\s+/g, ' ');
      // Clean trailing common words that get caught: "from Jane Doe on 2026-08-22" \u2192 "Jane Doe"
      sender_name = sender_name.replace(/\s+(via|on|through|through your|to)\s.*$/i, '');
      break;
    }
  }

  const senderEmailMatch = EMAIL_PATTERN.exec(combined);
  const sender_email = senderEmailMatch ? senderEmailMatch[1].toLowerCase() : null;

  const invoiceHintMatch = INVOICE_HINT_PATTERN.exec(combined);
  const invoice_id_hint = invoiceHintMatch ? invoiceHintMatch[1] : null;

  return {
    amount_cents,
    sender_name,
    sender_email,
    memo: null, // could parse "with message: ..." but bank notifications vary
    invoice_id_hint,
    raw_snippet: snippet,
  };
}

export interface MatchResult {
  invoice: Invoice | null;
  strategy: 'invoice_id_hint' | 'exact_amount_and_email' | 'exact_amount_only' | 'fuzzy_amount' | 'no_match';
  ambiguous: boolean; // true if multiple candidates and we didn't pick decisively
}

/**
 * Match a parsed e-transfer against outstanding invoices.
 * Match strategy (in order of specificity):
 *   1. invoice_id_hint: 8-hex ID prefix in memo/subject matches an issued invoice ID prefix
 *   2. exact amount + booking's customer_email matches sender_email
 *   3. exact amount + only one outstanding invoice at that amount
 *   4. fuzzy amount (\u00b1 $5) + only one candidate
 *   5. no_match: log for Kiril's manual review
 */
export async function matchETransferToInvoice(parsed: ParsedETransfer): Promise<MatchResult> {
  const svc = createServiceClient();
  const { data: outstandingRaw } = await svc
    .from('kiril_invoices')
    .select('*, booking:kiril_bookings(customer_email, customer_name)')
    .eq('status', 'issued')
    .order('created_at', { ascending: false });
  const outstanding = (outstandingRaw ?? []) as Array<Invoice & { booking?: { customer_email: string; customer_name: string } | null }>;

  // Strategy 1: invoice_id_hint
  if (parsed.invoice_id_hint) {
    const hinted = outstanding.filter((inv) => inv.id.startsWith(parsed.invoice_id_hint!));
    if (hinted.length === 1) return { invoice: hinted[0], strategy: 'invoice_id_hint', ambiguous: false };
    if (hinted.length > 1) return { invoice: null, strategy: 'invoice_id_hint', ambiguous: true };
  }

  // Strategy 2: exact amount + email
  const exactAmount = outstanding.filter((inv) => inv.total_cents === parsed.amount_cents);
  if (parsed.sender_email) {
    const byEmail = exactAmount.filter((inv) => inv.booking?.customer_email?.toLowerCase() === parsed.sender_email);
    if (byEmail.length === 1) return { invoice: byEmail[0], strategy: 'exact_amount_and_email', ambiguous: false };
  }

  // Strategy 3: exact amount only, single candidate
  if (exactAmount.length === 1) return { invoice: exactAmount[0], strategy: 'exact_amount_only', ambiguous: false };
  if (exactAmount.length > 1) return { invoice: null, strategy: 'exact_amount_only', ambiguous: true };

  // Strategy 4: fuzzy amount (\u00b1 $5 = 500 cents)
  const fuzzy = outstanding.filter((inv) => Math.abs(inv.total_cents - parsed.amount_cents) <= 500);
  if (fuzzy.length === 1) return { invoice: fuzzy[0], strategy: 'fuzzy_amount', ambiguous: false };
  if (fuzzy.length > 1) return { invoice: null, strategy: 'fuzzy_amount', ambiguous: true };

  return { invoice: null, strategy: 'no_match', ambiguous: false };
}

/**
 * End-to-end: parse the email, match it, mark paid, notify Kiril of unmatched.
 */
export interface ETransferProcessResult {
  ok: boolean;
  parsed: ParsedETransfer | null;
  match?: MatchResult;
  invoice_marked_paid?: Invoice | null;
  logged_for_manual_review?: boolean;
  error?: string;
}

export async function processETransferEmail(
  subject: string,
  body: string,
  senderEmail?: string,
  emailMessageId?: string,
): Promise<ETransferProcessResult> {
  const parsed = parseETransferEmail(subject, body);
  if (!parsed) {
    await logToInboxLog('unparseable', { subject, body: body.slice(0, 500), senderEmail, emailMessageId });
    return { ok: false, parsed: null, error: 'could not parse amount from email' };
  }
  if (senderEmail && !parsed.sender_email) parsed.sender_email = senderEmail;

  const match = await matchETransferToInvoice(parsed);

  if (match.invoice && !match.ambiguous) {
    const paid = await markInvoicePaid(match.invoice.id, 'e-transfer', `${parsed.sender_name ?? 'unknown sender'} / ${match.strategy}${emailMessageId ? ' / msg=' + emailMessageId : ''}`);
    await logToInboxLog('matched_and_marked_paid', { parsed, match_strategy: match.strategy, invoice_id: match.invoice.id, emailMessageId });
    return { ok: true, parsed, match, invoice_marked_paid: paid };
  }

  await logToInboxLog('unmatched_or_ambiguous', { parsed, match_strategy: match.strategy, ambiguous: match.ambiguous, emailMessageId });
  return { ok: false, parsed, match, logged_for_manual_review: true };
}

async function logToInboxLog(verdict: string, payload: Record<string, unknown>) {
  const svc = createServiceClient();
  const { error } = await svc.from('kiril_etransfer_log').insert({ verdict, payload });
  if (error) console.error('[etransfer-log]', error.message);
}
