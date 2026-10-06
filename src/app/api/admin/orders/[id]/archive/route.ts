// POST /api/admin/orders/[id]/archive — admin housekeeping, no customer email.

import { NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/require-role';
import { createServiceClient } from '@/lib/supabase/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  await requireAdminRole();
  const svc = createServiceClient();
  const { error } = await svc.from('orders').update({ status: 'archived' }).eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, status: 'archived' });
}
