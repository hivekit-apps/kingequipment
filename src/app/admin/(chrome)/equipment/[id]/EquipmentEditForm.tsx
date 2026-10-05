'use client';

import { useState, type FormEvent } from 'react';

type Pricing = {
  daily: number | null;
  weekly: number | null;
  monthly: number | null;
  buyNew: number | null;
  buyUsed: number | null;
  deposit: number;
};

type CityInfo = { slug: string; name: string; defaultPrice: number };

type Props = {
  id: string;
  initialPricing: Pricing;
  initialAvailability: ('rent' | 'buy')[];
  initialVisible: boolean;
  initialCityDelivery: Record<string, number>;
  cities: CityInfo[];
};

export function EquipmentEditForm({
  id,
  initialPricing,
  initialAvailability,
  initialVisible,
  initialCityDelivery,
  cities,
}: Props) {
  const [pricing, setPricing] = useState<Pricing>(initialPricing);
  const [availability, setAvailability] = useState<('rent' | 'buy')[]>(initialAvailability);
  const [visible, setVisible] = useState<boolean>(initialVisible);
  const [cityDelivery, setCityDelivery] = useState<Record<string, number>>(initialCityDelivery);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');

  function toggleAvail(k: 'rent' | 'buy') {
    setAvailability((prev) =>
      prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k],
    );
  }

  function setPrice<K extends keyof Pricing>(key: K, raw: string) {
    const n = raw === '' ? null : Number(raw);
    setPricing((p) => ({ ...p, [key]: n == null || Number.isNaN(n) ? null : n }));
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === 'saving') return;
    setStatus('saving');
    setErrorMsg('');
    try {
      const res = await fetch(`/api/admin/equipment/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pricing,
          availability,
          visible,
          city_delivery: cityDelivery,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setErrorMsg(data.error || `Save failed (${res.status})`);
        setStatus('error');
        return;
      }
      setStatus('saved');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Network error');
      setStatus('error');
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-6">
      <section className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-lg font-bold text-gray-900">Pricing (CAD)</h2>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
          <PriceInput label="Daily" value={pricing.daily} onChange={(v) => setPrice('daily', v)} />
          <PriceInput label="Weekly" value={pricing.weekly} onChange={(v) => setPrice('weekly', v)} />
          <PriceInput label="Monthly" value={pricing.monthly} onChange={(v) => setPrice('monthly', v)} />
          <PriceInput label="Buy new" value={pricing.buyNew} onChange={(v) => setPrice('buyNew', v)} />
          <PriceInput label="Buy used" value={pricing.buyUsed} onChange={(v) => setPrice('buyUsed', v)} />
          <PriceInput label="Deposit" value={pricing.deposit} onChange={(v) => setPrice('deposit', v)} />
        </div>
      </section>

      <section className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-lg font-bold text-gray-900">Availability</h2>
        <div className="mt-4 flex gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={availability.includes('rent')}
              onChange={() => toggleAvail('rent')}
            />
            Rent
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={availability.includes('buy')}
              onChange={() => toggleAvail('buy')}
            />
            Buy
          </label>
          <label className="flex items-center gap-2 text-sm ml-6">
            <input
              type="checkbox"
              checked={visible}
              onChange={(e) => setVisible(e.target.checked)}
            />
            Visible on site
          </label>
        </div>
      </section>

      <section className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-lg font-bold text-gray-900">Per-city delivery override</h2>
        <p className="text-xs text-gray-600 mt-1">
          Leave blank to use the city default. Enter a dollar amount to override just for this SKU.
        </p>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
          {cities.map((c) => (
            <div key={c.slug}>
              <label className="block text-xs font-medium text-gray-700">
                {c.name} <span className="text-gray-400">(def ${c.defaultPrice})</span>
              </label>
              <input
                type="number"
                min={0}
                step={1}
                value={cityDelivery[c.slug] ?? ''}
                onChange={(e) => {
                  const raw = e.target.value;
                  setCityDelivery((prev) => {
                    const next = { ...prev };
                    if (raw === '') delete next[c.slug];
                    else next[c.slug] = Number(raw);
                    return next;
                  });
                }}
                className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
          ))}
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={status === 'saving'}
          className="px-4 py-2 rounded-md bg-orange-700 text-white font-semibold text-sm hover:bg-orange-800 disabled:opacity-50"
        >
          {status === 'saving' ? 'Saving…' : 'Save'}
        </button>
        {status === 'saved' && (
          <span className="text-sm text-green-700">Saved.</span>
        )}
        {status === 'error' && (
          <span className="text-sm text-red-700">{errorMsg || 'Save failed.'}</span>
        )}
      </div>
    </form>
  );
}

function PriceInput({ label, value, onChange }: { label: string; value: number | null; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700">{label}</label>
      <input
        type="number"
        min={0}
        step={1}
        value={value == null ? '' : value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
      />
    </div>
  );
}
