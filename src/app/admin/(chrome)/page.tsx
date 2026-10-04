import Link from 'next/link';
import { requireAdmin } from '@/lib/require-role';
import { createServiceClient } from '@/lib/supabase/service';
import { formatCurrency } from '@/lib/invoice';
import type { Booking } from '@/lib/booking-db';
import type { Invoice } from '@/lib/invoice';

export const dynamic = 'force-dynamic';

type EquipmentLite = { id: string; short_name: string };

interface DashboardData {
  now: Date;
  monthStart: Date;
  pending: Booking[];
  upcoming: Booking[];
  recentPayments: Invoice[];
  equipmentMap: Map<string, EquipmentLite>;
  bookingMap: Map<string, Booking>;
  stats: {
    bookings_this_month: number;
    days_booked_this_month: number;
    revenue_this_month_cents: number;
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
  const monthStartDate = isoDateUTC(monthStart);
  const todayDate = isoDateUTC(now);

  const [
    pendingRes,
    upcomingRes,
    recentPaymentsRes,
    equipmentRes,
    monthBookingsRes,
    monthAvailabilityRes,
    monthPaidInvoicesRes,
  ] = await Promise.all([
    svc
      .from('kiril_bookings')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(10),
    svc
      .from('kiril_bookings')
      .select('*')
      .eq('status', 'confirmed')
      .gte('end_date', todayDate)
      .order('start_date', { ascending: true })
      .limit(10),
    svc
      .from('kiril_invoices')
      .select('*')
      .eq('status', 'paid')
      .order('paid_at', { ascending: false })
      .limit(10),
    svc.from('kiril_equipment').select('id, short_name'),
    svc
      .from('kiril_bookings')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', monthStartIso),
    svc
      .from('kiril_availability')
      .select('date')
      .eq('status', 'booked')
      .gte('date', monthStartDate),
    svc
      .from('kiril_invoices')
      .select('total_cents')
      .eq('status', 'paid')
      .gte('paid_at', monthStartIso),
  ]);

  const equipmentMap = new Map<string, EquipmentLite>();
  for (const e of (equipmentRes.data ?? []) as EquipmentLite[]) equipmentMap.set(e.id, e);

  const recentPayments = (recentPaymentsRes.data ?? []) as Invoice[];
  const bookingIds = Array.from(new Set(recentPayments.map((i) => i.booking_id).filter(Boolean)));
  let bookingMap = new Map<string, Booking>();
  if (bookingIds.length > 0) {
    const { data } = await svc.from('kiril_bookings').select('*').in('id', bookingIds);
    for (const b of (data ?? []) as Booking[]) bookingMap.set(b.id, b);
  }

  const uniqueDaysBooked = new Set<string>();
  for (const row of (monthAvailabilityRes.data ?? []) as Array<{ date: string }>) {
    uniqueDaysBooked.add(row.date);
  }
  const revenueThisMonth = ((monthPaidInvoicesRes.data ?? []) as Array<{ total_cents: number }>).reduce(
    (s, r) => s + (r.total_cents ?? 0),
    0,
  );

  return {
    now,
    monthStart,
    pending: (pendingRes.data ?? []) as Booking[],
    upcoming: (upcomingRes.data ?? []) as Booking[],
    recentPayments,
    equipmentMap,
    bookingMap,
    stats: {
      bookings_this_month: monthBookingsRes.count ?? 0,
      days_booked_this_month: uniqueDaysBooked.size,
      revenue_this_month_cents: revenueThisMonth,
    },
  };
}

function fmtDate(iso: string): string {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
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

function fmtDaysUntil(startIso: string, now: Date): string {
  const start = new Date(startIso + 'T00:00:00Z').getTime();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const diffD = Math.round((start - today) / (86400 * 1000));
  if (diffD < 0) return 'in progress';
  if (diffD === 0) return 'today';
  if (diffD === 1) return 'tomorrow';
  return `in ${diffD} days`;
}

function DeliveryZoneLabel({ zone }: { zone: Booking['delivery_zone'] }) {
  const map: Record<Booking['delivery_zone'], string> = {
    'king-township': 'King Twp (free)',
    gta: 'GTA flat-rate',
    other: 'Southern ON (quoted)',
  };
  return <span className="text-xs text-gray-500">{map[zone]}</span>;
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

      <section aria-label="This month at a glance" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label={`Bookings in ${monthLabel}`}
          value={data.stats.bookings_this_month.toString()}
          hint={data.stats.bookings_this_month === 0 ? 'No requests yet this month' : 'requests received'}
        />
        <StatCard
          label={`Days booked in ${monthLabel}`}
          value={data.stats.days_booked_this_month.toString()}
          hint={data.stats.days_booked_this_month === 0 ? 'No equipment out yet' : 'unique days on rent'}
        />
        <StatCard
          label={`Revenue in ${monthLabel}`}
          value={formatCurrency(data.stats.revenue_this_month_cents)}
          hint={data.stats.revenue_this_month_cents === 0 ? 'No payments received yet' : 'invoices marked paid'}
        />
      </section>

      <section aria-label="Booking requests waiting on you">
        <SectionHeader
          title={`Pending requests (${data.pending.length})`}
          linkHref="/admin/bookings"
          linkLabel="All bookings →"
        />
        {data.pending.length === 0 ? (
          <EmptyRow>No booking requests waiting. You&rsquo;re caught up.</EmptyRow>
        ) : (
          <ul className="space-y-2">
            {data.pending.map((b) => {
              const eq = data.equipmentMap.get(b.equipment_id);
              return (
                <li key={b.id} className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900">
                        {b.customer_name}
                        <span className="ml-2 text-sm font-normal text-gray-600">
                          &middot; {eq?.short_name ?? '(equipment)'}
                        </span>
                      </p>
                      <p className="text-sm text-gray-700 mt-1">
                        {fmtDate(b.start_date)}
                        {b.end_date !== b.start_date && ` → ${fmtDate(b.end_date)}`}
                        {b.operator && ' · +operator'}
                        {' · '}
                        <DeliveryZoneLabel zone={b.delivery_zone} />
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {b.customer_address}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Requested {fmtRelative(b.created_at, data.now)}
                        {' · '}
                        <a href={`mailto:${b.customer_email}`} className="text-orange-700 hover:underline">
                          {b.customer_email}
                        </a>
                        {b.customer_phone && (
                          <>
                            {' · '}
                            <a href={`tel:${b.customer_phone}`} className="text-orange-700 hover:underline">
                              {b.customer_phone}
                            </a>
                          </>
                        )}
                      </p>
                    </div>
                    <Link
                      href="/admin/bookings"
                      className="shrink-0 rounded-md bg-white border border-amber-300 px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-100"
                    >
                      Review
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-label="Upcoming deliveries">
        <SectionHeader
          title={`Upcoming deliveries (${data.upcoming.length})`}
          linkHref="/admin/calendar"
          linkLabel="Calendar →"
        />
        {data.upcoming.length === 0 ? (
          <EmptyRow>No upcoming deliveries. Once a booking is confirmed it will land here.</EmptyRow>
        ) : (
          <ul className="space-y-2">
            {data.upcoming.map((b) => {
              const eq = data.equipmentMap.get(b.equipment_id);
              return (
                <li key={b.id} className="rounded-lg border border-gray-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900">
                        {b.customer_name}
                        <span className="ml-2 text-sm font-normal text-gray-600">
                          &middot; {eq?.short_name ?? '(equipment)'}
                        </span>
                      </p>
                      <p className="text-sm text-gray-700 mt-1">
                        <span className="font-medium">{fmtDaysUntil(b.start_date, data.now)}</span>
                        {' · '}
                        {fmtDate(b.start_date)}
                        {b.end_date !== b.start_date && ` → ${fmtDate(b.end_date)}`}
                        {b.operator && ' · +operator'}
                      </p>
                      <p className="text-sm text-gray-700 mt-1">📍 {b.customer_address}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        <DeliveryZoneLabel zone={b.delivery_zone} />
                        {' · '}
                        <a href={`mailto:${b.customer_email}`} className="text-orange-700 hover:underline">
                          {b.customer_email}
                        </a>
                        {b.customer_phone && (
                          <>
                            {' · '}
                            <a href={`tel:${b.customer_phone}`} className="text-orange-700 hover:underline">
                              {b.customer_phone}
                            </a>
                          </>
                        )}
                      </p>
                      {b.notes && (
                        <p className="mt-2 text-xs text-gray-600 bg-gray-50 rounded p-2 whitespace-pre-wrap">
                          {b.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {admin.role === 'admin' && (
        <section aria-label="Recent payments">
          <SectionHeader
            title={`Recent payments (${data.recentPayments.length})`}
            linkHref="/admin/invoices"
            linkLabel="Invoices →"
          />
          {data.recentPayments.length === 0 ? (
            <EmptyRow>No payments yet. Marked-paid invoices show up here.</EmptyRow>
          ) : (
            <ul className="space-y-2">
              {data.recentPayments.map((inv) => {
                const b = data.bookingMap.get(inv.booking_id);
                return (
                  <li key={inv.id} className="rounded-lg border border-green-200 bg-green-50 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900">
                          {formatCurrency(inv.total_cents, inv.currency)}
                          <span className="ml-2 text-sm font-normal text-gray-600">
                            &middot; {b?.customer_name ?? '(unknown)'}
                            {' · '}
                            <span className="capitalize">{inv.kind}</span>
                          </span>
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          {inv.paid_at ? fmtRelative(inv.paid_at, data.now) : 'unknown time'}
                          {inv.paid_method && ` · via ${inv.paid_method}`}
                          {inv.paid_reference && ` · ref ${inv.paid_reference}`}
                        </p>
                        <p className="text-xs text-gray-400 mt-1 font-mono">#{inv.id.slice(0, 8)}</p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

function greeting(now: Date): string {
  // America/Toronto — use en-CA hour to keep it timezone-safe.
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
