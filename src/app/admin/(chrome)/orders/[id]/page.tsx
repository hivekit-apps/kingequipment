import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';

type Order = {
  id: string;
  created_at: string;
  status: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  delivery_address: string;
  delivery_city: string;
  delivery_price_cents: number | null;
  deposit_total_cents: number | null;
  rental_subtotal_cents: number | null;
  buy_subtotal_cents: number | null;
  grand_total_cents: number | null;
  notes: string | null;
};

type OrderItem = {
  id: string;
  equipment_name: string;
  kind: string;
  qty: number;
  start_date: string | null;
  end_date: string | null;
  days: number | null;
  applied_tier: string | null;
  unit_subtotal_cents: number | null;
  deposit_cents: number | null;
};

function money(cents: number | null): string {
  if (cents == null) return '-';
  return `$${(cents / 100).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function AdminOrderDetailPage({ params }: { params: { id: string } }) {
  const svc = createServiceClient();
  const [{ data: order }, { data: items }] = await Promise.all([
    svc.from('orders').select('*').eq('id', params.id).maybeSingle(),
    svc.from('order_items').select('*').eq('order_id', params.id),
  ]);
  if (!order) notFound();
  const o = order as Order;
  const its = (items as OrderItem[] | null) || [];

  return (
    <div>
      <Link href="/admin/orders" className="text-sm text-gray-600 hover:text-gray-900">← Back</Link>
      <h1 className="mt-3 text-2xl font-bold text-gray-900">Order #{o.id.slice(0, 8)}</h1>
      <p className="mt-1 text-sm text-gray-600">
        {new Date(o.created_at).toLocaleString()} · status <strong>{o.status}</strong>
      </p>

      <section className="mt-6 bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-lg font-bold">Customer</h2>
        <dl className="mt-3 text-sm space-y-1">
          <div><dt className="inline text-gray-600">Name:</dt> <dd className="inline font-semibold">{o.customer_name}</dd></div>
          <div><dt className="inline text-gray-600">Email:</dt> <dd className="inline">{o.customer_email}</dd></div>
          {o.customer_phone && <div><dt className="inline text-gray-600">Phone:</dt> <dd className="inline">{o.customer_phone}</dd></div>}
          <div><dt className="inline text-gray-600">City:</dt> <dd className="inline">{o.delivery_city}</dd></div>
          <div><dt className="inline text-gray-600">Address:</dt> <dd className="inline">{o.delivery_address}</dd></div>
          {o.notes && <div><dt className="inline text-gray-600">Notes:</dt> <dd className="inline">{o.notes}</dd></div>}
        </dl>
      </section>

      <section className="mt-6 bg-white rounded-lg border border-gray-200 overflow-hidden">
        <h2 className="text-lg font-bold px-5 pt-5">Items</h2>
        <table className="mt-3 w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-600">
            <tr>
              <th className="px-4 py-2 text-left">Item</th>
              <th className="px-4 py-2 text-left">Kind</th>
              <th className="px-4 py-2 text-right">Qty</th>
              <th className="px-4 py-2 text-left">Dates</th>
              <th className="px-4 py-2 text-left">Tier</th>
              <th className="px-4 py-2 text-right">Subtotal</th>
              <th className="px-4 py-2 text-right">Deposit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {its.map((i) => (
              <tr key={i.id}>
                <td className="px-4 py-2">{i.equipment_name}</td>
                <td className="px-4 py-2">{i.kind}</td>
                <td className="px-4 py-2 text-right">{i.qty}</td>
                <td className="px-4 py-2 text-xs">
                  {i.start_date && i.end_date ? `${i.start_date} → ${i.end_date} (${i.days}d)` : '-'}
                </td>
                <td className="px-4 py-2 text-xs">{i.applied_tier || '-'}</td>
                <td className="px-4 py-2 text-right">{money(i.unit_subtotal_cents)}</td>
                <td className="px-4 py-2 text-right">{money(i.deposit_cents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mt-6 bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-lg font-bold">Totals</h2>
        <dl className="mt-3 text-sm space-y-1">
          <div className="flex justify-between"><dt>Rental subtotal</dt><dd>{money(o.rental_subtotal_cents)}</dd></div>
          <div className="flex justify-between"><dt>Buy subtotal</dt><dd>{money(o.buy_subtotal_cents)}</dd></div>
          <div className="flex justify-between"><dt>Delivery</dt><dd>{money(o.delivery_price_cents)}</dd></div>
          <div className="flex justify-between pt-2 border-t"><dt className="font-bold">Grand total</dt><dd className="font-bold">{money(o.grand_total_cents)}</dd></div>
          <div className="flex justify-between text-gray-600"><dt>Refundable deposit</dt><dd>{money(o.deposit_total_cents)}</dd></div>
        </dl>
      </section>
    </div>
  );
}
