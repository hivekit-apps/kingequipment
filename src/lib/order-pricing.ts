// Order-pricing helper for the admin approval flow.
//
// RULES (owner-chosen 2026-10-04):
//
//   rental_deposit_due_cents = sum(order_items.deposit_cents) * settings.deposit_pct
//     — each line already stores (per-unit deposit * qty) as deposit_cents.
//       deposit_pct from kiril_settings scales how much of the stored
//       deposit is actually collected up-front.
//
//   grand_total_due_now_cents = rental_deposit_due + buy_subtotal + delivery
//     — buy items are paid in full; delivery is paid up-front; rental
//       balance (rental_subtotal - rental_deposit_due) is settled on delivery
//       by whatever method the operator chooses.
//
//   remaining_rental_balance_cents = rental_subtotal - rental_deposit_due
//     — informational: shown in the approval email so the customer knows
//       what's still owed when the equipment arrives.
//
// Everything is cents (integer). Callers are responsible for formatting.

import type { KirilSettings } from './settings';

export type OrderPricingInput = {
  rental_subtotal_cents: number | null;
  buy_subtotal_cents: number | null;
  delivery_price_cents: number | null;
  deposit_total_cents: number | null; // sum(items.deposit_cents) — pre-pct
};

export type OrderPricing = {
  rental_subtotal_cents: number;
  buy_subtotal_cents: number;
  delivery_price_cents: number;
  // sum of all item deposits (per-unit * qty), BEFORE applying deposit_pct
  item_deposits_total_cents: number;
  // what the customer actually pre-pays as the rental deposit:
  // item_deposits_total * settings.deposit_pct
  rental_deposit_due_cents: number;
  // rental_subtotal - rental_deposit_due_cents — owed on delivery
  remaining_rental_balance_cents: number;
  // the amount the approval email asks for up-front:
  // rental_deposit_due + buy_subtotal + delivery
  grand_total_due_now_cents: number;
  // informational: the order's grand_total_cents equivalent (rental + buy + delivery)
  order_grand_total_cents: number;
  // the deposit_pct used (echoed for display)
  deposit_pct: number;
};

export function computeOrderPricing(
  order: OrderPricingInput,
  settings: Pick<KirilSettings, 'deposit_pct'>,
): OrderPricing {
  const rental = Math.max(0, Math.round(order.rental_subtotal_cents ?? 0));
  const buy = Math.max(0, Math.round(order.buy_subtotal_cents ?? 0));
  const delivery = Math.max(0, Math.round(order.delivery_price_cents ?? 0));
  const itemDeposits = Math.max(0, Math.round(order.deposit_total_cents ?? 0));
  const pct = Math.max(0, Math.min(1, settings.deposit_pct ?? 0.2));

  const rentalDepositDue = Math.round(itemDeposits * pct);
  const remainingRentalBalance = Math.max(0, rental - rentalDepositDue);
  const grandTotalDueNow = rentalDepositDue + buy + delivery;

  return {
    rental_subtotal_cents: rental,
    buy_subtotal_cents: buy,
    delivery_price_cents: delivery,
    item_deposits_total_cents: itemDeposits,
    rental_deposit_due_cents: rentalDepositDue,
    remaining_rental_balance_cents: remainingRentalBalance,
    grand_total_due_now_cents: grandTotalDueNow,
    order_grand_total_cents: rental + buy + delivery,
    deposit_pct: pct,
  };
}

export function formatMoneyCents(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-CA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
