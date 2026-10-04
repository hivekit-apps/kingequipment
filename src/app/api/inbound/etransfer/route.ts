export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { verifySvix, normalizeAddr, pickText } from '@/lib/svix';
import { proxyResendFetchReceived } from '@/lib/vps-proxy';
import { processETransferEmail } from '@/lib/etransfer';
import { createServiceClient } from '@/lib/supabase/service';

// Inbound webhook for e-transfer notifications forwarded by Kiril's Gmail
// (kingequipmentrental.ca@gmail.com \u2192 Gmail forwarding rule \u2192
// kiril-payments@forward.hivekit.ai \u2192 Resend inbound \u2192 THIS webhook).
//
// Auth: svix signature verified against KIRIL_INBOUND_ETRANSFER_SECRET (set via
// Resend webhook signing secret) OR test-token bypass (x-kiril-e2e-test).
//
// Intake filter: we only process emails where the `to:` includes the configured
// intake address. All other emails are ACKed 200 + logged as 'ignored_non_intake'
// so recruit's parallel processing isn't disturbed.

interface ResendReceivedWebhook {
  type?: string;
  created_at?: string;
  data?: {
    email_id?: string;
    from?: string | { address?: string; name?: string } | Array<string | { address?: string }>;
    to?: string[] | string;
    subject?: string;
    message_id?: string;
    received_for?: string[];
  };
}

interface E2EFlatShape {
  from?: string | { address?: string; name?: string };
  to?: string | string[] | Array<{ address?: string; name?: string }>;
  subject?: string;
  text?: string | null;
  html?: string | null;
}

const INTAKE_ADDRESS = (process.env.KIRIL_ETRANSFER_INTAKE || 'kiril-payments@forward.hivekit.ai').toLowerCase();

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const svixId = request.headers.get('svix-id') || '';
  const svixTs = request.headers.get('svix-timestamp') || '';
  const svixSig = request.headers.get('svix-signature') || '';
  const testToken = request.headers.get('x-kiril-e2e-test') || '';
  const expectedTest = process.env.KIRIL_INBOUND_E2E_TOKEN?.trim();

  const isE2E = !!expectedTest && testToken === expectedTest;
  if (!isE2E) {
    if (!svixId || !svixTs || !svixSig) {
      return NextResponse.json({ error: 'missing svix headers' }, { status: 401 });
    }
    const secret = process.env.KIRIL_INBOUND_ETRANSFER_SECRET?.trim() ||
      process.env.RESEND_INBOUND_WEBHOOK_SECRET?.trim() || '';
    const check = verifySvix(rawBody, svixId, svixTs, svixSig, secret);
    if (!check.ok) return NextResponse.json({ error: `signature invalid: ${check.reason}` }, { status: 401 });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const asWebhook = parsed as ResendReceivedWebhook;
  const asFlat = parsed as E2EFlatShape;

  let fromAddr: string | null = null;
  let toAddr: string | null = null;
  let subject = '';
  let bodyText = '';
  let emailMessageId: string | null = null;

  if (asWebhook && asWebhook.type === 'email.received' && asWebhook.data) {
    const d = asWebhook.data;
    fromAddr = normalizeAddr(d.from);
    // to can be an array; normalizeAddr picks the first — but for filter we need to check all
    const toArr = Array.isArray(d.to) ? d.to : d.to ? [d.to] : [];
    const toLower = toArr.map((t) => (typeof t === 'string' ? t.trim().toLowerCase() : '')).filter(Boolean);
    toAddr = toLower[0] ?? null;

    // Intake filter
    const isForKiril = toLower.some((t) => t === INTAKE_ADDRESS);
    if (!isForKiril) {
      await logIgnored({ to: toLower, subject: d.subject ?? '', from: fromAddr });
      return NextResponse.json({ ok: true, ignored: true, reason: 'not_intake_address' });
    }

    subject = d.subject || '';
    emailMessageId = d.email_id || null;
    if (!emailMessageId) return NextResponse.json({ error: 'webhook missing data.email_id' }, { status: 400 });

    const fetched = await proxyResendFetchReceived(emailMessageId);
    if (fetched.status >= 400 || !fetched.data) {
      // Fall through with subject-only content — better than dropping the signal
      console.error('[etransfer-inbound] fetch received failed:', fetched.status);
    } else {
      const f = fetched.data as { html?: string; text?: string };
      bodyText = pickText(f.html, f.text);
    }
  } else {
    // Flat shape (E2E test harness)
    fromAddr = normalizeAddr(asFlat.from);
    const toArr = Array.isArray(asFlat.to) ? asFlat.to : asFlat.to ? [asFlat.to] : [];
    const toLower = toArr.map((t) => (typeof t === 'string' ? t.trim().toLowerCase() : typeof t === 'object' && t && 'address' in t ? String((t as { address?: string }).address || '').toLowerCase() : ''));
    toAddr = toLower[0] ?? null;
    const isForKiril = toLower.some((t) => t === INTAKE_ADDRESS);
    if (!isForKiril && !isE2E) {
      // In E2E mode, we may not have the intake address set; be strict only for real inbound
      await logIgnored({ to: toLower, subject: asFlat.subject ?? '', from: fromAddr });
      return NextResponse.json({ ok: true, ignored: true, reason: 'not_intake_address' });
    }
    subject = asFlat.subject || '';
    bodyText = pickText(asFlat.html, asFlat.text);
    emailMessageId = null;
  }

  if (!subject && !bodyText) {
    return NextResponse.json({ ok: false, error: 'empty subject and body' });
  }

  const result = await processETransferEmail(subject, bodyText, fromAddr ?? undefined, emailMessageId ?? undefined);

  return NextResponse.json({
    ok: result.ok,
    parsed: result.parsed,
    match: result.match ? { strategy: result.match.strategy, ambiguous: result.match.ambiguous, invoice_id: result.match.invoice?.id } : undefined,
    invoice_marked_paid: result.invoice_marked_paid?.id,
    logged_for_manual_review: result.logged_for_manual_review,
    error: result.error,
  });
}

async function logIgnored(payload: Record<string, unknown>) {
  try {
    const svc = createServiceClient();
    await svc.from('kiril_etransfer_log').insert({ verdict: 'ignored_non_intake', payload });
  } catch (err) {
    console.error('[etransfer-inbound] logIgnored failed:', err instanceof Error ? err.message : String(err));
  }
}
