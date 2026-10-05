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
