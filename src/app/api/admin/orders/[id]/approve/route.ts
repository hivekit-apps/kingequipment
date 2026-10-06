// POST /api/admin/orders/[id]/approve
//
// Marks an order as confirmed, computes the deposit/delivery payment ask using
// kiril_settings.deposit_pct, and sends:
//   (a) a branded approval email to the customer with e-Transfer instructions
//   (b) a short internal notify to the LEAD_INBOX_EMAIL
//
// Admin-only (requireAdminRole). Idempotent-ish: if the order is already
// confirmed, re-sending is allowed (operator may need to resend the email).

import { NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/require-role';
import { createServiceClient } from '@/lib/supabase/service';
import { loadSettings } from '@/lib/settings';
import { sendEmail } from '@/lib/email-send';
import {
  buildApprovalEmail,
  buildApprovalAdminNotify,
  type OrderForEmail,
  type OrderItemForEmail,
  DEFAULT_BRAND,
} from '@/lib/order-emails';
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

  const { data: items, error: itemsErr } = await svc
    .from('order_items')
    .select('*')
    .eq('order_id', params.id);
  if (itemsErr) return NextResponse.json({ error: itemsErr.message }, { status: 500 });

  // Flip status to confirmed.
  const { error: updErr } = await svc
    .from('orders')
    .update({ status: 'confirmed' })
    .eq('id', params.id);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  // Build and send emails.
  const settings = await loadSettings();
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
  type RawItem = {
    equipment_name: string;
    kind: string;
    qty: number;
    start_date: string | null;
    end_date: string | null;
    days: number | null;
    applied_tier: string | null;
    unit_subtotal_cents: number | null;
    deposit_cents: number | null;
  };
  const itemList: OrderItemForEmail[] = ((items ?? []) as RawItem[]).map((it) => ({
    equipment_name: it.equipment_name,
    kind: it.kind,
    qty: it.qty,
    start_date: it.start_date,
    end_date: it.end_date,
    days: it.days,
    applied_tier: it.applied_tier,
    unit_subtotal_cents: it.unit_subtotal_cents,
    deposit_cents: it.deposit_cents,
  }));

  const customerEmail = buildApprovalEmail(order, itemList, settings, brand);
  const adminNotify = buildApprovalAdminNotify(order, itemList, settings, brand);

  const adminTo = process.env.LEAD_INBOX_EMAIL || brand.supportEmail;
  const emailErrors: string[] = [];

  try {
    const r = await sendEmail({
      to: order.customer_email,
      replyTo: adminTo,
      subject: customerEmail.subject,
      html: customerEmail.html,
      text: customerEmail.text,
    });
    if (!r.ok) emailErrors.push(`customer: ${r.error ?? 'unknown'}`);
  } catch (err) {
    emailErrors.push(`customer threw: ${err instanceof Error ? err.message : String(err)}`);
  }

  try {
    const r = await sendEmail({
      to: adminTo,
      replyTo: order.customer_email,
      subject: adminNotify.subject,
      html: adminNotify.html,
      text: adminNotify.text,
    });
    if (!r.ok) emailErrors.push(`admin: ${r.error ?? 'unknown'}`);
  } catch (err) {
    emailErrors.push(`admin threw: ${err instanceof Error ? err.message : String(err)}`);
  }

  return NextResponse.json({
    ok: true,
    status: 'confirmed',
    etransfer_ref: customerEmail.etransferRef,
    email_errors: emailErrors.length > 0 ? emailErrors : undefined,
  });
}
