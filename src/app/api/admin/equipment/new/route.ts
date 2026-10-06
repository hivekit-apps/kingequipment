export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/require-role';
import { createServiceClient } from '@/lib/supabase/service';
import { getSiteConfig } from '@/lib/config';

type NewEquipmentBody = {
  id?: string;
  name?: string;
  shortName?: string;
  tagline?: string;
  class?: string;
  category?: string;
  availability?: string[];
  visible?: boolean;
  pricing?: {
    daily?: number | null;
    weekly?: number | null;
    monthly?: number | null;
    buyNew?: number | null;
    buyUsed?: number | null;
    deposit?: number | null;
  };
};

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export async function POST(req: NextRequest) {
  await requireAdminRole();

  let body: NewEquipmentBody = {};
  try {
    body = (await req.json()) as NewEquipmentBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const id = String(body.id || '').trim().toLowerCase();
  const name = String(body.name || '').trim();
  const category = String(body.category || '').trim();
  const availability = Array.isArray(body.availability)
    ? body.availability.filter((a) => a === 'rent' || a === 'buy')
    : [];

  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  if (!SLUG_RE.test(id)) {
    return NextResponse.json(
      { error: 'id must be kebab-case (lowercase letters, digits, single hyphens — e.g. "flagro-400k-heater")' },
      { status: 400 },
    );
  }
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });
  if (!category) return NextResponse.json({ error: 'category is required' }, { status: 400 });
  if (availability.length === 0) {
    return NextResponse.json({ error: 'availability must include at least "rent" or "buy"' }, { status: 400 });
  }

  // Validate category against site.json seed.
  const cfg = getSiteConfig();
  const validCategory = cfg.categories.some((c) => c.slug === category);
  if (!validCategory) {
    return NextResponse.json(
      { error: `Unknown category "${category}". Valid: ${cfg.categories.map((c) => c.slug).join(', ')}` },
      { status: 400 },
    );
  }

  // Collision check: must not conflict with site.json seed ids OR an existing custom id.
  const seedCollision = cfg.equipment.some((e) => e.id === id);
  if (seedCollision) {
    return NextResponse.json(
      { error: `id "${id}" collides with a seed catalog entry. Pick a different slug.` },
      { status: 409 },
    );
  }

  const svc = createServiceClient();
  const { data: existing } = await svc
    .from('equipment_custom')
    .select('id')
    .eq('id', id)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: `id "${id}" is already in use` }, { status: 409 });
  }

  const pricing = {
    daily: body.pricing?.daily ?? null,
    weekly: body.pricing?.weekly ?? null,
    monthly: body.pricing?.monthly ?? null,
    buyNew: body.pricing?.buyNew ?? null,
    buyUsed: body.pricing?.buyUsed ?? null,
    deposit: typeof body.pricing?.deposit === 'number' ? body.pricing.deposit : 0,
  };

  const row = {
    id,
    class: (body.class || 'power').trim(),
    category,
    name,
    short_name: body.shortName?.trim() || name,
    tagline: body.tagline?.trim() || '',
    display_rate: '',
    pricing,
    specs: {
      operatingWeightLbs: '',
      ratedOperatingCapacityLbs: '',
      engineHp: '',
      liftHeightIn: null,
      gateWidthIn: null,
    },
    attachments_included: [],
    ideal_for: [],
    photos: [],
    availability,
    visible: body.visible !== false,
    bookable: true,
    operator_note: '',
    photo_note: '',
  };

  const { error } = await svc.from('equipment_custom').insert(row);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id });
}
