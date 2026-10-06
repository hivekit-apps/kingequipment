// DELETE /api/admin/orders/[id] — hard-delete order + order_items.
// Admin-only (requireAdminRole). No customer email.

import { NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/require-role';
import { createServiceClient } from '@/lib/supabase/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await requireAdminRole();
  const svc = createServiceClient();

  // order_items has `on delete cascade` from the cycle 7 migration, but delete
  // explicitly for defense-in-depth in case the cascade is dropped later.
  await svc.from('order_items').delete().eq('order_id', params.id);
  const { error } = await svc.from('orders').delete().eq('id', params.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
