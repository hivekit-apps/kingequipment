'use client';

import { useState } from 'react';
import type { KirilSettings } from '@/lib/settings';

interface Props {
  initial: KirilSettings;
}

async function patch(key: string, value: unknown): Promise<void> {
  const res = await fetch('/api/admin/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value }),
  });
  if (!res.ok) throw new Error(`PATCH failed (${res.status})`);
}

export function SettingsForm({ initial }: Props) {
  const [s, setS] = useState(initial);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function save(key: string, mapped: string, value: unknown) {
    setStatus('saving');
    setError(null);
    try {
      await patch(key, value);
      setS((cur) => ({ ...cur, [mapped]: value }));
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
      setStatus('error');
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Row
        label="Deposit percentage"
        description="Fraction of the rental deposit charged up-front when an order is approved. e.g. 0.20 means the customer pays 20% of the sum-of-item-deposits before delivery."
      >
        <PctInput value={s.deposit_pct} onSave={(v) => save('deposit_pct', 'deposit_pct', v)} />
      </Row>

      <Row label="HST tax rate" description="Ontario HST = 0.13. Change if service area expands outside Ontario.">
        <PctInput value={s.tax_rate} onSave={(v) => save('tax_rate', 'tax_rate', v)} />
      </Row>

      <Row
        label="5% Google-review discount enabled"
        description="Reserved for future per-order discount at approval time."
      >
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={s.discounts_google_review_enabled}
            onChange={(e) => save('discounts.google_review_enabled', 'discounts_google_review_enabled', e.target.checked)}
          />
          <span className="text-sm text-gray-700">{s.discounts_google_review_enabled ? 'On' : 'Off'}</span>
        </label>
      </Row>

      <Row label="Discount amount" description="Percent off subtotal when the Google-review discount applies.">
        <PctInput value={s.discounts_google_review_pct} onSave={(v) => save('discounts.google_review_pct', 'discounts_google_review_pct', v)} />
      </Row>

      <Row label="E-transfer recipient email" description="Shown on every approval email as the e-transfer destination.">
        <TextInput value={s.etransfer_recipient_email} onSave={(v) => save('etransfer_recipient_email', 'etransfer_recipient_email', v)} />
      </Row>

      {status === 'saving' && <p className="text-sm text-gray-500">Saving…</p>}
      {status === 'saved' && <p className="text-sm text-green-600">Saved.</p>}
      {status === 'error' && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

function Row({ label, description, children }: { label: string; description: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900">{label}</p>
          <p className="text-sm text-gray-600 mt-1">{description}</p>
        </div>
        <div className="flex-shrink-0">{children}</div>
      </div>
    </div>
  );
}

function PctInput({ value, onSave }: { value: number; onSave: (v: number) => void }) {
  const [v, setV] = useState(String(value));
  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        step="0.01"
        min="0"
        max="1"
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => {
          const n = parseFloat(v);
          if (!Number.isNaN(n) && n !== value) onSave(n);
        }}
        className="w-24 px-2 py-1 border border-gray-300 rounded-md text-sm text-right"
      />
      <span className="text-sm text-gray-500">({(parseFloat(v) * 100).toFixed(1)}%)</span>
    </div>
  );
}

function TextInput({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [v, setV] = useState(value);
  return (
    <input
      type="email"
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => {
        if (v !== value) onSave(v);
      }}
      className="w-64 px-2 py-1 border border-gray-300 rounded-md text-sm"
    />
  );
}
