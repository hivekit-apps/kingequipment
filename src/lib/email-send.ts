import { Resend } from 'resend';

interface SendOpts {
  to: string;
  from?: string;
  cc?: string[];
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
}

// Vercel env values sometimes carry wrapping/trailing quote artifacts (see
// src/lib/supabase/service.ts for the same pattern). Strip them before using.
function sanitize(v: string | undefined): string {
  if (!v) return '';
  let out = v.trim();
  while (out.startsWith('"') || out.startsWith("'")) out = out.slice(1);
  while (out.endsWith('"') || out.endsWith("'")) out = out.slice(0, -1);
  return out.trim();
}

const DEFAULT_FROM = sanitize(process.env.LEAD_FROM_EMAIL) || 'onboarding@resend.dev';
const DEFAULT_REPLY_TO = sanitize(process.env.LEAD_INBOX_EMAIL) || 'kingequipmentrental.ca@gmail.com';

export async function sendEmail(opts: SendOpts): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  const apiKey = sanitize(process.env.RESEND_API_KEY);
  if (!apiKey) {
    console.error('[email-send] RESEND_API_KEY missing');
    return { ok: false, error: 'RESEND_API_KEY missing' };
  }
  try {
    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from: opts.from ?? DEFAULT_FROM,
      to: opts.to,
      ...(opts.cc && opts.cc.length > 0 ? { cc: opts.cc } : {}),
      replyTo: opts.replyTo ?? DEFAULT_REPLY_TO,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });
    if (result.error) {
      console.error('[email-send] Resend error:', result.error);
      return { ok: false, error: JSON.stringify(result.error) };
    }
    return { ok: true, messageId: result.data?.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[email-send] threw:', msg);
    return { ok: false, error: msg };
  }
}
