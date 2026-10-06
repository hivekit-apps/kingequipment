'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function RestoreButton({ id, disabled }: { id: string; disabled: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>('');

  async function onRestore() {
    if (disabled || busy) return;
    if (!confirm(`Restore ${id}? The item will reappear on the catalog and the redirect will be removed.`)) return;
    setBusy(true);
    setErr('');
    try {
      const res = await fetch(`/api/admin/equipment/${id}/restore`, { method: 'POST' });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setErr(data.error || `Restore failed (${res.status})`);
        setBusy(false);
        return;
      }
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Network error');
      setBusy(false);
    }
  }

  if (disabled) {
    return (
      <span className="text-xs text-gray-400" title="Custom items are hard-deleted and cannot be restored.">
        Cannot restore
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onRestore}
        disabled={busy}
        className="px-3 py-1.5 rounded-md border border-green-300 text-green-700 font-semibold text-xs hover:bg-green-50 disabled:opacity-50"
      >
        {busy ? 'Restoring…' : 'Restore'}
      </button>
      {err && <span className="text-xs text-red-700">{err}</span>}
    </div>
  );
}
