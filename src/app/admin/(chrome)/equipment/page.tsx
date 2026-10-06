import Link from 'next/link';
import { getSiteConfigLive, classLabel } from '@/lib/config';
import { createServiceClient } from '@/lib/supabase/service';
import { RestoreButton } from './RestoreButton';

export const dynamic = 'force-dynamic';

type Override = {
  equipment_id: string;
  pricing?: Record<string, number | null> | null;
  visible?: boolean | null;
  availability?: string[] | null;
};

type RedirectRow = {
  equipment_id: string;
  redirect_to: string;
  category_slug: string | null;
  deleted_at: string;
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

async function fetchRedirects(): Promise<RedirectRow[]> {
  try {
    const svc = createServiceClient();
    const { data } = await svc
      .from('equipment_redirects')
      .select('*')
      .order('deleted_at', { ascending: false });
    return (data as RedirectRow[]) || [];
  } catch {
    return [];
  }
}

export default async function AdminEquipmentListPage() {
  const cfg = await getSiteConfigLive();
  const [overrides, customIds, redirects] = await Promise.all([
    fetchOverrides(),
    fetchCustomIds(),
    fetchRedirects(),
  ]);
  // A redirect row flags the item as "deleted" in UI terms. Pull the names from
  // the merged catalog if they're still queryable (seed items hidden via overrides
  // still appear in cfg.equipment because getSiteConfigLive returns all).
  const redirectIds = new Set(redirects.map((r) => r.equipment_id));

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
            {cfg.equipment.filter((item) => !redirectIds.has(item.id)).map((item) => {
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

      {redirects.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-bold text-gray-900">Deleted (redirecting)</h2>
          <p className="mt-1 text-sm text-gray-600">
            These equipment IDs have been removed from the public catalog. Any old URLs
            redirect to the category page. Seed items can be restored; custom items were
            hard-deleted and cannot be restored.
          </p>
          <div className="mt-4 bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                <tr>
                  <th className="px-4 py-3 text-left">Equipment ID</th>
                  <th className="px-4 py-3 text-left">Redirects to</th>
                  <th className="px-4 py-3 text-left">Deleted at</th>
                  <th className="px-4 py-3 text-left">Source</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {redirects.map((r) => {
                  const wasCustom = customIds.has(r.equipment_id);
                  // A row in equipment_custom means hard-delete happened (custom items
                  // get hard-deleted). But cycle-10 custom-delete also wipes equipment_custom,
                  // so wasCustom = true here is impossible after a custom-delete. We check
                  // seed items by presence in cfg.equipment (seed items stay in site.json).
                  const seedItem = cfg.equipment.find((e) => e.id === r.equipment_id);
                  const canRestore = !!seedItem && !wasCustom;
                  return (
                    <tr key={r.equipment_id}>
                      <td className="px-4 py-3 font-mono text-xs">{r.equipment_id}</td>
                      <td className="px-4 py-3 text-xs">{r.redirect_to}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {new Date(r.deleted_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
                          {seedItem ? 'seed' : 'custom (deleted)'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <RestoreButton id={r.equipment_id} disabled={!canRestore} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
