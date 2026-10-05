export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/require-role';
import { createServiceClient } from '@/lib/supabase/service';
import { getSiteConfig, getEquipmentById } from '@/lib/config';

type Patch = {
  pricing?: Record<string, number | null>;
  availability?: string[];
  visible?: boolean;
  city_delivery?: Record<string, number>;
};

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  await requireAdminRole();
  const cfg = getSiteConfig();
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

  const { error } = await svc
    .from('equipment_overrides')
    .upsert(upsert, { onConflict: 'equipment_id' });
  if (error) {
    console.error('[admin equipment PATCH] upsert failed:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
