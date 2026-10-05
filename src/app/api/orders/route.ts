import { NextResponse, type NextRequest } from 'next/server';
import { getSiteConfigDynamic } from '@/lib/config';
import { calculateRentalPrice, calculateBuyPrice, daysBetween } from '@/lib/pricing';
import { createServiceClient } from '@/lib/supabase/service';
import { sendEmail } from '@/lib/email-send';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RawItem = {
  equipmentId?: unknown;
  kind?: unknown;
  qty?: unknown;
  startDate?: unknown;
  endDate?: unknown;
  buyCondition?: unknown;
};

type Payload = {
  customer_name?: unknown;
  customer_email?: unknown;
  customer_phone?: unknown;
  delivery_address?: unknown;
  delivery_city?: unknown;
  notes?: unknown;
  items?: unknown;
};

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const ipHits = new Map<string, { count: number; resetAt: number }>();

function rateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipHits.get(ip);
  if (!entry || entry.resetAt < now) {
    ipHits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count += 1;
  return true;
}

function asString(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

function asNumber(v: unknown, fallback = 0): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function money(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-CA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export async function POST(req: NextRequest) {
  const cfg = await getSiteConfigDynamic();
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';
  if (!rateLimit(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  let body: Payload;
  try {
    body = (await req.json()) as Payload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const name = asString(body.customer_name);
  const email = asString(body.customer_email);
  const phone = asString(body.customer_phone);
  const address = asString(body.delivery_address);
  const citySlug = asString(body.delivery_city);
  const notes = asString(body.notes);
  const rawItems = Array.isArray(body.items) ? (body.items as RawItem[]) : [];

  if (name.length < 2)
    return NextResponse.json({ error: 'Name is required.' }, { status: 422 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return NextResponse.json({ error: 'Valid email required.' }, { status: 422 });
  if (address.length < 5)
    return NextResponse.json({ error: 'Delivery address required.' }, { status: 422 });
  const city = cfg.cityPages.cities.find((c) => c.slug === citySlug);
  if (!city)
    return NextResponse.json({ error: 'Delivery city required.' }, { status: 422 });
  if (rawItems.length === 0)
    return NextResponse.json({ error: 'Cart is empty.' }, { status: 422 });

  // Build server-side pricing (never trust the client).
  type Line = {
    equipmentId: string;
    equipmentName: string;
    kind: 'rent' | 'buy';
    qty: number;
    startDate: string | null;
    endDate: string | null;
    days: number | null;
    appliedTier: string;
    unitSubtotalCents: number;
    depositCents: number;
  };
  const lines: Line[] = [];

  for (const raw of rawItems) {
    const equipmentId = asString(raw.equipmentId);
    const kind = asString(raw.kind);
    const qty = Math.max(1, Math.floor(asNumber(raw.qty, 1)));
    const item = cfg.equipment.find((e) => e.id === equipmentId);
    if (!item) continue;
    if (kind === 'rent') {
      if (!item.availability.includes('rent')) continue;
      const startDate = asString(raw.startDate);
      const endDate = asString(raw.endDate);
      const days = daysBetween(startDate, endDate);
      if (days <= 0) {
        return NextResponse.json(
          { error: `Invalid rental dates for ${item.shortName}.` },
          { status: 422 },
        );
      }
      const rp = calculateRentalPrice(item, days);
      lines.push({
        equipmentId: item.id,
        equipmentName: item.name,
        kind: 'rent',
        qty,
        startDate,
        endDate,
        days,
        appliedTier: rp.appliedTier,
        unitSubtotalCents: Math.round(rp.total * 100) * qty,
        depositCents: Math.round(item.pricing.deposit * 100) * qty,
      });
    } else if (kind === 'buy') {
      if (!item.availability.includes('buy')) continue;
      const cond = asString(raw.buyCondition) === 'used' ? 'used' : 'new';
      const bp = calculateBuyPrice(item, cond);
      if (bp.total <= 0) continue;
      lines.push({
        equipmentId: item.id,
        equipmentName: item.name,
        kind: 'buy',
        qty,
        startDate: null,
        endDate: null,
        days: null,
        appliedTier: bp.appliedTier,
        unitSubtotalCents: Math.round(bp.total * 100) * qty,
        depositCents: 0,
      });
    }
  }

  if (lines.length === 0) {
    return NextResponse.json(
      { error: 'No valid items in cart.' },
      { status: 422 },
    );
  }

  const rentalSubtotalCents = lines
    .filter((l) => l.kind === 'rent')
    .reduce((s, l) => s + l.unitSubtotalCents, 0);
  const buySubtotalCents = lines
    .filter((l) => l.kind === 'buy')
    .reduce((s, l) => s + l.unitSubtotalCents, 0);
  const deliveryPriceCents = Math.round(city.deliveryPrice * 100);
  const depositTotalCents = lines.reduce((s, l) => s + l.depositCents, 0);
  const grandTotalCents =
    rentalSubtotalCents + buySubtotalCents + deliveryPriceCents;

  // Insert order.
  const svc = createServiceClient();
  const { data: order, error: orderErr } = await svc
    .from('orders')
    .insert({
      customer_name: name,
      customer_email: email,
      customer_phone: phone || null,
      delivery_address: address,
      delivery_city: city.slug,
      delivery_price_cents: deliveryPriceCents,
      deposit_total_cents: depositTotalCents,
      rental_subtotal_cents: rentalSubtotalCents,
      buy_subtotal_cents: buySubtotalCents,
      grand_total_cents: grandTotalCents,
      notes: notes || null,
      status: 'pending',
    })
    .select('*')
    .single();
  if (orderErr || !order) {
    console.error('[orders] insert failed:', orderErr?.message);
    return NextResponse.json(
      { error: 'Could not create order. Please try again.' },
      { status: 500 },
    );
  }

  const orderItemsPayload = lines.map((l) => ({
    order_id: order.id,
    equipment_id: l.equipmentId,
    equipment_name: l.equipmentName,
    kind: l.kind,
    qty: l.qty,
    start_date: l.startDate,
    end_date: l.endDate,
    days: l.days,
    applied_tier: l.appliedTier,
    unit_subtotal_cents: l.unitSubtotalCents,
    deposit_cents: l.depositCents,
  }));
  const { error: itemsErr } = await svc.from('order_items').insert(orderItemsPayload);
  if (itemsErr) {
    console.error('[orders] order_items insert failed:', itemsErr.message);
    // Don't fail the whole response; order row exists.
  }

  // Fire-and-forget emails (best effort).
  const itemsBlock = lines
    .map(
      (l) =>
        `  - ${l.equipmentName} × ${l.qty} (${l.kind}${
          l.kind === 'rent' ? `, ${l.days}d, ${l.appliedTier}` : `, ${l.appliedTier}`
        }) = ${money(l.unitSubtotalCents)}`,
    )
    .join('\n');

  const adminText =
    `New ${cfg.business.name} order from ${name} <${email}>\n\n` +
    `Order ID: ${order.id}\n` +
    `Delivery: ${city.name} (${address})\n` +
    `Phone: ${phone || '-'}\n\n` +
    `=== Items ===\n${itemsBlock}\n\n` +
    `Rental subtotal: ${money(rentalSubtotalCents)}\n` +
    `Buy subtotal: ${money(buySubtotalCents)}\n` +
    `Delivery (${city.name}): ${money(deliveryPriceCents)}\n` +
    `Deposit (refundable, rentals): ${money(depositTotalCents)}\n` +
    `Grand total: ${money(grandTotalCents)}\n\n` +
    (notes ? `Notes: ${notes}\n\n` : '') +
    `Reply directly to the customer at ${email}.\n`;

  const customerHtml =
    `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111827">` +
    `<p style="font-size:20px;font-weight:700;margin:0 0 8px 0">Thanks, ${name.split(' ')[0]}.</p>` +
    `<p style="font-size:15px;line-height:1.55;color:#374151;margin:0 0 20px 0">We&rsquo;ve received your ${cfg.business.name} order. We&rsquo;ll confirm delivery and send e-Transfer instructions for the deposit + delivery within a few hours during business hours.</p>` +
    `<p style="font-size:14px;color:#4b5563;margin:0 0 4px 0"><strong>Order:</strong> #${order.id.slice(0, 8)}</p>` +
    `<p style="font-size:14px;color:#4b5563;margin:0 0 4px 0"><strong>Delivery to:</strong> ${city.name}</p>` +
    `<pre style="font-family:ui-monospace,SFMono-Regular,monospace;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:12px;font-size:12px;white-space:pre-wrap;margin:16px 0">${lines
      .map(
        (l) =>
          `${l.equipmentName} × ${l.qty} (${l.kind}${
            l.kind === 'rent' ? `, ${l.days}d` : ''
          }) — ${money(l.unitSubtotalCents)}`,
      )
      .join('\n')}\nDelivery: ${money(deliveryPriceCents)}\nGrand total: ${money(grandTotalCents)}\nRefundable deposit: ${money(depositTotalCents)}</pre>` +
    `<p style="font-size:13px;color:#6b7280;margin:24px 0 0 0">${cfg.business.name} &mdash; Ontario, Canada</p>` +
    `</div>`;

  const customerText =
    `Thanks, ${name.split(' ')[0]}.\n\n` +
    `We received your ${cfg.business.name} order #${order.id.slice(0, 8)}.\n` +
    `We'll confirm delivery and e-Transfer deposit instructions by email shortly.\n\n` +
    `=== Items ===\n${itemsBlock}\n\n` +
    `Delivery to ${city.name}: ${money(deliveryPriceCents)}\n` +
    `Grand total: ${money(grandTotalCents)}\n` +
    `Refundable deposit (rentals): ${money(depositTotalCents)}\n\n` +
    `${cfg.business.name}\n`;

  const adminTo = process.env.LEAD_INBOX_EMAIL || cfg.business.email;
  const adminCc = (process.env.LEAD_CC_EMAIL || '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  try {
    await sendEmail({
      to: adminTo,
      cc: adminCc,
      replyTo: email,
      subject: `[Order #${order.id.slice(0, 8)}] ${name} — ${city.name} — ${money(grandTotalCents)}`,
      html: `<pre style="font-family:ui-monospace,SFMono-Regular,monospace;font-size:12px">${adminText}</pre>`,
      text: adminText,
    });
    await sendEmail({
      to: email,
      replyTo: adminTo,
      subject: `We got your ${cfg.business.name} order #${order.id.slice(0, 8)}`,
      html: customerHtml,
      text: customerText,
    });
  } catch (err) {
    console.error('[orders] email send threw:', err instanceof Error ? err.message : String(err));
    // non-fatal
  }

  return NextResponse.json({
    ok: true,
    order_id: order.id,
    grand_total_cents: grandTotalCents,
  });
}
