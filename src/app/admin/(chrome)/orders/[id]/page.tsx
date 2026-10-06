import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/require-role';
import { createServiceClient } from '@/lib/supabase/service';
import { loadSettings } from '@/lib/settings';
import { computeOrderPricing, formatMoneyCents } from '@/lib/order-pricing';
import { OrderActions } from './order-actions';

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

function statusPill(status: string): string {
  const map: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800',
    confirmed: 'bg-green-100 text-green-800',
    denied: 'bg-red-100 text-red-800',
    archived: 'bg-gray-200 text-gray-700',
    delivered: 'bg-blue-100 text-blue-800',
    returned: 'bg-gray-100 text-gray-700',
    cancelled: 'bg-gray-100 text-gray-500',
  };
  return map[status] ?? 'bg-gray-100 text-gray-700';
}

export default async function AdminOrderDetailPage({ params }: { params: { id: string } }) {
  await requireAdmin();
  const svc = createServiceClient();
  const [{ data: orderRow }, { data: itemsData }, settings] = await Promise.all([
    svc.from('orders').select('*').eq('id', params.id).maybeSingle(),
    svc.from('order_items').select('*').eq('order_id', params.id),
    loadSettings(),
  ]);
  if (!orderRow) notFound();
  const o = orderRow as Order;
  const items = (itemsData as OrderItem[] | null) ?? [];

  const pricing = computeOrderPricing(
    {
      rental_subtotal_cents: o.rental_subtotal_cents,
      buy_subtotal_cents: o.buy_subtotal_cents,
      delivery_price_cents: o.delivery_price_cents,
      deposit_total_cents: o.deposit_total_cents,
    },
    settings,
  );

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/orders" className="text-sm text-gray-600 hover:text-gray-900">
          ← Back to orders
        </Link>
        <div className="mt-3 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Order #{o.id.slice(0, 8)}</h1>
            <p className="mt-1 text-sm text-gray-600">
              {new Date(o.created_at).toLocaleString('en-CA', { timeZone: 'America/Toronto' })} &middot;{' '}
              <span className={`inline-block px-2 py-0.5 rounded-full text-xs uppercase font-medium tracking-wide ${statusPill(o.status)}`}>
                {o.status}
              </span>
            </p>
          </div>
          <div className="min-w-[320px]">
            <OrderActions orderId={o.id} status={o.status} />
          </div>
        </div>
      </div>

      <section className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-lg font-bold">Customer</h2>
        <dl className="mt-3 text-sm space-y-1">
          <div>
            <dt className="inline text-gray-600">Name:</dt> <dd className="inline font-semibold">{o.customer_name}</dd>
          </div>
          <div>
            <dt className="inline text-gray-600">Email:</dt>{' '}
            <dd className="inline">
              <a href={`mailto:${o.customer_email}`} className="text-orange-700 hover:underline">
                {o.customer_email}
              </a>
            </dd>
          </div>
          {o.customer_phone && (
            <div>
              <dt className="inline text-gray-600">Phone:</dt>{' '}
              <dd className="inline">
                <a href={`tel:${o.customer_phone}`} className="text-orange-700 hover:underline">
                  {o.customer_phone}
                </a>
              </dd>
            </div>
          )}
          <div>
            <dt className="inline text-gray-600">City:</dt> <dd className="inline">{o.delivery_city}</dd>
          </div>
          <div>
            <dt className="inline text-gray-600">Address:</dt> <dd className="inline">{o.delivery_address}</dd>
          </div>
          {o.notes && (
            <div className="mt-2">
              <dt className="text-gray-600 text-xs uppercase tracking-wide">Notes</dt>
              <dd className="mt-1 whitespace-pre-wrap text-gray-800 bg-gray-50 rounded p-2 text-sm">{o.notes}</dd>
            </div>
          )}
        </dl>
      </section>

      <section className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <h2 className="text-lg font-bold px-5 pt-5">Items ({items.length})</h2>
        <table className="mt-3 w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-600">
            <tr>
              <th className="px-4 py-2 text-left">Item</th>
              <th className="px-4 py-2 text-left">Kind</th>
              <th className="px-4 py-2 text-right">Qty</th>
              <th className="px-4 py-2 text-left">Dates</th>
              <th className="px-4 py-2 text-left">Tier</th>
              <th className="px-4 py-2 text-right">Subtotal</th>
              <th className="px-4 py-2 text-right">Deposit (per line)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((i) => (
              <tr key={i.id}>
                <td className="px-4 py-2">{i.equipment_name}</td>
                <td className="px-4 py-2 capitalize">{i.kind}</td>
                <td className="px-4 py-2 text-right">{i.qty}</td>
                <td className="px-4 py-2 text-xs">
                  {i.start_date && i.end_date ? `${i.start_date} → ${i.end_date} (${i.days ?? '?'}d)` : '-'}
                </td>
                <td className="px-4 py-2 text-xs">{i.applied_tier || '-'}</td>
                <td className="px-4 py-2 text-right">{formatMoneyCents(i.unit_subtotal_cents ?? 0)}</td>
                <td className="px-4 py-2 text-right">{formatMoneyCents(i.deposit_cents ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-lg font-bold">Order totals</h2>
          <dl className="mt-3 text-sm space-y-1">
            <div className="flex justify-between">
              <dt>Rental subtotal</dt>
              <dd>{formatMoneyCents(pricing.rental_subtotal_cents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Buy subtotal</dt>
              <dd>{formatMoneyCents(pricing.buy_subtotal_cents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Delivery</dt>
              <dd>{formatMoneyCents(pricing.delivery_price_cents)}</dd>
            </div>
            <div className="flex justify-between pt-2 border-t font-semibold">
              <dt>Grand total</dt>
              <dd>{formatMoneyCents(pricing.order_grand_total_cents)}</dd>
            </div>
          </dl>
        </div>

        <div className="bg-orange-50 rounded-lg border border-orange-200 p-5">
          <h2 className="text-lg font-bold text-orange-900">Due now on approval</h2>
          <p className="mt-1 text-xs text-orange-800">
            e-Transfer to {settings.etransfer_recipient_email} · ref KE-{o.id.slice(0, 8)}
          </p>
          <dl className="mt-3 text-sm space-y-1 text-gray-800">
            <div className="flex justify-between">
              <dt>
                Rental deposit <span className="text-xs text-gray-600">({(pricing.deposit_pct * 100).toFixed(0)}% of item deposits)</span>
              </dt>
              <dd>{formatMoneyCents(pricing.rental_deposit_due_cents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Buy (full)</dt>
              <dd>{formatMoneyCents(pricing.buy_subtotal_cents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Delivery</dt>
              <dd>{formatMoneyCents(pricing.delivery_price_cents)}</dd>
            </div>
            <div className="flex justify-between pt-2 border-t border-orange-200 font-semibold text-orange-900">
              <dt>Due now</dt>
              <dd>{formatMoneyCents(pricing.grand_total_due_now_cents)}</dd>
            </div>
            {pricing.remaining_rental_balance_cents > 0 && (
              <div className="flex justify-between pt-2 text-xs text-gray-600">
                <dt>Rental balance owed on delivery</dt>
                <dd>{formatMoneyCents(pricing.remaining_rental_balance_cents)}</dd>
              </div>
            )}
          </dl>
        </div>
      </section>
    </div>
  );
}
