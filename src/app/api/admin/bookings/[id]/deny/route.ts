export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/require-role';
import { fullDenyBooking } from '@/lib/booking-actions';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    /* empty body ok */
  }
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  const result = await fullDenyBooking(params.id, {
    denied_by: admin.email,
    reason: reason || 'No reason provided',
  });
  if (!result.ok) {
    return NextResponse.json({ error: 'deny failed', details: result.errors }, { status: 500 });
  }
  return NextResponse.json({ ok: true, booking_id: result.booking?.id });
}
