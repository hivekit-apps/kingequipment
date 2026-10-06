import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getSiteConfig,
  getSiteConfigDynamic,
  getCategory,
  rentableByCategory,
  cityPageUrl,
  type CityPage,
  type Category,
} from '@/lib/config';
import { EquipmentCard } from '@/components/EquipmentCard';
import {
  categoryCityLocalBusinessJsonLd,
  categoryCityBreadcrumbsJsonLd,
} from '@/lib/jsonld';

export const revalidate = 60;
export const dynamicParams = false;

// Only these three categories have inventory. conventional-generators is
// tracked in config but has no SKUs yet — intentionally omitted from the
// prerender set per owner spec (TASK B).
const ENABLED_CATEGORIES = [
  'drying-water-damage',
  'inverter-generators',
  'construction-heaters',
] as const;

export function generateStaticParams() {
  const cfg = getSiteConfig();
  const cities = cfg.cityPages.cities.map((c) => c.slug);
  const params: { category: string; city: string }[] = [];
  for (const category of ENABLED_CATEGORIES) {
    for (const city of cities) {
      params.push({ category, city });
    }
  }
  return params;
}

type RouteParams = { category: string; city: string };

export async function generateMetadata({ params }: { params: RouteParams }): Promise<Metadata> {
  if (!ENABLED_CATEGORIES.includes(params.category as (typeof ENABLED_CATEGORIES)[number])) {
    return {};
  }
  const cfg = await getSiteConfigDynamic();
  const cat = getCategory(params.category, cfg);
  const city = cfg.cityPages.cities.find((c) => c.slug === params.city);
  if (!cat || !city) return {};

  const grouped = rentableByCategory(cfg);
  const items = grouped.get(cat.slug) ?? [];
  const firstThree = items.slice(0, 3).map((i) => i.shortName).join(', ');

  const title = `${cat.name} Rental in ${city.name} — ${cfg.business.name}`;
  const description = `Rent ${cat.name.toLowerCase()} in ${city.name}, delivered. ${items.length} item${items.length === 1 ? '' : 's'} available: ${firstThree}. Daily, weekly, and monthly rates. Delivery to ${city.name}: $${city.deliveryPrice}.`;
  const canonical = `/${cat.slug}/${city.slug}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: `${cfg.business.siteUrl}${canonical}`,
      siteName: cfg.business.name,
      locale: 'en_CA',
      type: 'website',
    },
  };
}

function pickSiblingCities(current: CityPage, all: CityPage[]): CityPage[] {
  const sameRegion = all.filter((c) => c.slug !== current.slug && c.region === current.region);
  const picks = sameRegion.slice(0, 4);
  if (picks.length < 4) {
    const others = all.filter((c) => c.slug !== current.slug && !picks.includes(c));
    picks.push(...others.slice(0, 4 - picks.length));
  }
  return picks;
}

function otherCategoriesInCity(current: Category, all: Category[]): Category[] {
  return all
    .filter((c) => c.slug !== current.slug && ENABLED_CATEGORIES.includes(c.slug as (typeof ENABLED_CATEGORIES)[number]))
    .slice(0, 3);
}

function categoryHeroCopy(cat: Category, city: CityPage): string {
  const base = `Renting ${cat.name.toLowerCase()} in ${city.name} is straightforward: we deliver, you operate, we pick up. Flat delivery of $${city.deliveryPrice} per order to ${city.name} — same price for one unit or ten.`;
  const jobs = city.typicalJobs.length > 0 ? ` Common ${city.name} jobs we handle: ${city.typicalJobs.slice(0, 2).join('; ').toLowerCase()}.` : '';
  return base + jobs;
}

function categoryFaqs(cat: Category, city: CityPage, firstItem: string): { q: string; a: string }[] {
  switch (cat.slug) {
    case 'drying-water-damage':
      return [
        {
          q: `How fast can you deliver a dehumidifier in ${city.name} for emergency water damage?`,
          a: `${city.driveTime}. For emergency water damage in ${city.name}, we move fast — mold starts growing in 24–48 hours after a flood, so same-day drop-off is the norm when we have inventory. Delivery is a flat $${city.deliveryPrice} to ${city.name}, no surge pricing for after-hours or weekends.`,
        },
        {
          q: `What drying equipment do I actually need for a flooded basement in ${city.name}?`,
          a: `For most residential floods the stack is: a carpet water extractor (if there's standing water on carpet), one or two LGR-class dehumidifiers (${firstItem} is our go-to), two to four air movers, and an air scrubber if there's any mold concern. For a typical ${city.name} basement (800–1200 sq ft), one Dri-Eaz LGR 7000 XLi plus three F259-SM air movers runs 3–5 days.`,
        },
        {
          q: `Can I rent for just one or two days in ${city.name}?`,
          a: `Yes — our daily rate is the floor, and the weekly rate kicks in automatically once it's cheaper. So you never pay more than our weekly rate even if you keep the equipment for 7 days. Same for the monthly tier.`,
        },
        {
          q: `Do you deliver drying equipment to ${city.name} on evenings or weekends?`,
          a: `We'll do our best for water damage emergencies. Email us at the booking address with your postal code and we'll confirm within business hours (Mon–Sat 7am–7pm). For weekend emergency drops in ${city.name}, we try to accommodate same-day.`,
        },
      ];
    case 'inverter-generators':
      return [
        {
          q: `What size inverter generator do I need for a job site in ${city.name}?`,
          a: `For a trades truck or a few hand tools, 3,000–3,300W (Firman W3300i) is plenty. For a mid-size site running a compressor plus tools, 5,000–5,500W (Predator 5000W Dual-Fuel, Champion 5,500W) fits. For a large site with multiple heavy loads or sensitive electronics, 7,000W (A-iPower GXS7100iRDC) is the right pick. All of ours are inverter-class, so they're safe for laptops, phones, and jobsite electronics.`,
        },
        {
          q: `Can I run a dual-fuel generator on propane during an outage in ${city.name}?`,
          a: `Yes — our Predator 5000W Dual-Fuel runs on gasoline or propane. Propane is slightly less powerful but burns cleaner and stores indefinitely, which makes it a better backup fuel for ${city.name} residents who want generator coverage without storing fresh gasoline year-round.`,
        },
        {
          q: `How long will a tank of fuel last on these generators?`,
          a: `Depends on load. At 25–50% load the Firman W3300i runs ~9 hours on a tank; the Predator 5000W Dual-Fuel runs ~8 hours on gas or ~5 hours on a 20 lb propane cylinder; the A-iPower 7,000W runs ~10 hours. For continuous backup power during a ${city.name} outage, plan for refueling every 8–10 hours or run on a larger propane tank.`,
        },
        {
          q: `Do inverter generators work for powering sensitive electronics in ${city.name}?`,
          a: `Yes — that's the whole point. Inverter generators produce clean sine-wave power with low harmonic distortion, which is safe for laptops, phones, modems, routers, and medical equipment. Conventional generators can damage sensitive gear.`,
        },
      ];
    case 'construction-heaters':
      return [
        {
          q: `What size construction heater do I need for a job site in ${city.name}?`,
          a: `For a mid-size site in ${city.name} (garage, workshop, 1500–3000 sq ft open area), the Remington 140,000 BTU kerosene heater is the workhorse pick. For large open-air sites, warehouses, or heavy drying assist in winter, the Flagro 400,000 BTU propane heater is the right call. Both are portable and renter-operated.`,
        },
        {
          q: `Can I use a kerosene heater indoors in ${city.name}?`,
          a: `Only with proper ventilation. Torpedo-style kerosene heaters like our Remington 140k are designed for open or ventilated spaces — they produce exhaust that needs to escape. In sealed indoor spaces, use propane with a direct-vent setup instead, or use smaller ventless propane only if the manufacturer rates it for indoor use.`,
        },
        {
          q: `How much fuel does a 400,000 BTU propane heater burn in ${city.name} winter conditions?`,
          a: `At full output, a Flagro 400,000 BTU unit burns roughly 4 gallons of propane per hour (about one 100 lb cylinder every ~6 hours). For a 10-hour workday in a cold ${city.name} job site, plan for a propane bulk tank or two large cylinders.`,
        },
        {
          q: `Will you deliver a construction heater to ${city.name} this week?`,
          a: `${city.driveTime}. Winter is peak season for construction heaters, so the earlier you book the better your pick. Delivery to ${city.name} is a flat $${city.deliveryPrice}.`,
        },
      ];
    default:
      return [];
  }
}

export default async function CategoryCityLandingPage({ params }: { params: RouteParams }) {
  if (!ENABLED_CATEGORIES.includes(params.category as (typeof ENABLED_CATEGORIES)[number])) {
    notFound();
  }
  const cfg = await getSiteConfigDynamic();
  const cat = getCategory(params.category, cfg);
  const city = cfg.cityPages.cities.find((c) => c.slug === params.city);
  if (!cat || !city) notFound();

  const grouped = rentableByCategory(cfg);
  const items = grouped.get(cat.slug) ?? [];
  const firstItem = items[0]?.shortName ?? cat.name;
  const siblings = pickSiblingCities(city, cfg.cityPages.cities);
  const otherCats = otherCategoriesInCity(cat, cfg.categories);
  const faqs = categoryFaqs(cat, city, firstItem);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: categoryCityLocalBusinessJsonLd(
            cfg,
            cat.name,
            city,
            items.map((i) => ({ name: i.name, tagline: i.tagline, displayRate: i.displayRate })),
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: categoryCityBreadcrumbsJsonLd(cfg, cat.slug, cat.name, city),
        }}
      />

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="bg-slate-50 border-b border-slate-200">
        <ol className="container-page py-3 flex flex-wrap gap-x-2 text-sm text-slate-700">
          <li><Link href="/" className="hover:text-brand-orange">Home</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link href="/rent" className="hover:text-brand-orange">Rent</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link href={`/rent#cat-${cat.slug}`} className="hover:text-brand-orange">{cat.name}</Link></li>
          <li aria-hidden="true">/</li>
          <li className="font-semibold text-slate-950">{city.name}</li>
        </ol>
      </nav>

      {/* Hero */}
      <section className="bg-slate-950 text-white">
        <div className="container-page py-12 md:py-16">
          <p className="text-sm uppercase tracking-wide text-brand-orange font-bold">
            {city.region} region · {cfg.business.name}
          </p>
          <h1 className="mt-2 text-3xl md:text-5xl leading-tight">
            {cat.name} rental in {city.name}
          </h1>
          <p className="mt-4 text-lg text-slate-200 max-w-3xl">
            {categoryHeroCopy(cat, city)}
          </p>
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-300">
            <span><span className="font-semibold text-white">{items.length}</span> item{items.length === 1 ? '' : 's'} available</span>
            <span>Delivery to {city.name}: <span className="font-semibold text-white">${city.deliveryPrice}</span></span>
            <span>{city.driveTime}</span>
          </div>
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link href="#catalog" className="btn-primary text-lg" data-event={`cc_hero_browse_${cat.slug}_${city.slug}`}>
              See {items.length} rental{items.length === 1 ? '' : 's'}
            </Link>
            <Link href={cityPageUrl(city.slug, cfg)} className="btn-secondary text-lg bg-transparent text-white border-white hover:bg-slate-800">
              All equipment for {city.name}
            </Link>
          </div>
        </div>
      </section>

      {/* Category description */}
      <section className="bg-white">
        <div className="container-page py-12">
          <h2 className="text-2xl md:text-3xl">About {cat.name.toLowerCase()}</h2>
          <p className="mt-4 text-base text-slate-700 max-w-3xl leading-relaxed">{cat.description}</p>
        </div>
      </section>

      {/* Local context */}
      <section className="bg-slate-50">
        <div className="container-page py-12 grid md:grid-cols-2 gap-10">
          <div>
            <h2 className="text-2xl md:text-3xl">Why {city.name}</h2>
            <p className="mt-4 text-base text-slate-700 leading-relaxed">{city.localContext}</p>
            {city.neighborhoods.length > 0 && (
              <p className="mt-4 text-base text-slate-700">
                <span className="font-semibold">Neighbourhoods we deliver {cat.name.toLowerCase()} to:</span>{' '}
                {city.neighborhoods.join(' · ')}.
              </p>
            )}
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl">Typical {city.name} jobs</h2>
            <ul className="mt-4 space-y-3">
              {city.typicalJobs.map((j) => (
                <li key={j} className="flex items-start gap-3 bg-white rounded-md border border-slate-200 p-4">
                  <span className="mt-1 w-2 h-2 rounded-full bg-brand-orange flex-shrink-0" />
                  <span className="text-base">{j}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Equipment catalog */}
      <section id="catalog" className="bg-white scroll-mt-16">
        <div className="container-page py-12">
          <h2 className="text-2xl md:text-3xl">{cat.name} we deliver to {city.name}</h2>
          <p className="mt-3 text-base text-slate-700 max-w-3xl">
            {items.length === 0
              ? `No ${cat.name.toLowerCase()} currently listed — check back soon or contact us for availability.`
              : `${items.length} rental option${items.length === 1 ? '' : 's'}. All include delivery to ${city.name} for $${city.deliveryPrice}.`}
          </p>
          {items.length > 0 && (
            <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((item) => (
                <EquipmentCard key={`cc-${item.id}`} item={item} mode="rent" />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* FAQ */}
      {faqs.length > 0 && (
        <section className="bg-slate-50">
          <div className="container-page py-12">
            <h2 className="text-2xl md:text-3xl">FAQ — {cat.name} rental in {city.name}</h2>
            <div className="mt-6 space-y-4">
              {faqs.map((f) => (
                <details key={f.q} className="group rounded-md bg-white border border-slate-200 p-4">
                  <summary className="font-semibold cursor-pointer text-base list-none flex justify-between items-center">
                    {f.q}
                    <span className="ml-2 text-brand-orange group-open:rotate-45 transition-transform">+</span>
                  </summary>
                  <p className="mt-3 text-base text-slate-700">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Cross-links */}
      <section className="bg-white">
        <div className="container-page py-12 grid md:grid-cols-2 gap-10">
          {otherCats.length > 0 && (
            <div>
              <h2 className="text-2xl md:text-3xl">Other rentals in {city.name}</h2>
              <ul className="mt-6 space-y-3">
                {otherCats.map((oc) => (
                  <li key={oc.slug}>
                    <Link
                      href={`/${oc.slug}/${city.slug}`}
                      className="block px-4 py-3 rounded-md bg-slate-50 border border-slate-200 font-semibold hover:bg-slate-100 hover:border-slate-300"
                    >
                      {oc.name} rental in {city.name} →
                    </Link>
                  </li>
                ))}
                <li>
                  <Link
                    href={cityPageUrl(city.slug, cfg)}
                    className="block px-4 py-3 rounded-md bg-slate-50 border border-slate-200 font-semibold hover:bg-slate-100 hover:border-slate-300"
                  >
                    See all equipment for {city.name} →
                  </Link>
                </li>
              </ul>
            </div>
          )}
          {siblings.length > 0 && (
            <div>
              <h2 className="text-2xl md:text-3xl">{cat.name} in nearby cities</h2>
              <ul className="mt-6 space-y-3">
                {siblings.map((s) => (
                  <li key={s.slug}>
                    <Link
                      href={`/${cat.slug}/${s.slug}`}
                      className="block px-4 py-3 rounded-md bg-slate-50 border border-slate-200 font-semibold hover:bg-slate-100 hover:border-slate-300"
                    >
                      {cat.name} rental in {s.name} · ${s.deliveryPrice} delivery
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section id="cta" className="bg-slate-950 text-white scroll-mt-16">
        <div className="container-page py-12 md:py-16 text-center">
          <h2 className="text-2xl md:text-3xl">Need {cat.name.toLowerCase()} in {city.name}?</h2>
          <p className="mt-4 text-slate-200 max-w-2xl mx-auto">
            Pick your equipment, add it to the cart, choose dates, and we&apos;ll confirm delivery within a few hours during business hours.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="#catalog" className="btn-primary text-lg" data-event={`cc_cta_catalog_${cat.slug}_${city.slug}`}>
              Browse {items.length} rental{items.length === 1 ? '' : 's'}
            </Link>
            <Link href="/contact" className="btn-secondary text-lg bg-transparent text-white border-white hover:bg-slate-800">
              Email for a quote
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
