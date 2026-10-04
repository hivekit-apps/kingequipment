import { requireAdmin } from '@/lib/require-role';
import { listBookings, type Booking } from '@/lib/booking-db';
import { createServiceClient } from '@/lib/supabase/service';
import { BookingActions } from './actions';

export const dynamic = 'force-dynamic';

async function loadEquipmentMap(): Promise<Map<string, { short_name: string }>> {
  const svc = createServiceClient();
  const { data } = await svc.from('kiril_equipment').select('id, short_name');
  const m = new Map<string, { short_name: string }>();
  for (const e of (data ?? []) as Array<{ id: string; short_name: string }>) m.set(e.id, e);
  return m;
}

function fmtDate(iso: string): string {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function StatusPill({ status }: { status: Booking['status'] }) {
  const map: Record<Booking['status'], string> = {
    pending: 'bg-amber-100 text-amber-800',
    confirmed: 'bg-green-100 text-green-800',
    denied: 'bg-red-100 text-red-800',
    completed: 'bg-gray-200 text-gray-700',
    cancelled: 'bg-gray-100 text-gray-500',
  };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium uppercase tracking-wide ${map[status]}`}>{status}</span>;
}

export default async function BookingsPage() {
  await requireAdmin();
  const [bookings, equipmentMap] = await Promise.all([listBookings({ limit: 100 }), loadEquipmentMap()]);
  const pending = bookings.filter((b) => b.status === 'pending');
  const active = bookings.filter((b) => b.status === 'confirmed');
  const past = bookings.filter((b) => ['denied', 'completed', 'cancelled'].includes(b.status));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Bookings</h1>
        <p className="mt-1 text-gray-600">
          Pending requests: <strong>{pending.length}</strong> &middot; Confirmed: <strong>{active.length}</strong> &middot; Past: <strong>{past.length}</strong>
        </p>
      </div>

      <BookingSection title={`Pending (${pending.length})`} bookings={pending} equipmentMap={equipmentMap} showActions />
      <BookingSection title={`Confirmed (${active.length})`} bookings={active} equipmentMap={equipmentMap} />
      <BookingSection title={`Past (${past.length})`} bookings={past.slice(0, 20)} equipmentMap={equipmentMap} />
    </div>
  );
}

function BookingSection({
  title,
  bookings,
  equipmentMap,
  showActions,
}: {
  title: string;
  bookings: Booking[];
  equipmentMap: Map<string, { short_name: string }>;
  showActions?: boolean;
}) {
  if (bookings.length === 0) {
    return (
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">{title}</h2>
        <p className="text-sm text-gray-500 italic">Nothing here.</p>
      </section>
    );
  }
  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-800 mb-3">{title}</h2>
      <div className="space-y-3">
        {bookings.map((b) => {
          const eq = equipmentMap.get(b.equipment_id);
          return (
            <article key={b.id} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-gray-900">{b.customer_name}</p>
                    <StatusPill status={b.status} />
                    {b.operator && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 uppercase font-medium tracking-wide">+op</span>}
                  </div>
                  <p className="text-sm text-gray-600">
                    {eq?.short_name ?? '(equipment unknown)'} &middot; {fmtDate(b.start_date)}
                    {b.end_date !== b.start_date && ` \u2192 ${fmtDate(b.end_date)}`}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    <a href={`mailto:${b.customer_email}`} className="text-orange-700 hover:underline">{b.customer_email}</a>
                    {b.customer_phone && <> &middot; <a href={`tel:${b.customer_phone}`} className="text-orange-700 hover:underline">{b.customer_phone}</a></>}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">{b.customer_address}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {b.delivery_zone === 'king-township' ? 'King Twp (free delivery)' : b.delivery_zone === 'gta' ? 'GTA flat-rate' : 'Southern ON (quoted)'}
                    {' \u00b7 '}{new Date(b.created_at).toLocaleString('en-CA', { timeZone: 'America/Toronto' })}
                  </p>
                  {b.notes && (
                    <p className="mt-2 text-sm text-gray-700 bg-gray-50 rounded-md p-2 whitespace-pre-wrap">{b.notes}</p>
                  )}
                  {b.status === 'confirmed' && (
                    <p className="mt-1 text-xs text-green-700">Confirmed {b.confirmed_at ? new Date(b.confirmed_at).toLocaleString('en-CA', { timeZone: 'America/Toronto' }) : ''} by {b.confirmed_by || '?'}</p>
                  )}
                  {b.status === 'denied' && (
                    <p className="mt-1 text-xs text-red-700">Denied {b.denied_at ? new Date(b.denied_at).toLocaleString('en-CA', { timeZone: 'America/Toronto' }) : ''} by {b.denied_by || '?'}{b.denied_reason ? `: ${b.denied_reason}` : ''}</p>
                  )}
                </div>
                {showActions && <BookingActions bookingId={b.id} />}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
