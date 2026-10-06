export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/require-role';
import { createServiceClient } from '@/lib/supabase/service';
import { getSiteConfigLive, getEquipmentById } from '@/lib/config';

type Patch = {
  name?: string;
  shortName?: string;
  tagline?: string;
  pricing?: Record<string, number | null>;
  availability?: string[];
  visible?: boolean;
  city_delivery?: Record<string, number>;
};

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  await requireAdminRole();
  const cfg = await getSiteConfigLive();
  const item = getEquipmentById(params.id, cfg);
  if (!item) return NextResponse.json({ error: 'Unknown equipment id' }, { status: 404 });

  let body: Patch = {};
  try {
    body = (await req.json()) as Patch;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const svc = createServiceClient();
  const upsert: Record<string, unknown> = {
    equipment_id: item.id,
    updated_at: new Date().toISOString(),
  };
  if (body.pricing) upsert.pricing = body.pricing;
  if (Array.isArray(body.availability)) upsert.availability = body.availability;
  if (typeof body.visible === 'boolean') upsert.visible = body.visible;
  if (body.city_delivery) upsert.city_delivery = body.city_delivery;
  if (typeof body.name === 'string') upsert.name = body.name.trim();
  if (typeof body.shortName === 'string') upsert.short_name = body.shortName.trim();
  if (typeof body.tagline === 'string') upsert.tagline = body.tagline.trim();

  const { error } = await svc
    .from('equipment_overrides')
    .upsert(upsert, { onConflict: 'equipment_id' });
  if (error) {
    console.error('[admin equipment PATCH] upsert failed:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

// DELETE a custom equipment entry. Seed items (from site.json) cannot be
// deleted via this route -- hide them with overrides.visible=false instead.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await requireAdminRole();
  const svc = createServiceClient();

  // Confirm this id exists in equipment_custom (else it's a seed item).
  const { data: customRow, error: fetchErr } = await svc
    .from('equipment_custom')
    .select('id')
    .eq('id', params.id)
    .maybeSingle();
  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }
  if (!customRow) {
    return NextResponse.json(
      { error: 'This equipment is defined in the seed catalog and cannot be deleted. Toggle Visible=off to hide it.' },
      { status: 400 },
    );
  }

  // Clean up any override row piggy-backed on this id.
  await svc.from('equipment_overrides').delete().eq('equipment_id', params.id);
  // Clean up any blocked dates.
  await svc.from('equipment_blocked_dates').delete().eq('equipment_id', params.id);

  const { error } = await svc.from('equipment_custom').delete().eq('id', params.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
