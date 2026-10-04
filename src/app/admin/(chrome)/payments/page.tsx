import { requireAdmin } from '@/lib/require-role';
import { createServiceClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';

interface LogRow {
  id: string;
  verdict: string;
  payload: Record<string, unknown>;
  created_at: string;
}

async function loadLog(): Promise<LogRow[]> {
  const svc = createServiceClient();
  const { data } = await svc.from('kiril_etransfer_log').select('*').order('created_at', { ascending: false }).limit(100);
  return (data ?? []) as LogRow[];
}

function VerdictPill({ v }: { v: string }) {
  const map: Record<string, string> = {
    matched_and_marked_paid: 'bg-green-100 text-green-800',
    unmatched_or_ambiguous: 'bg-amber-100 text-amber-800',
    unparseable: 'bg-red-100 text-red-800',
    ignored_non_intake: 'bg-gray-100 text-gray-600',
  };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium uppercase tracking-wide ${map[v] ?? 'bg-gray-100'}`}>{v.replace(/_/g, ' ')}</span>;
}

export default async function PaymentsPage() {
  await requireAdmin();
  const rows = await loadLog();
  const needsAttention = rows.filter((r) => r.verdict === 'unmatched_or_ambiguous' || r.verdict === 'unparseable');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">E-transfer inbox</h1>
        <p className="mt-1 text-gray-600">
          Every inbound e-transfer notification (forwarded from Gmail). Auto-matched entries flip invoices to paid; unmatched need your review.
        </p>
      </div>

      {needsAttention.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm text-amber-900 font-semibold">
            {needsAttention.length} e-transfer{needsAttention.length !== 1 ? 's need' : ' needs'} manual review.
          </p>
          <p className="text-sm text-amber-800 mt-1">
            Open the entry below to see what was parsed. If it matches an outstanding invoice, mark it paid manually from /admin/invoices (or via SQL for now).
          </p>
        </div>
      )}

      {rows.length === 0 ? (
        <p className="text-sm text-gray-500 italic">Nothing here yet. Once Kiril&rsquo;s Gmail forwarder is set up, entries will appear as e-transfer notifications arrive.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <article key={r.id} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <VerdictPill v={r.verdict} />
                    <span className="text-xs text-gray-500">{new Date(r.created_at).toLocaleString('en-CA', { timeZone: 'America/Toronto' })}</span>
                  </div>
                  <pre className="mt-2 text-xs text-gray-700 bg-gray-50 rounded p-2 overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(r.payload, null, 2)}
                  </pre>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
