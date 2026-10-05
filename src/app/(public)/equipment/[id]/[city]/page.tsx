import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSiteConfig, getSiteConfigDynamic, getEquipmentById, classLabel, getEquipmentDeliveryPrice } from '@/lib/config';
import { AddToCartForm } from '@/components/AddToCartForm';

// ISR: revalidate every 60s so admin equipment/delivery edits propagate without redeploy.
export const revalidate = 60;

export function generateStaticParams() {
  const cfg = getSiteConfig();
  const out: { id: string; city: string }[] = [];
  for (const e of cfg.equipment) {
    for (const c of cfg.cityPages.cities) {
      out.push({ id: e.id, city: c.slug });
    }
  }
  return out;
}

export async function generateMetadata({
  params,
}: {
  params: { id: string; city: string };
}): Promise<Metadata> {
  const cfg = await getSiteConfigDynamic();
  const item = getEquipmentById(params.id, cfg);
  const city = cfg.cityPages.cities.find((c) => c.slug === params.city);
  if (!item || !city) return {};
  const deliveryPrice = await getEquipmentDeliveryPrice(item.id, city.slug, cfg);
  const title = `${item.shortName} rental in ${city.name} — ${cfg.business.name}`;
  const description = `Rent or buy a ${item.shortName.toLowerCase()} delivered to ${city.name}. Delivery $${deliveryPrice ?? city.deliveryPrice}. Daily, weekly, and monthly rates.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${cfg.business.siteUrl}/equipment/${item.id}/${city.slug}`,
      siteName: cfg.business.name,
      locale: 'en_CA',
      type: 'website',
    },
  };
}

export default async function EquipmentCityPage({
  params,
}: {
  params: { id: string; city: string };
}) {
  const cfg = await getSiteConfigDynamic();
  const item = getEquipmentById(params.id, cfg);
  const city = cfg.cityPages.cities.find((c) => c.slug === params.city);
  if (!item || !city) notFound();
  const deliveryPrice = (await getEquipmentDeliveryPrice(item.id, city.slug, cfg)) ?? city.deliveryPrice;

  return (
    <section className="bg-slate-50">
      <div className="container-page py-10 md:py-14">
        <nav aria-label="Breadcrumb" className="text-sm text-slate-600">
          <Link href="/" className="hover:text-brand-orange">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/equipment" className="hover:text-brand-orange">Equipment</Link>
          <span className="mx-2">/</span>
          <Link href={`/equipment/${item.id}`} className="hover:text-brand-orange">{item.shortName}</Link>
          <span className="mx-2">/</span>
          <span className="text-slate-950 font-semibold">{city.name}</span>
        </nav>

        <div className="mt-6 grid lg:grid-cols-[1.1fr_1fr] gap-10 items-start">
          <div>
            <p className="text-xs uppercase tracking-wide text-brand-orange font-bold">
              {classLabel(item.class)} · {city.region}
            </p>
            <h1 className="mt-1 text-3xl md:text-4xl font-bold text-slate-950">
              {item.shortName} rental in {city.name}
            </h1>
            <p className="mt-3 text-base text-slate-700">
              {item.tagline} Delivered to {city.name} for <strong>${deliveryPrice}</strong>.
            </p>

            {item.photos.length > 0 && (
              <div className="mt-6">
                <div className="relative w-full aspect-[4/3] overflow-hidden rounded-md bg-slate-100">
                  <Image
                    src={item.photos[0].src}
                    alt={item.photos[0].alt}
                    fill
                    sizes="(max-width: 1024px) 100vw, 55vw"
                    className="object-cover"
                    priority
                  />
                </div>
              </div>
            )}

            <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-bold text-slate-950">Local delivery to {city.name}</h2>
              <p className="mt-2 text-sm text-slate-700">{city.localContext}</p>
              <p className="mt-2 text-sm text-slate-700">{city.driveTime}.</p>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <dt>Delivery to {city.name}</dt>
                  <dd className="font-semibold">${deliveryPrice}</dd>
                </div>
                {item.pricing.daily != null && (
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <dt>Daily rental</dt>
                    <dd className="font-semibold">${item.pricing.daily}</dd>
                  </div>
                )}
                {item.pricing.weekly != null && (
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <dt>Weekly rental</dt>
                    <dd className="font-semibold">${item.pricing.weekly}</dd>
                  </div>
                )}
                {item.pricing.monthly != null && (
                  <div className="flex justify-between">
                    <dt>Monthly rental</dt>
                    <dd className="font-semibold">${item.pricing.monthly}</dd>
                  </div>
                )}
              </dl>
            </div>

            {city.neighborhoods.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm uppercase tracking-wide text-slate-600 font-bold">
                  Neighbourhoods we deliver in {city.name}
                </h3>
                <p className="mt-2 text-sm text-slate-700">{city.neighborhoods.join(' · ')}.</p>
              </div>
            )}

            {city.typicalJobs.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm uppercase tracking-wide text-slate-600 font-bold">
                  Typical {city.name} jobs for this equipment
                </h3>
                <ul className="mt-2 list-disc list-inside text-sm text-slate-700">
                  {city.typicalJobs.map((j) => (
                    <li key={j}>{j}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="lg:sticky lg:top-6">
            <AddToCartForm item={item} cities={cfg.cityPages.cities} defaultCity={city.slug} />
          </div>
        </div>
      </div>
    </section>
  );
}
