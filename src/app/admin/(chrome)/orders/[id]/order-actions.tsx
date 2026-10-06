'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  orderId: string;
  status: string;
}

type ActionKey = 'approve' | 'deny' | 'archive' | 'restore' | 'delete';

const LABELS: Record<ActionKey, string> = {
  approve: 'Approve',
  deny: 'Deny',
  archive: 'Archive',
  restore: 'Restore to pending',
  delete: 'Delete permanently',
};

export function OrderActions({ orderId, status }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<ActionKey | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function run(action: ActionKey) {
    if (action === 'delete') {
      const ok = window.confirm(
        'Permanently delete this order and all its line items?\nThis cannot be undone and the customer will NOT be notified.',
      );
      if (!ok) return;
    }
    if (action === 'deny') {
      const ok = window.confirm(
        'Deny this order? The customer will receive a short email saying we can\'t fulfill it.',
      );
      if (!ok) return;
    }
    setBusy(action);
    setMsg(null);
    setErr(null);
    try {
      const path =
        action === 'delete'
          ? `/api/admin/orders/${orderId}`
          : `/api/admin/orders/${orderId}/${action}`;
      const method = action === 'delete' ? 'DELETE' : 'POST';
      const res = await fetch(path, { method });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) throw new Error((data.error as string) ?? `HTTP ${res.status}`);
      if (action === 'delete') {
        setMsg('Deleted. Redirecting…');
        setTimeout(() => router.push('/admin/orders'), 400);
        return;
      }
      if (action === 'approve') {
        const errs = data.email_errors as string[] | undefined;
        setMsg(
          errs && errs.length > 0
            ? `Approved — but email failed: ${errs.join('; ')}. Fix and resend if needed.`
            : `Approved. Customer notified. e-Transfer ref: ${data.etransfer_ref ?? 'KE-???'}`,
        );
      } else if (action === 'deny') {
        const errs = data.email_errors as string[] | undefined;
        setMsg(
          errs && errs.length > 0
            ? `Denied — but email failed: ${errs.join('; ')}.`
            : 'Denied. Customer notified.',
        );
      } else if (action === 'archive') {
        setMsg('Archived.');
      } else if (action === 'restore') {
        setMsg('Restored to pending.');
      }
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(null);
    }
  }

  const showApprove = status === 'pending';
  const showDeny = status === 'pending';
  const showArchive = status !== 'archived' && status !== 'pending';
  const showRestore = status === 'archived';
  // Delete is always available.

  const buttons: { key: ActionKey; className: string; show: boolean }[] = [
    {
      key: 'approve',
      className: 'bg-orange-600 text-white hover:bg-orange-700',
      show: showApprove,
    },
    {
      key: 'deny',
      className: 'bg-white border border-red-300 text-red-700 hover:bg-red-50',
      show: showDeny,
    },
    {
      key: 'archive',
      className: 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50',
      show: showArchive,
    },
    {
      key: 'restore',
      className: 'bg-white border border-amber-300 text-amber-800 hover:bg-amber-50',
      show: showRestore,
    },
    {
      key: 'delete',
      className: 'bg-white border border-red-300 text-red-700 hover:bg-red-50',
      show: true,
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {buttons
          .filter((b) => b.show)
          .map((b) => (
            <button
              key={b.key}
              onClick={() => run(b.key)}
              disabled={busy !== null}
              className={`inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium transition disabled:opacity-50 ${b.className}`}
            >
              {busy === b.key ? 'Working…' : LABELS[b.key]}
            </button>
          ))}
      </div>
      {msg && <p className="text-sm text-green-700">{msg}</p>}
      {err && <p className="text-sm text-red-700">Error: {err}</p>}
    </div>
  );
}
