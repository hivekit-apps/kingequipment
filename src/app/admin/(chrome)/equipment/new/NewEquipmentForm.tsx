'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

type Category = { slug: string; name: string };

type Props = { categories: Category[] };

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export function NewEquipmentForm({ categories }: Props) {
  const router = useRouter();
  const [id, setId] = useState<string>('');
  const [idTouched, setIdTouched] = useState<boolean>(false);
  const [name, setName] = useState<string>('');
  const [shortName, setShortName] = useState<string>('');
  const [tagline, setTagline] = useState<string>('');
  const [category, setCategory] = useState<string>(categories[0]?.slug || '');
  const [klass, setKlass] = useState<string>('power');
  const [availRent, setAvailRent] = useState<boolean>(true);
  const [availBuy, setAvailBuy] = useState<boolean>(false);
  const [visible, setVisible] = useState<boolean>(true);
  const [daily, setDaily] = useState<string>('');
  const [weekly, setWeekly] = useState<string>('');
  const [monthly, setMonthly] = useState<string>('');
  const [buyNew, setBuyNew] = useState<string>('');
  const [buyUsed, setBuyUsed] = useState<string>('');
  const [deposit, setDeposit] = useState<string>('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');

  function onNameChange(v: string) {
    setName(v);
    if (!idTouched) setId(slugify(v));
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === 'saving') return;
    setStatus('saving');
    setErrorMsg('');

    const availability: string[] = [];
    if (availRent) availability.push('rent');
    if (availBuy) availability.push('buy');

    const num = (s: string): number | null => (s.trim() === '' ? null : Number(s));

    try {
      const res = await fetch('/api/admin/equipment/new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          name,
          shortName: shortName || name,
          tagline,
          category,
          class: klass || 'power',
          availability,
          visible,
          pricing: {
            daily: num(daily),
            weekly: num(weekly),
            monthly: num(monthly),
            buyNew: num(buyNew),
            buyUsed: num(buyUsed),
            deposit: num(deposit) ?? 0,
          },
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; id?: string };
      if (!res.ok || !data.id) {
        setErrorMsg(data.error || `Create failed (${res.status})`);
        setStatus('error');
        return;
      }
      router.push(`/admin/equipment/${data.id}`);
      router.refresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Network error');
      setStatus('error');
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-6 max-w-2xl">
      <section className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-lg font-bold text-gray-900">Basics</h2>
        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700">Name *</label>
            <input
              required
              type="text"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Flagro 400,000 BTU Construction Heater"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">URL slug (id) *</label>
            <input
              required
              type="text"
              value={id}
              onFocus={() => setIdTouched(true)}
              onChange={(e) => setId(e.target.value)}
              placeholder="flagro-400k-heater"
              pattern="^[a-z0-9]+(-[a-z0-9]+)*$"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm font-mono"
            />
            <p className="mt-1 text-xs text-gray-500">
              Lowercase letters, digits, single hyphens. Shown in the URL: /equipment/<span className="font-mono">{id || 'your-slug'}</span>
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Short name (used on cards)</label>
            <input
              type="text"
              value={shortName}
              onChange={(e) => setShortName(e.target.value)}
              placeholder="(defaults to Name if blank)"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Tagline (1-line description)</label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700">Category *</label>
              <select
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm bg-white"
              >
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">Class (free text)</label>
              <input
                type="text"
                value={klass}
                onChange={(e) => setKlass(e.target.value)}
                placeholder="drying, power, climate…"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-lg font-bold text-gray-900">Availability</h2>
        <div className="mt-4 flex gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={availRent} onChange={(e) => setAvailRent(e.target.checked)} />
            Rent
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={availBuy} onChange={(e) => setAvailBuy(e.target.checked)} />
            Buy
          </label>
          <label className="flex items-center gap-2 text-sm ml-6">
            <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} />
            Visible on site
          </label>
        </div>
      </section>

      <section className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-lg font-bold text-gray-900">Pricing (optional at create — can set later)</h2>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
          <Input label="Daily $" value={daily} onChange={setDaily} />
          <Input label="Weekly $" value={weekly} onChange={setWeekly} />
          <Input label="Monthly $" value={monthly} onChange={setMonthly} />
          <Input label="Buy new $" value={buyNew} onChange={setBuyNew} />
          <Input label="Buy used $" value={buyUsed} onChange={setBuyUsed} />
          <Input label="Deposit $" value={deposit} onChange={setDeposit} />
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={status === 'saving'}
          className="px-4 py-2 rounded-md bg-orange-700 text-white font-semibold text-sm hover:bg-orange-800 disabled:opacity-50"
        >
          {status === 'saving' ? 'Creating…' : 'Create equipment'}
        </button>
        {status === 'error' && <span className="text-sm text-red-700">{errorMsg}</span>}
      </div>
    </form>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700">{label}</label>
      <input
        type="number"
        min={0}
        step={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
      />
    </div>
  );
}
