import { requireAdminRole } from '@/lib/require-role';
import { getActiveEquipment, getAvailability } from '@/lib/booking-db';
import { loadSettings } from '@/lib/settings';
import { CalendarView } from './calendar-view';

export const dynamic = 'force-dynamic';

function monthRange(y: number, m: number): { from: string; to: string } {
  const from = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
  const to = new Date(Date.UTC(y, m + 2, 0)).toISOString().slice(0, 10); // through end of next month
  return { from, to };
}

export default async function CalendarPage() {
  await requireAdminRole();
  const equipment = await getActiveEquipment();
  const settings = await loadSettings();
  const primary = equipment[0];
  const now = new Date();
  const range = monthRange(now.getUTCFullYear(), now.getUTCMonth());
  const avail = primary ? await getAvailability(primary.id, range.from, range.to) : [];
  const icalUrl = settings.calendar_ical_token
    ? `/api/calendar.ics?token=${settings.calendar_ical_token}`
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Calendar</h1>
          <p className="mt-1 text-gray-600">
            Click any date to block/unblock. Booked days (green) come from confirmed bookings.
          </p>
        </div>
      </div>

      {icalUrl && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm">
          <p className="font-semibold text-blue-900 mb-1">Subscribe to this calendar in Google Calendar</p>
          <p className="text-blue-800 mb-2">
            In Google Calendar &rarr; &ldquo;Other calendars&rdquo; &rarr; &ldquo;From URL&rdquo; &rarr; paste:
          </p>
          <code className="block bg-white p-2 rounded text-xs break-all border border-blue-100">
            {`https://kiril-skidsteer.vercel.app${icalUrl}`}
          </code>
          <p className="text-blue-800 mt-2 text-xs">
            One-way sync (view only in Google Calendar). Bookings and blocks flow from here to there; changes made in Google Calendar don&rsquo;t sync back.
          </p>
        </div>
      )}

      {primary ? (
        <CalendarView
          equipmentSlug={primary.slug}
          equipmentName={primary.short_name}
          initialAvailability={avail.map((a) => ({ date: a.date, status: a.status, source: a.source, reason: a.reason }))}
        />
      ) : (
        <p className="text-gray-500 italic">No active equipment.</p>
      )}
    </div>
  );
}
