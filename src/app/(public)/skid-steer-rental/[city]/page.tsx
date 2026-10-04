import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSiteConfig, cityPageUrl, visibleEquipment, type CityPage } from '@/lib/config';
import { cityLocalBusinessJsonLd, cityBreadcrumbsJsonLd } from '@/lib/jsonld';
import { PhotoStrip } from '@/components/PhotoStrip';

export const dynamicParams = false;

export function generateStaticParams() {
  const cfg = getSiteConfig();
  return cfg.cityPages.cities.map((c) => ({ city: c.slug }));
}

export function generateMetadata({ params }: { params: { city: string } }): Metadata {
  const cfg = getSiteConfig();
  const city = cfg.cityPages.cities.find((c) => c.slug === params.city);
  if (!city) return {};
  const title = `Skid-steer rental in ${city.name} — mini stand-on track loader`;
  const description = `${cfg.business.name} delivers mini stand-on track loader rental to ${city.name}. ${city.coverage === 'core' ? 'Delivery included.' : 'Delivery quoted up-front.'} Send a request and we'll email you back.`.trim();
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
  const coverageNote =
    city.coverage === 'core'
      ? `${city.name} is in our core service area — delivery is included.`
      : `We deliver to ${city.name} — a delivery fee applies and is quoted up-front before we book.`;

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
          <li className="font-semibold text-slate-950">Skid-steer rental in {city.name}</li>
        </ol>
      </nav>

      {/* Hero */}
      <section className="bg-slate-950 text-white">
        <div className="container-page py-12 md:py-16">
          <p className="text-sm uppercase tracking-wide text-brand-orange font-bold">
            {city.region} region · {cfg.business.name}
          </p>
          <h1 className="mt-2 text-3xl md:text-5xl leading-tight">
            Skid-steer rental in {city.name} — mini stand-on track loader
          </h1>
          <p className="mt-4 text-lg text-slate-200 max-w-3xl">
            {coverageNote} One local owner-operator. {cfg.pricing.deliveryNote.replace(/^Delivery included within our service area\.\s*/, '')}
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link
              href="/book"
              className="btn-primary text-lg"
              data-event={`city_hero_book_${city.slug}`}
            >
              Request the loader
            </Link>
            <Link href="/equipment" className="btn-secondary text-lg bg-transparent text-white border-white hover:bg-slate-800">
              See specs &amp; photos
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
              <span className="font-semibold">Areas we deliver in {city.name}:</span>{' '}
              {city.neighborhoods.join(' · ')} and surrounding.
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

      {/* Machine */}
      <section className="bg-white">
        <div className="container-page py-12">
          <h2 className="text-2xl md:text-3xl">The machine for {city.name} work</h2>
          <div className="mt-8 grid md:grid-cols-2 gap-6">
            {visibleEquipment(cfg).map((item) => (
              <div key={item.id} className="rounded-lg border border-slate-200 p-6">
                <p className="text-xs uppercase tracking-wide text-brand-orange font-bold">
                  {item.class === 'heavy-duty' ? 'Heavy-duty option' : 'Mini option'}
                </p>
                <h3 className="mt-1 text-xl font-bold text-slate-950">{item.shortName}</h3>
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
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-slate-700">
            <Link href="/equipment" className="underline font-semibold">
              See full specs &amp; photos
            </Link>
          </p>
        </div>
      </section>

      {/* Recent jobs photos */}
      <section className="bg-slate-50">
        <div className="container-page py-12">
          <h2 className="text-2xl md:text-3xl">Recent jobs</h2>
          <p className="mt-3 text-base text-slate-700 max-w-3xl">
            Photos from recent jobs around the GTA. Same machines that come to your {city.name} site.
          </p>
          <div className="mt-6">
            <PhotoStrip limit={4} />
          </div>
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
                    Skid-steer rental in {s.name}
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

      {/* CTA — link to /book (single request form) */}
      <section id="cta" className="bg-slate-950 text-white scroll-mt-16">
        <div className="container-page py-12 md:py-16 text-center">
          <h2 className="text-2xl md:text-3xl">Need a machine in {city.name}?</h2>
          <p className="mt-4 text-slate-200 max-w-2xl mx-auto">
            Pick your dates, choose your delivery zone, and tell us where to
            send it. We&apos;ll email you back to confirm availability and
            quote delivery within a few hours during business hours.
          </p>
          <div className="mt-8">
            <Link href="/book" className="btn-primary text-lg" data-event={`city_cta_book_${city.slug}`}>
              Request the loader
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
