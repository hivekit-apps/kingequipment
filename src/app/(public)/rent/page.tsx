import type { Metadata } from 'next';
import Link from 'next/link';
import { getSiteConfigDynamic, rentableByCategory, visibleEquipment } from '@/lib/config';
import { EquipmentCard } from '@/components/EquipmentCard';

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const cfg = await getSiteConfigDynamic();
  return {
    title: `Rent equipment — ${cfg.business.name}`,
    description: `Rent construction heaters, drying and water damage equipment, inverter generators, and more. Delivered across Toronto, Markham, and the full Durham Region. Daily, weekly, and monthly rates with automatic rate tiering.`,
  };
}

export default async function RentPage() {
  const cfg = await getSiteConfigDynamic();
  const grouped = rentableByCategory(cfg);
  const totalRentable = visibleEquipment(cfg).filter((e) => e.availability.includes('rent')).length;

  return (
    <section className="container-page py-12">
      <nav aria-label="Breadcrumb" className="text-sm text-slate-600">
        <Link href="/" className="hover:text-brand-orange">Home</Link>
        <span className="mx-2">/</span>
        <span className="text-slate-950 font-semibold">Rent</span>
      </nav>

      <div className="mt-4 flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl">Rent equipment</h1>
          <p className="mt-3 text-base text-slate-700 max-w-2xl">
            {totalRentable} item{totalRentable === 1 ? '' : 's'} available for rent. Daily, weekly, and
            monthly rates — you always get the cheapest applicable rate automatically. Delivery across
            Toronto, Markham, and the full Durham Region.
          </p>
        </div>
        <Link href="/buy" className="btn-secondary text-sm px-4 py-2 min-h-[44px]">
          Shop sales →
        </Link>
      </div>

      {/* Category jump nav */}
      <nav aria-label="Category navigation" className="mt-8 flex flex-wrap gap-2">
        {cfg.categories
          .filter((c) => grouped.has(c.slug))
          .map((c) => (
            <a
              key={c.slug}
              href={`#cat-${c.slug}`}
              className="inline-block px-3 py-2 rounded-full bg-slate-100 border border-slate-200 text-sm font-semibold hover:bg-slate-200"
            >
              {c.name}
            </a>
          ))}
      </nav>

      {cfg.categories.map((cat) => {
        const items = grouped.get(cat.slug);
        if (!items || items.length === 0) return null;
        // Only enabled categories have per-city landing pages; the sub-nav
        // links to each (category × city) SEO landing page.
        const hasLandingPages = ['drying-water-damage', 'inverter-generators', 'construction-heaters'].includes(cat.slug);
        return (
          <section key={cat.slug} id={`cat-${cat.slug}`} className="mt-12 scroll-mt-24">
            <h2 className="text-2xl font-bold">{cat.name}</h2>
            {cat.description && (
              <p className="mt-2 text-sm text-slate-700 max-w-3xl">{cat.description}</p>
            )}
            {hasLandingPages && (
              <div className="mt-4">
                <p className="text-xs uppercase tracking-wide text-slate-500 font-bold">
                  Rent in your city
                </p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {cfg.cityPages.cities.map((c) => (
                    <li key={c.slug}>
                      <Link
                        href={`/${cat.slug}/${c.slug}`}
                        className="inline-block px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold hover:bg-slate-200"
                        data-event={`rent_cat_city_${cat.slug}_${c.slug}`}
                      >
                        {c.name} · ${c.deliveryPrice}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((item) => (
                <EquipmentCard key={`r-${item.id}`} item={item} mode="rent" />
              ))}
            </div>
          </section>
        );
      })}

      {totalRentable === 0 && (
        <p className="mt-10 text-sm text-slate-700">
          No rental items are currently listed. Please check back soon or{' '}
          <Link href="/contact" className="underline font-semibold">
            contact us
          </Link>{' '}
          to request a quote.
        </p>
      )}
    </section>
  );
}
