import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSiteConfigLive, getEquipmentById } from '@/lib/config';
import { createServiceClient } from '@/lib/supabase/service';
import { BlockedDatesManager } from './BlockedDatesManager';

export const dynamic = 'force-dynamic';

type Block = { id: string; blocked_date: string; reason: string | null };

async function fetchBlocks(id: string): Promise<Block[]> {
  try {
    const svc = createServiceClient();
    const { data } = await svc
      .from('equipment_blocked_dates')
      .select('*')
      .eq('equipment_id', id)
      .order('blocked_date');
    return (data as Block[] | null) || [];
  } catch {
    return [];
  }
}

export default async function PerSkuCalendarPage({
  params,
}: {
  params: { id: string };
}) {
  const cfg = await getSiteConfigLive();
  const item = getEquipmentById(params.id, cfg);
  if (!item) notFound();
  const blocks = await fetchBlocks(item.id);

  return (
    <div>
      <Link href={`/admin/equipment/${item.id}`} className="text-sm text-gray-600 hover:text-gray-900">
        ← Back to {item.shortName}
      </Link>
      <h1 className="mt-3 text-2xl font-bold text-gray-900">Blocked dates — {item.shortName}</h1>
      <p className="mt-1 text-sm text-gray-600">
        Block out dates where this specific SKU is unavailable (maintenance, already-rented, held).
      </p>

      <BlockedDatesManager equipmentId={item.id} initialBlocks={blocks} />
    </div>
  );
}
