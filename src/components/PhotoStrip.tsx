import Image from 'next/image';
import Link from 'next/link';
import { getSiteConfig, allPhotos, visibleEquipment } from '@/lib/config';

/**
 * Responsive photo grid. 2x2 on mobile, 4x1 on desktop.
 * Per-photo display ~150-200px mobile / ~280-320px desktop.
 * Aspect-[3/4] preserves portrait orientation of authentic in-action shots
 * (less aggressive crop than aspect-square).
 *
 * Default behaviour: picks one representative photo per category so the
 * strip reads as a rotating "what we deliver" showcase, not a flat gallery.
 */
export function PhotoStrip({ limit, machineId }: { limit?: number; machineId?: string }) {
  const cfg = getSiteConfig();
  if (machineId) {
    const source = cfg.equipment.find((e) => e.id === machineId)?.photos ?? [];
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
  const equipment = visibleEquipment(cfg);
  const perCategory: { id: string; src: string; alt: string; name: string; categoryName: string; categorySlug: string }[] = [];
  for (const cat of cfg.categories) {
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
  // Fallback to allPhotos if (somehow) no categories matched — keeps the component robust.
  if (limited.length === 0) {
    const photos = allPhotos(cfg).slice(0, 4);
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
