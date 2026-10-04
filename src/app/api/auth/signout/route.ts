export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
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

  await supabase.auth.signOut();

  const origin = new URL(request.url).origin;
  const response = NextResponse.redirect(new URL('/admin/login', origin));
  for (const cookie of pendingCookies) {
    response.cookies.set({ name: cookie.name, value: cookie.value, ...cookie.options });
  }
  return response;
}
