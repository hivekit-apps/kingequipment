import Image from 'next/image';
import Link from 'next/link';
import { getSiteConfig, allPhotos, visibleEquipment, type SiteConfig } from '@/lib/config';

/**
 * Responsive photo grid. 2x2 on mobile, 4x1 on desktop.
 *
 * Default behaviour: picks one representative photo per populated category
 * so the strip reads as a rotating "what we deliver" showcase. All data is
 * sourced from the merged catalog (admin overrides + custom SKUs win over
 * seed), so edits in the admin propagate here within the ISR window.
 *
 * The caller can optionally pass `cfg` (the already-fetched
 * `getSiteConfigDynamic()` result) to avoid a second trip to Supabase.
 */
export function PhotoStrip({
  limit,
  machineId,
  cfg,
}: {
  limit?: number;
  machineId?: string;
  cfg?: SiteConfig;
}) {
  const siteCfg = cfg ?? getSiteConfig();
  if (machineId) {
    const source = siteCfg.equipment.find((e) => e.id === machineId)?.photos ?? [];
    const photos = typeof limit === 'number' ? source.slice(0, limit) : source;
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {photos.map((p) => (
          <div key={p.src} className="relative aspect-square overflow-hidden rounded-md bg-white">
            <Image
              src={p.src}
              alt={p.alt}
              fill
              sizes="(max-width: 768px) 50vw, 25vw"
              className="object-contain"
              loading="lazy"
            />
          </div>
        ))}
      </div>
    );
  }

  // Category-rotation mode: one representative item per populated category.
  const equipment = visibleEquipment(siteCfg);
  const perCategory: { id: string; src: string; alt: string; name: string; categoryName: string; categorySlug: string }[] = [];
  for (const cat of siteCfg.categories) {
    const item = equipment.find((e) => e.category === cat.slug && e.photos.length > 0);
    if (item) {
      perCategory.push({
        id: item.id,
        src: item.photos[0].src,
        alt: item.photos[0].alt,
        name: item.shortName,
        categoryName: cat.name,
        categorySlug: cat.slug,
      });
    }
  }
  const limited = typeof limit === 'number' ? perCategory.slice(0, limit) : perCategory;
  // Fallback to allPhotos if (somehow) no categories matched.
  if (limited.length === 0) {
    const photos = allPhotos(siteCfg).slice(0, 4);
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {photos.map((p) => (
          <div key={p.src} className="relative aspect-square overflow-hidden rounded-md bg-white">
            <Image src={p.src} alt={p.alt} fill sizes="(max-width: 768px) 50vw, 25vw" className="object-contain" loading="lazy" />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {limited.map((p) => (
        <Link
          key={p.src}
          href={`/equipment/${p.id}`}
          className="group relative aspect-square overflow-hidden rounded-md bg-white"
          data-event={`photo_strip_${p.id}`}
        >
          <Image
            src={p.src}
            alt={p.alt}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-contain group-hover:scale-105 transition-transform"
            loading="lazy"
          />
          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 to-transparent p-2 text-xs font-semibold text-white">
            {p.categoryName}
          </span>
        </Link>
      ))}
    </div>
  );
}
