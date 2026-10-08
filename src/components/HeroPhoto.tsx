import Image from 'next/image';
import { getSiteConfig, visibleEquipment, type SiteConfig } from '@/lib/config';

/**
 * Hero photo for the homepage. Picks the first visible equipment item that
 * has a photo so the hero reflects the LIVE admin catalog (overrides +
 * equipment_custom), not the stale `config/site.json` heroPhoto field.
 *
 * Accepts an optional `cfg` so the parent server component can pass the
 * already-fetched `getSiteConfigDynamic()` result — avoids a second trip to
 * Supabase. If omitted, falls back to the synchronous seed config.
 */
export function HeroPhoto({ cfg }: { cfg?: SiteConfig }) {
  const siteCfg = cfg ?? getSiteConfig();
  const firstWithPhoto = visibleEquipment(siteCfg).find((e) => e.photos.length > 0);
  const src = firstWithPhoto?.photos[0]?.src ?? siteCfg.heroPhoto.src;
  const alt = firstWithPhoto?.photos[0]?.alt ?? siteCfg.heroPhoto.alt;
  return (
    <div className="relative w-full overflow-hidden rounded-lg bg-white aspect-square md:max-h-[600px]">
      <Image
        src={src}
        alt={alt}
        fill
        priority
        sizes="(max-width: 768px) 100vw, 50vw"
        className="object-contain"
      />
    </div>
  );
}
