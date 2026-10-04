// SVIX signature verification (used by Resend inbound webhooks).
// Copied from recruit/src/app/api/inbound/email/route.ts — verified pattern.

import { createHmac, timingSafeEqual } from 'node:crypto';

export function verifySvix(
  rawBody: string,
  id: string,
  ts: string,
  sigHeader: string,
  secret: string,
): { ok: boolean; reason?: string } {
  if (!secret) return { ok: false, reason: 'no_secret_configured' };

  const secretParts = secret.split('_');
  const secretB64 = secretParts.length > 1 ? secretParts.slice(1).join('_') : secret;
  let secretBytes: Buffer;
  try {
    secretBytes = Buffer.from(secretB64, 'base64');
    if (secretBytes.length === 0) return { ok: false, reason: 'secret_decode_empty' };
  } catch (err) {
    return { ok: false, reason: `secret_decode:${(err as Error).message}` };
  }

  const signedContent = `${id}.${ts}.${rawBody}`;
  const parts = sigHeader.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { ok: false, reason: 'no_signatures' };

  const expected = createHmac('sha256', secretBytes).update(signedContent).digest('base64');
  const expBuf = Buffer.from(expected, 'base64');

  for (const part of parts) {
    const [, sig] = part.includes(',') ? part.split(',', 2) : ['', part];
    if (!sig) continue;
    let sigBuf: Buffer;
    try {
      sigBuf = Buffer.from(sig, 'base64');
    } catch {
      continue;
    }
    if (sigBuf.length !== expBuf.length) continue;
    if (timingSafeEqual(sigBuf, expBuf)) return { ok: true };
  }
  return { ok: false, reason: 'sig_mismatch' };
}

export function normalizeAddr(v: unknown): string | null {
  if (!v) return null;
  if (typeof v === 'string') return v.trim() || null;
  if (Array.isArray(v)) {
    const first = v[0];
    if (typeof first === 'string') return first.trim() || null;
    if (first && typeof first === 'object' && 'address' in first)
      return String((first as { address?: unknown }).address || '').trim() || null;
    return null;
  }
  if (typeof v === 'object' && v !== null && 'address' in v)
    return String((v as { address?: unknown }).address || '').trim() || null;
  return null;
}

export function pickText(html: string | null | undefined, text: string | null | undefined): string {
  if (text && typeof text === 'string' && text.trim()) return text;
  if (html && typeof html === 'string' && html.trim()) {
    return html
      .replace(/<br\s*\/?>(\s|$)/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .trim();
  }
  return '';
}
