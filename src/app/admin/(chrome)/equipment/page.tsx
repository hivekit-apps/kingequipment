import Link from 'next/link';
import { getSiteConfigLive, classLabel } from '@/lib/config';
import { createServiceClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';

type Override = {
  equipment_id: string;
  pricing?: Record<string, number | null> | null;
  visible?: boolean | null;
  availability?: string[] | null;
};

async function fetchOverrides(): Promise<Record<string, Override>> {
  try {
    const svc = createServiceClient();
    const { data } = await svc.from('equipment_overrides').select('*');
    const map: Record<string, Override> = {};
    for (const row of data || []) {
      map[row.equipment_id] = row as Override;
    }
    return map;
  } catch {
    return {};
  }
}

async function fetchCustomIds(): Promise<Set<string>> {
  try {
    const svc = createServiceClient();
    const { data } = await svc.from('equipment_custom').select('id');
    return new Set((data || []).map((r: { id: string }) => r.id));
  } catch {
    return new Set();
  }
}

export default async function AdminEquipmentListPage() {
  const cfg = await getSiteConfigLive();
  const [overrides, customIds] = await Promise.all([fetchOverrides(), fetchCustomIds()]);

  return (
    <div>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Equipment catalog</h1>
          <p className="mt-1 text-sm text-gray-600">
            Site.json is the seed; custom-created SKUs and edits are stored in Supabase and merged at read-time.
          </p>
        </div>
        <Link
          href="/admin/equipment/new"
          className="px-4 py-2 rounded-md bg-orange-700 text-white font-semibold text-sm hover:bg-orange-800"
        >
          + New equipment
        </Link>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-600">
            <tr>
              <th className="px-4 py-3 text-left">Item</th>
              <th className="px-4 py-3 text-left">Source</th>
              <th className="px-4 py-3 text-left">Class</th>
              <th className="px-4 py-3 text-left">Availability</th>
              <th className="px-4 py-3 text-right">Daily</th>
              <th className="px-4 py-3 text-right">Weekly</th>
              <th className="px-4 py-3 text-right">Monthly</th>
              <th className="px-4 py-3 text-right">Buy new</th>
              <th className="px-4 py-3 text-left">Visible</th>
              <th className="px-4 py-3 text-right">Edit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {cfg.equipment.map((item) => {
              const o = overrides[item.id];
              const pricing = { ...item.pricing, ...(o?.pricing || {}) };
              const availability = (o?.availability as string[]) || item.availability;
              const visible = o?.visible != null ? o.visible : item.visible !== false;
              const isCustom = customIds.has(item.id);
              return (
                <tr key={item.id}>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">{item.shortName}</div>
                    <div className="text-xs text-gray-500">{item.id}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${isCustom ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'}`}>
                      {isCustom ? 'custom' : 'seed'}
                    </span>
                  </td>
                  <td className="px-4 py-3">{classLabel(item.class)}</td>
                  <td className="px-4 py-3 text-xs">{availability.join(', ')}</td>
                  <td className="px-4 py-3 text-right">{pricing.daily != null ? `$${pricing.daily}` : '-'}</td>
                  <td className="px-4 py-3 text-right">{pricing.weekly != null ? `$${pricing.weekly}` : '-'}</td>
                  <td className="px-4 py-3 text-right">{pricing.monthly != null ? `$${pricing.monthly}` : '-'}</td>
                  <td className="px-4 py-3 text-right">{pricing.buyNew != null ? `$${pricing.buyNew}` : '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${visible ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                      {visible ? 'Visible' : 'Hidden'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/equipment/${item.id}`}
                      className="text-orange-700 hover:text-orange-900 font-medium"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
