export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { proxySupabaseAdmin, proxyResendEmail, isProxyConfigured } from '@/lib/vps-proxy';
import { createServiceClient } from '@/lib/supabase/service';

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
  // This prevents open sign-up on a private admin surface.
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
      // Do not leak whether the email exists — return a generic success message.
      // The user will simply never receive an email.
      return NextResponse.json({ message: 'If this address is authorized, a sign-in link is on its way.' });
    }
  } catch (err) {
    console.error('[Auth] admin allow-list check threw:', err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: 'Auth backend unavailable' }, { status: 503 });
  }

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://kiril-skidsteer.vercel.app').trim();
  const appName = 'King Equipment Rental admin';

  // Prefer VPS-proxied admin.generateLink so the branded email goes through
  // hivekit's Resend (from address controlled by the proxy) instead of Supabase
  // default templates. Fall through to signInWithOtp if proxy not configured.
  if (isProxyConfigured()) {
    try {
      const linkResult = await proxySupabaseAdmin('POST', '/auth/v1/admin/generate_link', {
        type: 'magiclink',
        email,
      });

      const data = linkResult.data as Record<string, unknown> | null;
      const props = data?.properties as Record<string, unknown> | undefined;
      const hashedToken = (props?.hashed_token as string | undefined) || (data?.hashed_token as string | undefined);
      if (!hashedToken) {
        console.error('[Auth] generateLink no hashed_token, falling through:', linkResult.status, JSON.stringify(data).slice(0, 500));
        throw new Error('No hashed_token in generateLink response');
      }

      const callbackUrl = `${baseUrl}/api/auth/callback?token_hash=${hashedToken}&type=magiclink&next=${encodeURIComponent(nextParam)}`;

      await proxyResendEmail(
        email,
        `Sign in to ${appName}`,
        `<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <p style="font-size:20px;font-weight:700;color:#111827;margin:0 0 8px 0">Sign in to King Equipment Rental admin</p>
          <p style="font-size:15px;color:#4b5563;line-height:1.55;margin:0 0 24px 0">Click the button below to sign in. This link expires in 1 hour.</p>
          <a href="${callbackUrl}" style="display:inline-block;background:#c2410c;color:#ffffff;font-weight:700;font-size:15px;padding:14px 28px;border-radius:8px;text-decoration:none">Sign in &rarr;</a>
          <p style="font-size:13px;color:#6b7280;margin-top:24px">If you didn&rsquo;t request this, you can safely ignore this email.</p>
        </div>`,
      );

      return NextResponse.json({ message: 'Check your email for a sign-in link' });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error('[Auth] Token-hash flow failed, falling through to OTP:', errMsg);
    }
  }

  // Fallback: use Supabase-hosted OTP (default templates)
  const { supabase, response } = createClient(req);
  const redirectTo = `${baseUrl}/api/auth/callback?next=${encodeURIComponent(nextParam)}`;
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo },
  });
  if (error) {
    console.error('[Auth] signInWithOtp failed:', error.message);
    return NextResponse.json({ error: 'Failed to send login link', debug: error.message }, { status: 500 });
  }
  const jsonResponse = NextResponse.json({ message: 'Check your email for a sign-in link' });
  for (const cookie of response.cookies.getAll()) jsonResponse.cookies.set(cookie);
  return jsonResponse;
}
