export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/require-role';
import { createServiceClient } from '@/lib/supabase/service';

// POST /api/admin/equipment/[id]/restore — undoes a cycle-10 soft delete.
// For SEED items: removes the equipment_redirects row and sets overrides.visible=true
//   (if an override row exists; else the item wasn't in overrides to begin with).
// For CUSTOM items: cannot be restored (the equipment_custom row was hard-deleted).
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  await requireAdminRole();
  const svc = createServiceClient();

  // Delete redirect row (idempotent — fine if it doesn't exist).
  const { error: delRedirect } = await svc
    .from('equipment_redirects')
    .delete()
    .eq('equipment_id', params.id);
  if (delRedirect) {
    return NextResponse.json({ error: delRedirect.message }, { status: 500 });
  }

  // If an override row exists, flip visible back to true. If no override row
  // exists at all, the seed item is already fully visible — nothing to do.
  const { data: existing } = await svc
    .from('equipment_overrides')
    .select('equipment_id')
    .eq('equipment_id', params.id)
    .maybeSingle();
  if (existing) {
    const { error } = await svc
      .from('equipment_overrides')
      .update({ visible: true, updated_at: new Date().toISOString() })
      .eq('equipment_id', params.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
