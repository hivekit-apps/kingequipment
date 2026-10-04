import Image from 'next/image';
import { getSiteConfig } from '@/lib/config';

/**
 * Hero photo for the homepage. Single large image, portrait-natural aspect,
 * priority-loaded for LCP. Uses next/image responsive variants (WebP/AVIF).
 */
export function HeroPhoto() {
  const cfg = getSiteConfig();
  const { src, alt } = cfg.heroPhoto;
  return (
    <div className="relative w-full overflow-hidden rounded-lg bg-slate-900 aspect-[4/5] md:aspect-[3/4] md:max-h-[600px]">
      <Image
        src={src}
        alt={alt}
        fill
        priority
        sizes="(max-width: 768px) 100vw, 50vw"
        className="object-cover"
      />
    </div>
  );
}
