export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/require-role';
import { fullConfirmBooking } from '@/lib/booking-actions';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    /* empty body ok */
  }
  const applyDiscount = body.apply_google_review_discount === true;
  const origin = new URL(req.url).origin;
  const result = await fullConfirmBooking(params.id, {
    confirmed_by: admin.email,
    apply_google_review_discount: applyDiscount,
    origin,
  });
  if (!result.ok) {
    return NextResponse.json({ error: 'confirm failed', details: result.errors, booking: result.booking, invoice: result.invoice }, { status: 500 });
  }
  return NextResponse.json({
    ok: true,
    booking_id: result.booking?.id,
    invoice_id: result.invoice?.id,
    payment_link: result.payment_link,
    email_message_id: result.email_message_id,
    math: result.math,
  });
}
