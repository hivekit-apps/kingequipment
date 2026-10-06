'use client';

import Link from 'next/link';
import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/components/CartContext';
import { calculateRentalPrice, calculateBuyPrice, daysBetween, formatMoney } from '@/lib/pricing';
import { getSiteConfig } from '@/lib/config';
import { tomorrowISO, plusDaysISO, isTomorrowOrLater, START_DATE_ERROR } from '@/lib/dates';

const cfg = getSiteConfig();

export default function CartPage() {
  const router = useRouter();
  const {
    items,
    removeItem,
    updateItem,
    city,
    setCity,
    clearCart,
    hydrated,
    cartStartDate,
    cartEndDate,
    setCartDates,
  } = useCart();

  const selectedCity = useMemo(
    () => cfg.cityPages.cities.find((c) => c.slug === city) || cfg.cityPages.cities[0],
    [city],
  );
  const deliveryPrice = selectedCity?.deliveryPrice ?? 0;

  const hasRentals = useMemo(() => items.some((it) => it.kind === 'rent'), [items]);
  const tomorrow = tomorrowISO();

  // One-time safety: if the user lands on /cart with rentals but no global
  // dates (e.g. legacy localStorage), seed them from the first rental item or
  // default to tomorrow + 1 day. This also propagates them to every rental.
  useEffect(() => {
    if (!hydrated) return;
    if (!hasRentals) return;
    if (cartStartDate && cartEndDate) {
      // If stored dates are now in the past (user came back next day), bump.
      if (cartStartDate < tomorrow) {
        const start = tomorrow;
        const end = cartEndDate < start ? plusDaysISO(start, 1) : cartEndDate;
        setCartDates(start, end);
      }
      return;
    }
    // Seed from first rental item.
    const firstRental = items.find((it) => it.kind === 'rent');
    const start = firstRental?.startDate && firstRental.startDate >= tomorrow
      ? firstRental.startDate
      : tomorrow;
    const end = firstRental?.endDate && firstRental.endDate >= start
      ? firstRental.endDate
      : plusDaysISO(start, 1);
    setCartDates(start, end);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, hasRentals]);

  const effectiveStart = cartStartDate || tomorrow;
  const effectiveEnd = cartEndDate || plusDaysISO(effectiveStart, 1);
  const cartDays = useMemo(
    () => daysBetween(effectiveStart, effectiveEnd),
    [effectiveStart, effectiveEnd],
  );

  const startInvalid = hasRentals && !isTomorrowOrLater(effectiveStart);
  const endInvalid = hasRentals && effectiveEnd < effectiveStart;

  const rows = useMemo(() => {
    return items.map((it) => {
      const equipment = cfg.equipment.find((e) => e.id === it.equipmentId);
      if (!equipment) return null;
      if (it.kind === 'rent') {
        // Use global cart dates for rentals.
        const days = daysBetween(effectiveStart, effectiveEnd);
        const rp = calculateRentalPrice(equipment, days);
        return {
          cart: it,
          equipment,
          lineTotal: rp.total * it.qty,
          tier: rp.appliedTier,
          breakdown: rp.breakdown,
          deposit: equipment.pricing.deposit * it.qty,
          days,
        };
      }
      const bp = calculateBuyPrice(equipment, it.buyCondition || 'new');
      return {
        cart: it,
        equipment,
        lineTotal: bp.total * it.qty,
        tier: bp.appliedTier,
        breakdown: bp.breakdown,
        deposit: 0,
        days: 0,
      };
    }).filter((r): r is NonNullable<typeof r> => r !== null);
  }, [items, effectiveStart, effectiveEnd]);

  const rentalSubtotal = rows
    .filter((r) => r.cart.kind === 'rent')
    .reduce((sum, r) => sum + r.lineTotal, 0);
  const buySubtotal = rows
    .filter((r) => r.cart.kind === 'buy')
    .reduce((sum, r) => sum + r.lineTotal, 0);
  const depositTotal = rows.reduce((sum, r) => sum + r.deposit, 0);
  const grandTotal = rentalSubtotal + buySubtotal + (rows.length > 0 ? deliveryPrice : 0);

  const hasInvalidDates = hasRentals && (startInvalid || endInvalid || cartDays <= 0);

  if (!hydrated) {
    return (
      <section className="container-page py-12">
        <h1 className="text-3xl md:text-4xl">Your cart</h1>
        <p className="mt-4 text-slate-700">Loading…</p>
      </section>
    );
  }

  if (rows.length === 0) {
    return (
      <section className="container-page py-12">
        <h1 className="text-3xl md:text-4xl">Your cart</h1>
        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-8 text-center">
          <p className="text-base text-slate-700">Your cart is empty.</p>
          <Link href="/equipment" className="mt-6 inline-block btn-primary">
            Browse equipment
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="container-page py-12">
      <h1 className="text-3xl md:text-4xl">Your cart</h1>
      <p className="mt-2 text-sm text-slate-700">
        Review items, set your rental dates and delivery city, then continue to checkout.
      </p>

      <div className="mt-8 grid lg:grid-cols-[1.4fr_1fr] gap-8 items-start">
        <div className="space-y-4">
          {rows.map((r) => (
            <article
              key={`${r.cart.equipmentId}-${r.cart.kind}`}
              className="rounded-lg border border-slate-200 bg-white p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-xs uppercase tracking-wide text-brand-orange font-bold">
                    {r.cart.kind === 'rent' ? 'Rental' : 'Purchase'}
                  </p>
                  <h2 className="text-lg font-bold text-slate-950">{r.equipment.name}</h2>
                  <p className="text-xs text-slate-600 mt-1">{r.breakdown}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(r.cart.equipmentId, r.cart.kind)}
                  className="text-xs text-slate-600 hover:text-red-700 underline"
                >
                  Remove
                </button>
              </div>

              <div className="mt-4 flex items-end justify-between gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Qty</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={r.cart.qty}
                    onChange={(e) =>
                      updateItem(r.cart.equipmentId, r.cart.kind, {
                        qty: Math.max(1, Math.min(10, Number(e.target.value) || 1)),
                      })
                    }
                    className="mt-1 w-20 rounded-md border border-slate-300 px-2 py-2 text-sm"
                  />
                </div>
                <div className="text-right">
                  {r.cart.kind === 'rent' && (
                    <p className="text-xs text-slate-600">
                      {r.days} day{r.days === 1 ? '' : 's'} · tier: <strong>{r.tier}</strong>
                    </p>
                  )}
                  <p className="text-lg font-bold text-brand-orange">
                    {formatMoney(r.lineTotal)}
                  </p>
                  {r.cart.kind === 'rent' && r.deposit > 0 && (
                    <p className="text-xs text-slate-600">
                      Deposit: {formatMoney(r.deposit)}
                    </p>
                  )}
                </div>
              </div>
            </article>
          ))}
          <button
            type="button"
            onClick={clearCart}
            className="text-xs text-slate-600 hover:text-red-700 underline"
          >
            Clear cart
          </button>
        </div>

        <aside className="rounded-lg border border-slate-200 bg-white p-5 lg:sticky lg:top-6">
          <h2 className="text-lg font-bold text-slate-950">Order summary</h2>
          <div className="mt-4">
            <label className="block text-xs font-semibold text-slate-700">Delivery city</label>
            <select
              value={selectedCity?.slug || ''}
              onChange={(e) => setCity(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-2 text-sm"
            >
              {cfg.cityPages.cities.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name} — ${c.deliveryPrice}
                </option>
              ))}
            </select>
          </div>

          {hasRentals && (
            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-700">Rental dates</label>
              <div className="mt-1 grid grid-cols-2 gap-2">
                <input
                  type="date"
                  aria-label="Rental start date"
                  value={effectiveStart}
                  min={tomorrow}
                  onChange={(e) => {
                    const v = e.target.value;
                    const newEnd = effectiveEnd < v ? v : effectiveEnd;
                    setCartDates(v, newEnd);
                  }}
                  className={`rounded-md border px-2 py-2 text-sm ${startInvalid ? 'border-red-400' : 'border-slate-300'}`}
                />
                <input
                  type="date"
                  aria-label="Rental end date"
                  value={effectiveEnd}
                  min={effectiveStart}
                  onChange={(e) => setCartDates(effectiveStart, e.target.value)}
                  className={`rounded-md border px-2 py-2 text-sm ${endInvalid ? 'border-red-400' : 'border-slate-300'}`}
                />
              </div>
              <p className="mt-1 text-xs text-slate-600">
                Days: <strong>{cartDays}</strong>
              </p>
              {startInvalid && (
                <p className="mt-1 text-xs text-red-700">{START_DATE_ERROR}</p>
              )}
              {!startInvalid && endInvalid && (
                <p className="mt-1 text-xs text-red-700">
                  End date must be on or after the start date.
                </p>
              )}
              {!startInvalid && !endInvalid && cartDays <= 0 && (
                <p className="mt-1 text-xs text-red-700">
                  Rental must be at least one day.
                </p>
              )}
            </div>
          )}

          <dl className="mt-5 space-y-2 text-sm">
            {rentalSubtotal > 0 && (
              <div className="flex justify-between">
                <dt>Rental subtotal</dt>
                <dd className="font-semibold">{formatMoney(rentalSubtotal)}</dd>
              </div>
            )}
            {buySubtotal > 0 && (
              <div className="flex justify-between">
                <dt>Purchase subtotal</dt>
                <dd className="font-semibold">{formatMoney(buySubtotal)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt>Delivery to {selectedCity?.name}</dt>
              <dd className="font-semibold">{formatMoney(deliveryPrice)}</dd>
            </div>
            {depositTotal > 0 && (
              <div className="flex justify-between pt-2 border-t border-slate-100">
                <dt>Refundable deposit (rentals)</dt>
                <dd className="font-semibold">{formatMoney(depositTotal)}</dd>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-slate-200 text-base">
              <dt className="font-bold">Grand total</dt>
              <dd className="font-bold text-brand-orange">{formatMoney(grandTotal)}</dd>
            </div>
          </dl>

          <button
            type="button"
            onClick={() => router.push('/checkout')}
            disabled={hasInvalidDates}
            className="btn-primary w-full mt-5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Checkout
          </button>
          {hasInvalidDates && (
            <p className="mt-2 text-xs text-red-700">
              Fix the rental dates above before you can check out.
            </p>
          )}
          <p className="mt-3 text-xs text-slate-600">
            Deposits and delivery due to lock in the booking. Rental balance invoiced the morning of delivery.
          </p>
        </aside>
      </div>
    </section>
  );
}
