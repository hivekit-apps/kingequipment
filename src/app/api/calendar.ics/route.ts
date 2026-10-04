export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { loadSettings } from '@/lib/settings';
import { buildICS, bookingToCalendarEntry, blockedToCalendarEntry } from '@/lib/ical';

// Private iCal feed — Kiril and Valdas subscribe to this URL from Google Calendar
// ("Other calendars" → "From URL"). The URL includes a random token so it's not
// world-guessable; rotate via /admin/settings if needed.
//
// Usage: /api/calendar.ics?token=<calendar_ical_token>

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token') ?? '';
  const settings = await loadSettings();
  if (!settings.calendar_ical_token || token !== settings.calendar_ical_token) {
    return NextResponse.json({ error: 'invalid token' }, { status: 403 });
  }

  const svc = createServiceClient();
  const { data: bookings } = await svc
    .from('kiril_bookings')
    .select('*')
    .in('status', ['confirmed', 'pending'])
    .order('start_date');
  const { data: blocks } = await svc
    .from('kiril_availability')
    .select('*')
    .eq('source', 'manual')
    .order('date');
  const { data: equipment } = await svc.from('kiril_equipment').select('*');
  const equipmentById = new Map<string, { short_name: string }>();
  for (const e of (equipment ?? []) as Array<{ id: string; short_name: string }>) {
    equipmentById.set(e.id, e);
  }

  const entries = [];
  for (const b of (bookings ?? []) as Array<Parameters<typeof bookingToCalendarEntry>[0]>) {
    const eq = equipmentById.get(b.equipment_id);
    if (!eq) continue;
    entries.push(bookingToCalendarEntry(b, { id: b.equipment_id, slug: '', name: eq.short_name, short_name: eq.short_name, daily_rate_cents: 0, weekly_rate_cents: null, monthly_rate_cents: null, operator_daily_rate_cents: null, active: true }));
  }
  for (const bl of (blocks ?? []) as Array<{ equipment_id: string; date: string; reason: string | null }>) {
    const eq = equipmentById.get(bl.equipment_id);
    if (!eq) continue;
    entries.push(blockedToCalendarEntry(eq.short_name, bl.date, bl.reason ?? undefined));
  }

  const ics = buildICS(entries);
  return new NextResponse(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Cache-Control': 'private, max-age=300', // 5 min cache; Google Calendar polls every ~24h anyway
    },
  });
}
