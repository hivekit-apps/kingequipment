import Link from 'next/link';
import { requireAdmin } from '@/lib/require-role';
import { createServiceClient } from '@/lib/supabase/service';
import { formatMoneyCents } from '@/lib/order-pricing';

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

type OrderItemLite = {
  order_id: string;
  equipment_name: string;
  kind: string;
  qty: number;
  end_date: string | null;
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

export default async function AdminOrdersPage() {
  await requireAdmin();
  const svc = createServiceClient();
  const { data: ordersData, error } = await svc
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);
  const orders = (ordersData ?? []) as Order[];

  const ids = orders.map((o) => o.id);
  const itemsByOrder = new Map<string, OrderItemLite[]>();
  if (ids.length > 0) {
    const { data: items } = await svc
      .from('order_items')
      .select('order_id, equipment_name, kind, qty, end_date')
      .in('order_id', ids);
    for (const it of (items ?? []) as OrderItemLite[]) {
      const arr = itemsByOrder.get(it.order_id) ?? [];
      arr.push(it);
      itemsByOrder.set(it.order_id, arr);
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const pending: Order[] = [];
  const confirmed: Order[] = [];
  const past: Order[] = [];
  const archived: Order[] = [];
  for (const o of orders) {
    if (o.status === 'archived') {
      archived.push(o);
      continue;
    }
    if (o.status === 'pending') {
      pending.push(o);
      continue;
    }
    if (o.status === 'confirmed') {
      const items = itemsByOrder.get(o.id) ?? [];
      const datedItems = items.filter((it) => it.end_date);
      const allPast =
        datedItems.length > 0 && datedItems.every((it) => (it.end_date ?? '') < today);
      if (allPast) past.push(o);
      else confirmed.push(o);
      continue;
    }
    past.push(o); // denied / cancelled / delivered / returned
  }

  return (
    <div className="space-y-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Orders</h1>
          <p className="mt-1 text-sm text-gray-600">
            Multi-item ecommerce orders.
            {pending.length > 0 && (
              <>
                {' '}<strong className="text-amber-700">{pending.length} pending approval.</strong>
              </>
            )}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-800">
          Error loading orders: {error.message}
        </div>
      )}

      <OrdersSection title="Pending approval" tone="amber" orders={pending} itemsByOrder={itemsByOrder} highlightAction />
      <OrdersSection title="Active" tone="green" orders={confirmed} itemsByOrder={itemsByOrder} />
      <OrdersSection title="Past" tone="gray" orders={past} itemsByOrder={itemsByOrder} />
      <ArchivedSection orders={archived} itemsByOrder={itemsByOrder} />
    </div>
  );
}

function OrdersSection({
  title,
  tone,
  orders,
  itemsByOrder,
  highlightAction,
}: {
  title: string;
  tone: 'amber' | 'green' | 'gray';
  orders: Order[];
  itemsByOrder: Map<string, OrderItemLite[]>;
  highlightAction?: boolean;
}) {
  const borderTone =
    tone === 'amber' ? 'border-amber-200 bg-amber-50/40' : tone === 'green' ? 'border-green-200' : 'border-gray-200';
  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-800 mb-3">
        {title} ({orders.length})
      </h2>
      {orders.length === 0 ? (
        <p className="text-sm text-gray-500 italic">Nothing here.</p>
      ) : (
        <div className={`bg-white rounded-lg border ${borderTone} overflow-hidden`}>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-600">
              <tr>
                <th className="px-4 py-3 text-left">Created</th>
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-left">City</th>
                <th className="px-4 py-3 text-left">Items</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map((o) => {
                const items = itemsByOrder.get(o.id) ?? [];
                const itemsLabel = items.length === 0
                  ? '-'
                  : items
                      .slice(0, 2)
                      .map((it) => `${it.equipment_name} × ${it.qty}`)
                      .join(', ') + (items.length > 2 ? `, +${items.length - 2}` : '');
                return (
                  <tr key={o.id}>
                    <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">
                      {new Date(o.created_at).toLocaleString('en-CA', {
                        timeZone: 'America/Toronto',
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{o.customer_name}</div>
                      <div className="text-xs text-gray-500">{o.customer_email}</div>
                      {o.customer_phone && (
                        <div className="text-xs text-gray-500">{o.customer_phone}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">{o.delivery_city}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{itemsLabel}</td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {formatMoneyCents(o.grand_total_cents ?? 0)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs uppercase font-medium tracking-wide ${statusPill(o.status)}`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/orders/${o.id}`}
                        className={
                          highlightAction
                            ? 'inline-block rounded-md bg-orange-600 text-white px-3 py-1.5 text-xs font-medium hover:bg-orange-700'
                            : 'text-orange-700 hover:underline text-sm'
                        }
                      >
                        {highlightAction ? 'Review' : 'View'}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function ArchivedSection({
  orders,
  itemsByOrder,
}: {
  orders: Order[];
  itemsByOrder: Map<string, OrderItemLite[]>;
}) {
  return (
    <section>
      <details className="rounded-lg border border-gray-200 bg-white">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50">
          Archived ({orders.length})
        </summary>
        <div className="px-4 pb-4">
          {orders.length === 0 ? (
            <p className="text-sm text-gray-500 italic py-2">Nothing archived.</p>
          ) : (
            <ul className="divide-y divide-gray-100 text-sm">
              {orders.map((o) => {
                const items = itemsByOrder.get(o.id) ?? [];
                return (
                  <li key={o.id} className="py-2 flex items-center justify-between">
                    <div className="min-w-0">
                      <span className="font-medium text-gray-800">{o.customer_name}</span>
                      <span className="text-gray-500"> &middot; {formatMoneyCents(o.grand_total_cents ?? 0)}</span>
                      <span className="text-gray-500"> &middot; {items.length} item{items.length === 1 ? '' : 's'}</span>
                    </div>
                    <Link href={`/admin/orders/${o.id}`} className="text-xs text-orange-700 hover:underline">
                      View
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </details>
    </section>
  );
}
