export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
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
  // cycle 10 long-form fields
  description?: string | null;
  specsBullets?: string[] | null;
  attachmentsIncluded?: string[] | null;
  idealFor?: string[] | null;
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
  // Cycle 10 long-form fields. Store empty string / empty array as null so
  // the merge falls back to seed instead of overriding with "nothing".
  if (body.description !== undefined) {
    const trimmed = typeof body.description === 'string' ? body.description.trim() : '';
    upsert.description = trimmed.length > 0 ? trimmed : null;
  }
  if (body.specsBullets !== undefined) {
    const arr = Array.isArray(body.specsBullets)
      ? body.specsBullets.map((s) => String(s).trim()).filter((s) => s.length > 0)
      : [];
    upsert.specs_bullets = arr.length > 0 ? arr : null;
  }
  if (body.attachmentsIncluded !== undefined) {
    const arr = Array.isArray(body.attachmentsIncluded)
      ? body.attachmentsIncluded.map((s) => String(s).trim()).filter((s) => s.length > 0)
      : [];
    upsert.attachments_included = arr.length > 0 ? arr : null;
  }
  if (body.idealFor !== undefined) {
    const arr = Array.isArray(body.idealFor)
      ? body.idealFor.map((s) => String(s).trim()).filter((s) => s.length > 0)
      : [];
    upsert.ideal_for = arr.length > 0 ? arr : null;
  }

  const { error } = await svc
    .from('equipment_overrides')
    .upsert(upsert, { onConflict: 'equipment_id' });
  if (error) {
    console.error('[admin equipment PATCH] upsert failed:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Cycle 10: invalidate ISR caches so edits (long-form content, pricing,
  // name) appear immediately on the public site.
  try {
    revalidatePath(`/equipment/${params.id}`);
    const cities = cfg.cityPages.cities.map((c) => c.slug);
    for (const slug of cities) {
      revalidatePath(`/equipment/${params.id}/${slug}`);
    }
    revalidatePath('/rent');
    revalidatePath('/buy');
  } catch {
    // revalidatePath failures are non-fatal
  }

  return NextResponse.json({ ok: true });
}

// DELETE any equipment entry (seed OR custom) via cycle-10 flow.
// - Resolve item category + preferred mode (rent vs buy) to compute redirect target.
// - Insert equipment_redirects row (upsert) so public /equipment/<id>[/city] 307s.
// - SEED items: upsert equipment_overrides with visible=false (removes from catalog;
//   seed row stays in site.json so a Restore can un-hide without redeploy).
// - CUSTOM items: hard-delete from equipment_custom + clean up blocked dates.
// Returns { ok, redirect_to } so the UI can navigate the admin away.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await requireAdminRole();
  const svc = createServiceClient();
  const cfg = await getSiteConfigLive();
  const item = getEquipmentById(params.id, cfg);
  if (!item) {
    return NextResponse.json({ error: 'Unknown equipment id' }, { status: 404 });
  }

  // Compute redirect target. Prefer /rent#cat-<cat> when the item is rentable,
  // else /buy#cat-<cat>. Fallback /rent when no availability info is present.
  const category = item.category || 'drying-water-damage';
  const prefersBuy = !item.availability.includes('rent') && item.availability.includes('buy');
  const target = `${prefersBuy ? '/buy' : '/rent'}#cat-${category}`;

  // Is this a custom-created item?
  const { data: customRow } = await svc
    .from('equipment_custom')
    .select('id')
    .eq('id', params.id)
    .maybeSingle();
  const isCustom = !!customRow;

  // Record the redirect first (upsert so Restore can delete this row cleanly).
  const { error: redirectErr } = await svc
    .from('equipment_redirects')
    .upsert(
      {
        equipment_id: params.id,
        redirect_to: target,
        category_slug: category,
        deleted_at: new Date().toISOString(),
      },
      { onConflict: 'equipment_id' },
    );
  if (redirectErr) {
    console.error('[admin equipment DELETE] redirect upsert failed:', redirectErr.message);
    return NextResponse.json({ error: redirectErr.message }, { status: 500 });
  }

  // Clean up blocked dates for both seed and custom.
  await svc.from('equipment_blocked_dates').delete().eq('equipment_id', params.id);

  if (isCustom) {
    // Hard-delete the custom row and any lingering override.
    await svc.from('equipment_overrides').delete().eq('equipment_id', params.id);
    const { error } = await svc.from('equipment_custom').delete().eq('id', params.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else {
    // Seed item: soft-hide via overrides.visible=false. Keep other override
    // fields intact so a Restore brings back the exact prior state.
    const { error } = await svc
      .from('equipment_overrides')
      .upsert(
        {
          equipment_id: params.id,
          visible: false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'equipment_id' },
      );
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // Cycle 10: invalidate the ISR cache for every path that could render this
  // item so the stale HTML doesn't keep returning 200. Base + per-city routes.
  try {
    revalidatePath(`/equipment/${params.id}`);
    const cities = cfg.cityPages.cities.map((c) => c.slug);
    for (const slug of cities) {
      revalidatePath(`/equipment/${params.id}/${slug}`);
    }
    revalidatePath('/rent');
    revalidatePath('/buy');
    for (const slug of cities) {
      revalidatePath(`/drying-water-damage/${slug}`);
      revalidatePath(`/inverter-generators/${slug}`);
      revalidatePath(`/construction-heaters/${slug}`);
    }
  } catch {
    // revalidatePath failures are non-fatal
  }

  return NextResponse.json({ ok: true, redirect_to: target });
}
