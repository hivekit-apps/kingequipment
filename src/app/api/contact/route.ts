// POST /api/contact
//
// Public contact-form endpoint. Validates inputs, enforces a honeypot and a
// soft per-IP rate limit, then sends:
//   (a) a notification to Kiril's inbox (hard-coded per owner directive)
//   (b) a courtesy copy to the sender so they have the thread on their side
//
// Both emails go through Resend (sanitize env values; strip trailing-quote
// artifacts same as src/lib/email-send.ts).

import { NextResponse, type NextRequest } from 'next/server';
import { sendEmail } from '@/lib/email-send';
import { getSiteConfig } from '@/lib/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Hard-coded target per owner directive — the contact form is for Kiril
// specifically, not the generic LEAD_INBOX_EMAIL (which may route elsewhere).
const CONTACT_TARGET_EMAIL = 'kingequipment.ca@gmail.com';

type Payload = {
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  message?: unknown;
  website?: unknown; // honeypot
};

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const ipHits = new Map<string, { count: number; resetAt: number }>();

function rateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipHits.get(ip);
  if (!entry || entry.resetAt < now) {
    ipHits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count += 1;
  return true;
}

function asString(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';
  if (!rateLimit(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  let body: Payload;
  try {
    body = (await req.json()) as Payload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Honeypot: bots happily fill hidden "website" fields; humans don't see it.
  const honeypot = asString(body.website);
  if (honeypot.length > 0) {
    // Silently accept — don't tell the bot we rejected it.
    return NextResponse.json({ ok: true });
  }

  const name = asString(body.name);
  const email = asString(body.email);
  const phone = asString(body.phone);
  const message = asString(body.message);

  if (name.length < 2) {
    return NextResponse.json(
      { error: 'Please enter your name (at least 2 characters).', field: 'name' },
      { status: 422 },
    );
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: 'Please enter a valid email address.', field: 'email' },
      { status: 422 },
    );
  }
  const phoneDigits = phone.replace(/\D/g, '');
  if (phoneDigits.length < 7) {
    return NextResponse.json(
      { error: 'Please enter a phone number (at least 7 digits).', field: 'phone' },
      { status: 422 },
    );
  }
  if (message.length < 10) {
    return NextResponse.json(
      { error: 'Please include a message (at least 10 characters).', field: 'message' },
      { status: 422 },
    );
  }

  const cfg = getSiteConfig();
  const now = new Date();
  const timestamp = now.toISOString();
  const sourceUrl = req.headers.get('referer') || cfg.business?.siteUrl || '';

  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safePhone = escapeHtml(phone);
  const safeMessage = escapeHtml(message);
  const safeSource = escapeHtml(sourceUrl);

  const notifyHtml =
    `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111827">` +
    `<p style="font-size:20px;font-weight:700;margin:0 0 12px 0">New contact-form message</p>` +
    `<table style="font-size:14px;color:#374151;border-collapse:collapse;width:100%;margin:0 0 16px 0">` +
    `<tr><td style="padding:4px 0;color:#6b7280;width:120px"><strong>Name</strong></td><td style="padding:4px 0">${safeName}</td></tr>` +
    `<tr><td style="padding:4px 0;color:#6b7280"><strong>Email</strong></td><td style="padding:4px 0"><a href="mailto:${safeEmail}">${safeEmail}</a></td></tr>` +
    `<tr><td style="padding:4px 0;color:#6b7280"><strong>Phone</strong></td><td style="padding:4px 0"><a href="tel:${safePhone}">${safePhone}</a></td></tr>` +
    `<tr><td style="padding:4px 0;color:#6b7280;vertical-align:top"><strong>Message</strong></td><td style="padding:4px 0;white-space:pre-wrap">${safeMessage}</td></tr>` +
    `</table>` +
    `<p style="font-size:12px;color:#9ca3af;margin:16px 0 0 0;border-top:1px solid #e5e7eb;padding-top:10px">Received ${timestamp}${sourceUrl ? ` · from ${safeSource}` : ''}</p>` +
    `<p style="font-size:13px;color:#4b5563;margin:10px 0 0 0">Reply to this email to respond directly — the reply-to is set to ${safeEmail}.</p>` +
    `</div>`;

  const notifyText =
    `New contact-form message\n\n` +
    `Name: ${name}\n` +
    `Email: ${email}\n` +
    `Phone: ${phone}\n\n` +
    `Message:\n${message}\n\n` +
    `---\nReceived: ${timestamp}\n` +
    (sourceUrl ? `Source: ${sourceUrl}\n` : '') +
    `Reply to this email to respond directly (reply-to = ${email}).\n`;

  const notifySubject = `[Contact form] ${name} — ${phone}`;

  // (a) Notification to Kiril
  const notifyRes = await sendEmail({
    to: CONTACT_TARGET_EMAIL,
    replyTo: email,
    subject: notifySubject,
    html: notifyHtml,
    text: notifyText,
  });
  if (!notifyRes.ok) {
    console.error('[contact] notify send failed:', notifyRes.error);
    // Still return 200 — we don't want the user to retry endlessly when the
    // issue is on our side. But signal in the response for debugging.
    return NextResponse.json(
      { ok: false, error: 'Email delivery failed. Please email us directly.' },
      { status: 502 },
    );
  }

  // (b) Courtesy copy to the sender. Reply-to Kiril's inbox so their reply
  // lands with him. Best-effort; don't fail the whole request on this.
  const businessName = cfg.business?.name || 'King Equipment';
  const ackHtml =
    `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111827">` +
    `<p style="font-size:18px;font-weight:700;margin:0 0 10px 0">Thanks, ${escapeHtml(name.split(' ')[0] || name)}.</p>` +
    `<p style="font-size:15px;line-height:1.55;color:#374151;margin:0 0 14px 0">Thanks for reaching out to ${escapeHtml(businessName)} — we received your message and will be in touch shortly.</p>` +
    `<p style="font-size:14px;color:#4b5563;margin:0 0 6px 0"><strong>Your message:</strong></p>` +
    `<pre style="font-family:ui-monospace,SFMono-Regular,monospace;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:12px;font-size:12px;white-space:pre-wrap;margin:0 0 16px 0">${safeMessage}</pre>` +
    `<p style="font-size:13px;color:#6b7280;margin:16px 0 0 0">${escapeHtml(businessName)}${cfg.business?.hours ? `<br/>${escapeHtml(cfg.business.hours)}` : ''}</p>` +
    `</div>`;
  const ackText =
    `Thanks, ${name.split(' ')[0] || name}.\n\n` +
    `Thanks for reaching out to ${businessName} — we received your message and will be in touch shortly.\n\n` +
    `--- Your message ---\n${message}\n\n` +
    `${businessName}\n${cfg.business?.hours || ''}\n`;
  try {
    await sendEmail({
      to: email,
      replyTo: CONTACT_TARGET_EMAIL,
      subject: `Thanks — we received your message · ${businessName}`,
      html: ackHtml,
      text: ackText,
    });
  } catch (err) {
    console.warn('[contact] ack send threw:', err instanceof Error ? err.message : String(err));
  }

  return NextResponse.json({ ok: true, message_id: notifyRes.messageId });
}
