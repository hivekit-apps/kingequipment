'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { EquipmentItem, CityPage } from '@/lib/config';
import { useCart } from './CartContext';
import { calculateRentalPrice, daysBetween, formatMoney } from '@/lib/pricing';
import { tomorrowISO, plusDaysISO, START_DATE_ERROR } from '@/lib/dates';

type Props = {
  item: EquipmentItem;
  cities: CityPage[];
  defaultMode?: 'rent' | 'buy';
  defaultCity?: string;
};

export function AddToCartForm({ item, cities, defaultMode, defaultCity }: Props) {
  const router = useRouter();
  const { addItem, setCity } = useCart();
  const rentable = item.availability.includes('rent');
  const buyable = item.availability.includes('buy');

  const initialMode: 'rent' | 'buy' =
    defaultMode === 'buy' && buyable ? 'buy' : rentable ? 'rent' : 'buy';
  const [mode, setMode] = useState<'rent' | 'buy'>(initialMode);
  const [buyCondition, setBuyCondition] = useState<'new' | 'used'>(
    item.pricing.buyNew != null ? 'new' : 'used',
  );
  const tomorrow = tomorrowISO();
  const [startDate, setStartDate] = useState<string>(tomorrow);
  const [endDate, setEndDate] = useState<string>(plusDaysISO(tomorrow, 1));
  const [city, setCityLocal] = useState<string>(defaultCity || cities[0]?.slug || '');
  const [qty, setQty] = useState<number>(1);
  const [added, setAdded] = useState<boolean>(false);

  const days = useMemo(() => daysBetween(startDate, endDate), [startDate, endDate]);
  const price = useMemo(() => {
    if (mode === 'rent') return calculateRentalPrice(item, days);
    return null;
  }, [mode, item, days]);

  const buyUnit =
    mode === 'buy'
      ? buyCondition === 'used' && item.pricing.buyUsed != null
        ? item.pricing.buyUsed
        : item.pricing.buyNew ?? item.pricing.buyUsed ?? 0
      : 0;

  const lineTotal =
    mode === 'rent' ? (price?.total ?? 0) * qty : buyUnit * qty;

  const startDateInvalid = mode === 'rent' && startDate < tomorrow;

  function handleAdd() {
    if (mode === 'rent') {
      if (!startDate || !endDate || days <= 0) return;
      if (startDate < tomorrow) return;
      addItem({
        equipmentId: item.id,
        kind: 'rent',
        qty,
        startDate,
        endDate,
        city,
      });
    } else {
      addItem({
        equipmentId: item.id,
        kind: 'buy',
        qty,
        buyCondition,
        city,
      });
    }
    if (city) setCity(city);
    setAdded(true);
  }

  function handleGoToCart() {
    router.push('/cart');
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex gap-2">
        {rentable && (
          <button
            type="button"
            onClick={() => setMode('rent')}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-semibold ${
              mode === 'rent'
                ? 'bg-brand-orange text-white'
                : 'bg-slate-100 text-slate-950 hover:bg-slate-200'
            }`}
          >
            Rent
          </button>
        )}
        {buyable && (
          <button
            type="button"
            onClick={() => setMode('buy')}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-semibold ${
              mode === 'buy'
                ? 'bg-brand-orange text-white'
                : 'bg-slate-100 text-slate-950 hover:bg-slate-200'
            }`}
          >
            Buy
          </button>
        )}
      </div>

      {mode === 'rent' && (
        <div className="mt-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Start</label>
              <input
                type="date"
                value={startDate}
                min={tomorrow}
                onChange={(e) => {
                  const v = e.target.value;
                  setStartDate(v);
                  if (endDate < v) setEndDate(v);
                }}
                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">End</label>
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-2 text-sm"
              />
            </div>
          </div>
          {price && (
            <div className="rounded-md bg-slate-50 border border-slate-200 p-3 text-sm">
              <div className="flex justify-between">
                <span>Rental ({days} day{days === 1 ? '' : 's'})</span>
                <span className="font-semibold">{formatMoney(price.total)}</span>
              </div>
              <p className="mt-1 text-xs text-slate-600">
                Tier applied: <strong>{price.appliedTier}</strong> · {price.breakdown}
              </p>
            </div>
          )}
        </div>
      )}

      {mode === 'buy' && (
        <div className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">Condition</label>
            <div className="flex gap-2">
              {item.pricing.buyNew != null && (
                <button
                  type="button"
                  onClick={() => setBuyCondition('new')}
                  className={`px-3 py-2 rounded-md text-sm font-semibold ${
                    buyCondition === 'new'
                      ? 'bg-slate-950 text-white'
                      : 'bg-slate-100 text-slate-950 hover:bg-slate-200'
                  }`}
                >
                  New · ${item.pricing.buyNew}
                </button>
              )}
              {item.pricing.buyUsed != null && (
                <button
                  type="button"
                  onClick={() => setBuyCondition('used')}
                  className={`px-3 py-2 rounded-md text-sm font-semibold ${
                    buyCondition === 'used'
                      ? 'bg-slate-950 text-white'
                      : 'bg-slate-100 text-slate-950 hover:bg-slate-200'
                  }`}
                >
                  Used · ${item.pricing.buyUsed}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mt-5">
        <label className="block text-xs font-semibold text-slate-700">Delivery city</label>
        <select
          value={city}
          onChange={(e) => setCityLocal(e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-2 text-sm"
        >
          {cities.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name} — delivery ${c.deliveryPrice}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-5">
        <label className="block text-xs font-semibold text-slate-700">Quantity</label>
        <input
          type="number"
          min={1}
          max={10}
          value={qty}
          onChange={(e) => setQty(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
          className="mt-1 w-24 rounded-md border border-slate-300 px-2 py-2 text-sm"
        />
      </div>

      <div className="mt-5 pt-4 border-t border-slate-200 flex items-baseline justify-between">
        <span className="text-sm text-slate-700">Line total</span>
        <span className="text-xl font-bold text-brand-orange">{formatMoney(lineTotal)}</span>
      </div>

      {!added ? (
        <>
          {startDateInvalid && (
            <p className="mt-3 text-xs text-red-700">{START_DATE_ERROR}</p>
          )}
          <button
            type="button"
            onClick={handleAdd}
            className="btn-primary w-full mt-4"
            disabled={mode === 'rent' && (days <= 0 || startDateInvalid)}
            data-event={`add_to_cart_${item.id}`}
          >
            Add to cart
          </button>
        </>
      ) : (
        <div className="mt-4 space-y-2">
          <p className="rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-900">
            Added to cart.
          </p>
          <button
            type="button"
            onClick={handleGoToCart}
            className="btn-primary w-full"
          >
            Go to cart
          </button>
          <button
            type="button"
            onClick={() => setAdded(false)}
            className="btn-secondary w-full"
          >
            Keep shopping
          </button>
        </div>
      )}

      <p className="mt-3 text-xs text-slate-600">
        No payment collected here. Deposit (${item.pricing.deposit} per unit for rentals) + delivery
        charged on checkout. Balance invoiced on delivery.
      </p>
    </div>
  );
}
