// Documentation of expected behavior for pricing.ts.
// Not wired to a test runner — these are the correctness contract.
// Run manually: `npx tsx src/lib/pricing.test.ts` (if tsx installed) or
// `node --experimental-strip-types src/lib/pricing.test.ts` (Node 23+).

import { calculateRentalPrice, calculateBuyPrice, daysBetween } from './pricing';
import type { EquipmentItem } from './config';

const fixture: EquipmentItem = {
  id: 'test',
  class: 'drying',
  availability: ['rent', 'buy'],
  name: 'Test Item',
  shortName: 'Test',
  tagline: '',
  displayRate: '',
  pricing: {
    daily: 85,
    weekly: 340,
    monthly: 980,
    buyNew: 3200,
    buyUsed: 1800,
    deposit: 500,
  },
  specs: {
    operatingWeightLbs: '',
    ratedOperatingCapacityLbs: '',
    engineHp: '',
    liftHeightIn: null,
    gateWidthIn: null,
  },
  attachmentsIncluded: [],
  idealFor: [],
  photos: [],
  operatorNote: '',
  photoNote: '',
};

type Case = { label: string; actual: unknown; expected: unknown };
const cases: Case[] = [];

function assertEq(label: string, actual: unknown, expected: unknown) {
  cases.push({ label, actual, expected });
}

// Case 1: 1 day = daily
assertEq('1 day', calculateRentalPrice(fixture, 1).total, 85);
assertEq('1 day tier', calculateRentalPrice(fixture, 1).appliedTier, 'daily');

// Case 2: 2 days = daily
assertEq('2 days', calculateRentalPrice(fixture, 2).total, 170);
assertEq('2 days tier', calculateRentalPrice(fixture, 2).appliedTier, 'daily');

// Case 3: 5 days = weekly (5×85=425 > 340)
assertEq('5 days -> weekly', calculateRentalPrice(fixture, 5).total, 340);
assertEq('5 days tier', calculateRentalPrice(fixture, 5).appliedTier, 'weekly');

// Case 4: 7 days = weekly
assertEq('7 days', calculateRentalPrice(fixture, 7).total, 340);
assertEq('7 days tier', calculateRentalPrice(fixture, 7).appliedTier, 'weekly');

// Case 5: 21 days = monthly (3×340=1020 > 980)
assertEq('21 days -> monthly', calculateRentalPrice(fixture, 21).total, 980);
assertEq('21 days tier', calculateRentalPrice(fixture, 21).appliedTier, 'monthly');

// Case 6: 30 days = monthly
assertEq('30 days', calculateRentalPrice(fixture, 30).total, 980);

// Case 7: 45 days = 2 months
assertEq('45 days -> 2 months', calculateRentalPrice(fixture, 45).total, 1960);

// Case 8: 14 days = 2 weeks (2×340 = 680 vs 1×980 = 980; weekly cheaper)
assertEq('14 days -> 2 weeks', calculateRentalPrice(fixture, 14).total, 680);
assertEq('14 days tier', calculateRentalPrice(fixture, 14).appliedTier, 'weekly');

// Case 9: daysBetween
assertEq('daysBetween same', daysBetween('2026-10-05', '2026-10-05'), 1);
assertEq('daysBetween 5d', daysBetween('2026-10-05', '2026-10-09'), 5);
assertEq('daysBetween invalid', daysBetween('2026-10-09', '2026-10-05'), 0);

// Buy price
assertEq('buy new', calculateBuyPrice(fixture, 'new').total, 3200);
assertEq('buy used', calculateBuyPrice(fixture, 'used').total, 1800);

// Report
let fails = 0;
for (const c of cases) {
  const ok = JSON.stringify(c.actual) === JSON.stringify(c.expected);
  if (!ok) fails++;
  // eslint-disable-next-line no-console
  console.log(`${ok ? 'OK' : 'FAIL'} ${c.label}: ${JSON.stringify(c.actual)} ${ok ? '==' : '!=='} ${JSON.stringify(c.expected)}`);
}
if (fails === 0) {
  // eslint-disable-next-line no-console
  console.log(`\nAll ${cases.length} pricing cases passed.`);
} else {
  // eslint-disable-next-line no-console
  console.log(`\n${fails}/${cases.length} pricing cases FAILED.`);
  process.exit(1);
}
