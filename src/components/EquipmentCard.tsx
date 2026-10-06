import Image from 'next/image';
import Link from 'next/link';
import type { EquipmentItem } from '@/lib/config';
import { classLabel } from '@/lib/config';

type Mode = 'rent' | 'buy' | 'both';

export function EquipmentCard({ item, mode = 'both' }: { item: EquipmentItem; mode?: Mode }) {
  const rentable = item.availability.includes('rent') && mode !== 'buy';
  const buyable = item.availability.includes('buy') && mode !== 'rent';
  const detailHref = mode === 'buy' ? `/equipment/${item.id}?mode=buy` : `/equipment/${item.id}`;

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm flex flex-col">
      <Link href={detailHref} className="group">
        <header>
          <p className="text-xs uppercase tracking-wide text-brand-orange font-bold">
            {classLabel(item.class)}
          </p>
          <h2 className="mt-1 text-xl md:text-2xl font-bold text-slate-950 group-hover:text-brand-orange transition-colors">
            {item.name}
          </h2>
          <p className="mt-2 text-sm text-slate-700">{item.tagline}</p>
        </header>

        {item.photos.length > 0 && (
          <div className="relative w-full aspect-square overflow-hidden rounded-md bg-white mt-4">
            <Image
              src={item.photos[0].src}
              alt={item.photos[0].alt}
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-contain group-hover:scale-105 transition-transform"
            />
          </div>
        )}
      </Link>

      <dl className="mt-4 space-y-1 text-xs text-slate-700">
        {rentable && item.pricing.daily != null && (
          <div className="flex justify-between">
            <dt>Daily</dt>
            <dd className="font-semibold">${item.pricing.daily}</dd>
          </div>
        )}
        {rentable && item.pricing.weekly != null && (
          <div className="flex justify-between">
            <dt>Weekly</dt>
            <dd className="font-semibold">${item.pricing.weekly}</dd>
          </div>
        )}
        {rentable && item.pricing.monthly != null && (
          <div className="flex justify-between">
            <dt>Monthly</dt>
            <dd className="font-semibold">${item.pricing.monthly}</dd>
          </div>
        )}
        {buyable && item.pricing.buyNew != null && (
          <div className="flex justify-between border-t border-slate-100 pt-1 mt-1">
            <dt>Buy new</dt>
            <dd className="font-semibold">${item.pricing.buyNew}</dd>
          </div>
        )}
        {buyable && item.pricing.buyUsed != null && (
          <div className={`flex justify-between${buyable && item.pricing.buyNew == null ? ' border-t border-slate-100 pt-1 mt-1' : ''}`}>
            <dt>Buy used</dt>
            <dd className="font-semibold">${item.pricing.buyUsed}</dd>
          </div>
        )}
      </dl>

      <div className="mt-5 flex flex-wrap gap-2">
        <Link
          href={detailHref}
          className="inline-block btn-secondary text-xs px-3 py-2 min-h-[40px]"
          data-event={`catalog_view_${item.id}`}
        >
          Details
        </Link>
        {rentable && (
          <Link
            href={`/equipment/${item.id}`}
            className="inline-block btn-primary text-xs px-3 py-2 min-h-[40px]"
            data-event={`catalog_rent_${item.id}`}
          >
            Rent
          </Link>
        )}
        {buyable && (
          <Link
            href={`/equipment/${item.id}?mode=buy`}
            className="inline-block btn-primary text-xs px-3 py-2 min-h-[40px]"
            data-event={`catalog_buy_${item.id}`}
          >
            Buy
          </Link>
        )}
      </div>
    </article>
  );
}
