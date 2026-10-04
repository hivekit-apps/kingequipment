// Stripe integration — cycle 5 refactor (2026-08-22): sk_live_ stays VPS-side
// per R-VERCEL-1. Kiril calls the hivekit VPS-proxy /proxy/stripe/create-
// invoice-checkout route; the proxy holds STRIPE_SECRET_KEY and creates the
// checkout session. Kiril's Vercel env carries only NEXT_PUBLIC_STRIPE_
// PUBLISHABLE_KEY (pk_live_) + STRIPE_ALLOW_LIVE=1 + STRIPE_WEBHOOK_SECRET
// (the signing secret for Kiril's own dashboard webhook endpoint — distinct
// from superbright/ct-stewards webhooks). Webhook signature verification
// runs locally (Kiril's Vercel), not through the proxy — Stripe posts
// straight to https://kiril-skidsteer.vercel.app/api/stripe/webhook.

const VPS_PROXY_URL = process.env.VPS_PROXY_URL?.trim() || '';
const VPS_PROXY_KEY = process.env.VPS_PROXY_KEY?.trim() || '';
const STATEMENT_DESCRIPTOR_SUFFIX = 'KING EQUIP';

export function stripeConfigured(): { ok: boolean; mode?: 'live'; reason?: string } {
  if (!VPS_PROXY_URL || !VPS_PROXY_KEY) {
    return { ok: false, reason: 'VPS_PROXY_URL / VPS_PROXY_KEY missing' };
  }
  // Cycle-5 owner-approval gate: refuse to attempt live charges until the
  // flag is explicitly set on Kiril's Vercel env. Prevents accidental live
  // capture while backend is still under development.
  if (process.env.STRIPE_ALLOW_LIVE !== '1') {
    return { ok: false, reason: 'STRIPE_ALLOW_LIVE=1 not set (cycle-5 gate)' };
  }
  return { ok: true, mode: 'live' };
}

interface CreateCheckoutOpts {
  amount_cents: number;
  currency?: string;
  invoice_id: string;
  booking_id: string;
  customer_email: string;
  description: string;
  success_url: string;
  cancel_url: string;
}

export async function createCheckoutSession(
  opts: CreateCheckoutOpts,
): Promise<{ ok: boolean; url?: string; sessionId?: string; error?: string; mode?: 'live' }> {
  const cfg = stripeConfigured();
  if (!cfg.ok) return { ok: false, error: cfg.reason };

  try {
    const res = await fetch(`${VPS_PROXY_URL}/proxy/stripe/create-invoice-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Proxy-Key': VPS_PROXY_KEY,
      },
      body: JSON.stringify({
        amount_cents: opts.amount_cents,
        currency: opts.currency ?? 'cad',
        description: opts.description,
        invoice_id: opts.invoice_id,
        booking_id: opts.booking_id,
        customer_email: opts.customer_email,
        success_url: opts.success_url,
        cancel_url: opts.cancel_url,
        statement_descriptor_suffix: STATEMENT_DESCRIPTOR_SUFFIX,
        app: 'kiril',
      }),
      signal: AbortSignal.timeout(30000),
    });
    const data = (await res.json()) as { id?: string; url?: string; error?: string; detail?: string };
    if (!res.ok || !data.url) {
      const msg = data.detail || data.error || `VPS-proxy HTTP ${res.status}`;
      console.error('[stripe] createCheckoutSession via proxy failed:', msg);
      return { ok: false, error: msg, mode: cfg.mode };
    }
    return { ok: true, url: data.url, sessionId: data.id, mode: cfg.mode };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[stripe] createCheckoutSession via proxy threw:', msg);
    return { ok: false, error: msg, mode: cfg.mode };
  }
}

export async function verifyWebhookSignature(rawBody: string, signature: string): Promise<{ ok: boolean; event?: unknown; error?: string }> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim() || '';
  if (!secret) return { ok: false, error: 'STRIPE_WEBHOOK_SECRET missing' };
  // Stripe signature format: "t=1234,v1=abc..."
  const parts = signature.split(',').map((p) => p.split('=')) as [string, string][];
  const ts = parts.find(([k]) => k === 't')?.[1];
  const v1 = parts.filter(([k]) => k === 'v1').map(([, v]) => v);
  if (!ts || v1.length === 0) return { ok: false, error: 'malformed signature header' };
  const { createHmac, timingSafeEqual } = await import('node:crypto');
  const signedPayload = `${ts}.${rawBody}`;
  const expected = createHmac('sha256', secret).update(signedPayload).digest('hex');
  const expBuf = Buffer.from(expected, 'hex');
  for (const sig of v1) {
    const sigBuf = Buffer.from(sig, 'hex');
    if (sigBuf.length === expBuf.length && timingSafeEqual(sigBuf, expBuf)) {
      try {
        return { ok: true, event: JSON.parse(rawBody) };
      } catch {
        return { ok: false, error: 'body is not JSON' };
      }
    }
  }
  return { ok: false, error: 'signature mismatch' };
}
