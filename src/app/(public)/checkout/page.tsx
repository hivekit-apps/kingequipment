'use client';

import Link from 'next/link';
import { useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/components/CartContext';
import { calculateRentalPrice, calculateBuyPrice, daysBetween, formatMoney } from '@/lib/pricing';
import { getSiteConfig } from '@/lib/config';

const cfg = getSiteConfig();

export default function CheckoutPage() {
  const router = useRouter();
  const { items, city, clearCart, hydrated } = useCart();
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [orderId, setOrderId] = useState<string>('');

  const selectedCity = useMemo(
    () => cfg.cityPages.cities.find((c) => c.slug === city) || cfg.cityPages.cities[0],
    [city],
  );

  const rows = useMemo(() => {
    return items.map((it) => {
      const equipment = cfg.equipment.find((e) => e.id === it.equipmentId);
      if (!equipment) return null;
      if (it.kind === 'rent') {
        const days = daysBetween(it.startDate || '', it.endDate || '');
        const rp = calculateRentalPrice(equipment, days);
        return { cart: it, equipment, lineTotal: rp.total * it.qty, days };
      }
      const bp = calculateBuyPrice(equipment, it.buyCondition || 'new');
      return { cart: it, equipment, lineTotal: bp.total * it.qty, days: 0 };
    }).filter((r): r is NonNullable<typeof r> => r !== null);
  }, [items]);

  const rentalSubtotal = rows
    .filter((r) => r.cart.kind === 'rent')
    .reduce((sum, r) => sum + r.lineTotal, 0);
  const buySubtotal = rows
    .filter((r) => r.cart.kind === 'buy')
    .reduce((sum, r) => sum + r.lineTotal, 0);
  const deliveryPrice = rows.length > 0 ? selectedCity?.deliveryPrice ?? 0 : 0;
  const grandTotal = rentalSubtotal + buySubtotal + deliveryPrice;

  // Date validation for rental items.
  const dateIssues = useMemo(() => {
    const issues: string[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (const r of rows) {
      if (r.cart.kind !== 'rent') continue;
      const label = r.equipment.shortName;
      const start = r.cart.startDate;
      const end = r.cart.endDate;
      if (!start || !end) {
        issues.push(`${label}: start and end dates are required.`);
        continue;
      }
      const sd = new Date(start);
      const ed = new Date(end);
      if (Number.isNaN(sd.getTime()) || Number.isNaN(ed.getTime())) {
        issues.push(`${label}: pick valid start and end dates.`);
        continue;
      }
      if (sd < today) {
        issues.push(`${label}: start date can't be in the past.`);
        continue;
      }
      if (ed < sd) {
        issues.push(`${label}: end date must be on or after the start date.`);
        continue;
      }
      if (r.days <= 0) {
        issues.push(`${label}: rental must be at least one day.`);
      }
    }
    return issues;
  }, [rows]);
  const hasDateIssues = dateIssues.length > 0;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === 'sending') return;
    if (hasDateIssues) {
      setErrorMsg(dateIssues[0]);
      setStatus('error');
      return;
    }
    setStatus('sending');
    setErrorMsg('');
    const fd = new FormData(e.currentTarget);
    const body = {
      customer_name: String(fd.get('name') || ''),
      customer_email: String(fd.get('email') || ''),
      customer_phone: String(fd.get('phone') || ''),
      delivery_address: String(fd.get('address') || ''),
      delivery_city: selectedCity?.slug || '',
      notes: String(fd.get('notes') || ''),
      items: items.map((it) => ({
        equipmentId: it.equipmentId,
        kind: it.kind,
        qty: it.qty,
        startDate: it.startDate || null,
        endDate: it.endDate || null,
        buyCondition: it.buyCondition || null,
      })),
    };
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as { order_id?: string; error?: string };
      if (!res.ok) {
        setErrorMsg(data.error || `Request failed (${res.status})`);
        setStatus('error');
        return;
      }
      setOrderId(data.order_id || '');
      setStatus('sent');
      clearCart();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Network error');
      setStatus('error');
    }
  }

  if (!hydrated) {
    return (
      <section className="container-page py-12">
        <h1 className="text-3xl md:text-4xl">Checkout</h1>
        <p className="mt-4 text-slate-700">Loading…</p>
      </section>
    );
  }

  if (status === 'sent') {
    return (
      <section className="container-page py-12">
        <h1 className="text-3xl md:text-4xl">Order received</h1>
        <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-6">
          <p className="text-base font-bold text-green-900">Thanks — your order is in.</p>
          {orderId && (
            <p className="mt-2 text-sm text-green-900">Reference: #{orderId.slice(0, 8)}</p>
          )}
          <p className="mt-2 text-sm text-green-900">
            We&apos;ll email you within a few hours during business hours with delivery
            confirmation and deposit payment instructions (Interac e-Transfer).
          </p>
        </div>
        <Link href="/equipment" className="mt-6 inline-block btn-secondary">
          Keep shopping
        </Link>
      </section>
    );
  }

  if (rows.length === 0) {
    return (
      <section className="container-page py-12">
        <h1 className="text-3xl md:text-4xl">Checkout</h1>
        <p className="mt-4 text-slate-700">Your cart is empty.</p>
        <Link href="/equipment" className="mt-6 inline-block btn-primary">
          Browse equipment
        </Link>
      </section>
    );
  }

  return (
    <section className="container-page py-12">
      <h1 className="text-3xl md:text-4xl">Checkout</h1>
      <p className="mt-2 text-sm text-slate-700">
        Enter your contact and delivery details — we&apos;ll follow up by email to confirm.
      </p>

      <form onSubmit={onSubmit} className="mt-8 grid lg:grid-cols-[1.4fr_1fr] gap-8 items-start" noValidate>
        <div className="rounded-lg border border-slate-200 bg-white p-6 space-y-5">
          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-slate-950">
              Full name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              minLength={2}
              autoComplete="name"
              className="mt-1 block w-full min-h-[48px] rounded-md border border-slate-300 px-3 text-base focus:border-brand-orange focus:ring-1 focus:ring-brand-orange"
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-slate-950">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="mt-1 block w-full min-h-[48px] rounded-md border border-slate-300 px-3 text-base"
              />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-semibold text-slate-950">
                Phone <span className="text-slate-600 font-normal">(optional)</span>
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                className="mt-1 block w-full min-h-[48px] rounded-md border border-slate-300 px-3 text-base"
              />
            </div>
          </div>
          <div>
            <label htmlFor="address" className="block text-sm font-semibold text-slate-950">
              Delivery address
            </label>
            <input
              id="address"
              name="address"
              type="text"
              required
              autoComplete="street-address"
              placeholder="Street, City, Postal code"
              className="mt-1 block w-full min-h-[48px] rounded-md border border-slate-300 px-3 text-base"
            />
            <p className="mt-1 text-xs text-slate-600">
              Delivery city: <strong>{selectedCity?.name}</strong> (${selectedCity?.deliveryPrice}).
              <Link href="/cart" className="ml-2 underline">change</Link>
            </p>
          </div>
          <div>
            <label htmlFor="notes" className="block text-sm font-semibold text-slate-950">
              Notes <span className="text-slate-600 font-normal">(optional)</span>
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              placeholder="Preferred delivery window, access notes, special requests…"
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-base"
            />
          </div>
          {hasDateIssues && (
            <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="alert">
              <p className="font-semibold">Please fix the rental dates before placing the order:</p>
              <ul className="mt-2 list-disc list-inside space-y-1">
                {dateIssues.map((issue, i) => (
                  <li key={i}>{issue}</li>
                ))}
              </ul>
              <p className="mt-2">
                <Link href="/cart" className="underline font-semibold">Edit dates in cart</Link>
              </p>
            </div>
          )}
          <button
            type="submit"
            disabled={status === 'sending' || hasDateIssues}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === 'sending' ? 'Submitting…' : 'Place order'}
          </button>
          {status === 'error' && (
            <p className="text-sm text-red-700" role="alert">
              {errorMsg || 'Something went wrong. Please try again in a moment.'}
            </p>
          )}
          <p className="text-xs text-slate-600">
            No payment collected on this page. We&apos;ll email instructions to pay the
            refundable deposit + delivery via Interac e-Transfer within a few hours. The
            rental balance is invoiced the morning of delivery.
          </p>
        </div>

        <aside className="rounded-lg border border-slate-200 bg-white p-5 lg:sticky lg:top-6">
          <h2 className="text-lg font-bold text-slate-950">Order summary</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {rows.map((r) => (
              <li
                key={`${r.cart.equipmentId}-${r.cart.kind}`}
                className="flex justify-between gap-2 border-b border-slate-100 pb-2"
              >
                <span>
                  <strong>{r.equipment.shortName}</strong> × {r.cart.qty}
                  <br />
                  <span className="text-xs text-slate-600">
                    {r.cart.kind === 'rent'
                      ? `${r.days} day${r.days === 1 ? '' : 's'} rental`
                      : `Buy (${r.cart.buyCondition || 'new'})`}
                  </span>
                </span>
                <span className="font-semibold">{formatMoney(r.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-1 text-sm">
            {rentalSubtotal > 0 && (
              <div className="flex justify-between">
                <dt>Rental subtotal</dt>
                <dd>{formatMoney(rentalSubtotal)}</dd>
              </div>
            )}
            {buySubtotal > 0 && (
              <div className="flex justify-between">
                <dt>Purchase subtotal</dt>
                <dd>{formatMoney(buySubtotal)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt>Delivery ({selectedCity?.name})</dt>
              <dd>{formatMoney(deliveryPrice)}</dd>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-200 text-base">
              <dt className="font-bold">Grand total</dt>
              <dd className="font-bold text-brand-orange">{formatMoney(grandTotal)}</dd>
            </div>
          </dl>
        </aside>
      </form>
    </section>
  );
}
