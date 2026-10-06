export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/require-role';
import { createServiceClient } from '@/lib/supabase/service';
import { getSiteConfigLive, getEquipmentById, type EquipmentPhoto } from '@/lib/config';

const BUCKET = 'equipment-photos';
const MAX_BYTES = 15 * 1024 * 1024; // 15 MB
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']);

function slugifyFilename(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}

function extForMime(mime: string): string {
  switch (mime) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/avif':
      return 'avif';
    case 'image/gif':
      return 'gif';
    default:
      return 'bin';
  }
}

type ExistingOverride = {
  photos?: EquipmentPhoto[] | null;
};

async function readCurrentPhotos(id: string): Promise<EquipmentPhoto[]> {
  const cfg = await getSiteConfigLive();
  const item = getEquipmentById(id, cfg);
  // item.photos is already the merged list -- use it as the base.
  return item ? [...item.photos] : [];
}

// POST: upload a single file -> push to Supabase Storage -> append to overrides.photos.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  await requireAdminRole();
  const cfg = await getSiteConfigLive();
  const item = getEquipmentById(params.id, cfg);
  if (!item) return NextResponse.json({ error: 'Unknown equipment id' }, { status: 404 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 });
  const file = form.get('file');
  const altField = form.get('alt');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file field' }, { status: 400 });
  }
  if (file.size === 0) return NextResponse.json({ error: 'File is empty' }, { status: 400 });
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: `File too large (max ${MAX_BYTES / 1024 / 1024}MB)` }, { status: 413 });
  }
  const mime = file.type || 'application/octet-stream';
  if (!ALLOWED_MIME.has(mime)) {
    return NextResponse.json({ error: `Unsupported type ${mime}` }, { status: 415 });
  }

  const buf = Buffer.from(await file.arrayBuffer());

  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim().replace(/^"|"$|^'|'$/g, '');
  const key = (process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim().replace(/^"|"$|^'|'$/g, '');
  if (!url || !key) return NextResponse.json({ error: 'Storage not configured' }, { status: 500 });

  const ts = Date.now();
  const baseName = slugifyFilename(file.name.replace(/\.[^.]+$/, '')) || 'photo';
  const ext = extForMime(mime);
  const path = `${item.id}/${ts}-${baseName}.${ext}`;

  const uploadRes = await fetch(`${url}/storage/v1/object/${BUCKET}/${path}`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': mime,
      'x-upsert': 'false',
      'cache-control': '3600',
    },
    body: buf,
  });
  if (!uploadRes.ok) {
    const text = await uploadRes.text().catch(() => '');
    return NextResponse.json(
      { error: `Upload failed (${uploadRes.status}): ${text.slice(0, 200)}` },
      { status: 500 },
    );
  }

  const publicUrl = `${url}/storage/v1/object/public/${BUCKET}/${path}`;
  const alt = (typeof altField === 'string' && altField.trim().length > 0 ? altField.trim() : `${item.shortName} photo`);
  const newPhoto: EquipmentPhoto = { src: publicUrl, alt };

  const nextPhotos = [...(await readCurrentPhotos(item.id)), newPhoto];

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
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, photo: newPhoto });
}

// PATCH: edit alt text for an existing photo (keyed by src).
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  await requireAdminRole();
  const cfg = await getSiteConfigLive();
  const item = getEquipmentById(params.id, cfg);
  if (!item) return NextResponse.json({ error: 'Unknown equipment id' }, { status: 404 });

  let body: { src?: string; alt?: string } = {};
  try {
    body = (await req.json()) as { src?: string; alt?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const src = String(body.src || '');
  const alt = String(body.alt || '').trim();
  if (!src) return NextResponse.json({ error: 'src required' }, { status: 400 });

  const current = await readCurrentPhotos(item.id);
  const next = current.map((p) => (p.src === src ? { ...p, alt } : p));

  const svc = createServiceClient();
  const { error } = await svc
    .from('equipment_overrides')
    .upsert(
      {
        equipment_id: item.id,
        photos: next,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'equipment_id' },
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
