import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSiteConfig, getEquipmentById, classLabel } from '@/lib/config';
import { createServiceClient } from '@/lib/supabase/service';
import { EquipmentEditForm } from './EquipmentEditForm';

export const dynamic = 'force-dynamic';

type Override = {
  equipment_id: string;
  pricing?: Record<string, number | null> | null;
  visible?: boolean | null;
  availability?: string[] | null;
  city_delivery?: Record<string, number> | null;
};

async function fetchOverride(id: string): Promise<Override | null> {
  try {
    const svc = createServiceClient();
    const { data } = await svc
      .from('equipment_overrides')
      .select('*')
      .eq('equipment_id', id)
      .maybeSingle();
    return (data as Override | null) || null;
  } catch {
    return null;
  }
}

export default async function AdminEquipmentEditPage({
  params,
}: {
  params: { id: string };
}) {
  const cfg = getSiteConfig();
  const item = getEquipmentById(params.id, cfg);
  if (!item) notFound();
  const override = await fetchOverride(item.id);

  const pricing = { ...item.pricing, ...(override?.pricing || {}) };
  const availability = (override?.availability as ('rent' | 'buy')[]) || item.availability;
  const visible = override?.visible != null ? override.visible : item.visible !== false;
  const cityDelivery = override?.city_delivery || {};

  return (
    <div>
      <div className="mb-6 flex items-center gap-3 text-sm">
        <Link href="/admin/equipment" className="text-gray-600 hover:text-gray-900">
          ← Back
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-gray-900">Edit {item.name}</h1>
      <p className="mt-1 text-sm text-gray-600">
        {classLabel(item.class)} · <span className="font-mono text-xs">{item.id}</span>
      </p>
      <div className="mt-6 flex gap-3 text-sm">
        <Link href={`/admin/equipment/${item.id}/calendar`} className="text-orange-700 hover:text-orange-900 underline">
          Blocked dates →
        </Link>
      </div>
      <EquipmentEditForm
        id={item.id}
        initialPricing={pricing}
        initialAvailability={availability}
        initialVisible={visible}
        initialCityDelivery={cityDelivery}
        cities={cfg.cityPages.cities.map((c) => ({ slug: c.slug, name: c.name, defaultPrice: c.deliveryPrice }))}
      />
    </div>
  );
}
