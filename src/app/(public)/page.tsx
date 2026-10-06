import Link from 'next/link';
import Image from 'next/image';
import { getSiteConfig, cityPageUrl, visibleEquipment, classLabel, rentableByCategory } from '@/lib/config';
import { PhotoStrip } from '@/components/PhotoStrip';
import { HeroPhoto } from '@/components/HeroPhoto';

export default function HomePage() {
  const cfg = getSiteConfig();
  const equipment = visibleEquipment(cfg);
  const grouped = rentableByCategory(cfg);
  return (
    <>
      {/* Hero */}
      <section className="bg-slate-950 text-white">
        <div className="container-page py-12 md:py-20 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h1 className="text-3xl md:text-5xl leading-tight">
              {cfg.business.tagline}
            </h1>
            <p className="mt-4 text-lg text-slate-200">
              Local owner-operator. {cfg.pricing.deliveryNote}
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link href="/equipment" className="btn-primary text-lg" data-event="hero_shop_click">
                Browse equipment
              </Link>
              <Link href="/service-area" className="btn-secondary text-lg bg-transparent text-white border-white hover:bg-slate-800" data-event="hero_area_click">
                Delivery pricing by city
              </Link>
            </div>
          </div>
          <div>
            <HeroPhoto />
          </div>
        </div>
      </section>

      {/* Equipment preview */}
      <section className="bg-white">
        <div className="container-page py-12">
          <h2 className="text-2xl md:text-3xl">Our rental &amp; sales catalog</h2>
          <p className="mt-3 text-base text-slate-700 max-w-2xl">
            {cfg.pricing.displayRate}. {cfg.pricing.multiDayNote}
          </p>
          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {equipment.map((item) => (
              <div key={item.id} className="rounded-lg border border-slate-200 p-5 flex flex-col">
                {item.photos[0] && (
                  <div className="relative w-full aspect-square overflow-hidden rounded-md bg-white mb-4">
                    <Image
                      src={item.photos[0].src}
                      alt={item.photos[0].alt}
                      fill
                      sizes="(max-width: 640px) 100vw, 33vw"
                      className="object-contain"
                    />
                  </div>
                )}
                <p className="text-xs uppercase tracking-wide text-brand-orange font-bold">
                  {classLabel(item.class)}
                </p>
                <h3 className="mt-1 text-lg font-bold text-slate-950">{item.shortName}</h3>
                <p className="mt-2 text-sm text-slate-700 flex-1">{item.tagline}</p>
                <p className="mt-3 text-sm font-semibold">{item.displayRate}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {item.availability.includes('rent') && (
                    <Link
                      href={`/equipment/${item.id}`}
                      className="inline-block btn-primary text-xs px-3 py-2 min-h-[40px]"
                      data-event={`home_rent_${item.id}`}
                    >
                      Rent
                    </Link>
                  )}
                  {item.availability.includes('buy') && (
                    <Link
                      href={`/equipment/${item.id}?mode=buy`}
                      className="inline-block btn-secondary text-xs px-3 py-2 min-h-[40px]"
                      data-event={`home_buy_${item.id}`}
                    >
                      Buy
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-8 text-sm text-slate-700">
            <Link href="/equipment" className="underline font-semibold">
              See full catalog &amp; place an order
            </Link>
          </p>
        </div>
      </section>

      {/* Browse by category */}
      <section className="bg-slate-50 border-y border-slate-200">
        <div className="container-page py-12">
          <h2 className="text-2xl md:text-3xl">Browse by category</h2>
          <p className="mt-3 text-base text-slate-700 max-w-2xl">
            Serving {cfg.cityPages.cities.length} cities across Toronto, Markham, and the Durham Region.
            Each category also has city-specific pages with local pricing and delivery details.
          </p>
          <ul className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {cfg.categories.map((cat) => {
              const items = grouped.get(cat.slug) ?? [];
              const hasItems = items.length > 0;
              const href = hasItems ? `/rent#cat-${cat.slug}` : '/contact';
              return (
                <li key={cat.slug}>
                  <Link
                    href={href}
                    className={`block h-full rounded-lg border p-5 transition-all group ${hasItems ? 'border-slate-200 bg-white hover:border-brand-orange hover:shadow-sm' : 'border-dashed border-slate-300 bg-white/50'}`}
                    data-event={`home_cat_${cat.slug}`}
                  >
                    <p className="text-xs uppercase tracking-wide text-brand-orange font-bold">
                      {hasItems ? `${items.length} rental${items.length === 1 ? '' : 's'}` : 'Coming soon'}
                    </p>
                    <h3 className="mt-1 text-xl font-bold text-slate-950 group-hover:text-brand-orange">
                      {cat.name}
                    </h3>
                    <p className="mt-2 text-sm text-slate-700">{cat.description}</p>
                    {hasItems && (
                      <p className="mt-4 text-xs font-semibold text-brand-orange group-hover:underline">
                        See {cat.name.toLowerCase()} →
                      </p>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* Resources strip */}
      <section className="bg-white">
        <div className="container-page py-10">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-brand-orange font-bold">New guide</p>
              <h2 className="mt-1 text-xl md:text-2xl font-bold text-slate-950">
                How to dry out a flooded basement — step by step
              </h2>
              <p className="mt-2 text-sm text-slate-700 max-w-2xl">
                A restoration-trades playbook with equipment specs, timelines, and sizing rules of thumb.
              </p>
            </div>
            <Link
              href="/guides/basement-flood-recovery"
              className="btn-primary text-sm"
              data-event="home_guide_basement_flood"
            >
              Read the guide →
            </Link>
          </div>
        </div>
      </section>

      {/* Trust block */}
      <section className="bg-slate-50">
        <div className="container-page py-12">
          <h2 className="text-2xl md:text-3xl">Why order from us</h2>
          <ul className="mt-6 grid sm:grid-cols-2 gap-4">
            {cfg.trustPoints.map((t) => (
              <li key={t} className="flex items-start gap-3">
                <span className="mt-1 w-2 h-2 rounded-full bg-brand-orange flex-shrink-0" />
                <span className="text-base">{t}</span>
              </li>
            ))}
          </ul>
          {cfg.partner.name && (
            <p className="mt-6 text-sm text-slate-700">
              Partner: <span className="font-semibold">{cfg.partner.name}</span>
              {cfg.partner.credentials ? ` — ${cfg.partner.credentials}` : ''}.
            </p>
          )}
          <p className="mt-4 text-sm text-slate-700">{cfg.pricing.comparisonNote}</p>
        </div>
      </section>

      {/* Photos (mobile reveal) */}
      <section className="bg-white md:hidden">
        <div className="container-page py-12">
          <h2 className="text-2xl">Recent jobs</h2>
          <div className="mt-6">
            <PhotoStrip />
          </div>
        </div>
      </section>

      {/* Service area summary */}
      <section className="bg-white">
        <div className="container-page py-12">
          <h2 className="text-2xl md:text-3xl">We deliver across Toronto, Markham &amp; Durham</h2>
          <p className="mt-3 text-base text-slate-700 max-w-2xl">{cfg.serviceAreaTagline}</p>

          <div className="mt-8">
            <ul className="flex flex-wrap gap-2">
              {cfg.cityPages.cities.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={cityPageUrl(c.slug, cfg)}
                    className="inline-block px-3 py-2 rounded-full bg-slate-100 text-sm font-semibold hover:bg-slate-200"
                  >
                    {c.name} · ${c.deliveryPrice}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-6">
            <Link href="/service-area" className="underline font-semibold">
              See full service area &amp; delivery details
            </Link>
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-slate-50">
        <div className="container-page py-12">
          <h2 className="text-2xl md:text-3xl">Frequently asked questions</h2>
          <div className="mt-6 space-y-4">
            {cfg.faq.map((item) => (
              <details key={item.q} className="group rounded-md bg-white border border-slate-200 p-4">
                <summary className="font-semibold cursor-pointer text-base list-none flex justify-between items-center">
                  {item.q}
                  <span className="ml-2 text-brand-orange group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="mt-3 text-base text-slate-700">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA — link to /equipment */}
      <section id="cta" className="bg-slate-950 text-white scroll-mt-16">
        <div className="container-page py-12 md:py-16 text-center">
          <h2 className="text-2xl md:text-3xl">Ready to order?</h2>
          <p className="mt-4 text-slate-200 max-w-2xl mx-auto">
            Add what you need to the cart, pick your dates and delivery city, and
            we&apos;ll confirm delivery details within a few hours during business hours.
          </p>
          <div className="mt-8">
            <Link href="/equipment" className="btn-primary text-lg" data-event="cta_shop_click">
              Browse the catalog
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
