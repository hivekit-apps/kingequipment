import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { redirect } from 'next/navigation';
import { getAdminByEmail, type AdminUser } from './auth';

/**
 * Load the current admin session. Redirects to /admin/login if no session
 * or if the email isn't in the kiril_admins allow-list.
 */
export async function requireAdmin(): Promise<AdminUser> {
  const cookieStore = cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';
  const supabase = createServerClient(url, key, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set() {},
      remove() {},
    },
  });
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const email = session?.user?.email;
  if (!email) redirect('/admin/login');
  const admin = await getAdminByEmail(email);
  if (!admin) redirect('/admin/login?error=not_authorized');
  return admin;
}

/**
 * Same as requireAdmin, plus enforces role==='admin' (Kiril only, not Valdas).
 */
export async function requireAdminRole(): Promise<AdminUser> {
  const admin = await requireAdmin();
  if (admin.role !== 'admin') redirect('/admin?error=admin_only');
  return admin;
}
