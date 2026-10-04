// Booking + Sheet integration.
// SINGLE SOURCE OF TRUTH for booking pricing + delivery zones.
// Fetches Kiril's Variables tab via public gviz CSV endpoint (no auth needed
// because the Sheet is shared "anyone with link"); falls back to hard-coded
// values per CT-A28 (pipeline-level auto-correct, zero user B_th).

export type SheetVars = {
  pricePerDay: string;
  pricePerWeek: string;
  pricePerMonth: string;
  storageAddress: string;
  kingTownshipDeliveryPrice: string;
  gtaDeliveryPrice: string;
  notificationEmail: string;
  phoneNumber: string;
  operatorPricePerDay: string;
};

// notificationEmail intentionally empty in FALLBACK — the route prefers
// the env var LEAD_INBOX_EMAIL when the Sheet's value is missing. This lets
// us route booking emails to a Resend-verified address during the period
// before domain verification, while still honoring whatever value Kiril
// eventually puts in the Sheet.
const FALLBACK: SheetVars = {
  pricePerDay: '$249.99',
  pricePerWeek: '$1,049.93',
  pricePerMonth: '$2,999.70',
  storageAddress: '',
  kingTownshipDeliveryPrice: 'FREE',
  gtaDeliveryPrice: '$99.99',
  notificationEmail: '',
  phoneNumber: '',
  operatorPricePerDay: '$299.99',
};

const SHEET_ID = '14mOVnRJHCKcsSitYvPorO-9rzuUSNXumRKy6ORV9Fl4';
const TAB_NAME = 'Variables';

function sheetCsvUrl(tab: string): string {
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab)}`;
}

function parseTwoColCsv(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const m = line.match(/^"([^"]*)","([^"]*)"$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

export async function getSheetVars(): Promise<SheetVars> {
  try {
    const res = await fetch(sheetCsvUrl(TAB_NAME), {
      next: { revalidate: 300 },
    });
    if (!res.ok) return FALLBACK;
    const text = await res.text();
    const map = parseTwoColCsv(text);
    return {
      pricePerDay: map['Price per day'] || FALLBACK.pricePerDay,
      pricePerWeek: map['Price per week'] || FALLBACK.pricePerWeek,
      pricePerMonth: map['Price per month'] || FALLBACK.pricePerMonth,
      storageAddress: map['Storage address'] || FALLBACK.storageAddress,
      kingTownshipDeliveryPrice:
        map['King Township delivery price'] || FALLBACK.kingTownshipDeliveryPrice,
      gtaDeliveryPrice: map['GTA delivery price'] || FALLBACK.gtaDeliveryPrice,
      notificationEmail: map['Notification email'] || FALLBACK.notificationEmail,
      phoneNumber: map['Phone number'] || FALLBACK.phoneNumber,
      operatorPricePerDay:
        map['Operator price per day'] || FALLBACK.operatorPricePerDay,
    };
  } catch {
    return FALLBACK;
  }
}

// V7: pickup option removed (Kiril V7 directive). All requests are delivery
// requests across three zones.
export type DeliveryZone = 'king-township' | 'gta' | 'other';

export const DELIVERY_ZONE_OPTIONS: { value: DeliveryZone; label: string; help: string }[] = [
  { value: 'king-township', label: 'Delivery within King Township', help: 'Free delivery within King Township' },
  { value: 'gta', label: 'Delivery within the GTA', help: 'Flat delivery fee — includes drop-off AND pickup' },
  { value: 'other', label: 'Other location in Southern Ontario', help: "We'll email you with a delivery quote" },
];

export function deliveryPriceLabel(zone: DeliveryZone, vars: SheetVars): string {
  switch (zone) {
    case 'king-township':
      return vars.kingTownshipDeliveryPrice || 'FREE';
    case 'gta':
      return vars.gtaDeliveryPrice;
    case 'other':
      return 'By request';
  }
}

export function rentalDays(startISO: string, endISO: string): number {
  if (!startISO || !endISO) return 0;
  const start = Date.parse(startISO);
  const end = Date.parse(endISO);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0;
  const days = Math.round((end - start) / 86400000) + 1; // inclusive
  return Math.max(1, days);
}

// Tier label: 1-6 days = daily, 7-29 days = weekly, 30+ = monthly.
// Kiril spec defines the three tier prices; the customer-facing label shows
// which tier applies. Exact total math (e.g. "8 days = 1 week + 1 day") is
// Kiril's quote-side concern — we expose the tier the request falls into.
export function rentalTierLabel(days: number, vars: SheetVars): string {
  if (days <= 0) return 'Pick your dates above';
  if (days >= 30) return `Monthly rate · ${vars.pricePerMonth}`;
  if (days >= 7) return `Weekly rate · ${vars.pricePerWeek}`;
  return `Daily rate · ${days} × ${vars.pricePerDay}`;
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function plusDaysISO(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// V7 operator add-on helpers.
// Parses a "$249.99" / "$1,049.93" / "FREE" / "By request" / "" string into a
// numeric dollar amount, or null when it can't (free / by-request / blank).
export function parsePriceToNumber(s: string | undefined | null): number | null {
  if (!s) return null;
  const cleaned = s.replace(/[^0-9.]/g, '');
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function formatMoney(n: number): string {
  return `$${n.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Computes rental subtotal when the tier is fully deterministic from the
// daily rate (1-6 days). For weekly/monthly tiers, Kiril issues the final
// quote — we expose the tier label only.
export function dailyRentalSubtotal(days: number, vars: SheetVars): number | null {
  if (days <= 0 || days >= 7) return null;
  const daily = parsePriceToNumber(vars.pricePerDay);
  if (daily == null) return null;
  return daily * days;
}

export function operatorSubtotal(days: number, vars: SheetVars, requested: boolean): number | null {
  if (!requested || days <= 0) return null;
  const daily = parsePriceToNumber(vars.operatorPricePerDay);
  if (daily == null) return null;
  return daily * days;
}

export function deliverySubtotal(zone: DeliveryZone, vars: SheetVars): number | null {
  return parsePriceToNumber(deliveryPriceLabel(zone, vars));
}
