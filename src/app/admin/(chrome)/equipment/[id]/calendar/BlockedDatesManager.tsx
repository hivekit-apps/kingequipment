'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

type Block = { id: string; blocked_date: string; reason: string | null };

export function BlockedDatesManager({
  equipmentId,
  initialBlocks,
}: {
  equipmentId: string;
  initialBlocks: Block[];
}) {
  const router = useRouter();
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [date, setDate] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [status, setStatus] = useState<'idle' | 'saving'>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');

  async function onAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!date) return;
    setStatus('saving');
    setErrorMsg('');
    try {
      const res = await fetch(`/api/admin/equipment/${equipmentId}/calendar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, reason }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; block?: Block };
      if (!res.ok) {
        setErrorMsg(data.error || `Add failed (${res.status})`);
        setStatus('idle');
        return;
      }
      if (data.block) setBlocks((prev) => [...prev, data.block!].sort((a, b) => a.blocked_date.localeCompare(b.blocked_date)));
      setDate('');
      setReason('');
      setStatus('idle');
      router.refresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Network error');
      setStatus('idle');
    }
  }

  async function onRemove(id: string) {
    setStatus('saving');
    try {
      await fetch(`/api/admin/equipment/${equipmentId}/calendar?id=${id}`, { method: 'DELETE' });
      setBlocks((prev) => prev.filter((b) => b.id !== id));
      setStatus('idle');
      router.refresh();
    } catch {
      setStatus('idle');
    }
  }

  return (
    <div className="mt-6 grid md:grid-cols-[1fr_1.4fr] gap-6">
      <form onSubmit={onAdd} className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-lg font-bold">Block a date</h2>
        <div className="mt-3">
          <label className="block text-xs font-semibold text-gray-700">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-2 py-2 text-sm"
          />
        </div>
        <div className="mt-3">
          <label className="block text-xs font-semibold text-gray-700">Reason (optional)</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-2 py-2 text-sm"
            placeholder="Maintenance, held for customer, etc."
          />
        </div>
        <button
          type="submit"
          disabled={status === 'saving' || !date}
          className="mt-4 px-4 py-2 rounded-md bg-orange-700 text-white font-semibold text-sm disabled:opacity-50"
        >
          {status === 'saving' ? 'Saving…' : 'Add block'}
        </button>
        {errorMsg && <p className="mt-2 text-sm text-red-700">{errorMsg}</p>}
      </form>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <h2 className="text-lg font-bold px-5 pt-5">Blocked dates</h2>
        {blocks.length === 0 ? (
          <p className="px-5 py-6 text-sm text-gray-500">None blocked.</p>
        ) : (
          <table className="mt-3 w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-600">
              <tr>
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-left">Reason</th>
                <th className="px-4 py-2 text-right">—</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {blocks.map((b) => (
                <tr key={b.id}>
                  <td className="px-4 py-2">{b.blocked_date}</td>
                  <td className="px-4 py-2 text-gray-700">{b.reason || '-'}</td>
                  <td className="px-4 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => onRemove(b.id)}
                      className="text-xs text-red-700 hover:underline"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
