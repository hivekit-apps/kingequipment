import { type NextRequest, NextResponse } from 'next/server';
// IMPORTANT: Only import from @/lib/supabase/server (Edge Runtime compatible).
// NEVER import @/lib/supabase/service — @supabase/supabase-js breaks Edge Runtime.
import { createClient } from '@/lib/supabase/server';

// Protected admin paths.
const PROTECTED_PAGE_PREFIXES = ['/admin'];
const PROTECTED_API_PREFIXES = ['/api/admin/'];

// Explicit public exceptions inside the admin surface.
const PUBLIC_ADMIN_PATHS = new Set<string>([
  '/admin/login',
  '/admin/logged-out',
]);

// Public admin/auth API endpoints.
const PUBLIC_API_PATHS = new Set<string>([
  '/api/auth/send-magic-link',
  '/api/auth/callback',
  '/api/auth/signout',
]);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtectedPage = PROTECTED_PAGE_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/')) && !PUBLIC_ADMIN_PATHS.has(pathname);
  const isProtectedApi = PROTECTED_API_PREFIXES.some((p) => pathname.startsWith(p)) && !PUBLIC_API_PATHS.has(pathname);

  if (!isProtectedPage && !isProtectedApi) {
    const { response } = createClient(request);
    return response;
  }

  const { supabase, response } = createClient(request);
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  if (!user) {
    if (isProtectedApi) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/admin/login';
    redirectUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    // Match everything except static assets and public files.
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
