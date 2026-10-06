// POST /api/admin/orders/[id]/deny — set status=denied, email customer.

import { NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/require-role';
import { createServiceClient } from '@/lib/supabase/service';
import { sendEmail } from '@/lib/email-send';
import { buildDenialEmail, DEFAULT_BRAND, type OrderForEmail } from '@/lib/order-emails';
import { getSiteConfig } from '@/lib/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  await requireAdminRole();
  const svc = createServiceClient();

  const { data: orderRow, error: orderErr } = await svc
    .from('orders')
    .select('*')
    .eq('id', params.id)
    .maybeSingle();
  if (orderErr) return NextResponse.json({ error: orderErr.message }, { status: 500 });
  if (!orderRow) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

  const { error: updErr } = await svc.from('orders').update({ status: 'denied' }).eq('id', params.id);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  const cfg = getSiteConfig();
  const siteUrl = cfg.business?.siteUrl || '';
  const shortDomain = siteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '') || DEFAULT_BRAND.shortDomain;
  const brand = {
    businessName: cfg.business?.name || DEFAULT_BRAND.businessName,
    shortDomain,
    supportEmail: cfg.business?.email || DEFAULT_BRAND.supportEmail,
  };

  const order: OrderForEmail = {
    id: orderRow.id,
    customer_name: orderRow.customer_name,
    customer_email: orderRow.customer_email,
    delivery_address: orderRow.delivery_address,
    delivery_city: orderRow.delivery_city,
    rental_subtotal_cents: orderRow.rental_subtotal_cents,
    buy_subtotal_cents: orderRow.buy_subtotal_cents,
    delivery_price_cents: orderRow.delivery_price_cents,
    deposit_total_cents: orderRow.deposit_total_cents,
    grand_total_cents: orderRow.grand_total_cents,
    notes: orderRow.notes,
  };
  const email = buildDenialEmail(order, brand);
  const adminToRaw = (process.env.LEAD_INBOX_EMAIL ?? '').trim();
  const adminTo = (
    adminToRaw.replace(/^['"]+/, '').replace(/['"]+$/, '').trim()
  ) || brand.supportEmail;
  const errs: string[] = [];
  try {
    const r = await sendEmail({
      to: order.customer_email,
      replyTo: adminTo,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });
    if (!r.ok) errs.push(r.error ?? 'unknown');
  } catch (err) {
    errs.push(err instanceof Error ? err.message : String(err));
  }

  return NextResponse.json({ ok: true, status: 'denied', email_errors: errs.length ? errs : undefined });
}
