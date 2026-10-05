import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSiteConfig, cityPageUrl, visibleEquipment, type CityPage } from '@/lib/config';
import { cityLocalBusinessJsonLd, cityBreadcrumbsJsonLd } from '@/lib/jsonld';

export const dynamicParams = false;

export function generateStaticParams() {
  const cfg = getSiteConfig();
  return cfg.cityPages.cities.map((c) => ({ city: c.slug }));
}

export function generateMetadata({ params }: { params: { city: string } }): Metadata {
  const cfg = getSiteConfig();
  const city = cfg.cityPages.cities.find((c) => c.slug === params.city);
  if (!city) return {};
  const title = `Equipment rental in ${city.name} — ${cfg.business.name}`;
  const description = `${cfg.business.name} delivers equipment rental to ${city.name} — dehumidifiers, air scrubbers, carpet extractors, air movers, generators, and heaters. Daily, weekly, and monthly rates.`.trim();
  return {
    title,
    description,
    alternates: { canonical: cityPageUrl(city.slug, cfg) },
    openGraph: {
      title,
      description,
      url: `${cfg.business.siteUrl}${cityPageUrl(city.slug, cfg)}`,
      siteName: cfg.business.name,
      locale: 'en_CA',
      type: 'website',
    },
  };
}

function siblingCities(city: CityPage, all: CityPage[]): CityPage[] {
  const same = all.filter((c) => c.slug !== city.slug && c.region === city.region);
  if (same.length >= 4) return same.slice(0, 4);
  const others = all.filter((c) => c.slug !== city.slug && c.region !== city.region);
  return [...same, ...others].slice(0, 4);
}

export default function CityPageRoute({ params }: { params: { city: string } }) {
  const cfg = getSiteConfig();
  const city = cfg.cityPages.cities.find((c) => c.slug === params.city);
  if (!city) notFound();
  const siblings = siblingCities(city, cfg.cityPages.cities);
  const equipment = visibleEquipment(cfg);
  const deliveryPrice = (city as unknown as { deliveryPrice?: number }).deliveryPrice;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: cityLocalBusinessJsonLd(cfg, city) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: cityBreadcrumbsJsonLd(cfg, city) }}
      />

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="bg-slate-50 border-b border-slate-200">
        <ol className="container-page py-3 flex flex-wrap gap-x-2 text-sm text-slate-700">
          <li><Link href="/" className="hover:text-brand-orange">Home</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link href="/service-area" className="hover:text-brand-orange">Service area</Link></li>
          <li aria-hidden="true">/</li>
          <li className="font-semibold text-slate-950">Equipment rental in {city.name}</li>
        </ol>
      </nav>

      {/* Hero */}
      <section className="bg-slate-950 text-white">
        <div className="container-page py-12 md:py-16">
          <p className="text-sm uppercase tracking-wide text-brand-orange font-bold">
            {city.region} region · {cfg.business.name}
          </p>
          <h1 className="mt-2 text-3xl md:text-5xl leading-tight">
            Equipment rental in {city.name}
          </h1>
          <p className="mt-4 text-lg text-slate-200 max-w-3xl">
            Dehumidifiers, air scrubbers, carpet extractors, air movers, generators, and heaters — delivered to {city.name}.
            {deliveryPrice ? ` Delivery to ${city.name}: $${deliveryPrice} per order.` : ''}
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link
              href="/equipment"
              className="btn-primary text-lg"
              data-event={`city_hero_rent_${city.slug}`}
            >
              Browse rental catalog
            </Link>
            <Link href="/equipment?view=buy" className="btn-secondary text-lg bg-transparent text-white border-white hover:bg-slate-800">
              Shop for sale
            </Link>
          </div>
        </div>
      </section>

      {/* Local context */}
      <section className="bg-white">
        <div className="container-page py-12">
          <h2 className="text-2xl md:text-3xl">Renting in {city.name}</h2>
          <p className="mt-4 text-base text-slate-700 max-w-3xl leading-relaxed">{city.localContext}</p>
          {city.neighborhoods.length > 0 && (
            <p className="mt-4 text-base text-slate-700 max-w-3xl">
              <span className="font-semibold">Neighbourhoods we deliver in {city.name}:</span>{' '}
              {city.neighborhoods.join(' · ')}.
            </p>
          )}
          <p className="mt-2 text-sm text-slate-600">{city.driveTime}.</p>
        </div>
      </section>

      {/* Typical jobs */}
      <section className="bg-slate-50">
        <div className="container-page py-12">
          <h2 className="text-2xl md:text-3xl">Typical {city.name} jobs we handle</h2>
          <ul className="mt-6 grid sm:grid-cols-2 gap-4">
            {city.typicalJobs.map((j) => (
              <li key={j} className="flex items-start gap-3 bg-white rounded-md border border-slate-200 p-4">
                <span className="mt-1 w-2 h-2 rounded-full bg-brand-orange flex-shrink-0" />
                <span className="text-base">{j}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Equipment catalog */}
      <section className="bg-white">
        <div className="container-page py-12">
          <h2 className="text-2xl md:text-3xl">What we deliver to {city.name}</h2>
          <div className="mt-8 grid md:grid-cols-2 gap-6">
            {equipment.map((item) => (
              <Link
                key={item.id}
                href={`/equipment/${item.id}/${city.slug}`}
                className="rounded-lg border border-slate-200 p-6 bg-white hover:border-brand-orange hover:shadow-sm transition-all group"
                data-event={`city_item_click_${city.slug}_${item.id}`}
              >
                <p className="text-xs uppercase tracking-wide text-brand-orange font-bold">
                  {item.class}
                </p>
                <h3 className="mt-1 text-xl font-bold text-slate-950 group-hover:text-brand-orange">{item.shortName}</h3>
                <p className="mt-3 text-base text-slate-700">{item.tagline}</p>
                <ul className="mt-4 space-y-1 text-sm text-slate-700">
                  {item.idealFor.slice(0, 3).map((j) => (
                    <li key={j} className="flex items-start gap-2">
                      <span className="mt-1 w-1.5 h-1.5 rounded-full bg-brand-orange flex-shrink-0" />
                      <span>{j}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-sm font-semibold">{item.displayRate}</p>
                <p className="mt-3 text-xs font-semibold text-brand-orange group-hover:underline">
                  Rent in {city.name} →
                </p>
              </Link>
            ))}
          </div>
          <p className="mt-6 text-sm text-slate-700">
            <Link href="/rent" className="underline font-semibold">
              See full rental catalog
            </Link>
            {' · '}
            <Link href="/buy" className="underline font-semibold">
              Shop used equipment
            </Link>
          </p>
        </div>
      </section>

      {/* Sibling cities */}
      {siblings.length > 0 && (
        <section className="bg-white">
          <div className="container-page py-12">
            <h2 className="text-2xl md:text-3xl">Nearby areas we deliver to</h2>
            <ul className="mt-6 grid sm:grid-cols-2 md:grid-cols-4 gap-3">
              {siblings.map((s) => (
                <li key={s.slug}>
                  <Link
                    href={cityPageUrl(s.slug, cfg)}
                    className="block px-4 py-3 rounded-md bg-slate-50 border border-slate-200 font-semibold hover:bg-slate-100 hover:border-slate-300"
                  >
                    Equipment rental in {s.name}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm">
              <Link href="/service-area" className="underline font-semibold">
                See full service area
              </Link>
            </p>
          </div>
        </section>
      )}

      {/* CTA */}
      <section id="cta" className="bg-slate-950 text-white scroll-mt-16">
        <div className="container-page py-12 md:py-16 text-center">
          <h2 className="text-2xl md:text-3xl">Need equipment in {city.name}?</h2>
          <p className="mt-4 text-slate-200 max-w-2xl mx-auto">
            Add what you need to the cart, pick your dates, and we&apos;ll confirm delivery within a few hours during business hours.
          </p>
          <div className="mt-8">
            <Link href="/equipment" className="btn-primary text-lg" data-event={`city_cta_rent_${city.slug}`}>
              Browse equipment
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
