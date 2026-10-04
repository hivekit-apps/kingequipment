import { createServiceClient } from './supabase/service';

export type AdminRole = 'admin' | 'operator';

export interface AdminUser {
  email: string;
  role: AdminRole;
  full_name: string | null;
}

/**
 * Look up an admin user by email. Returns null if not in the allow-list.
 * Uses service-role client to bypass RLS (RLS restricts read to self only).
 */
export async function getAdminByEmail(email: string): Promise<AdminUser | null> {
  const svc = createServiceClient();
  const { data, error } = await svc
    .from('kiril_admins')
    .select('email, role, full_name')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle();
  if (error || !data) return null;
  return data as AdminUser;
}
