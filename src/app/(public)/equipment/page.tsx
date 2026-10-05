import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { getSiteConfig, getSiteConfigDynamic, visibleEquipment, classLabel, type EquipmentItem } from '@/lib/config';

// ISR: revalidate every 60s so admin equipment edits propagate without redeploy.
export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const cfg = await getSiteConfigDynamic();
  const equipment = visibleEquipment(cfg);
  return {
    title: `Equipment catalog — ${cfg.business.name}`,
    description: `Rent or buy drying, power, and climate equipment across Toronto, Markham, and Durham Region. ${equipment.map((e) => e.shortName).join(', ')}.`,
  };
}

function EquipmentCard({ item }: { item: EquipmentItem }) {
  const rentable = item.availability.includes('rent');
  const buyable = item.availability.includes('buy');
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm flex flex-col">
      <header>
        <p className="text-xs uppercase tracking-wide text-brand-orange font-bold">
          {classLabel(item.class)}
        </p>
        <h2 className="mt-1 text-xl md:text-2xl font-bold text-slate-950">{item.name}</h2>
        <p className="mt-2 text-sm text-slate-700">{item.tagline}</p>
      </header>

      {item.photos.length > 0 && (
        <div className="relative w-full aspect-[4/3] overflow-hidden rounded-md bg-slate-100 mt-4">
          <Image
            src={item.photos[0].src}
            alt={item.photos[0].alt}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover"
          />
        </div>
      )}

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
          <div className="flex justify-between">
            <dt>Buy used</dt>
            <dd className="font-semibold">${item.pricing.buyUsed}</dd>
          </div>
        )}
      </dl>

      <div className="mt-5 flex flex-wrap gap-2">
        <Link
          href={`/equipment/${item.id}`}
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

export default async function EquipmentPage() {
  const cfg = await getSiteConfigDynamic();
  const equipment = visibleEquipment(cfg);
  const rentables = equipment.filter((e) => e.availability.includes('rent'));
  const buyables = equipment.filter((e) => e.availability.includes('buy'));

  return (
    <section className="container-page py-12">
      <h1 className="text-3xl md:text-4xl">Equipment catalog</h1>
      <p className="mt-4 text-base text-slate-700 max-w-2xl">
        Rent by the day, week, or month — or buy new or used. Delivery across
        Toronto, Markham, and the full Durham Region. Prices in CAD.
      </p>

      <section className="mt-10">
        <h2 className="text-2xl font-bold">Rent</h2>
        <p className="mt-2 text-sm text-slate-700">
          {cfg.pricing.multiDayNote}
        </p>
        <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {rentables.map((item) => (
            <EquipmentCard key={`r-${item.id}`} item={item} />
          ))}
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-2xl font-bold">Buy</h2>
        <p className="mt-2 text-sm text-slate-700">
          Our rental catalog is also available for sale — new or used (where in stock).
        </p>
        <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {buyables.map((item) => (
            <EquipmentCard key={`b-${item.id}`} item={item} />
          ))}
        </div>
      </section>
    </section>
  );
}
