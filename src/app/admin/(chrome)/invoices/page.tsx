import { requireAdminRole } from '@/lib/require-role';
import { listInvoices, formatCurrency } from '@/lib/invoice';
import { createServiceClient } from '@/lib/supabase/service';
import { MarkPaidButton } from './mark-paid-button';

export const dynamic = 'force-dynamic';

async function loadBookingMap(): Promise<Map<string, { customer_name: string; start_date: string; end_date: string }>> {
  const svc = createServiceClient();
  const { data } = await svc.from('kiril_bookings').select('id, customer_name, start_date, end_date');
  const m = new Map<string, { customer_name: string; start_date: string; end_date: string }>();
  for (const b of (data ?? []) as Array<{ id: string; customer_name: string; start_date: string; end_date: string }>) m.set(b.id, b);
  return m;
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    issued: 'bg-amber-100 text-amber-800',
    paid: 'bg-green-100 text-green-800',
    void: 'bg-gray-100 text-gray-500',
    refunded: 'bg-blue-100 text-blue-800',
  };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium uppercase tracking-wide ${map[status] ?? 'bg-gray-100'}`}>{status}</span>;
}

export default async function InvoicesPage() {
  await requireAdminRole();
  const [invoices, bookingMap] = await Promise.all([listInvoices({ limit: 100 }), loadBookingMap()]);
  const outstanding = invoices.filter((i) => i.status === 'issued');
  const paid = invoices.filter((i) => i.status === 'paid');
  const totalOutstanding = outstanding.reduce((s, i) => s + i.total_cents, 0);
  const totalPaidThisMonth = paid.filter((i) => i.paid_at && new Date(i.paid_at).getUTCMonth() === new Date().getUTCMonth()).reduce((s, i) => s + i.total_cents, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Invoices</h1>
        <p className="mt-1 text-gray-600">
          Outstanding: <strong>{formatCurrency(totalOutstanding)}</strong> across {outstanding.length} &middot; Paid this month: <strong>{formatCurrency(totalPaidThisMonth)}</strong>
        </p>
      </div>

      <Section title={`Outstanding (${outstanding.length})`} invoices={outstanding} bookingMap={bookingMap} />
      <Section title={`Paid (${paid.length})`} invoices={paid.slice(0, 20)} bookingMap={bookingMap} />
    </div>
  );
}

function Section({
  title,
  invoices,
  bookingMap,
}: {
  title: string;
  invoices: Awaited<ReturnType<typeof listInvoices>>;
  bookingMap: Map<string, { customer_name: string; start_date: string; end_date: string }>;
}) {
  if (invoices.length === 0) {
    return (
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">{title}</h2>
        <p className="text-sm text-gray-500 italic">Nothing here.</p>
      </section>
    );
  }
  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-800 mb-3">{title}</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-gray-500 border-b border-gray-200">
              <th className="py-2 pr-4">Invoice #</th>
              <th className="py-2 pr-4">Customer</th>
              <th className="py-2 pr-4">Kind</th>
              <th className="py-2 pr-4">Amount</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Dates / Paid</th>
              <th className="py-2 pr-4">Pay link</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => {
              const b = bookingMap.get(inv.booking_id);
              return (
                <tr key={inv.id} className="border-b border-gray-100">
                  <td className="py-2 pr-4 font-mono text-xs">#{inv.id.slice(0, 8)}</td>
                  <td className="py-2 pr-4">{b?.customer_name ?? '(unknown)'}</td>
                  <td className="py-2 pr-4 capitalize">{inv.kind}</td>
                  <td className="py-2 pr-4 font-medium">{formatCurrency(inv.total_cents, inv.currency)}</td>
                  <td className="py-2 pr-4"><StatusPill status={inv.status} /></td>
                  <td className="py-2 pr-4 text-xs text-gray-600">
                    {inv.paid_at
                      ? `Paid ${new Date(inv.paid_at).toLocaleDateString('en-CA', { timeZone: 'America/Toronto' })} (${inv.paid_method || 'unknown'})`
                      : b ? `${b.start_date} \u2192 ${b.end_date}` : ''}
                  </td>
                  <td className="py-2 pr-4">
                    {inv.stripe_payment_link_url ? (
                      <a href={inv.stripe_payment_link_url} target="_blank" rel="noopener noreferrer" className="text-orange-700 hover:underline text-xs">Open</a>
                    ) : (
                      <span className="text-gray-400 text-xs">e-transfer</span>
                    )}
                  </td>
                  <td className="py-2">
                    {inv.status === 'issued' && <MarkPaidButton invoiceId={inv.id} />}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
