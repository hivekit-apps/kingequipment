// Dynamic rental-pricing calculator for King Equipment.
// Rule: pick the cheapest-equivalent tier automatically.
//   - If daily × days <= weekly rate -> daily × days
//   - Else if weekly × ceil(days/7) <= monthly rate -> weekly × ceil(days/7)
//   - Else monthly × ceil(days/30)
// (Days are inclusive — "1 day" = start_date == end_date.)
//
// All amounts are dollars (number) in the input; output totals are DOLLARS
// (float). The caller converts to cents at the DB/Stripe boundary.
//
// Buy pricing is deterministic: pick buyUsed if available, else buyNew. No
// tier logic.

import type { EquipmentItem } from './config';

export type AppliedTier = 'daily' | 'weekly' | 'monthly' | 'buy-new' | 'buy-used';

export type RentalPrice = {
  total: number;
  breakdown: string;
  appliedTier: AppliedTier;
  units: number;
  unitRate: number;
};

export function daysBetween(startISO: string, endISO: string): number {
  if (!startISO || !endISO) return 0;
  const start = Date.parse(startISO + (startISO.length === 10 ? 'T00:00:00Z' : ''));
  const end = Date.parse(endISO + (endISO.length === 10 ? 'T00:00:00Z' : ''));
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0;
  return Math.max(1, Math.round((end - start) / 86400000) + 1);
}

export function calculateRentalPrice(item: EquipmentItem, days: number): RentalPrice {
  const d = Math.max(1, Math.floor(days || 0));
  const { daily, weekly, monthly } = item.pricing;

  // Fallbacks: if any tier is missing, degrade gracefully.
  const dailyCost = daily != null ? daily * d : Infinity;
  const weeks = Math.ceil(d / 7);
  const weeklyCost = weekly != null ? weekly * weeks : Infinity;
  const months = Math.ceil(d / 30);
  const monthlyCost = monthly != null ? monthly * months : Infinity;

  // Choose the cheapest tier.
  type Candidate = {
    cost: number;
    tier: AppliedTier;
    units: number;
    rate: number;
    label: string;
  };
  const candidates: Candidate[] = [];
  if (daily != null) {
    candidates.push({
      cost: dailyCost,
      tier: 'daily',
      units: d,
      rate: daily,
      label: `${d} day${d === 1 ? '' : 's'} × $${daily}`,
    });
  }
  if (weekly != null) {
    candidates.push({
      cost: weeklyCost,
      tier: 'weekly',
      units: weeks,
      rate: weekly,
      label: `${weeks} week${weeks === 1 ? '' : 's'} × $${weekly}`,
    });
  }
  if (monthly != null) {
    candidates.push({
      cost: monthlyCost,
      tier: 'monthly',
      units: months,
      rate: monthly,
      label: `${months} month${months === 1 ? '' : 's'} × $${monthly}`,
    });
  }

  if (candidates.length === 0) {
    return {
      total: 0,
      breakdown: 'No rental pricing configured',
      appliedTier: 'daily',
      units: d,
      unitRate: 0,
    };
  }

  // Sort by cost, pick cheapest.
  candidates.sort((a, b) => a.cost - b.cost);
  const winner = candidates[0];

  return {
    total: Math.round(winner.cost * 100) / 100,
    breakdown: winner.label,
    appliedTier: winner.tier,
    units: winner.units,
    unitRate: winner.rate,
  };
}

export type BuyPrice = {
  total: number;
  breakdown: string;
  appliedTier: AppliedTier;
};

export function calculateBuyPrice(item: EquipmentItem, prefer: 'new' | 'used' = 'new'): BuyPrice {
  const { buyNew, buyUsed } = item.pricing;
  if (prefer === 'used' && buyUsed != null) {
    return { total: buyUsed, breakdown: `Used — $${buyUsed}`, appliedTier: 'buy-used' };
  }
  if (buyNew != null) {
    return { total: buyNew, breakdown: `New — $${buyNew}`, appliedTier: 'buy-new' };
  }
  if (buyUsed != null) {
    return { total: buyUsed, breakdown: `Used — $${buyUsed}`, appliedTier: 'buy-used' };
  }
  return { total: 0, breakdown: 'Not for sale', appliedTier: 'buy-new' };
}

export function formatPriceBreakdown(price: RentalPrice | BuyPrice): string {
  return `${price.breakdown} = $${price.total.toFixed(2)}`;
}

export function formatMoney(n: number): string {
  return `$${n.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatMoneyFromCents(cents: number): string {
  return formatMoney(cents / 100);
}

// --- Unit-test documentation (behavior spec) ---
// (Running tests not wired in this project — these cases are the correctness
// contract. Keep in sync with pricing changes.)
//
// Case 1: 5 days × $85 daily = $425 vs weekly $340 → use weekly, final = $340
//   calculateRentalPrice({pricing:{daily:85, weekly:340, monthly:980,...}}, 5)
//   returns { total: 340, appliedTier: 'weekly', units: 1, unitRate: 340 }
//
// Case 2: 3 weeks × $340 = $1020 vs monthly $980 → use monthly, final = $980
//   calculateRentalPrice({pricing:{daily:85, weekly:340, monthly:980,...}}, 21)
//   returns { total: 980, appliedTier: 'monthly', units: 1, unitRate: 980 }
//
// Case 3: 2 days × $85 = $170 vs weekly $340 → use daily, final = $170
//   calculateRentalPrice({pricing:{daily:85, weekly:340, monthly:980,...}}, 2)
//   returns { total: 170, appliedTier: 'daily', units: 2, unitRate: 85 }
//
// Case 4: 1 day → daily tier, final = $85
//
// Case 5: 45 days → monthly tier applies with units=2 (ceil(45/30))
//   total = 2 × $980 = $1960
