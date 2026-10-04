export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { fireBalanceInvoice } from '@/lib/booking-actions';

// Vercel Cron: runs daily at 11:00 UTC (~7am EDT / 6am EST).
// Fetches confirmed bookings with start_date=today AND no balance invoice yet;
// fires the balance invoice for each.
//
// Vercel Cron sends header `Authorization: Bearer <VERCEL_CRON_SECRET>` when
// configured. We accept that OR ?token=<CRON_TOKEN> for manual invocation
// (owner testing). Never public.

function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_TOKEN?.trim() || '';
  const authHeader = req.headers.get('authorization') ?? '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const tokenParam = new URL(req.url).searchParams.get('token') ?? '';
  if (!cronSecret) return false;
  return bearer === cronSecret || tokenParam === cronSecret;
}

async function processCron() {
  const svc = createServiceClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await svc
    .from('kiril_bookings')
    .select('id, start_date, status')
    .eq('status', 'confirmed')
    .eq('start_date', today);
  if (error) return { ok: false, error: error.message };
  const bookings = (data ?? []) as Array<{ id: string; start_date: string }>;
  const results: Array<{ booking_id: string; result: unknown }> = [];
  for (const b of bookings) {
    const r = await fireBalanceInvoice(b.id, {
      origin: process.env.NEXT_PUBLIC_APP_URL || 'https://kiril-skidsteer.vercel.app',
    });
    results.push({ booking_id: b.id, result: r });
  }
  return { ok: true, date: today, processed: results.length, results };
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  return NextResponse.json(await processCron());
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  return NextResponse.json(await processCron());
}
