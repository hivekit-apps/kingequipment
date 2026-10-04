'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  DELIVERY_ZONE_OPTIONS,
  deliveryPriceLabel,
  rentalDays,
  rentalTierLabel,
  todayISO,
  plusDaysISO,
  dailyRentalSubtotal,
  operatorSubtotal,
  deliverySubtotal,
  formatMoney,
  type DeliveryZone,
  type SheetVars,
} from '@/lib/booking';

function enumerateDates(startISO: string, endISO: string): string[] {
  const out: string[] = [];
  const s = new Date(startISO + 'T00:00:00Z');
  const e = new Date(endISO + 'T00:00:00Z');
  for (let d = new Date(s); d <= e; d.setUTCDate(d.getUTCDate() + 1)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

type Props = {
  vars: SheetVars;
};

export function BookingForm({ vars }: Props) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const today = todayISO();
  const tomorrow = plusDaysISO(today, 1);

  const [startDate, setStartDate] = useState<string>(today);
  const [endDate, setEndDate] = useState<string>(tomorrow);
  const [zone, setZone] = useState<DeliveryZone>('king-township');
  const [operator, setOperator] = useState<boolean>(false);

  const [unavailable, setUnavailable] = useState<Set<string>>(new Set());
  useEffect(() => {
    const from = today;
    const to = plusDaysISO(today, 120); // 4-month horizon
    fetch(`/api/availability?equipment=mini-stand-on&from=${from}&to=${to}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.unavailable) {
          setUnavailable(new Set((d.unavailable as { date: string }[]).map((u) => u.date)));
        }
      })
      .catch(() => {/* silent — form still works, availability check is best-effort */});
  }, [today]);

  const conflictDates = useMemo(() => {
    if (!startDate || !endDate || endDate < startDate) return [] as string[];
    return enumerateDates(startDate, endDate).filter((d) => unavailable.has(d));
  }, [startDate, endDate, unavailable]);

  const days = useMemo(() => rentalDays(startDate, endDate), [startDate, endDate]);
  const tier = useMemo(() => rentalTierLabel(days, vars), [days, vars]);
  const deliveryPrice = deliveryPriceLabel(zone, vars);

  const rentalSub = useMemo(() => dailyRentalSubtotal(days, vars), [days, vars]);
  const operatorSub = useMemo(() => operatorSubtotal(days, vars, operator), [days, vars, operator]);
  const deliverySub = useMemo(() => deliverySubtotal(zone, vars), [zone, vars]);
  const estimateTotal = useMemo(() => {
    if (rentalSub == null) return null;
    return (
      (rentalSub ?? 0) +
      (operatorSub ?? 0) +
      (deliverySub ?? 0)
    );
  }, [rentalSub, operatorSub, deliverySub]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === 'sending') return;

    if (!startDate || !endDate || days <= 0) {
      setErrorMsg('Please pick a start and end date.');
      setStatus('error');
      return;
    }

    setStatus('sending');
    setErrorMsg('');

    const fd = new FormData(e.currentTarget);
    const body = {
      name: String(fd.get('name') || ''),
      email: String(fd.get('email') || ''),
      phone: String(fd.get('phone') || ''),
      address: String(fd.get('address') || ''),
      startDate,
      endDate,
      days,
      zone,
      operator,
      notes: String(fd.get('notes') || ''),
      hp: String(fd.get('hp') || ''),
      source: 'book-page',
    };

    try {
      const res = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        setErrorMsg(err.error || `Request failed (${res.status})`);
        setStatus('error');
        return;
      }
      setStatus('sent');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Network error');
      setStatus('error');
    }
  }

  if (status === 'sent') {
    return (
      <div className="rounded-md bg-green-50 border border-green-200 p-6 text-base text-green-900">
        <p className="font-bold text-lg">Thanks — we got your request.</p>
        <p className="mt-2">
          We&apos;ll review the dates and email you back shortly to confirm
          availability and finalize delivery details.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <input
        type="text"
        name="hp"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
        defaultValue=""
      />

      {/* Dates */}
      <fieldset className="space-y-3">
        <legend className="text-base font-bold text-slate-950">Rental dates</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="startDate" className="block text-sm font-semibold text-slate-950">
              Start date
            </label>
            <input
              id="startDate"
              name="startDate"
              type="date"
              required
              min={today}
              value={startDate}
              onChange={(e) => {
                const v = e.target.value;
                setStartDate(v);
                if (endDate && endDate < v) setEndDate(v);
              }}
              className="mt-1 block w-full min-h-[48px] rounded-md border border-slate-300 px-3 text-base focus:border-brand-orange focus:ring-1 focus:ring-brand-orange"
            />
          </div>
          <div>
            <label htmlFor="endDate" className="block text-sm font-semibold text-slate-950">
              End date
            </label>
            <input
              id="endDate"
              name="endDate"
              type="date"
              required
              min={startDate || today}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 block w-full min-h-[48px] rounded-md border border-slate-300 px-3 text-base focus:border-brand-orange focus:ring-1 focus:ring-brand-orange"
            />
          </div>
        </div>
        <p className="text-sm text-slate-700">
          {days > 0
            ? `${days} day${days > 1 ? 's' : ''} · ${tier}`
            : 'Pick a start and end date.'}
        </p>
        {conflictDates.length > 0 && (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            <strong>Heads up:</strong> {conflictDates.length === 1 ? `${conflictDates[0]} is` : `${conflictDates.length} of these days are`} already booked or blocked. Please pick different dates — we can&rsquo;t hold the machine for that period.
          </p>
        )}
      </fieldset>

      {/* Delivery zone */}
      <fieldset className="space-y-3">
        <legend className="text-base font-bold text-slate-950">Delivery</legend>
        <div className="space-y-2">
          {DELIVERY_ZONE_OPTIONS.map((opt) => {
            const checked = zone === opt.value;
            const price = deliveryPriceLabel(opt.value, vars);
            return (
              <label
                key={opt.value}
                className={`flex items-start gap-3 rounded-md border p-3 cursor-pointer ${
                  checked
                    ? 'border-brand-orange bg-orange-50'
                    : 'border-slate-300 bg-white hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="zone"
                  value={opt.value}
                  checked={checked}
                  onChange={() => setZone(opt.value)}
                  className="mt-1"
                />
                <span className="flex-1">
                  <span className="block text-sm font-semibold text-slate-950">
                    {opt.label}
                  </span>
                  <span className="block text-xs text-slate-600">{opt.help}</span>
                </span>
                <span className="text-sm font-bold text-brand-orange whitespace-nowrap">
                  {price}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* Operator add-on */}
      <fieldset className="space-y-3">
        <legend className="text-base font-bold text-slate-950">Trained operator (optional)</legend>
        <label
          className={`flex items-start gap-3 rounded-md border p-3 cursor-pointer ${
            operator
              ? 'border-brand-orange bg-orange-50'
              : 'border-slate-300 bg-white hover:bg-slate-50'
          }`}
        >
          <input
            type="checkbox"
            name="operator"
            checked={operator}
            onChange={(e) => setOperator(e.target.checked)}
            className="mt-1"
          />
          <span className="flex-1">
            <span className="block text-sm font-semibold text-slate-950">
              Add a trained machine operator
            </span>
            <span className="block text-xs text-slate-600">
              Experienced operator runs the loader for you on-site. Skip if you&apos;re running it yourself.
            </span>
          </span>
          <span className="text-sm font-bold text-brand-orange whitespace-nowrap">
            {vars.operatorPricePerDay}/day
          </span>
        </label>
      </fieldset>

      {/* Cost breakdown */}
      {days > 0 && (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm">
          <p className="font-bold text-slate-950">Estimated cost</p>
          <dl className="mt-2 space-y-1">
            <div className="flex justify-between">
              <dt className="text-slate-700">
                Rental · {days} day{days > 1 ? 's' : ''} · {tier.replace(/^Daily rate · |^Weekly rate · |^Monthly rate · /, '')}
              </dt>
              <dd className="font-semibold text-slate-950">
                {rentalSub != null
                  ? formatMoney(rentalSub)
                  : 'By email'}
              </dd>
            </div>
            {operator && (
              <div className="flex justify-between">
                <dt className="text-slate-700">
                  Operator · {days} × {vars.operatorPricePerDay}
                </dt>
                <dd className="font-semibold text-slate-950">
                  {operatorSub != null ? formatMoney(operatorSub) : '—'}
                </dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-slate-700">Delivery · {DELIVERY_ZONE_OPTIONS.find((o) => o.value === zone)?.label}</dt>
              <dd className="font-semibold text-slate-950">{deliveryPrice}</dd>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2 mt-2">
              <dt className="font-bold text-slate-950">Estimated total</dt>
              <dd className="font-bold text-brand-orange">
                {estimateTotal != null && deliverySub != null
                  ? formatMoney(estimateTotal)
                  : rentalSub == null
                    ? 'By email'
                    : 'Plus delivery'}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-slate-600">
            Estimate only. We&apos;ll email you the final price after reviewing your dates and location.
          </p>
        </div>
      )}

      {/* Contact details */}
      <fieldset className="space-y-3">
        <legend className="text-base font-bold text-slate-950">Your details</legend>
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
            className="mt-1 block w-full min-h-[48px] rounded-md border border-slate-300 px-3 text-base focus:border-brand-orange focus:ring-1 focus:ring-brand-orange"
          />
        </div>
        <div>
          <label htmlFor="phone" className="block text-sm font-semibold text-slate-950">
            Phone <span className="font-normal text-slate-600">(optional)</span>
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="e.g. 416-555-0123"
            className="mt-1 block w-full min-h-[48px] rounded-md border border-slate-300 px-3 text-base focus:border-brand-orange focus:ring-1 focus:ring-brand-orange"
          />
          <p className="mt-1 text-xs text-slate-600">
            We&apos;ll email you back. Add a phone number only if you&apos;d prefer a text or call.
          </p>
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
            className="mt-1 block w-full min-h-[48px] rounded-md border border-slate-300 px-3 text-base focus:border-brand-orange focus:ring-1 focus:ring-brand-orange"
          />
          <p className="mt-1 text-xs text-slate-600">
            Used to confirm delivery zone and route. Not shared outside our team.
          </p>
        </div>
        <div>
          <label htmlFor="notes" className="block text-sm font-semibold text-slate-950">
            Anything else? <span className="font-normal text-slate-600">(optional)</span>
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            placeholder="Attachments needed, access notes, preferred delivery window…"
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-base focus:border-brand-orange focus:ring-1 focus:ring-brand-orange"
          />
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={status === 'sending' || conflictDates.length > 0}
        className="btn-primary w-full text-lg"
      >
        {status === 'sending' ? 'Sending…' : conflictDates.length > 0 ? 'Pick different dates' : 'Send request'}
      </button>
      {status === 'error' && (
        <p className="text-sm text-red-700" role="alert">
          {errorMsg || 'Something went wrong. Please try again in a moment.'}
        </p>
      )}
      <p className="text-xs text-slate-600">
        Sending a request does not lock in a rental yet — we&apos;ll email back
        to confirm availability and delivery. No payment is collected here.
      </p>
    </form>
  );
}
