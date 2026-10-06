import Link from 'next/link';
import { requireAdmin } from '@/lib/require-role';
import { createServiceClient } from '@/lib/supabase/service';
import { formatMoneyCents } from '@/lib/order-pricing';

export const dynamic = 'force-dynamic';

type OrderLite = {
  id: string;
  created_at: string;
  status: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  delivery_city: string;
  rental_subtotal_cents: number | null;
  buy_subtotal_cents: number | null;
  delivery_price_cents: number | null;
  grand_total_cents: number | null;
};

type OrderItemLite = {
  order_id: string;
  equipment_name: string;
  kind: string;
  qty: number;
  end_date: string | null;
};

interface DashboardData {
  now: Date;
  monthStart: Date;
  pending: OrderLite[];
  confirmed: OrderLite[];
  past: OrderLite[];
  archived: OrderLite[];
  itemsByOrder: Map<string, OrderItemLite[]>;
  stats: {
    orders_this_month: number;
    revenue_this_month_cents: number;
    pending_count: number;
    confirmed_count: number;
  };
}

function firstOfMonthUTC(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

function isoDateUTC(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function loadDashboard(): Promise<DashboardData> {
  const svc = createServiceClient();
  const now = new Date();
  const monthStart = firstOfMonthUTC(now);
  const monthStartIso = monthStart.toISOString();
  const todayDate = isoDateUTC(now);

  const { data: ordersData, error: ordersErr } = await svc
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);
  if (ordersErr) console.error('[admin dashboard] orders load:', ordersErr.message);
  const orders = (ordersData ?? []) as OrderLite[];

  const ids = orders.map((o) => o.id);
  const itemsByOrder = new Map<string, OrderItemLite[]>();
  if (ids.length > 0) {
    const { data: itemsData } = await svc
      .from('order_items')
      .select('order_id, equipment_name, kind, qty, end_date')
      .in('order_id', ids);
    for (const it of (itemsData ?? []) as OrderItemLite[]) {
      const arr = itemsByOrder.get(it.order_id) ?? [];
      arr.push(it);
      itemsByOrder.set(it.order_id, arr);
    }
  }

  // Classify.
  const pending: OrderLite[] = [];
  const confirmed: OrderLite[] = [];
  const past: OrderLite[] = [];
  const archived: OrderLite[] = [];
  for (const o of orders) {
    if (o.status === 'archived') {
      archived.push(o);
      continue;
    }
    if (o.status === 'pending') {
      pending.push(o);
      continue;
    }
    if (o.status === 'delivered' || o.status === 'returned') {
      past.push(o);
      continue;
    }
    if (o.status === 'confirmed') {
      // "past" if every item's end_date < today AND there's at least one dated item.
      const items = itemsByOrder.get(o.id) ?? [];
      const datedItems = items.filter((it) => it.end_date);
      const allPast =
        datedItems.length > 0 && datedItems.every((it) => (it.end_date ?? '') < todayDate);
      if (allPast) {
        past.push(o);
      } else {
        confirmed.push(o);
      }
      continue;
    }
    // denied / cancelled → past bucket by default.
    past.push(o);
  }

  const monthRevenue = orders
    .filter((o) => o.status === 'confirmed' || o.status === 'delivered' || o.status === 'returned')
    .filter((o) => new Date(o.created_at).toISOString() >= monthStartIso)
    .reduce((s, o) => s + (o.grand_total_cents ?? 0), 0);
  const monthCount = orders.filter((o) => new Date(o.created_at).toISOString() >= monthStartIso)
    .length;

  return {
    now,
    monthStart,
    pending,
    confirmed,
    past,
    archived,
    itemsByOrder,
    stats: {
      orders_this_month: monthCount,
      revenue_this_month_cents: monthRevenue,
      pending_count: pending.length,
      confirmed_count: confirmed.length,
    },
  };
}

function fmtTs(iso: string): string {
  return new Date(iso).toLocaleString('en-CA', {
    timeZone: 'America/Toronto',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function fmtRelative(iso: string, now: Date): string {
  const diffMs = now.getTime() - new Date(iso).getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.round(diffH / 24);
  if (diffD < 7) return `${diffD}d ago`;
  return fmtTs(iso);
}

function statusBadge(status: string): string {
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

export default async function AdminDashboard() {
  const admin = await requireAdmin();
  const data = await loadDashboard();
  const monthLabel = data.monthStart.toLocaleDateString('en-CA', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          {greeting(data.now)}, {admin.full_name?.split(' ')[0] || 'friend'}.
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Here&rsquo;s what&rsquo;s happening with King Equipment Rental right now.
        </p>
      </div>

      <section aria-label="This month at a glance" className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard
          label={`Orders in ${monthLabel}`}
          value={data.stats.orders_this_month.toString()}
          hint={data.stats.orders_this_month === 0 ? 'No orders yet this month' : 'orders received'}
        />
        <StatCard
          label="Pending approval"
          value={data.stats.pending_count.toString()}
          hint={data.stats.pending_count === 0 ? "You're caught up" : 'awaiting your action'}
        />
        <StatCard
          label="Active orders"
          value={data.stats.confirmed_count.toString()}
          hint={data.stats.confirmed_count === 0 ? 'None in progress' : 'confirmed, upcoming or in-progress'}
        />
        <StatCard
          label={`Revenue in ${monthLabel}`}
          value={formatMoneyCents(data.stats.revenue_this_month_cents)}
          hint={data.stats.revenue_this_month_cents === 0 ? 'No confirmed revenue yet' : 'confirmed-order total'}
        />
      </section>

      <section aria-label="Pending approval">
        <SectionHeader
          title={`Pending approval (${data.pending.length})`}
          linkHref="/admin/orders"
          linkLabel="All orders →"
        />
        {data.pending.length === 0 ? (
          <EmptyRow>No orders waiting. You&rsquo;re caught up.</EmptyRow>
        ) : (
          <ul className="space-y-2">
            {data.pending.slice(0, 10).map((o) => (
              <li key={o.id} className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900">
                      {o.customer_name}
                      <span className={`ml-2 text-xs px-2 py-0.5 rounded-full uppercase font-medium tracking-wide ${statusBadge(o.status)}`}>
                        {o.status}
                      </span>
                    </p>
                    <p className="text-sm text-gray-700 mt-1">
                      {formatMoneyCents(o.grand_total_cents ?? 0)} &middot; {o.delivery_city}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Submitted {fmtRelative(o.created_at, data.now)}
                      {' · '}
                      <a href={`mailto:${o.customer_email}`} className="text-orange-700 hover:underline">
                        {o.customer_email}
                      </a>
                      {o.customer_phone && (
                        <>
                          {' · '}
                          <a href={`tel:${o.customer_phone}`} className="text-orange-700 hover:underline">
                            {o.customer_phone}
                          </a>
                        </>
                      )}
                    </p>
                  </div>
                  <Link
                    href={`/admin/orders/${o.id}`}
                    className="shrink-0 rounded-md bg-white border border-amber-300 px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-100"
                  >
                    Review
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Active orders">
        <SectionHeader
          title={`Active orders (${data.confirmed.length})`}
          linkHref="/admin/calendar"
          linkLabel="Calendar →"
        />
        {data.confirmed.length === 0 ? (
          <EmptyRow>Nothing confirmed yet. Approved orders show up here.</EmptyRow>
        ) : (
          <ul className="space-y-2">
            {data.confirmed.slice(0, 10).map((o) => (
              <li key={o.id} className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900">
                      {o.customer_name}
                      <span className="ml-2 text-sm font-normal text-gray-600">
                        &middot; {formatMoneyCents(o.grand_total_cents ?? 0)} &middot; {o.delivery_city}
                      </span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Confirmed {fmtRelative(o.created_at, data.now)}
                    </p>
                  </div>
                  <Link
                    href={`/admin/orders/${o.id}`}
                    className="shrink-0 text-sm text-orange-700 hover:underline"
                  >
                    View
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Past orders">
        <SectionHeader
          title={`Past (${data.past.length})`}
          linkHref="/admin/orders"
          linkLabel="All orders →"
        />
        {data.past.length === 0 ? (
          <EmptyRow>No past orders.</EmptyRow>
        ) : (
          <p className="text-sm text-gray-500">{data.past.length} order{data.past.length === 1 ? '' : 's'} completed or declined. See the Orders tab for details.</p>
        )}
      </section>
    </div>
  );
}

function greeting(now: Date): string {
  const hourStr = now.toLocaleString('en-CA', { hour: 'numeric', hour12: false, timeZone: 'America/Toronto' });
  const h = parseInt(hourStr, 10);
  if (Number.isNaN(h)) return 'Hello';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-2 text-3xl font-semibold text-gray-900">{value}</div>
      {hint && <div className="mt-1 text-xs text-gray-500">{hint}</div>}
    </div>
  );
}

function SectionHeader({
  title,
  linkHref,
  linkLabel,
}: {
  title: string;
  linkHref: string;
  linkLabel: string;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
      <Link href={linkHref} className="text-sm text-orange-700 hover:underline">
        {linkLabel}
      </Link>
    </div>
  );
}

function EmptyRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-gray-200 bg-white p-4 text-sm text-gray-500 italic">
      {children}
    </div>
  );
}
