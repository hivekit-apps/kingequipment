import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAdminByEmail, type AdminUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

async function getSessionEmail(): Promise<string | null> {
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
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.email ?? null;
}

export default async function AdminChromeLayout({ children }: { children: React.ReactNode }) {
  const email = await getSessionEmail();
  if (!email) redirect('/admin/login');
  const admin: AdminUser | null = await getAdminByEmail(email);
  if (!admin) redirect('/admin/login?error=not_authorized');

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="font-semibold text-gray-900 whitespace-nowrap">
              King Equipment Rental — admin
            </Link>
            <nav className="hidden sm:flex items-center gap-4 text-sm">
              <Link href="/admin" className="text-gray-700 hover:text-orange-700">
                Dashboard
              </Link>
              <Link href="/admin/bookings" className="text-gray-700 hover:text-orange-700">
                Bookings
              </Link>
              {admin.role === 'admin' && (
                <>
                  <Link href="/admin/calendar" className="text-gray-700 hover:text-orange-700">
                    Calendar
                  </Link>
                  <Link href="/admin/invoices" className="text-gray-700 hover:text-orange-700">
                    Invoices
                  </Link>
                  <Link href="/admin/payments" className="text-gray-700 hover:text-orange-700">
                    Payments
                  </Link>
                  <Link href="/admin/settings" className="text-gray-700 hover:text-orange-700">
                    Settings
                  </Link>
                </>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-gray-600">{admin.full_name || email}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 uppercase font-medium tracking-wide">
                {admin.role}
              </span>
            </div>
            <form action="/api/auth/signout" method="post">
              <button className="text-gray-600 hover:text-red-600 text-sm">Sign out</button>
            </form>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
