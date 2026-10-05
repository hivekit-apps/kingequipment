export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/require-role';
import { createServiceClient } from '@/lib/supabase/service';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  await requireAdminRole();
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }
  const date = typeof body.date === 'string' ? body.date : '';
  const reason = typeof body.reason === 'string' ? body.reason : null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'invalid date' }, { status: 422 });
  }
  const svc = createServiceClient();
  const { data, error } = await svc
    .from('equipment_blocked_dates')
    .upsert(
      { equipment_id: params.id, blocked_date: date, reason },
      { onConflict: 'equipment_id,blocked_date' },
    )
    .select('*')
    .single();
  if (error) {
    console.error('[admin equipment calendar POST] upsert failed:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, block: data });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  await requireAdminRole();
  const url = new URL(req.url);
  const blockId = url.searchParams.get('id');
  const date = url.searchParams.get('date');
  const svc = createServiceClient();
  let q = svc.from('equipment_blocked_dates').delete().eq('equipment_id', params.id);
  if (blockId) q = q.eq('id', blockId);
  else if (date) q = q.eq('blocked_date', date);
  else return NextResponse.json({ error: 'id or date required' }, { status: 422 });
  const { error } = await q;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
