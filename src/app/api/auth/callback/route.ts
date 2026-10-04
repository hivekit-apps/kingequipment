export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse } from 'next/server';

// pendingCookies pattern: collect all cookie mutations, apply to the final
// redirect response. NextResponse.next() + copy-cookies silently drops cookies
// on redirects.

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const code = searchParams.get('code');
  const nextRaw = searchParams.get('next') ?? '/admin';
  const next = typeof nextRaw === 'string' && nextRaw.startsWith('/') && !nextRaw.startsWith('//') ? nextRaw : '/admin';

  const pendingCookies: { name: string; value: string; options: CookieOptions }[] = [];

  const cookieHeader = request.headers.get('cookie') ?? '';
  const cookieMap = new Map<string, string>();
  cookieHeader.split(';').forEach((c) => {
    const [key, ...rest] = c.trim().split('=');
    if (key) cookieMap.set(key, rest.join('='));
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

  const supabase = createServerClient(url, key, {
    cookies: {
      get(name: string) {
        return cookieMap.get(name);
      },
      set(name: string, value: string, options: CookieOptions) {
        cookieMap.set(name, value);
        pendingCookies.push({ name, value, options });
      },
      remove(name: string, options: CookieOptions) {
        cookieMap.delete(name);
        pendingCookies.push({ name, value: '', options });
      },
    },
  });

  let authError = false;
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as 'magiclink' | 'email',
    });
    if (error) {
      console.error('[Auth Callback] verifyOtp failed:', error.message);
      authError = true;
    }
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error('[Auth Callback] exchangeCodeForSession failed:', error.message);
      authError = true;
    }
  } else {
    authError = true;
  }

  const origin = new URL(request.url).origin;
  const redirectTo = authError ? '/admin/login?error=auth' : next;
  const response = NextResponse.redirect(new URL(redirectTo, origin));
  for (const cookie of pendingCookies) {
    response.cookies.set({ name: cookie.name, value: cookie.value, ...cookie.options });
  }
  return response;
}
