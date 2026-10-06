// Order lifecycle emails — approval + denial.
//
// These are sent via Resend directly (see src/lib/email-send.ts). The templates
// mirror the branded look of the order-received email in src/app/api/orders/route.ts.

import { computeOrderPricing, formatMoneyCents } from './order-pricing';
import type { KirilSettings } from './settings';

export type OrderForEmail = {
  id: string;
  customer_name: string;
  customer_email: string;
  delivery_address: string;
  delivery_city: string;
  rental_subtotal_cents: number | null;
  buy_subtotal_cents: number | null;
  delivery_price_cents: number | null;
  deposit_total_cents: number | null;
  grand_total_cents: number | null;
  notes: string | null;
};

export type OrderItemForEmail = {
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

export type BrandConfig = {
  businessName: string; // "King Equipment Rental"
  shortDomain: string; // "kingequipment.ca"
  supportEmail: string; // reply-to for customer emails
};

export const DEFAULT_BRAND: BrandConfig = {
  businessName: 'King Equipment Rental',
  shortDomain: 'kingequipment.ca',
  supportEmail: 'kingequipmentrental.ca@gmail.com',
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function orderIdShort(id: string): string {
  return id.slice(0, 8);
}

function itemLineText(it: OrderItemForEmail): string {
  const dates =
    it.kind === 'rent' && it.start_date && it.end_date
      ? ` (${it.start_date} → ${it.end_date}${it.days ? `, ${it.days}d` : ''}${
          it.applied_tier ? `, ${it.applied_tier}` : ''
        })`
      : it.kind === 'buy'
        ? ` (${it.applied_tier || 'purchase'})`
        : '';
  return `${it.equipment_name} × ${it.qty}${dates} — ${formatMoneyCents(it.unit_subtotal_cents ?? 0)}`;
}

function buildItemsBlockHtml(items: OrderItemForEmail[]): string {
  return items
    .map((it) => `<li style="margin:4px 0">${escapeHtml(itemLineText(it))}</li>`)
    .join('\n');
}

function buildItemsBlockText(items: OrderItemForEmail[]): string {
  return items.map((it) => `  - ${itemLineText(it)}`).join('\n');
}

export function buildApprovalEmail(
  order: OrderForEmail,
  items: OrderItemForEmail[],
  settings: Pick<KirilSettings, 'deposit_pct' | 'etransfer_recipient_email'>,
  brand: BrandConfig = DEFAULT_BRAND,
): { subject: string; html: string; text: string; etransferRef: string } {
  const idShort = orderIdShort(order.id);
  const pricing = computeOrderPricing(order, settings);
  const etransferRef = `KE-${idShort}`;
  const etransferTo = settings.etransfer_recipient_email || brand.supportEmail;
  const subject = `Your ${brand.businessName} order is approved — ${idShort}`;

  const html =
    `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#111827">` +
    `<p style="font-size:22px;font-weight:700;margin:0 0 4px 0;color:#111827">Your order is approved.</p>` +
    `<p style="font-size:14px;color:#6b7280;margin:0 0 20px 0">Order #${escapeHtml(idShort)} · ${brand.businessName}</p>` +
    `<p style="font-size:15px;line-height:1.55;color:#374151;margin:0 0 16px 0">Hi ${escapeHtml(
      order.customer_name.split(' ')[0] || 'there',
    )}, we're confirming the order below. To lock in your booking, please send the deposit + delivery via Interac e-Transfer using the instructions at the bottom of this email.</p>` +
    `<h2 style="font-size:16px;color:#111827;margin:20px 0 8px 0">Items</h2>` +
    `<ul style="font-size:14px;color:#374151;padding-left:18px;margin:0 0 20px 0">${buildItemsBlockHtml(items)}</ul>` +
    `<h2 style="font-size:16px;color:#111827;margin:20px 0 8px 0">Delivery</h2>` +
    `<p style="font-size:14px;color:#374151;margin:0 0 20px 0">${escapeHtml(order.delivery_address)}, ${escapeHtml(
      order.delivery_city,
    )}</p>` +
    `<h2 style="font-size:16px;color:#111827;margin:20px 0 8px 0">Totals</h2>` +
    `<table style="width:100%;font-size:14px;color:#374151;margin:0 0 20px 0;border-collapse:collapse">` +
    `<tr><td style="padding:2px 0">Rental subtotal</td><td style="text-align:right">${formatMoneyCents(pricing.rental_subtotal_cents)}</td></tr>` +
    `<tr><td style="padding:2px 0">Buy subtotal</td><td style="text-align:right">${formatMoneyCents(pricing.buy_subtotal_cents)}</td></tr>` +
    `<tr><td style="padding:2px 0">Delivery</td><td style="text-align:right">${formatMoneyCents(pricing.delivery_price_cents)}</td></tr>` +
    `<tr><td style="padding:4px 0;border-top:1px solid #e5e7eb;font-weight:600">Order grand total</td><td style="text-align:right;padding-top:4px;border-top:1px solid #e5e7eb;font-weight:600">${formatMoneyCents(pricing.order_grand_total_cents)}</td></tr>` +
    `</table>` +
    `<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:16px;margin:20px 0">` +
    `<p style="font-size:15px;font-weight:600;color:#9a3412;margin:0 0 8px 0">Deposit &amp; delivery due to lock in your booking</p>` +
    `<table style="width:100%;font-size:14px;color:#374151;margin:0;border-collapse:collapse">` +
    `<tr><td style="padding:2px 0">Rental deposit (${(pricing.deposit_pct * 100).toFixed(0)}% of item deposits)</td><td style="text-align:right">${formatMoneyCents(pricing.rental_deposit_due_cents)}</td></tr>` +
    `<tr><td style="padding:2px 0">Purchases (full)</td><td style="text-align:right">${formatMoneyCents(pricing.buy_subtotal_cents)}</td></tr>` +
    `<tr><td style="padding:2px 0">Delivery</td><td style="text-align:right">${formatMoneyCents(pricing.delivery_price_cents)}</td></tr>` +
    `<tr><td style="padding:6px 0;border-top:1px solid #fed7aa;font-weight:700;color:#9a3412">Due now by e-Transfer</td><td style="text-align:right;padding-top:6px;border-top:1px solid #fed7aa;font-weight:700;color:#9a3412">${formatMoneyCents(pricing.grand_total_due_now_cents)}</td></tr>` +
    `</table>` +
    (pricing.remaining_rental_balance_cents > 0
      ? `<p style="font-size:13px;color:#6b7280;margin:12px 0 0 0">Remaining rental balance of ${formatMoneyCents(pricing.remaining_rental_balance_cents)} is due on delivery.</p>`
      : '') +
    `</div>` +
    `<h2 style="font-size:16px;color:#111827;margin:20px 0 8px 0">How to pay</h2>` +
    `<p style="font-size:14px;color:#374151;margin:0 0 6px 0">Interac e-Transfer to <strong>${escapeHtml(etransferTo)}</strong></p>` +
    `<p style="font-size:14px;color:#374151;margin:0 0 6px 0">Reference / message: <code style="background:#f3f4f6;padding:2px 6px;border-radius:4px">${escapeHtml(etransferRef)}</code></p>` +
    `<p style="font-size:13px;color:#6b7280;margin:16px 0 0 0">Reply to this email with questions. We'll confirm delivery once payment lands.</p>` +
    `<p style="font-size:13px;color:#9ca3af;margin:20px 0 0 0">${brand.businessName} &mdash; ${brand.shortDomain}</p>` +
    `</div>`;

  const text =
    `Your ${brand.businessName} order #${idShort} is approved.\n\n` +
    `Hi ${order.customer_name.split(' ')[0] || 'there'},\n\n` +
    `=== Items ===\n${buildItemsBlockText(items)}\n\n` +
    `Delivery: ${order.delivery_address}, ${order.delivery_city}\n\n` +
    `=== Totals ===\n` +
    `Rental subtotal: ${formatMoneyCents(pricing.rental_subtotal_cents)}\n` +
    `Buy subtotal:    ${formatMoneyCents(pricing.buy_subtotal_cents)}\n` +
    `Delivery:        ${formatMoneyCents(pricing.delivery_price_cents)}\n` +
    `Order total:     ${formatMoneyCents(pricing.order_grand_total_cents)}\n\n` +
    `=== Due now by e-Transfer ===\n` +
    `Rental deposit (${(pricing.deposit_pct * 100).toFixed(0)}% of item deposits): ${formatMoneyCents(pricing.rental_deposit_due_cents)}\n` +
    `Purchases (full):                                              ${formatMoneyCents(pricing.buy_subtotal_cents)}\n` +
    `Delivery:                                                      ${formatMoneyCents(pricing.delivery_price_cents)}\n` +
    `Due now:                                                       ${formatMoneyCents(pricing.grand_total_due_now_cents)}\n` +
    (pricing.remaining_rental_balance_cents > 0
      ? `\nRemaining rental balance due on delivery: ${formatMoneyCents(pricing.remaining_rental_balance_cents)}\n`
      : '') +
    `\n=== How to pay ===\n` +
    `Interac e-Transfer to: ${etransferTo}\n` +
    `Reference: ${etransferRef}\n\n` +
    `Reply to this email with questions. We'll confirm delivery once payment lands.\n\n` +
    `${brand.businessName} — ${brand.shortDomain}\n`;

  return { subject, html, text, etransferRef };
}

export function buildApprovalAdminNotify(
  order: OrderForEmail,
  items: OrderItemForEmail[],
  settings: Pick<KirilSettings, 'deposit_pct' | 'etransfer_recipient_email'>,
  brand: BrandConfig = DEFAULT_BRAND,
): { subject: string; html: string; text: string } {
  const idShort = orderIdShort(order.id);
  const pricing = computeOrderPricing(order, settings);
  const subject = `[APPROVED #${idShort}] ${order.customer_name} — ${order.delivery_city} — ${formatMoneyCents(
    pricing.grand_total_due_now_cents,
  )} due`;

  const text =
    `Order #${idShort} approved and customer notified.\n\n` +
    `Customer: ${order.customer_name} <${order.customer_email}>\n` +
    `Delivery: ${order.delivery_address}, ${order.delivery_city}\n\n` +
    `Items:\n${buildItemsBlockText(items)}\n\n` +
    `Due now by e-transfer: ${formatMoneyCents(pricing.grand_total_due_now_cents)}\n` +
    `  (rental deposit ${formatMoneyCents(pricing.rental_deposit_due_cents)} + buy ${formatMoneyCents(
      pricing.buy_subtotal_cents,
    )} + delivery ${formatMoneyCents(pricing.delivery_price_cents)})\n` +
    (pricing.remaining_rental_balance_cents > 0
      ? `Remaining rental balance on delivery: ${formatMoneyCents(pricing.remaining_rental_balance_cents)}\n`
      : '') +
    `\n${brand.businessName}\n`;

  const html = `<pre style="font-family:ui-monospace,SFMono-Regular,monospace;font-size:12px">${escapeHtml(text)}</pre>`;
  return { subject, html, text };
}

export function buildDenialEmail(
  order: OrderForEmail,
  brand: BrandConfig = DEFAULT_BRAND,
): { subject: string; html: string; text: string } {
  const idShort = orderIdShort(order.id);
  const subject = `About your ${brand.businessName} order #${idShort}`;
  const html =
    `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111827">` +
    `<p style="font-size:20px;font-weight:700;margin:0 0 8px 0">Hi ${escapeHtml(
      order.customer_name.split(' ')[0] || 'there',
    )},</p>` +
    `<p style="font-size:15px;line-height:1.6;color:#374151;margin:0 0 16px 0">Thanks for your interest in ${brand.businessName}. Unfortunately we can't fulfill order #${escapeHtml(
      idShort,
    )} at this time.</p>` +
    `<p style="font-size:15px;line-height:1.6;color:#374151;margin:0 0 16px 0">If you have questions or want to discuss alternative dates/equipment, reply to this email or reach us at ${escapeHtml(
      brand.supportEmail,
    )}.</p>` +
    `<p style="font-size:13px;color:#9ca3af;margin:20px 0 0 0">${brand.businessName} &mdash; ${brand.shortDomain}</p>` +
    `</div>`;
  const text =
    `Hi ${order.customer_name.split(' ')[0] || 'there'},\n\n` +
    `Thanks for your interest in ${brand.businessName}. Unfortunately we can't fulfill order #${idShort} at this time.\n\n` +
    `If you have questions or want to discuss alternative dates/equipment, reply to this email or reach us at ${brand.supportEmail}.\n\n` +
    `${brand.businessName} — ${brand.shortDomain}\n`;
  return { subject, html, text };
}
