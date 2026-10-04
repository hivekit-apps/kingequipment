'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface AvailabilityRow {
  date: string;
  status: 'booked' | 'blocked' | 'maintenance';
  source: 'manual' | 'booking';
  reason: string | null;
}

interface Props {
  equipmentSlug: string;
  equipmentName: string;
  initialAvailability: AvailabilityRow[];
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function daysInMonth(y: number, m: number): number {
  return new Date(y, m + 1, 0).getDate();
}

function monthName(y: number, m: number): string {
  return new Date(y, m, 1).toLocaleDateString('en-CA', { month: 'long', year: 'numeric' });
}

export function CalendarView({ equipmentSlug, equipmentName, initialAvailability }: Props) {
  const router = useRouter();
  const [availability, setAvailability] = useState<AvailabilityRow[]>(initialAvailability);
  const [cursor, setCursor] = useState<{ y: number; m: number }>(() => {
    const now = new Date();
    return { y: now.getUTCFullYear(), m: now.getUTCMonth() };
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availMap = useMemo(() => {
    const m = new Map<string, AvailabilityRow>();
    for (const a of availability) m.set(a.date, a);
    return m;
  }, [availability]);

  const refresh = useCallback(async () => {
    const from = isoDate(new Date(Date.UTC(cursor.y, cursor.m, 1)));
    const to = isoDate(new Date(Date.UTC(cursor.y, cursor.m + 2, 0))); // through end of next month
    try {
      const res = await fetch(`/api/availability?equipment=${equipmentSlug}&from=${from}&to=${to}`);
      const data = await res.json();
      if (res.ok && data.unavailable) {
        setAvailability(data.unavailable.map((r: { date: string; status: string }) => ({ date: r.date, status: r.status as AvailabilityRow['status'], source: 'manual', reason: null })));
      }
    } catch (err) {
      console.error('refresh failed', err);
    }
  }, [cursor.y, cursor.m, equipmentSlug]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function onDayClick(dateISO: string) {
    if (busy) return;
    const existing = availMap.get(dateISO);
    if (existing?.source === 'booking') {
      alert('This day is booked. Cancel the booking to free it up.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (existing?.source === 'manual') {
        // Unblock
        const res = await fetch('/api/admin/calendar/block', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ equipment_slug: equipmentSlug, date: dateISO }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error || `Unblock failed`);
      } else {
        // Block
        const reason = prompt('Reason for blocking this day? (optional)') ?? '';
        const res = await fetch('/api/admin/calendar/block', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ equipment_slug: equipmentSlug, dates: [dateISO], reason: reason || 'Manual block' }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error || `Block failed`);
      }
      await refresh();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  function nav(delta: number) {
    setCursor((c) => {
      const total = c.y * 12 + c.m + delta;
      return { y: Math.floor(total / 12), m: total % 12 };
    });
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => nav(-1)} className="px-3 py-1 text-sm rounded border border-gray-300 hover:bg-gray-50">&larr; Prev</button>
        <h2 className="text-lg font-semibold text-gray-900">
          {monthName(cursor.y, cursor.m)} &middot; <span className="font-normal text-gray-500">{equipmentName}</span>
        </h2>
        <button onClick={() => nav(1)} className="px-3 py-1 text-sm rounded border border-gray-300 hover:bg-gray-50">Next &rarr;</button>
      </div>

      <MonthGrid year={cursor.y} month={cursor.m} availMap={availMap} onDayClick={onDayClick} busy={busy} />

      <div className="mt-4 flex items-center gap-4 text-xs text-gray-600">
        <Legend color="bg-white border border-gray-300" label="Available" />
        <Legend color="bg-green-200" label="Booked" />
        <Legend color="bg-red-200" label="Blocked" />
        <Legend color="bg-yellow-200" label="Maintenance" />
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`inline-block w-4 h-4 rounded ${color}`} />
      {label}
    </span>
  );
}

function MonthGrid({
  year,
  month,
  availMap,
  onDayClick,
  busy,
}: {
  year: number;
  month: number;
  availMap: Map<string, { status: string; source: string; reason: string | null }>;
  onDayClick: (d: string) => void;
  busy: boolean;
}) {
  const firstOfMonth = new Date(Date.UTC(year, month, 1));
  const startDow = firstOfMonth.getUTCDay(); // 0=Sun
  const days = daysInMonth(year, month);
  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const today = isoDate(new Date());

  return (
    <div className="grid grid-cols-7 gap-1">
      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
        <div key={d} className="text-xs font-medium text-gray-500 text-center py-1">{d}</div>
      ))}
      {cells.map((day, idx) => {
        if (day === null) return <div key={idx} />;
        const dateStr = isoDate(new Date(Date.UTC(year, month, day)));
        const av = availMap.get(dateStr);
        const isToday = dateStr === today;
        const color = av
          ? av.status === 'booked'
            ? 'bg-green-200 hover:bg-green-300'
            : av.status === 'blocked'
              ? 'bg-red-200 hover:bg-red-300'
              : 'bg-yellow-200 hover:bg-yellow-300'
          : 'bg-white hover:bg-gray-50';
        return (
          <button
            key={idx}
            onClick={() => onDayClick(dateStr)}
            disabled={busy}
            title={av ? `${av.status} (${av.source}${av.reason ? ' — ' + av.reason : ''})` : `Available — click to block`}
            className={`aspect-square border rounded p-1 text-sm ${isToday ? 'border-orange-500' : 'border-gray-200'} ${color} disabled:opacity-50`}
          >
            <span className={isToday ? 'font-bold text-orange-700' : 'text-gray-700'}>{day}</span>
          </button>
        );
      })}
    </div>
  );
}
