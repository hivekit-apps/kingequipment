export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/require-role';
import { loadSettings, setSetting } from '@/lib/settings';

export async function GET() {
  await requireAdminRole();
  const s = await loadSettings();
  return NextResponse.json(s);
}

export async function PATCH(req: NextRequest) {
  await requireAdminRole();
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }
  const key = typeof body.key === 'string' ? body.key : '';
  const value = body.value;
  if (!key) return NextResponse.json({ error: 'key required' }, { status: 422 });
  await setSetting(key, value);
  return NextResponse.json({ ok: true });
}
