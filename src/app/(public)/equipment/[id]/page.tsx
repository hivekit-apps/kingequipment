import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSiteConfig, getEquipmentById, classLabel } from '@/lib/config';
import { AddToCartForm } from '@/components/AddToCartForm';

export function generateStaticParams() {
  const cfg = getSiteConfig();
  return cfg.equipment.map((e) => ({ id: e.id }));
}

export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  const cfg = getSiteConfig();
  const item = getEquipmentById(params.id, cfg);
  if (!item) return {};
  const title = `${item.name} — rent or buy · ${cfg.business.name}`;
  const description = `${item.tagline} Rent by the day, week, or month, or buy. Delivery across Toronto, Markham, and Durham Region.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${cfg.business.siteUrl}/equipment/${item.id}`,
      siteName: cfg.business.name,
      locale: 'en_CA',
      type: 'website',
    },
  };
}

type SpecRow = { label: string; value: string | null | undefined };

export default function EquipmentDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { mode?: string };
}) {
  const cfg = getSiteConfig();
  const item = getEquipmentById(params.id, cfg);
  if (!item) notFound();

  const defaultMode: 'rent' | 'buy' =
    searchParams.mode === 'buy' && item.availability.includes('buy') ? 'buy' : 'rent';

  const specs: SpecRow[] = [
    { label: 'Weight', value: item.specs.operatingWeightLbs && `${item.specs.operatingWeightLbs} lbs` },
    { label: 'Capacity', value: item.specs.ratedOperatingCapacityLbs || null },
    { label: 'Engine', value: item.specs.engineHp && item.specs.engineHp !== 'N/A' ? `${item.specs.engineHp} hp` : null },
    { label: 'Lift height', value: item.specs.liftHeightIn ? `${item.specs.liftHeightIn} in` : null },
    { label: 'Fits through', value: item.specs.gateWidthIn ? `${item.specs.gateWidthIn}-inch gate` : null },
    { label: 'Bucket', value: item.specs.bucketWidthIn ? `${item.specs.bucketWidthIn} inches` : null },
  ].filter((s) => s.value);

  return (
    <section className="bg-slate-50">
      <div className="container-page py-10 md:py-14">
        <nav aria-label="Breadcrumb" className="text-sm text-slate-600">
          <Link href="/" className="hover:text-brand-orange">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/equipment" className="hover:text-brand-orange">Equipment</Link>
          <span className="mx-2">/</span>
          <span className="text-slate-950 font-semibold">{item.shortName}</span>
        </nav>

        <div className="mt-6 grid lg:grid-cols-[1.1fr_1fr] gap-10 items-start">
          <div>
            <p className="text-xs uppercase tracking-wide text-brand-orange font-bold">
              {classLabel(item.class)}
            </p>
            <h1 className="mt-1 text-3xl md:text-4xl font-bold text-slate-950">{item.name}</h1>
            <p className="mt-3 text-base text-slate-700">{item.tagline}</p>

            {item.photos.length > 0 && (
              <div className="mt-6 space-y-3">
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
                {item.photos.length > 1 && (
                  <div className="grid grid-cols-3 gap-3">
                    {item.photos.slice(1).map((p) => (
                      <div
                        key={p.src}
                        className="relative aspect-[4/3] overflow-hidden rounded-md bg-slate-100"
                      >
                        <Image
                          src={p.src}
                          alt={p.alt}
                          fill
                          sizes="(max-width: 1024px) 33vw, 18vw"
                          className="object-cover"
                          loading="lazy"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-bold text-slate-950">Rental &amp; sale pricing</h2>
              <dl className="mt-4 space-y-2 text-sm">
                {item.pricing.daily != null && (
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <dt>Daily</dt>
                    <dd className="font-semibold">${item.pricing.daily}</dd>
                  </div>
                )}
                {item.pricing.weekly != null && (
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <dt>Weekly</dt>
                    <dd className="font-semibold">${item.pricing.weekly}</dd>
                  </div>
                )}
                {item.pricing.monthly != null && (
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <dt>Monthly</dt>
                    <dd className="font-semibold">${item.pricing.monthly}</dd>
                  </div>
                )}
                {item.pricing.buyNew != null && (
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <dt>Buy new</dt>
                    <dd className="font-semibold">${item.pricing.buyNew}</dd>
                  </div>
                )}
                {item.pricing.buyUsed != null && (
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <dt>Buy used</dt>
                    <dd className="font-semibold">${item.pricing.buyUsed}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt>Deposit (rentals)</dt>
                  <dd className="font-semibold">${item.pricing.deposit}</dd>
                </div>
              </dl>
              <p className="mt-3 text-xs text-slate-600">
                {cfg.pricing.multiDayNote}
              </p>
            </div>

            {specs.length > 0 && (
              <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
                <h2 className="text-lg font-bold text-slate-950">Specs</h2>
                <dl className="mt-3 space-y-2 text-sm">
                  {specs.map((s) => (
                    <div key={s.label} className="flex justify-between border-b border-slate-100 pb-1">
                      <dt>{s.label}</dt>
                      <dd className="font-semibold">{s.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {item.attachmentsIncluded.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm uppercase tracking-wide text-slate-600 font-bold">Included</h3>
                <ul className="mt-2 list-disc list-inside text-sm text-slate-700">
                  {item.attachmentsIncluded.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              </div>
            )}

            {item.idealFor.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm uppercase tracking-wide text-slate-600 font-bold">Ideal for</h3>
                <ul className="mt-2 list-disc list-inside text-sm text-slate-700">
                  {item.idealFor.map((j) => (
                    <li key={j}>{j}</li>
                  ))}
                </ul>
              </div>
            )}

            <p className="mt-6 text-sm italic text-slate-700">{item.operatorNote}</p>
          </div>

          <div className="lg:sticky lg:top-6">
            <AddToCartForm item={item} cities={cfg.cityPages.cities} defaultMode={defaultMode} />
          </div>
        </div>
      </div>
    </section>
  );
}
