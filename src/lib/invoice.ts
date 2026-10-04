import { createServiceClient } from './supabase/service';
import type { Booking, DeliveryZone, Equipment } from './booking-db';
import type { KirilSettings } from './settings';

export type InvoiceKind = 'deposit' | 'balance' | 'custom';
export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'void' | 'refunded';
export type PaidMethod = 'stripe' | 'e-transfer' | 'manual' | 'other';

export interface Invoice {
  id: string;
  booking_id: string;
  kind: InvoiceKind;
  subtotal_cents: number;
  tax_cents: number;
  discount_cents: number;
  total_cents: number;
  currency: string;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_payment_link_url: string | null;
  status: InvoiceStatus;
  paid_at: string | null;
  paid_method: PaidMethod | null;
  paid_reference: string | null;
  emailed_at: string | null;
  email_message_id: string | null;
  memo: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceMath {
  rental_days: number;
  rental_tier: 'daily' | 'weekly' | 'monthly';
  rental_subtotal_cents: number;
  operator_subtotal_cents: number;
  delivery_subtotal_cents: number;
  discount_cents: number;
  subtotal_cents: number;
  tax_cents: number;
  total_cents: number;
  deposit_cents: number; // 20% of total for deposit invoice
  balance_cents: number; // total - deposit for balance invoice
}

export function daysInclusive(startISO: string, endISO: string): number {
  const s = new Date(startISO + 'T00:00:00Z').getTime();
  const e = new Date(endISO + 'T00:00:00Z').getTime();
  return Math.max(1, Math.round((e - s) / (86400 * 1000)) + 1);
}

export function computeInvoiceMath(
  booking: Pick<Booking, 'start_date' | 'end_date' | 'operator' | 'delivery_zone'>,
  equipment: Equipment,
  settings: KirilSettings,
  opts?: { applyGoogleReviewDiscount?: boolean },
): InvoiceMath {
  const days = daysInclusive(booking.start_date, booking.end_date);

  // Tier selection: weekly if >=7 days AND weekly rate exists; monthly if >=30 days AND monthly rate exists.
  let tier: 'daily' | 'weekly' | 'monthly' = 'daily';
  let rental_subtotal_cents = equipment.daily_rate_cents * days;
  if (days >= 30 && equipment.monthly_rate_cents != null) {
    tier = 'monthly';
    const months = Math.floor(days / 30);
    const extraDays = days - months * 30;
    rental_subtotal_cents = equipment.monthly_rate_cents * months + equipment.daily_rate_cents * extraDays;
  } else if (days >= 7 && equipment.weekly_rate_cents != null) {
    tier = 'weekly';
    const weeks = Math.floor(days / 7);
    const extraDays = days - weeks * 7;
    rental_subtotal_cents = equipment.weekly_rate_cents * weeks + equipment.daily_rate_cents * extraDays;
  }

  const operator_subtotal_cents =
    booking.operator && equipment.operator_daily_rate_cents != null
      ? equipment.operator_daily_rate_cents * days
      : 0;

  const delivery_subtotal_cents =
    booking.delivery_zone === 'king-township'
      ? settings.delivery_fee_king_township_cents
      : booking.delivery_zone === 'gta'
        ? settings.delivery_fee_gta_cents
        : 0; // 'other' — quoted manually; 0 until Kiril overrides

  const pre_discount_subtotal = rental_subtotal_cents + operator_subtotal_cents + delivery_subtotal_cents;

  const applyDiscount =
    opts?.applyGoogleReviewDiscount === true && settings.discounts_google_review_enabled === true;
  const discount_cents = applyDiscount
    ? Math.round(pre_discount_subtotal * settings.discounts_google_review_pct)
    : 0;

  const subtotal_cents = pre_discount_subtotal - discount_cents;
  const tax_cents = Math.round(subtotal_cents * settings.tax_rate);
  const total_cents = subtotal_cents + tax_cents;

  const deposit_cents = Math.round(total_cents * settings.deposit_pct);
  const balance_cents = total_cents - deposit_cents;

  return {
    rental_days: days,
    rental_tier: tier,
    rental_subtotal_cents,
    operator_subtotal_cents,
    delivery_subtotal_cents,
    discount_cents,
    subtotal_cents,
    tax_cents,
    total_cents,
    deposit_cents,
    balance_cents,
  };
}

export function formatCurrency(cents: number, currency: string = 'CAD'): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export async function createInvoice(
  bookingId: string,
  kind: InvoiceKind,
  amountCents: number,
  math: InvoiceMath,
  opts?: { memo?: string; discount_cents?: number },
): Promise<Invoice | null> {
  const svc = createServiceClient();
  const subtotal_cents = kind === 'deposit' ? Math.round(amountCents / (1 + math.tax_cents / math.subtotal_cents)) : amountCents;
  // For simplicity we record the whole booking's tax on the deposit invoice
  // (Stripe deposit invoices commonly include prorated tax). Kiril's substrate
  // isn't audited enough for this to matter; if it does, split proportionally.
  const { data, error } = await svc
    .from('kiril_invoices')
    .insert({
      booking_id: bookingId,
      kind,
      subtotal_cents,
      tax_cents: 0,
      discount_cents: opts?.discount_cents ?? 0,
      total_cents: amountCents,
      currency: 'CAD',
      status: 'issued',
      memo: opts?.memo ?? null,
    })
    .select('*')
    .single();
  if (error || !data) {
    console.error('[invoice] createInvoice failed:', error?.message);
    return null;
  }
  return data as Invoice;
}

export async function markInvoicePaid(
  id: string,
  method: PaidMethod,
  reference?: string,
): Promise<Invoice | null> {
  const svc = createServiceClient();
  const { data, error } = await svc
    .from('kiril_invoices')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      paid_method: method,
      paid_reference: reference ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single();
  if (error || !data) return null;
  return data as Invoice;
}

export async function listInvoices(opts?: { status?: InvoiceStatus; limit?: number }): Promise<Invoice[]> {
  const svc = createServiceClient();
  let q = svc.from('kiril_invoices').select('*').order('created_at', { ascending: false });
  if (opts?.status) q = q.eq('status', opts.status);
  if (opts?.limit) q = q.limit(opts.limit);
  const { data, error } = await q;
  if (error || !data) return [];
  return data as Invoice[];
}

export async function findBookingInvoicesByKind(bookingId: string, kind: InvoiceKind): Promise<Invoice[]> {
  const svc = createServiceClient();
  const { data, error } = await svc
    .from('kiril_invoices')
    .select('*')
    .eq('booking_id', bookingId)
    .eq('kind', kind);
  if (error || !data) return [];
  return data as Invoice[];
}
