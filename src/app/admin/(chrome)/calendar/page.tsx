// Admin orders calendar.
//
// Shows a monthly grid of orders whose rental items span each date. Server-
// rendered, no fancy client calendar. Scrollable list grouped by date for
// clarity on smaller screens.
//
// Scope: pending + confirmed orders only. Buy-only orders do not block dates
// (only rental items with start_date/end_date contribute). Each entry is a
// link to /admin/orders/[id] and shows customer name, equipment items, grand
// total, delivery city/address, and status.

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
  delivery_address: string;
  delivery_city: string;
  grand_total_cents: number | null;
};

type OrderItem = {
  order_id: string;
  equipment_name: string;
  kind: string;
  qty: number;
  start_date: string | null;
  end_date: string | null;
};

type DayEntry = {
  order: Order;
  items: { equipment_name: string; qty: number }[];
  isStart: boolean;
  isEnd: boolean;
};

function statusPill(status: string): string {
  const map: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800 border-amber-300',
    confirmed: 'bg-green-100 text-green-800 border-green-300',
    delivered: 'bg-blue-100 text-blue-800 border-blue-300',
    returned: 'bg-gray-100 text-gray-700 border-gray-300',
  };
  return map[status] ?? 'bg-gray-100 text-gray-700 border-gray-300';
}

function isoDateUTC(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function enumerateDates(startISO: string, endISO: string): string[] {
  const out: string[] = [];
  const start = new Date(startISO + 'T00:00:00Z');
  const end = new Date(endISO + 'T00:00:00Z');
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return out;
  for (const d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams?: { month?: string };
}) {
  await requireAdmin();
  const svc = createServiceClient();

  // Determine month cursor from ?month=YYYY-MM, default to current month UTC.
  const now = new Date();
  let cursorY = now.getUTCFullYear();
  let cursorM = now.getUTCMonth();
  if (searchParams?.month && /^\d{4}-\d{2}$/.test(searchParams.month)) {
    const [y, m] = searchParams.month.split('-').map((s) => parseInt(s, 10));
    if (Number.isFinite(y) && Number.isFinite(m) && m >= 1 && m <= 12) {
      cursorY = y;
      cursorM = m - 1;
    }
  }

  // 60-day window centered on cursor month (first-of-month minus 2d → end-of-month + 30d
  // actually keep it clean: the viewed month itself + a 15-day padding on each side so items
  // with ranges that cross month boundaries still show).
  const windowStart = new Date(Date.UTC(cursorY, cursorM, 1));
  windowStart.setUTCDate(windowStart.getUTCDate() - 15);
  const windowEnd = new Date(Date.UTC(cursorY, cursorM + 1, 0));
  windowEnd.setUTCDate(windowEnd.getUTCDate() + 15);
  const windowStartISO = isoDateUTC(windowStart);
  const windowEndISO = isoDateUTC(windowEnd);

  // Fetch orders in relevant statuses.
  const { data: ordersData } = await svc
    .from('orders')
    .select('*')
    .in('status', ['pending', 'confirmed', 'delivered', 'returned'])
    .order('created_at', { ascending: false })
    .limit(500);
  const orders = (ordersData ?? []) as Order[];
  const orderById = new Map<string, Order>();
  for (const o of orders) orderById.set(o.id, o);

  // Fetch rental items that overlap the window.
  const { data: itemsData } = await svc
    .from('order_items')
    .select('order_id, equipment_name, kind, qty, start_date, end_date')
    .eq('kind', 'rent')
    .not('start_date', 'is', null)
    .not('end_date', 'is', null)
    .lte('start_date', windowEndISO)
    .gte('end_date', windowStartISO);
  const items = (itemsData ?? []) as OrderItem[];

  // Build date -> entries map.
  const byDate = new Map<string, DayEntry[]>();
  for (const it of items) {
    const order = orderById.get(it.order_id);
    if (!order) continue;
    if (!it.start_date || !it.end_date) continue;
    const dates = enumerateDates(it.start_date, it.end_date);
    for (const d of dates) {
      if (d < windowStartISO || d > windowEndISO) continue;
      const arr = byDate.get(d) ?? [];
      // Try to merge into existing entry for this order (common case: multi-item order).
      const existing = arr.find((e) => e.order.id === order.id);
      if (existing) {
        existing.items.push({ equipment_name: it.equipment_name, qty: it.qty });
        existing.isStart = existing.isStart || d === it.start_date;
        existing.isEnd = existing.isEnd || d === it.end_date;
      } else {
        arr.push({
          order,
          items: [{ equipment_name: it.equipment_name, qty: it.qty }],
          isStart: d === it.start_date,
          isEnd: d === it.end_date,
        });
      }
      byDate.set(d, arr);
    }
  }

  // Build the month grid (days of the current month only, Sun-first).
  const monthFirst = new Date(Date.UTC(cursorY, cursorM, 1));
  const monthDays = new Date(Date.UTC(cursorY, cursorM + 1, 0)).getUTCDate();
  const leadBlanks = monthFirst.getUTCDay(); // 0=Sun
  const cells: Array<{ day: number | null; dateISO: string | null }> = [];
  for (let i = 0; i < leadBlanks; i++) cells.push({ day: null, dateISO: null });
  for (let d = 1; d <= monthDays; d++) {
    cells.push({
      day: d,
      dateISO: isoDateUTC(new Date(Date.UTC(cursorY, cursorM, d))),
    });
  }
  while (cells.length % 7 !== 0) cells.push({ day: null, dateISO: null });

  const monthLabel = new Date(Date.UTC(cursorY, cursorM, 1)).toLocaleDateString('en-CA', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

  const prevCursor = new Date(Date.UTC(cursorY, cursorM - 1, 1));
  const nextCursor = new Date(Date.UTC(cursorY, cursorM + 1, 1));
  const prevParam = `${prevCursor.getUTCFullYear()}-${String(prevCursor.getUTCMonth() + 1).padStart(2, '0')}`;
  const nextParam = `${nextCursor.getUTCFullYear()}-${String(nextCursor.getUTCMonth() + 1).padStart(2, '0')}`;

  const todayISO = isoDateUTC(now);

  // Flat upcoming list — all days in window that have entries, chronological.
  const sortedDates = Array.from(byDate.keys()).sort();
  const upcomingDates = sortedDates.filter((d) => d >= todayISO).slice(0, 20);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Calendar</h1>
          <p className="mt-1 text-sm text-gray-600">
            Rental items on each date. Each tile links to the full order. Buy-only orders don&rsquo;t block dates.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/calendar?month=${prevParam}`}
            className="px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white hover:bg-gray-50"
          >
            ← {prevCursor.toLocaleDateString('en-CA', { month: 'short', timeZone: 'UTC' })}
          </Link>
          <div className="text-sm font-semibold text-gray-800 px-2">{monthLabel}</div>
          <Link
            href={`/admin/calendar?month=${nextParam}`}
            className="px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white hover:bg-gray-50"
          >
            {nextCursor.toLocaleDateString('en-CA', { month: 'short', timeZone: 'UTC' })} →
          </Link>
        </div>
      </div>

      <section className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-7 gap-1">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="text-xs font-medium text-gray-500 text-center py-1">
              {d}
            </div>
          ))}
          {cells.map((c, idx) => {
            if (c.day === null) return <div key={idx} />;
            const entries = c.dateISO ? byDate.get(c.dateISO) ?? [] : [];
            const isToday = c.dateISO === todayISO;
            return (
              <div
                key={idx}
                className={`min-h-[110px] rounded border ${isToday ? 'border-orange-400 bg-orange-50/40' : 'border-gray-200 bg-white'} p-1.5`}
              >
                <div className={`text-xs mb-1 ${isToday ? 'text-orange-700 font-bold' : 'text-gray-500'}`}>
                  {c.day}
                </div>
                <div className="space-y-1">
                  {entries.slice(0, 3).map((e) => (
                    <Link
                      key={e.order.id}
                      href={`/admin/orders/${e.order.id}`}
                      title={`${e.order.customer_name} — ${e.items.map((i) => `${i.equipment_name} ×${i.qty}`).join(', ')} — ${formatMoneyCents(e.order.grand_total_cents ?? 0)} — ${e.order.delivery_city}: ${e.order.delivery_address}`}
                      className={`block text-[11px] leading-tight rounded px-1.5 py-1 border truncate ${statusPill(e.order.status)}`}
                    >
                      <span className="font-semibold truncate block">{e.order.customer_name}</span>
                      <span className="truncate block opacity-80">
                        {e.items.map((i) => `${i.equipment_name} ×${i.qty}`).join(', ')}
                      </span>
                    </Link>
                  ))}
                  {entries.length > 3 && (
                    <div className="text-[10px] text-gray-500">+{entries.length - 3} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Upcoming days</h2>
        {upcomingDates.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No rentals in the next 60-day window.</p>
        ) : (
          <div className="space-y-4">
            {upcomingDates.map((d) => {
              const entries = byDate.get(d) ?? [];
              return (
                <div key={d} className="bg-white rounded-lg border border-gray-200">
                  <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between">
                    <div className="text-sm font-semibold text-gray-800">
                      {new Date(d + 'T00:00:00Z').toLocaleDateString('en-CA', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        timeZone: 'UTC',
                      })}
                    </div>
                    <div className="text-xs text-gray-500">
                      {entries.length} order{entries.length === 1 ? '' : 's'}
                    </div>
                  </div>
                  <ul className="divide-y divide-gray-100">
                    {entries.map((e) => (
                      <li key={e.order.id} className="px-4 py-3 flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">{e.order.customer_name}</span>
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] uppercase font-medium tracking-wide ${statusPill(e.order.status).replace('border-', 'border ')}`}>
                              {e.order.status}
                            </span>
                            {(e.isStart || e.isEnd) && (
                              <span className="text-[10px] text-gray-500">
                                {e.isStart && e.isEnd ? '(single day)' : e.isStart ? '(start)' : '(end)'}
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-700 mt-0.5">
                            {e.items.map((i) => `${i.equipment_name} × ${i.qty}`).join(', ')}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {e.order.delivery_city} · {e.order.delivery_address} ·{' '}
                            <span className="font-semibold text-gray-700">
                              {formatMoneyCents(e.order.grand_total_cents ?? 0)}
                            </span>
                          </div>
                        </div>
                        <Link
                          href={`/admin/orders/${e.order.id}`}
                          className="text-sm text-orange-700 hover:underline whitespace-nowrap"
                        >
                          View order →
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
