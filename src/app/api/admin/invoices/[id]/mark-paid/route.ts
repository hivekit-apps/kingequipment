export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/require-role';
import { markInvoicePaid } from '@/lib/invoice';

// POST /api/admin/invoices/{id}/mark-paid  body: { method, reference }
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  await requireAdmin();
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    /* empty ok */
  }
  const method = typeof body.method === 'string' ? body.method : 'manual';
  const reference = typeof body.reference === 'string' ? body.reference : undefined;
  const allowed = ['stripe', 'e-transfer', 'manual', 'other'];
  if (!allowed.includes(method)) {
    return NextResponse.json({ error: `method must be one of ${allowed.join(', ')}` }, { status: 422 });
  }
  const paid = await markInvoicePaid(params.id, method as 'stripe' | 'e-transfer' | 'manual' | 'other', reference);
  if (!paid) return NextResponse.json({ error: 'invoice not found or update failed' }, { status: 404 });
  return NextResponse.json({ ok: true, invoice_id: paid.id, status: paid.status });
}
