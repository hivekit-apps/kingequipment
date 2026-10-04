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

const DEFAULT_FROM = process.env.LEAD_FROM_EMAIL || 'onboarding@resend.dev';
const DEFAULT_REPLY_TO = process.env.LEAD_INBOX_EMAIL || 'kingequipmentrental.ca@gmail.com';

export async function sendEmail(opts: SendOpts): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
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
