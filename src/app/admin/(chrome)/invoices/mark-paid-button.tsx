'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function MarkPaidButton({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const [method, setMethod] = useState<'e-transfer' | 'manual' | 'stripe' | 'other'>('e-transfer');
  const [reference, setReference] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/invoices/${invoiceId}/mark-paid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method, reference }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || `Failed (${res.status})`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  if (!show) {
    return (
      <button
        onClick={() => setShow(true)}
        className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-50 text-gray-700"
      >
        Mark paid
      </button>
    );
  }
  return (
    <div className="flex flex-col gap-1 items-end">
      <select
        value={method}
        onChange={(e) => setMethod(e.target.value as typeof method)}
        className="text-xs px-2 py-1 border border-gray-300 rounded"
      >
        <option value="e-transfer">e-transfer</option>
        <option value="manual">manual (cash/cheque)</option>
        <option value="stripe">stripe</option>
        <option value="other">other</option>
      </select>
      <input
        type="text"
        value={reference}
        onChange={(e) => setReference(e.target.value)}
        placeholder="Reference (optional)"
        className="text-xs px-2 py-1 border border-gray-300 rounded w-32"
      />
      <div className="flex gap-1">
        <button
          onClick={submit}
          disabled={busy}
          className="text-xs px-2 py-1 rounded bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
        >
          {busy ? '…' : 'Save'}
        </button>
        <button
          onClick={() => setShow(false)}
          className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
