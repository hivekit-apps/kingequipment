import type { Metadata } from 'next';
import Link from 'next/link';
import { getSiteConfig, cityPageUrl } from '@/lib/config';

const cfg = getSiteConfig();

export const metadata: Metadata = {
  title: 'Service area & delivery',
  description: `${cfg.business.name} delivers rental and sales equipment across ${cfg.cityPages.cities.map((c) => c.name).join(', ')}.`,
};

export default function ServiceAreaPage() {
  return (
    <section className="container-page py-12">
      <h1 className="text-3xl md:text-4xl">Service area &amp; delivery</h1>
      <p className="mt-4 text-base text-slate-700 max-w-2xl">{cfg.serviceAreaTagline}</p>

      <div className="mt-10">
        <h2 className="text-xl font-bold">Delivery pricing by city</h2>
        <p className="mt-2 text-sm text-slate-700">Flat per-order delivery price. Same price for one item or ten.</p>
        <ul className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {cfg.cityPages.cities.map((c) => (
            <li key={c.slug}>
              <Link
                href={cityPageUrl(c.slug, cfg)}
                className="flex items-baseline justify-between gap-3 px-4 py-3 rounded-md bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300"
              >
                <span className="font-semibold text-slate-950">{c.name}</span>
                <span className="font-bold text-brand-orange">${c.deliveryPrice}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-12 bg-slate-50 rounded-md p-6 border border-slate-200">
        <h2 className="text-xl font-bold">How delivery works</h2>
        <p className="mt-3 text-base">{cfg.pricing.deliveryNote}</p>
        <p className="mt-3 text-base">{cfg.pricing.multiDayNote}</p>
      </div>

      {/* Per-city category deep-links */}
      <div className="mt-12">
        <h2 className="text-xl font-bold">Rentals by city and category</h2>
        <p className="mt-2 text-sm text-slate-700 max-w-3xl">
          Every city has dedicated pages for each equipment category with local pricing and job-type notes.
          Pick a city, pick a category, we deliver.
        </p>
        <div className="mt-6 space-y-6">
          {cfg.cityPages.cities.map((c) => (
            <div key={c.slug} className="rounded-md border border-slate-200 bg-white p-5">
              <div className="flex items-baseline justify-between gap-4 flex-wrap">
                <h3 className="text-lg font-bold text-slate-950">
                  <Link href={cityPageUrl(c.slug, cfg)} className="hover:text-brand-orange">
                    {c.name}
                  </Link>
                </h3>
                <span className="text-sm text-slate-600">
                  Delivery <span className="font-bold text-brand-orange">${c.deliveryPrice}</span> · {c.region} region
                </span>
              </div>
              <ul className="mt-3 flex flex-wrap gap-2">
                {['drying-water-damage', 'inverter-generators', 'construction-heaters'].map((catSlug) => {
                  const cat = cfg.categories.find((cc) => cc.slug === catSlug);
                  if (!cat) return null;
                  return (
                    <li key={catSlug}>
                      <Link
                        href={`/${catSlug}/${c.slug}`}
                        className="inline-block px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold hover:bg-slate-200"
                        data-event={`sa_city_cat_${c.slug}_${catSlug}`}
                      >
                        {cat.name}
                      </Link>
                    </li>
                  );
                })}
                <li>
                  <Link
                    href={cityPageUrl(c.slug, cfg)}
                    className="inline-block px-3 py-1.5 rounded-full bg-slate-900 text-white border border-slate-900 text-xs font-semibold hover:bg-slate-800"
                  >
                    All equipment →
                  </Link>
                </li>
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-10 flex flex-col sm:flex-row gap-3">
        <Link href="/equipment" className="btn-primary" data-event="service_area_shop_click">
          Browse equipment
        </Link>
        <Link href="/cart" className="btn-secondary">
          View cart
        </Link>
      </div>
    </section>
  );
}
