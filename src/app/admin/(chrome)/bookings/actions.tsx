'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function BookingActions({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applyDiscount, setApplyDiscount] = useState(false);
  const [showDeny, setShowDeny] = useState(false);
  const [denyReason, setDenyReason] = useState('');

  async function confirm() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apply_google_review_discount: applyDiscount }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || `Confirm failed (${res.status})`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Confirm failed');
    } finally {
      setBusy(false);
    }
  }

  async function deny() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}/deny`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: denyReason }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || `Deny failed (${res.status})`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Deny failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2 min-w-[220px]">
      <label className="flex items-center gap-2 text-xs text-gray-600">
        <input
          type="checkbox"
          checked={applyDiscount}
          onChange={(e) => setApplyDiscount(e.target.checked)}
          className="rounded"
        />
        Apply 5% Google-review discount
      </label>
      <div className="flex gap-2">
        <button
          onClick={confirm}
          disabled={busy}
          className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-3 py-1.5 rounded-md disabled:opacity-50"
        >
          {busy ? '…' : 'Confirm'}
        </button>
        <button
          onClick={() => setShowDeny((v) => !v)}
          disabled={busy}
          className="border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm px-3 py-1.5 rounded-md disabled:opacity-50"
        >
          Deny
        </button>
      </div>
      {showDeny && (
        <div className="flex flex-col gap-2 w-full">
          <textarea
            value={denyReason}
            onChange={(e) => setDenyReason(e.target.value)}
            placeholder="Reason (optional; shown to customer)"
            rows={2}
            className="text-sm px-2 py-1 border border-gray-300 rounded-md w-full"
          />
          <button
            onClick={deny}
            disabled={busy}
            className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-3 py-1.5 rounded-md disabled:opacity-50"
          >
            {busy ? '…' : 'Send denial'}
          </button>
        </div>
      )}
      {error && <p className="text-xs text-red-600 text-right">{error}</p>}
    </div>
  );
}
