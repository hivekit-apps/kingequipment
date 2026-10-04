import { NextResponse, type NextRequest } from 'next/server';
import { Resend } from 'resend';
import { getSiteConfig } from '@/lib/config';
import {
  dailyRentalSubtotal,
  deliveryPriceLabel,
  deliverySubtotal,
  formatMoney,
  getSheetVars,
  operatorSubtotal,
  rentalDays,
  rentalTierLabel,
  type DeliveryZone,
} from '@/lib/booking';
import { createBooking, getEquipmentBySlug } from '@/lib/booking-db';
import { loadSettings } from '@/lib/settings';
import { computeInvoiceMath } from '@/lib/invoice';
import { bookingReceivedEmail } from '@/lib/email-templates';
import { sendEmail } from '@/lib/email-send';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type BookingPayload = {
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  address?: unknown;
  startDate?: unknown;
  endDate?: unknown;
  zone?: unknown;
  operator?: unknown;
  notes?: unknown;
  hp?: unknown;
  source?: unknown;
  equipment?: unknown; // slug — defaults to mini-stand-on
};

const RATE_LIMIT_MAX = 5;
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

function isValidZone(z: string): z is DeliveryZone {
  return z === 'king-township' || z === 'gta' || z === 'other';
}

function isValidISODate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
}

export async function POST(req: NextRequest) {
  const cfg = getSiteConfig();
  let body: BookingPayload;
  try {
    body = (await req.json()) as BookingPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';
  if (!rateLimit(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  // Honeypot — silently accept and discard.
  if (asString(body.hp) !== '') {
    return NextResponse.json({ ok: true });
  }

  const name = asString(body.name);
  const email = asString(body.email);
  const phone = asString(body.phone);
  const address = asString(body.address);
  const startDate = asString(body.startDate);
  const endDate = asString(body.endDate);
  const zoneRaw = asString(body.zone);
  const operator = body.operator === true || body.operator === 'true';
  const notes = asString(body.notes);
  const source = asString(body.source) || 'book-page';
  const equipmentSlug = asString(body.equipment) || 'mini-stand-on';

  if (name.length < 2) {
    return NextResponse.json({ error: 'Please enter your name.' }, { status: 422 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email.' }, { status: 422 });
  }
  if (phone.length > 0 && phone.replace(/[^0-9]/g, '').length < 7) {
    return NextResponse.json({ error: 'Please enter a valid phone number or leave it blank.' }, { status: 422 });
  }
  if (!isValidISODate(startDate) || !isValidISODate(endDate)) {
    return NextResponse.json({ error: 'Please pick valid start and end dates.' }, { status: 422 });
  }
  if (endDate < startDate) {
    return NextResponse.json({ error: 'End date must be on or after start date.' }, { status: 422 });
  }
  if (!isValidZone(zoneRaw)) {
    return NextResponse.json({ error: 'Please pick a delivery option.' }, { status: 422 });
  }
  const zone: DeliveryZone = zoneRaw;
  if (address.length < 5) {
    return NextResponse.json(
      { error: 'Please enter a delivery address.' },
      { status: 422 },
    );
  }

  // -- DB write path (cycle 4) — always attempt; email is separate concern
  const equipment = await getEquipmentBySlug(equipmentSlug);
  let bookingId: string | null = null;
  if (equipment) {
    const created = await createBooking({
      equipment_id: equipment.id,
      customer_name: name,
      customer_email: email,
      customer_phone: phone || null,
      customer_address: address,
      start_date: startDate,
      end_date: endDate,
      operator,
      delivery_zone: zone,
      notes: notes || null,
      source,
      ip,
    });
    bookingId = created?.id ?? null;
  }

  // -- Legacy email path (cycle 2 T1) — preserved for admin notification
  const vars = await getSheetVars();
  const days = rentalDays(startDate, endDate);
  const tier = rentalTierLabel(days, vars);
  const delivery = deliveryPriceLabel(zone, vars);
  const rentalSub = dailyRentalSubtotal(days, vars);
  const operatorSub = operatorSubtotal(days, vars, operator);
  const deliverySub = deliverySubtotal(zone, vars);

  const zoneLabel: Record<DeliveryZone, string> = {
    'king-township': 'Delivery — King Township',
    'gta': 'Delivery — GTA (includes drop-off and pickup)',
    'other': 'Delivery — Other Southern Ontario (quote needed)',
  };

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.LEAD_INBOX_EMAIL || vars.notificationEmail || cfg.business.email;
  const cc = (process.env.LEAD_CC_EMAIL || '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const from = process.env.LEAD_FROM_EMAIL || 'onboarding@resend.dev';

  const ua = req.headers.get('user-agent') || 'unknown';
  const opTag = operator ? ' +Op' : '';
  const adminSubject = `[Booking${opTag}] ${name} — ${startDate} → ${endDate} (${days}d, ${zoneLabel[zone]})`;
  const estimateLine =
    rentalSub != null && deliverySub != null
      ? `Estimate: ${formatMoney(rentalSub + (operatorSub ?? 0) + deliverySub)} (rental${operator ? ' + operator' : ''}${deliverySub > 0 ? ' + delivery' : ''})\n`
      : `Estimate: tier-based — see rental + operator + delivery above; final quote yours.\n`;
  const adminText =
    `New booking request from ${cfg.business.name} site:\n\n` +
    (bookingId ? `Admin: https://kiril-skidsteer.vercel.app/admin/bookings/${bookingId}\n\n` : '') +
    `=== Customer ===\n` +
    `Name:    ${name}\n` +
    `Email:   ${email}\n` +
    (phone ? `Phone:   ${phone}\n` : `Phone:   (not provided — reply by email)\n`) +
    `Address: ${address}\n` +
    `\n=== Rental ===\n` +
    `Start:    ${startDate}\n` +
    `End:      ${endDate}\n` +
    `Days:     ${days}\n` +
    `Tier:     ${tier}\n` +
    `Rental:   ${rentalSub != null ? formatMoney(rentalSub) : 'tier-based, you confirm'}\n` +
    `Operator: ${operator ? `YES — ${days} × ${vars.operatorPricePerDay}${operatorSub != null ? ` = ${formatMoney(operatorSub)}` : ''}` : 'no'}\n` +
    `Delivery: ${zoneLabel[zone]} (${delivery})\n` +
    estimateLine +
    (notes ? `\n=== Notes ===\n${notes}\n` : '') +
    `\n=== Meta ===\n` +
    `Source:  ${source}\n` +
    `IP:      ${ip}\n` +
    `UA:      ${ua}\n` +
    `Time:    ${new Date().toISOString()}\n` +
    `\nReply to this email to respond to the customer directly.\n`;

  if (!apiKey) {
    console.error('[book] RESEND_API_KEY missing — payload logged only');
    return NextResponse.json(
      { error: 'Booking transport not configured. Please try again later.', booking_id: bookingId },
      { status: 503 },
    );
  }

  try {
    const resend = new Resend(apiKey);
    const adminResult = await resend.emails.send({
      from,
      to,
      ...(cc.length > 0 ? { cc } : {}),
      replyTo: email,
      subject: adminSubject,
      text: adminText,
    });
    if (adminResult.error) {
      console.error('[book] admin email Resend error:', adminResult.error);
      return NextResponse.json(
        { error: 'Could not send your request. Please try again in a moment.', booking_id: bookingId },
        { status: 502 },
      );
    }

    // Fire-and-forget customer confirmation email (best effort — don't block on failure).
    if (bookingId && equipment) {
      try {
        const created = await getBookingSafely(bookingId);
        if (created) {
          const settings = await loadSettings();
          const math = computeInvoiceMath(created, equipment, settings);
          const custTmpl = bookingReceivedEmail(created, equipment, math);
          await sendEmail({
            to: email,
            replyTo: to,
            subject: custTmpl.subject,
            html: custTmpl.html,
            text: custTmpl.text,
          });
        }
      } catch (err) {
        console.error('[book] customer confirmation email failed (non-fatal):', err instanceof Error ? err.message : String(err));
      }
    }

    return NextResponse.json({ ok: true, booking_id: bookingId });
  } catch (err) {
    console.error('[book] Send threw:', err);
    return NextResponse.json(
      { error: 'Could not send your request. Please try again in a moment.', booking_id: bookingId },
      { status: 502 },
    );
  }
}

async function getBookingSafely(id: string) {
  const { getBooking } = await import('@/lib/booking-db');
  return getBooking(id);
}
