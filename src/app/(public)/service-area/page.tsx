import type { Metadata } from 'next';
import Link from 'next/link';
import { getSiteConfig, cityPageUrl, type CityPage } from '@/lib/config';

const cfg = getSiteConfig();

export const metadata: Metadata = {
  title: 'Service Area & Delivery',
  description: `${cfg.business.name} delivers mini stand-on track loader rentals across the GTA — including ${cfg.cityPages.cities.slice(0, 6).map((c) => c.name).join(', ')} and ${cfg.cityPages.cities.length - 6}+ other cities.`,
};

function byRegion(cities: CityPage[]): Record<string, CityPage[]> {
  return cities.reduce<Record<string, CityPage[]>>((acc, c) => {
    (acc[c.region] ||= []).push(c);
    return acc;
  }, {});
}

const REGION_ORDER = ['York', 'Toronto', 'Peel', 'Halton', 'Durham', 'Simcoe'];

export default function ServiceAreaPage() {
  const grouped = byRegion(cfg.cityPages.cities);
  const orderedRegions = REGION_ORDER.filter((r) => grouped[r]).concat(
    Object.keys(grouped).filter((r) => !REGION_ORDER.includes(r)),
  );

  return (
    <section className="container-page py-12">
      <h1 className="text-3xl md:text-4xl">Service area &amp; delivery</h1>
      <p className="mt-4 text-base text-slate-700 max-w-2xl">{cfg.serviceAreaTagline}</p>

      <div className="mt-10">
        <h2 className="text-xl font-bold">Core delivery area (delivery included)</h2>
        <ul className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {cfg.cityPages.cities
            .filter((c) => c.coverage === 'core')
            .map((c) => (
              <li key={c.slug}>
                <Link
                  href={cityPageUrl(c.slug, cfg)}
                  className="block px-4 py-3 rounded-md bg-slate-50 border border-slate-200 font-semibold hover:bg-slate-100 hover:border-slate-300"
                >
                  {c.name}
                </Link>
              </li>
            ))}
        </ul>
      </div>

      <div className="mt-12">
        <h2 className="text-xl font-bold">Extended delivery area (delivery fee applies)</h2>
        <p className="mt-2 text-sm text-slate-700">
          Cities below are outside our core route — we deliver case-by-case and quote the delivery fee up-front.
        </p>
        {orderedRegions.map((region) => {
          const inRegion = grouped[region].filter((c) => c.coverage === 'extended');
          if (inRegion.length === 0) return null;
          return (
            <div key={region} className="mt-6">
              <h3 className="text-sm uppercase tracking-wide text-slate-600 font-bold">{region}</h3>
              <ul className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                {inRegion.map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={cityPageUrl(c.slug, cfg)}
                      className="block px-4 py-3 rounded-md bg-white border border-slate-200 font-semibold hover:bg-slate-50 hover:border-slate-300"
                    >
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="mt-12 bg-slate-50 rounded-md p-6 border border-slate-200">
        <h2 className="text-xl font-bold">Delivery</h2>
        <p className="mt-3 text-base">{cfg.pricing.deliveryNote}</p>
        <p className="mt-3 text-base">{cfg.pricing.multiDayNote}</p>
      </div>

      <div className="mt-10 flex flex-col sm:flex-row gap-3">
        <Link href="/book" className="btn-primary" data-event="service_area_book_click">
          Request the loader
        </Link>
        <Link href="/equipment" className="btn-secondary">
          See specs &amp; photos
        </Link>
      </div>
    </section>
  );
}
