import Link from 'next/link';
import { createServiceClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';

type Order = {
  id: string;
  created_at: string;
  status: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  delivery_city: string;
  grand_total_cents: number | null;
  rental_subtotal_cents: number | null;
  buy_subtotal_cents: number | null;
};

function money(cents: number | null): string {
  if (cents == null) return '-';
  return `$${(cents / 100).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function AdminOrdersPage() {
  const svc = createServiceClient();
  const { data: orders, error } = await svc
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
      <p className="mt-1 text-sm text-gray-600">Multi-item ecommerce orders. Legacy single-item bookings in the Bookings tab.</p>

      {error && (
        <div className="mt-6 rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-800">
          Error loading orders: {error.message}
          <p className="mt-1 text-xs">If the <code>orders</code> table doesn&apos;t exist yet, apply the migration.</p>
        </div>
      )}

      <div className="mt-6 bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-600">
            <tr>
              <th className="px-4 py-3 text-left">Created</th>
              <th className="px-4 py-3 text-left">Customer</th>
              <th className="px-4 py-3 text-left">City</th>
              <th className="px-4 py-3 text-right">Rental</th>
              <th className="px-4 py-3 text-right">Buy</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-right">ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(orders as Order[] | null)?.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-sm text-gray-500">
                  No orders yet.
                </td>
              </tr>
            )}
            {(orders as Order[] | null)?.map((o) => (
              <tr key={o.id}>
                <td className="px-4 py-3 text-xs text-gray-700">
                  {new Date(o.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <div className="font-semibold text-gray-900">{o.customer_name}</div>
                  <div className="text-xs text-gray-500">{o.customer_email}</div>
                  {o.customer_phone && (
                    <div className="text-xs text-gray-500">{o.customer_phone}</div>
                  )}
                </td>
                <td className="px-4 py-3">{o.delivery_city}</td>
                <td className="px-4 py-3 text-right">{money(o.rental_subtotal_cents)}</td>
                <td className="px-4 py-3 text-right">{money(o.buy_subtotal_cents)}</td>
                <td className="px-4 py-3 text-right font-semibold">{money(o.grand_total_cents)}</td>
                <td className="px-4 py-3">
                  <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
                    {o.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs">
                  <Link href={`/admin/orders/${o.id}`} className="text-orange-700 hover:text-orange-900">
                    #{o.id.slice(0, 8)}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
