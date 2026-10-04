export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/require-role';
import { blockDates, unblockDate, getEquipmentBySlug } from '@/lib/booking-db';

// POST /api/admin/calendar/block  body: { equipment_slug, dates: string[], reason }
// DELETE /api/admin/calendar/block  body: { equipment_slug, date }
export async function POST(req: NextRequest) {
  await requireAdminRole();
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }
  const equipmentSlug = typeof body.equipment_slug === 'string' ? body.equipment_slug : 'mini-stand-on';
  const dates = Array.isArray(body.dates) ? (body.dates as unknown[]).filter((d): d is string => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) : [];
  const reason = typeof body.reason === 'string' ? body.reason : 'Manual block';
  if (dates.length === 0) return NextResponse.json({ error: 'no valid dates' }, { status: 422 });
  const eq = await getEquipmentBySlug(equipmentSlug);
  if (!eq) return NextResponse.json({ error: 'equipment not found' }, { status: 404 });
  await blockDates(eq.id, dates, reason);
  return NextResponse.json({ ok: true, blocked: dates.length });
}

export async function DELETE(req: NextRequest) {
  await requireAdminRole();
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }
  const equipmentSlug = typeof body.equipment_slug === 'string' ? body.equipment_slug : 'mini-stand-on';
  const date = typeof body.date === 'string' ? body.date : '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: 'invalid date' }, { status: 422 });
  const eq = await getEquipmentBySlug(equipmentSlug);
  if (!eq) return NextResponse.json({ error: 'equipment not found' }, { status: 404 });
  await unblockDate(eq.id, date);
  return NextResponse.json({ ok: true, unblocked: date });
}
