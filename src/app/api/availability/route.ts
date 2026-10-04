export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getEquipmentBySlug, getAvailability } from '@/lib/booking-db';

// Public read-only endpoint used by the customer-facing date-picker on /book.
// Returns dates that are UNAVAILABLE (booked, blocked, or maintenance) so the
// picker can grey them out. Response is not sensitive: it doesn't leak booking
// customer identity, just date+status.

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const slug = url.searchParams.get('equipment') ?? 'mini-stand-on';
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  if (!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return NextResponse.json({ error: 'from and to (YYYY-MM-DD) required' }, { status: 400 });
  }
  const equipment = await getEquipmentBySlug(slug);
  if (!equipment) return NextResponse.json({ error: 'equipment not found' }, { status: 404 });
  const rows = await getAvailability(equipment.id, from, to);
  return NextResponse.json({
    equipment: { slug: equipment.slug, name: equipment.short_name },
    unavailable: rows.map((r) => ({ date: r.date, status: r.status })),
  });
}
