import {
  confirmBooking as dbConfirm,
  denyBooking as dbDeny,
  getBooking,
  getEquipmentBySlug,
  type Booking,
  type Equipment,
} from './booking-db';
import { createServiceClient } from './supabase/service';
import { computeInvoiceMath, createInvoice, findBookingInvoicesByKind, type Invoice, type InvoiceMath } from './invoice';
import { loadSettings } from './settings';
import { depositInvoiceEmail, balanceInvoiceEmail, bookingDeniedEmail } from './email-templates';
import { sendEmail } from './email-send';
import { createCheckoutSession, stripeConfigured } from './stripe';

async function getEquipmentById(id: string): Promise<Equipment | null> {
  const svc = createServiceClient();
  const { data, error } = await svc.from('kiril_equipment').select('*').eq('id', id).maybeSingle();
  if (error || !data) return null;
  return data as Equipment;
}

interface ConfirmOptions {
  confirmed_by: string; // email of confirming admin
  apply_google_review_discount?: boolean;
  origin: string; // e.g. https://kiril-skidsteer.vercel.app
}

interface ConfirmResult {
  ok: boolean;
  booking?: Booking;
  invoice?: Invoice;
  math?: InvoiceMath;
  payment_link?: string | null;
  email_message_id?: string;
  errors?: string[];
}

/**
 * Full confirm flow: DB confirm + availability rows + deposit invoice +
 * (best-effort) Stripe payment link + customer email.
 */
export async function fullConfirmBooking(bookingId: string, opts: ConfirmOptions): Promise<ConfirmResult> {
  const errors: string[] = [];
  const booking = await dbConfirm(bookingId, opts.confirmed_by);
  if (!booking) return { ok: false, errors: ['confirmBooking failed or booking not found'] };
  const equipment = await getEquipmentById(booking.equipment_id);
  if (!equipment) return { ok: false, booking, errors: ['equipment not found'] };
  const settings = await loadSettings();
  const math = computeInvoiceMath(booking, equipment, settings, {
    applyGoogleReviewDiscount: opts.apply_google_review_discount === true,
  });

  // Guard against double-issuing on re-confirm/re-run.
  const existingDeposits = await findBookingInvoicesByKind(booking.id, 'deposit');
  let invoice: Invoice | null = existingDeposits[0] ?? null;
  if (!invoice) {
    invoice = await createInvoice(booking.id, 'deposit', math.deposit_cents, math, {
      memo: `Deposit for ${equipment.short_name} rental ${booking.start_date} to ${booking.end_date}`,
      discount_cents: opts.apply_google_review_discount === true ? math.discount_cents : 0,
    });
  }
  if (!invoice) return { ok: false, booking, math, errors: ['invoice creation failed'] };

  let paymentLink: string | null = null;
  if (stripeConfigured().ok) {
    const stripe = await createCheckoutSession({
      amount_cents: invoice.total_cents,
      invoice_id: invoice.id,
      booking_id: booking.id,
      customer_email: booking.customer_email,
      description: `Deposit — ${equipment.short_name} rental ${booking.start_date} to ${booking.end_date}`,
      success_url: `${opts.origin}/pay/success?invoice=${invoice.id}`,
      cancel_url: `${opts.origin}/pay/cancel?invoice=${invoice.id}`,
    });
    if (stripe.ok && stripe.url) {
      paymentLink = stripe.url;
      const svc = createServiceClient();
      await svc.from('kiril_invoices').update({
        stripe_checkout_session_id: stripe.sessionId,
        stripe_payment_link_url: stripe.url,
        updated_at: new Date().toISOString(),
      }).eq('id', invoice.id);
      invoice.stripe_checkout_session_id = stripe.sessionId ?? null;
      invoice.stripe_payment_link_url = stripe.url;
    } else if (stripe.error) {
      errors.push(`stripe: ${stripe.error}`);
    }
  }

  const emailTmpl = depositInvoiceEmail(booking, equipment, invoice, math, settings, {
    paymentLinkUrl: paymentLink,
    discountApplied: opts.apply_google_review_discount === true,
  });
  const sendResult = await sendEmail({
    to: booking.customer_email,
    replyTo: process.env.LEAD_INBOX_EMAIL || settings.etransfer_recipient_email,
    subject: emailTmpl.subject,
    html: emailTmpl.html,
    text: emailTmpl.text,
  });
  if (sendResult.ok && sendResult.messageId) {
    const svc = createServiceClient();
    await svc.from('kiril_invoices').update({
      emailed_at: new Date().toISOString(),
      email_message_id: sendResult.messageId,
      updated_at: new Date().toISOString(),
    }).eq('id', invoice.id);
  } else if (sendResult.error) {
    errors.push(`email: ${sendResult.error}`);
  }

  return {
    ok: errors.length === 0,
    booking,
    invoice,
    math,
    payment_link: paymentLink,
    email_message_id: sendResult.messageId,
    errors: errors.length > 0 ? errors : undefined,
  };
}

interface DenyOptions {
  denied_by: string;
  reason: string;
}

export async function fullDenyBooking(bookingId: string, opts: DenyOptions) {
  const booking = await dbDeny(bookingId, opts.denied_by, opts.reason);
  if (!booking) return { ok: false, errors: ['denyBooking failed'] };
  const equipment = await getEquipmentById(booking.equipment_id);
  if (equipment) {
    const emailTmpl = bookingDeniedEmail(booking, equipment, opts.reason);
    await sendEmail({
      to: booking.customer_email,
      subject: emailTmpl.subject,
      html: emailTmpl.html,
      text: emailTmpl.text,
    });
  }
  return { ok: true, booking };
}

interface BalanceOpts {
  origin: string;
  apply_google_review_discount?: boolean;
}

/**
 * Fire the balance invoice for a confirmed booking (called by morning-of-delivery cron).
 * Idempotent — skips if a balance invoice already exists.
 */
export async function fireBalanceInvoice(bookingId: string, opts: BalanceOpts) {
  const booking = await getBooking(bookingId);
  if (!booking) return { ok: false, error: 'booking not found' };
  if (booking.status !== 'confirmed') return { ok: false, error: `booking status is ${booking.status}` };
  const equipment = await getEquipmentById(booking.equipment_id);
  if (!equipment) return { ok: false, error: 'equipment not found' };
  const settings = await loadSettings();
  const math = computeInvoiceMath(booking, equipment, settings, {
    applyGoogleReviewDiscount: opts.apply_google_review_discount === true,
  });

  const existing = await findBookingInvoicesByKind(booking.id, 'balance');
  if (existing.length > 0) return { ok: true, skipped: true, invoice: existing[0] };

  const invoice = await createInvoice(booking.id, 'balance', math.balance_cents, math, {
    memo: `Balance for ${equipment.short_name} rental, delivery ${booking.start_date}`,
  });
  if (!invoice) return { ok: false, error: 'balance invoice creation failed' };

  let paymentLink: string | null = null;
  if (stripeConfigured().ok) {
    const stripe = await createCheckoutSession({
      amount_cents: invoice.total_cents,
      invoice_id: invoice.id,
      booking_id: booking.id,
      customer_email: booking.customer_email,
      description: `Balance — ${equipment.short_name} rental ${booking.start_date} to ${booking.end_date}`,
      success_url: `${opts.origin}/pay/success?invoice=${invoice.id}`,
      cancel_url: `${opts.origin}/pay/cancel?invoice=${invoice.id}`,
    });
    if (stripe.ok && stripe.url) {
      paymentLink = stripe.url;
      const svc = createServiceClient();
      await svc.from('kiril_invoices').update({
        stripe_checkout_session_id: stripe.sessionId,
        stripe_payment_link_url: stripe.url,
        updated_at: new Date().toISOString(),
      }).eq('id', invoice.id);
    }
  }

  const emailTmpl = balanceInvoiceEmail(booking, equipment, invoice, settings, {
    paymentLinkUrl: paymentLink,
  });
  const sendResult = await sendEmail({
    to: booking.customer_email,
    replyTo: process.env.LEAD_INBOX_EMAIL || settings.etransfer_recipient_email,
    subject: emailTmpl.subject,
    html: emailTmpl.html,
    text: emailTmpl.text,
  });
  if (sendResult.ok && sendResult.messageId) {
    const svc = createServiceClient();
    await svc.from('kiril_invoices').update({
      emailed_at: new Date().toISOString(),
      email_message_id: sendResult.messageId,
      updated_at: new Date().toISOString(),
    }).eq('id', invoice.id);
  }

  return { ok: true, invoice, payment_link: paymentLink };
}

export { getEquipmentById };
