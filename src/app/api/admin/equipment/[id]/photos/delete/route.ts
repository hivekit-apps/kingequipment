export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/require-role';
import { createServiceClient } from '@/lib/supabase/service';
import { getSiteConfigLive, getEquipmentById } from '@/lib/config';

const BUCKET = 'equipment-photos';

// POST { src }: remove this photo from the overrides.photos array AND from
// Supabase Storage (best-effort; storage deletion failure is non-fatal because
// the public page is driven by the overrides array, not storage listings).
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  await requireAdminRole();
  const cfg = await getSiteConfigLive();
  const item = getEquipmentById(params.id, cfg);
  if (!item) return NextResponse.json({ error: 'Unknown equipment id' }, { status: 404 });

  let body: { src?: string } = {};
  try {
    body = (await req.json()) as { src?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const src = String(body.src || '');
  if (!src) return NextResponse.json({ error: 'src required' }, { status: 400 });

  const current = [...item.photos];
  const nextPhotos = current.filter((p) => p.src !== src);
  if (nextPhotos.length === current.length) {
    return NextResponse.json({ error: 'Photo not found on this equipment' }, { status: 404 });
  }

  // Best-effort delete from Storage. Only attempt if src looks like our bucket URL.
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim().replace(/^"|"$|^'|'$/g, '');
  const key = (process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim().replace(/^"|"$|^'|'$/g, '');
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = src.indexOf(marker);
  if (url && key && idx >= 0) {
    const objectPath = src.slice(idx + marker.length);
    try {
      await fetch(`${url}/storage/v1/object/${BUCKET}/${objectPath}`, {
        method: 'DELETE',
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
      });
    } catch {
      // non-fatal
    }
  }

  const svc = createServiceClient();
  const { error } = await svc
    .from('equipment_overrides')
    .upsert(
      {
        equipment_id: item.id,
        photos: nextPhotos,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'equipment_id' },
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
