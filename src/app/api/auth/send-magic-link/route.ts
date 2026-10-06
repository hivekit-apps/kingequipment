export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { proxySupabaseAdmin, proxyResendEmail, isProxyConfigured } from '@/lib/vps-proxy';
import { createServiceClient } from '@/lib/supabase/service';

function sanitize(v: string | undefined): string {
  if (!v) return '';
  let out = v.trim();
  while (out.startsWith('"') || out.startsWith("'")) out = out.slice(1);
  while (out.endsWith('"') || out.endsWith("'")) out = out.slice(0, -1);
  return out.trim();
}

// Call Supabase admin API directly (no VPS proxy) using the service-role key.
// Returns the hashed_token on success or null on failure.
async function directGenerateMagicLink(email: string): Promise<string | null> {
  const url = sanitize(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = sanitize(process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!url || !key) return null;
  try {
    const res = await fetch(`${url}/auth/v1/admin/generate_link`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type: 'magiclink', email }),
      cache: 'no-store',
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error('[Auth] direct generate_link failed', res.status, body.slice(0, 500));
      return null;
    }
    const data = (await res.json()) as Record<string, unknown> & {
      properties?: Record<string, unknown>;
      hashed_token?: string;
    };
    // Supabase returns hashed_token at the top level; some SDK versions nest it under .properties.
    const hashedToken =
      (data.hashed_token as string | undefined) ||
      ((data.properties?.hashed_token as string | undefined) ?? undefined);
    return hashedToken || null;
  } catch (err) {
    console.error('[Auth] direct generate_link threw:', err instanceof Error ? err.message : String(err));
    return null;
  }
}

// Call Resend REST API directly (no VPS proxy) using RESEND_API_KEY.
async function directResendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const apiKey = sanitize(process.env.RESEND_API_KEY);
  const fromRaw = sanitize(process.env.LEAD_FROM_EMAIL) || 'noreply@hivekit.ai';
  // Resend requires "Name <email>" format or just the email. Preserve what's set.
  const from = fromRaw.includes('<') ? fromRaw : `King Equipment <${fromRaw}>`;
  if (!apiKey) {
    console.error('[Auth] RESEND_API_KEY not configured');
    return false;
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject, html }),
      cache: 'no-store',
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error('[Auth] Resend send failed', res.status, body.slice(0, 500));
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Auth] Resend send threw:', err instanceof Error ? err.message : String(err));
    return false;
  }
}

function brandedEmailHtml(callbackUrl: string, appName: string): string {
  return `<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:24px">
    <p style="font-size:20px;font-weight:700;color:#111827;margin:0 0 8px 0">Sign in to ${appName}</p>
    <p style="font-size:15px;color:#4b5563;line-height:1.55;margin:0 0 24px 0">Click the button below to sign in. This link expires in 1 hour.</p>
    <a href="${callbackUrl}" style="display:inline-block;background:#c2410c;color:#ffffff;font-weight:700;font-size:15px;padding:14px 28px;border-radius:8px;text-decoration:none">Sign in &rarr;</a>
    <p style="font-size:13px;color:#6b7280;margin-top:24px">If you didn&rsquo;t request this, you can safely ignore this email.</p>
    <p style="font-size:12px;color:#9ca3af;margin-top:8px">For your security, please open the link in the same browser you requested it from.</p>
  </div>`;
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const emailRaw = body.email;
  const nextRaw = body.next;
  const nextParam = typeof nextRaw === 'string' && nextRaw.startsWith('/') && !nextRaw.startsWith('//') ? nextRaw : '/admin';

  if (!emailRaw || typeof emailRaw !== 'string' || !emailRaw.includes('@')) {
    return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
  }

  const email = emailRaw.toLowerCase().trim();

  // Allow-list gate: only pre-provisioned admins can request a magic link.
  try {
    const svc = createServiceClient();
    const { data: adminRow, error: adminErr } = await svc
      .from('kiril_admins')
      .select('email, role')
      .eq('email', email)
      .maybeSingle();
    if (adminErr) {
      console.error('[Auth] kiril_admins lookup failed:', adminErr.message);
      return NextResponse.json({ error: 'Auth backend unavailable' }, { status: 503 });
    }
    if (!adminRow) {
      return NextResponse.json({ message: 'If this address is authorized, a sign-in link is on its way.' });
    }
  } catch (err) {
    console.error('[Auth] admin allow-list check threw:', err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: 'Auth backend unavailable' }, { status: 503 });
  }

  const baseUrl = sanitize(process.env.NEXT_PUBLIC_APP_URL) || 'https://kingequipment.ca';
  const appName = 'King Equipment admin';

  // Primary path (preferred): direct Supabase admin generate_link + direct Resend
  // send. No dependency on the VPS proxy. This keeps us on the token_hash flow
  // (our /api/auth/callback), which is a) same-origin so cookies set cleanly on
  // kingequipment.ca, and b) less susceptible to Gmail link-prefetch consumption
  // than Supabase's hosted /auth/v1/verify path.
  const hashedToken = await directGenerateMagicLink(email);
  if (hashedToken) {
    const callbackUrl = `${baseUrl}/api/auth/callback?token_hash=${hashedToken}&type=magiclink&next=${encodeURIComponent(nextParam)}`;
    const ok = await directResendEmail(email, `Sign in to ${appName}`, brandedEmailHtml(callbackUrl, appName));
    if (ok) return NextResponse.json({ message: 'Check your email for a sign-in link' });
    console.error('[Auth] Direct Resend send failed; trying VPS proxy fallback');
  }

  // Secondary path: VPS proxy (only used if direct path above failed and proxy
  // is configured + reachable). Kept for historical compatibility; if the
  // proxy tunnel is down, this will fast-fail.
  if (isProxyConfigured() && hashedToken) {
    try {
      const callbackUrl = `${baseUrl}/api/auth/callback?token_hash=${hashedToken}&type=magiclink&next=${encodeURIComponent(nextParam)}`;
      await proxyResendEmail(email, `Sign in to ${appName}`, brandedEmailHtml(callbackUrl, appName));
      return NextResponse.json({ message: 'Check your email for a sign-in link' });
    } catch (err) {
      console.error('[Auth] VPS-proxy Resend fallback failed:', err instanceof Error ? err.message : String(err));
    }
  }
  if (isProxyConfigured()) {
    // Last-ditch: use the VPS proxy for generate_link too.
    try {
      const linkResult = await proxySupabaseAdmin('POST', '/auth/v1/admin/generate_link', {
        type: 'magiclink',
        email,
      });
      const data = linkResult.data as Record<string, unknown> | null;
      const props = data?.properties as Record<string, unknown> | undefined;
      const token = (props?.hashed_token as string | undefined) || (data?.hashed_token as string | undefined);
      if (token) {
        const callbackUrl = `${baseUrl}/api/auth/callback?token_hash=${token}&type=magiclink&next=${encodeURIComponent(nextParam)}`;
        await proxyResendEmail(email, `Sign in to ${appName}`, brandedEmailHtml(callbackUrl, appName));
        return NextResponse.json({ message: 'Check your email for a sign-in link' });
      }
    } catch (err) {
      console.error('[Auth] VPS proxy full fallback failed:', err instanceof Error ? err.message : String(err));
    }
  }

  // Final fallback: Supabase-hosted OTP. Only reached if everything above
  // fails. These links go through Supabase's own /auth/v1/verify + come
  // with Gmail-prefetch risk, so we try to avoid them.
  const { supabase, response } = createClient(req);
  const redirectTo = `${baseUrl}/api/auth/callback?next=${encodeURIComponent(nextParam)}`;
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo },
  });
  if (error) {
    console.error('[Auth] signInWithOtp fallback failed:', error.message);
    return NextResponse.json({ error: 'Failed to send login link', debug: error.message }, { status: 500 });
  }
  const jsonResponse = NextResponse.json({ message: 'Check your email for a sign-in link' });
  for (const cookie of response.cookies.getAll()) jsonResponse.cookies.set(cookie);
  return jsonResponse;
}
