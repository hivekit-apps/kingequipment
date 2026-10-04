import Image from 'next/image';
import { getSiteConfig, allPhotos } from '@/lib/config';

/**
 * Responsive photo grid. 2x2 on mobile, 4x1 on desktop.
 * Per-photo display ~150-200px mobile / ~280-320px desktop.
 * Aspect-[3/4] preserves portrait orientation of authentic in-action shots
 * (less aggressive crop than aspect-square).
 */
export function PhotoStrip({ limit, machineId }: { limit?: number; machineId?: string }) {
  const cfg = getSiteConfig();
  const source = machineId
    ? cfg.equipment.find((e) => e.id === machineId)?.photos ?? []
    : allPhotos(cfg);
  const photos = typeof limit === 'number' ? source.slice(0, limit) : source;
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {photos.map((p) => (
        <div key={p.src} className="relative aspect-[3/4] overflow-hidden rounded-md bg-slate-200">
          <Image
            src={p.src}
            alt={p.alt}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover"
            loading="lazy"
          />
        </div>
      ))}
    </div>
  );
}
