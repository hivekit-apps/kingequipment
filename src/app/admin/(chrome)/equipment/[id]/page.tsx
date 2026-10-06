import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSiteConfigLive, getEquipmentById, classLabel } from '@/lib/config';
import { createServiceClient } from '@/lib/supabase/service';
import { EquipmentEditForm } from './EquipmentEditForm';
import { PhotoManager } from './PhotoManager';

export const dynamic = 'force-dynamic';

type Override = {
  equipment_id: string;
  pricing?: Record<string, number | null> | null;
  visible?: boolean | null;
  availability?: string[] | null;
  city_delivery?: Record<string, number> | null;
  name?: string | null;
  short_name?: string | null;
  tagline?: string | null;
  photos?: { src: string; alt: string }[] | null;
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

async function isCustom(id: string): Promise<boolean> {
  try {
    const svc = createServiceClient();
    const { data } = await svc
      .from('equipment_custom')
      .select('id')
      .eq('id', id)
      .maybeSingle();
    return !!data;
  } catch {
    return false;
  }
}

export default async function AdminEquipmentEditPage({
  params,
}: {
  params: { id: string };
}) {
  const cfg = await getSiteConfigLive();
  const item = getEquipmentById(params.id, cfg);
  if (!item) notFound();
  const [override, custom] = await Promise.all([
    fetchOverride(item.id),
    isCustom(item.id),
  ]);

  const pricing = { ...item.pricing, ...(override?.pricing || {}) };
  const availability = (override?.availability as ('rent' | 'buy')[]) || item.availability;
  const visible = override?.visible != null ? override.visible : item.visible !== false;
  const cityDelivery = override?.city_delivery || {};
  // Photos come from merged item (which already applies overrides) -- this is
  // the canonical post-merge list the admin should edit.
  const photos = item.photos || [];

  return (
    <div>
      <div className="mb-6 flex items-center gap-3 text-sm">
        <Link href="/admin/equipment" className="text-gray-600 hover:text-gray-900">
          ← Back
        </Link>
      </div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit {item.name}</h1>
          <p className="mt-1 text-sm text-gray-600">
            {classLabel(item.class)} · <span className="font-mono text-xs">{item.id}</span>{' '}
            <span className={`ml-2 inline-block px-2 py-0.5 rounded-full text-xs ${custom ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'}`}>
              {custom ? 'custom' : 'seed'}
            </span>
          </p>
        </div>
      </div>
      <div className="mt-6 flex gap-3 text-sm">
        <Link href={`/admin/equipment/${item.id}/calendar`} className="text-orange-700 hover:text-orange-900 underline">
          Blocked dates →
        </Link>
      </div>
      <EquipmentEditForm
        id={item.id}
        initialName={item.name}
        initialShortName={item.shortName}
        initialTagline={item.tagline}
        initialPricing={pricing}
        initialAvailability={availability}
        initialVisible={visible}
        initialCityDelivery={cityDelivery}
        isCustom={custom}
        cities={cfg.cityPages.cities.map((c) => ({ slug: c.slug, name: c.name, defaultPrice: c.deliveryPrice }))}
      />

      <PhotoManager id={item.id} initialPhotos={photos} />
    </div>
  );
}
