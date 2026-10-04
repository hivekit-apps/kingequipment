import type { Booking, Equipment } from './booking-db';
import type { Invoice, InvoiceMath } from './invoice';
import { formatCurrency } from './invoice';
import type { KirilSettings } from './settings';

interface EmailPayload {
  subject: string;
  html: string;
  text: string;
}

function line(label: string, value: string): string {
  return `<tr><td style="padding:6px 0;color:#4b5563;font-size:14px">${label}</td><td style="padding:6px 0;text-align:right;color:#111827;font-weight:500;font-size:14px">${value}</td></tr>`;
}

function money(cents: number, currency = 'CAD') {
  return formatCurrency(cents, currency);
}

/**
 * Booking-received confirmation email to the customer.
 */
export function bookingReceivedEmail(
  booking: Booking,
  equipment: Equipment,
  math: InvoiceMath,
): EmailPayload {
  const subject = `We got your rental request — ${equipment.short_name}, ${booking.start_date} to ${booking.end_date}`;
  const html = `
  <div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111827">
    <p style="font-size:20px;font-weight:700;margin:0 0 8px 0">Thanks, ${escapeHtml(booking.customer_name.split(' ')[0])}.</p>
    <p style="font-size:15px;line-height:1.55;color:#374151;margin:0 0 20px 0">We&rsquo;ve received your request for the <strong>${escapeHtml(equipment.name)}</strong> from <strong>${booking.start_date}</strong> to <strong>${booking.end_date}</strong>. Our team will confirm availability and reply within a few hours during business hours.</p>
    <table style="width:100%;border-collapse:collapse;margin:0 0 20px 0">
      ${line('Rental (' + math.rental_days + ' day' + (math.rental_days !== 1 ? 's' : '') + ', ' + math.rental_tier + ')', money(math.rental_subtotal_cents))}
      ${booking.operator ? line('Operator', money(math.operator_subtotal_cents)) : ''}
      ${line('Delivery — ' + zoneLabel(booking.delivery_zone), money(math.delivery_subtotal_cents))}
      ${line('HST (13%)', money(math.tax_cents))}
      <tr><td colspan="2" style="border-top:1px solid #e5e7eb;padding-top:8px"></td></tr>
      ${line('Estimated total', money(math.total_cents))}
      ${line('Deposit (20%) — payable on confirmation', money(math.deposit_cents))}
      ${line('Balance — invoiced morning of delivery', money(math.balance_cents))}
    </table>
    <p style="font-size:14px;color:#4b5563;line-height:1.55;margin:0 0 16px 0">If you have questions before we get back to you, just reply to this email.</p>
    <p style="font-size:13px;color:#6b7280;margin:24px 0 0 0">King Equipment Rental &mdash; owner-operated &mdash; Ontario, Canada</p>
  </div>`;
  const text = plainVersion([
    `Hi ${booking.customer_name.split(' ')[0]},`,
    ``,
    `Thanks for your rental request:`,
    `  Equipment: ${equipment.name}`,
    `  Dates:     ${booking.start_date} to ${booking.end_date} (${math.rental_days} day${math.rental_days !== 1 ? 's' : ''})`,
    `  Delivery:  ${zoneLabel(booking.delivery_zone)}`,
    ``,
    `Estimated total: ${money(math.total_cents)}`,
    `Deposit (20%): ${money(math.deposit_cents)} — payable on confirmation`,
    `Balance:       ${money(math.balance_cents)} — invoiced morning of delivery`,
    ``,
    `We'll reply within a few hours during business hours.`,
    ``,
    `King Equipment Rental`,
  ]);
  return { subject, html, text };
}

/**
 * Deposit invoice to the customer (sent on booking CONFIRM by admin).
 */
export function depositInvoiceEmail(
  booking: Booking,
  equipment: Equipment,
  invoice: Invoice,
  math: InvoiceMath,
  settings: KirilSettings,
  opts?: { paymentLinkUrl?: string | null; discountApplied?: boolean },
): EmailPayload {
  const subject = `Your rental is confirmed — ${equipment.short_name}, ${booking.start_date}. Deposit invoice enclosed.`;
  const payLinkBlock = opts?.paymentLinkUrl
    ? `<p style="margin:0 0 12px 0"><a href="${opts.paymentLinkUrl}" style="display:inline-block;background:#c2410c;color:#fff;font-weight:700;font-size:15px;padding:12px 24px;border-radius:8px;text-decoration:none">Pay ${money(invoice.total_cents)} deposit by card &rarr;</a></p>`
    : `<p style="font-size:14px;color:#4b5563;margin:0 0 12px 0"><em>Card payment link coming shortly.</em></p>`;

  const html = `
  <div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111827">
    <p style="font-size:20px;font-weight:700;margin:0 0 4px 0">Your rental is confirmed.</p>
    <p style="font-size:15px;line-height:1.55;color:#374151;margin:0 0 20px 0">${escapeHtml(equipment.name)}, <strong>${booking.start_date}</strong> to <strong>${booking.end_date}</strong>${booking.operator ? ' (with operator)' : ''}.</p>

    <div style="background:#fff7ed;border-left:3px solid #c2410c;padding:16px;border-radius:6px;margin:0 0 20px 0">
      <p style="font-size:14px;font-weight:600;color:#7c2d12;margin:0 0 4px 0">Deposit due to lock in the dates</p>
      <p style="font-size:28px;font-weight:700;color:#111827;margin:0">${money(invoice.total_cents)}</p>
      ${opts?.discountApplied ? '<p style="font-size:12px;color:#166534;margin:6px 0 0 0">Google-review 5% discount applied.</p>' : ''}
    </div>

    <p style="font-size:15px;font-weight:600;margin:20px 0 8px 0">Two ways to pay:</p>

    <div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:0 0 12px 0">
      <p style="font-size:14px;font-weight:600;color:#111827;margin:0 0 8px 0">Card (Stripe)</p>
      ${payLinkBlock}
    </div>

    <div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:0 0 20px 0">
      <p style="font-size:14px;font-weight:600;color:#111827;margin:0 0 8px 0">Interac e-Transfer</p>
      <p style="font-size:14px;color:#4b5563;margin:0 0 6px 0">Send <strong>${money(invoice.total_cents)}</strong> to:</p>
      <p style="font-size:15px;font-weight:700;color:#111827;margin:0 0 6px 0">${escapeHtml(settings.etransfer_recipient_email)}</p>
      <p style="font-size:13px;color:#6b7280;margin:0">Include <strong>#${invoice.id.slice(0, 8)}</strong> in the message so we match it to your booking.</p>
    </div>

    <p style="font-size:14px;color:#4b5563;line-height:1.55;margin:20px 0 0 0">The balance (<strong>${money(math.balance_cents)}</strong>) is invoiced the morning of delivery. Reply to this email if you have questions.</p>
    <p style="font-size:13px;color:#6b7280;margin:24px 0 0 0">King Equipment Rental</p>
  </div>`;

  const text = plainVersion([
    `Your rental is confirmed.`,
    `  ${equipment.name}, ${booking.start_date} to ${booking.end_date}${booking.operator ? ' (with operator)' : ''}`,
    ``,
    `Deposit due: ${money(invoice.total_cents)}`,
    ``,
    `Two ways to pay:`,
    ``,
    `  Card (Stripe):`,
    opts?.paymentLinkUrl ? `    ${opts.paymentLinkUrl}` : `    (Payment link coming shortly.)`,
    ``,
    `  Interac e-Transfer:`,
    `    Send ${money(invoice.total_cents)} to ${settings.etransfer_recipient_email}`,
    `    Include #${invoice.id.slice(0, 8)} in the message.`,
    ``,
    `Balance ${money(math.balance_cents)} is invoiced the morning of delivery.`,
    ``,
    `King Equipment Rental`,
  ]);
  return { subject, html, text };
}

export function balanceInvoiceEmail(
  booking: Booking,
  equipment: Equipment,
  invoice: Invoice,
  settings: KirilSettings,
  opts?: { paymentLinkUrl?: string | null },
): EmailPayload {
  const subject = `Balance due today — ${equipment.short_name} delivery, ${booking.start_date}`;
  const payLinkBlock = opts?.paymentLinkUrl
    ? `<p style="margin:0 0 12px 0"><a href="${opts.paymentLinkUrl}" style="display:inline-block;background:#c2410c;color:#fff;font-weight:700;font-size:15px;padding:12px 24px;border-radius:8px;text-decoration:none">Pay ${money(invoice.total_cents)} balance by card &rarr;</a></p>`
    : `<p style="font-size:14px;color:#4b5563;margin:0 0 12px 0"><em>Card payment link coming shortly.</em></p>`;

  const html = `
  <div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111827">
    <p style="font-size:20px;font-weight:700;margin:0 0 4px 0">Delivery day — balance due</p>
    <p style="font-size:15px;line-height:1.55;color:#374151;margin:0 0 20px 0">Your <strong>${escapeHtml(equipment.name)}</strong> is scheduled for delivery today.</p>

    <div style="background:#fff7ed;border-left:3px solid #c2410c;padding:16px;border-radius:6px;margin:0 0 20px 0">
      <p style="font-size:14px;font-weight:600;color:#7c2d12;margin:0 0 4px 0">Balance due today</p>
      <p style="font-size:28px;font-weight:700;color:#111827;margin:0">${money(invoice.total_cents)}</p>
    </div>

    <div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:0 0 12px 0">
      <p style="font-size:14px;font-weight:600;color:#111827;margin:0 0 8px 0">Card (Stripe)</p>
      ${payLinkBlock}
    </div>

    <div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:0 0 20px 0">
      <p style="font-size:14px;font-weight:600;color:#111827;margin:0 0 8px 0">Interac e-Transfer</p>
      <p style="font-size:14px;color:#4b5563;margin:0 0 6px 0">Send <strong>${money(invoice.total_cents)}</strong> to:</p>
      <p style="font-size:15px;font-weight:700;color:#111827;margin:0 0 6px 0">${escapeHtml(settings.etransfer_recipient_email)}</p>
      <p style="font-size:13px;color:#6b7280;margin:0">Include <strong>#${invoice.id.slice(0, 8)}</strong> in the message.</p>
    </div>

    <p style="font-size:13px;color:#6b7280;margin:24px 0 0 0">King Equipment Rental</p>
  </div>`;

  const text = plainVersion([
    `Delivery day — balance due today: ${money(invoice.total_cents)}`,
    ``,
    `  ${equipment.name}, delivery ${booking.start_date}`,
    ``,
    `Two ways to pay:`,
    ``,
    `  Card (Stripe):`,
    opts?.paymentLinkUrl ? `    ${opts.paymentLinkUrl}` : `    (Payment link coming shortly.)`,
    ``,
    `  Interac e-Transfer:`,
    `    Send ${money(invoice.total_cents)} to ${settings.etransfer_recipient_email}`,
    `    Include #${invoice.id.slice(0, 8)} in the message.`,
    ``,
    `King Equipment Rental`,
  ]);
  return { subject, html, text };
}

export function bookingDeniedEmail(
  booking: Booking,
  equipment: Equipment,
  reason: string,
): EmailPayload {
  const subject = `Unable to fulfill your ${equipment.short_name} rental for ${booking.start_date}`;
  const html = `
  <div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111827">
    <p style="font-size:18px;font-weight:700;margin:0 0 8px 0">Hi ${escapeHtml(booking.customer_name.split(' ')[0])},</p>
    <p style="font-size:15px;line-height:1.55;color:#374151;margin:0 0 12px 0">Unfortunately we&rsquo;re unable to fulfill your rental request for the ${escapeHtml(equipment.name)} on ${booking.start_date}${booking.end_date !== booking.start_date ? ' – ' + booking.end_date : ''}.</p>
    ${reason ? '<p style="font-size:14px;color:#4b5563;line-height:1.55;margin:0 0 12px 0"><strong>Reason:</strong> ' + escapeHtml(reason) + '</p>' : ''}
    <p style="font-size:15px;line-height:1.55;color:#374151;margin:0 0 12px 0">If you&rsquo;d like to try different dates, just reply to this email.</p>
    <p style="font-size:13px;color:#6b7280;margin:24px 0 0 0">King Equipment Rental</p>
  </div>`;
  const text = plainVersion([
    `Hi ${booking.customer_name.split(' ')[0]},`,
    ``,
    `Unfortunately we're unable to fulfill your rental request for the ${equipment.name} on ${booking.start_date}${booking.end_date !== booking.start_date ? ' – ' + booking.end_date : ''}.`,
    ``,
    reason ? `Reason: ${reason}` : ``,
    ``,
    `If you'd like to try different dates, reply to this email.`,
    ``,
    `King Equipment Rental`,
  ]);
  return { subject, html, text };
}

function zoneLabel(z: string): string {
  return z === 'king-township' ? 'King Township (free)' : z === 'gta' ? 'GTA flat-rate' : 'Southern Ontario (quoted)';
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c);
}

function plainVersion(lines: string[]): string {
  return lines.filter((l) => l !== undefined).join('\n');
}
