// Shared date helpers for rental-date constraints.
//
// Business rule: rental start date must be TOMORROW or later — same-day
// bookings are not accepted. All date comparisons use ISO (YYYY-MM-DD)
// strings, which sort lexically correctly, so no Date math is required
// for the comparisons themselves.

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function tomorrowISO(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function plusDaysISO(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * True iff the given ISO date is tomorrow or any later day (UTC).
 * Returns false for missing, malformed, past, or today dates.
 */
export function isTomorrowOrLater(iso: string | undefined | null): boolean {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  return iso >= tomorrowISO();
}

export const START_DATE_ERROR = 'Start date must be tomorrow or later.';
