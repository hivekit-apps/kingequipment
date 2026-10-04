import Link from 'next/link';
import { getSiteConfig, cityPageUrl, visibleEquipment } from '@/lib/config';
import { PhotoStrip } from '@/components/PhotoStrip';
import { HeroPhoto } from '@/components/HeroPhoto';

export default function HomePage() {
  const cfg = getSiteConfig();
  const equipment = visibleEquipment(cfg);
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
              One local owner-operator. {cfg.pricing.deliveryNote}
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link href="/book" className="btn-primary text-lg" data-event="hero_book_click">
                Book the loader · from $249.99/day
              </Link>
              <Link href="/equipment" className="btn-secondary text-lg bg-transparent text-white border-white hover:bg-slate-800" data-event="hero_specs_click">
                See specs &amp; photos
              </Link>
            </div>
          </div>
          <div>
            <HeroPhoto />
          </div>
        </div>
      </section>

      {/* Equipment intro */}
      <section className="bg-white">
        <div className="container-page py-12">
          <h2 className="text-2xl md:text-3xl">Our machine</h2>
          <div className="mt-8 grid md:grid-cols-2 gap-6">
            {equipment.map((item) => (
              <div key={item.id} className="rounded-lg border border-slate-200 p-6">
                <p className="text-xs uppercase tracking-wide text-brand-orange font-bold">
                  {item.class === 'heavy-duty' ? 'Heavy-duty' : 'Mini'}
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
                {item.bookable && (
                  <Link href="/book" className="mt-4 inline-block btn-primary text-sm" data-event={`equipment_intro_book_${item.id}`}>
                    Book this machine
                  </Link>
                )}
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

      {/* Trust block */}
      <section className="bg-slate-50">
        <div className="container-page py-12">
          <h2 className="text-2xl md:text-3xl">Why rent from us</h2>
          <ul className="mt-6 grid sm:grid-cols-2 gap-4">
            {cfg.trustPoints.map((t) => (
              <li key={t} className="flex items-start gap-3">
                <span className="mt-1 w-2 h-2 rounded-full bg-brand-orange flex-shrink-0" />
                <span className="text-base">{t}</span>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-slate-700">
            Operated in partnership with{' '}
            <a href={cfg.partner.url} target="_blank" rel="noopener noreferrer" className="underline font-semibold">
              {cfg.partner.business}
            </a>{' '}— {cfg.partner.credentials}.
          </p>
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
          <h2 className="text-2xl md:text-3xl">We deliver across the GTA</h2>
          <p className="mt-3 text-base text-slate-700 max-w-2xl">{cfg.serviceAreaTagline}</p>

          <div className="mt-8">
            <h3 className="text-sm uppercase tracking-wide text-slate-600 font-bold">Core delivery area</h3>
            <ul className="mt-3 flex flex-wrap gap-2">
              {cfg.cityPages.cities
                .filter((c) => c.coverage === 'core')
                .map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={cityPageUrl(c.slug, cfg)}
                      className="inline-block px-3 py-2 rounded-full bg-slate-100 text-sm font-semibold hover:bg-slate-200"
                    >
                      {c.name}
                    </Link>
                  </li>
                ))}
            </ul>
          </div>

          <div className="mt-6">
            <h3 className="text-sm uppercase tracking-wide text-slate-600 font-bold">Also serving</h3>
            <ul className="mt-3 flex flex-wrap gap-2">
              {cfg.cityPages.cities
                .filter((c) => c.coverage === 'extended')
                .map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={cityPageUrl(c.slug, cfg)}
                      className="inline-block px-3 py-2 rounded-full bg-slate-50 border border-slate-200 text-sm font-semibold hover:bg-slate-100"
                    >
                      {c.name}
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

      {/* CTA — link to /book (single request form lives there) */}
      <section id="cta" className="bg-slate-950 text-white scroll-mt-16">
        <div className="container-page py-12 md:py-16 text-center">
          <h2 className="text-2xl md:text-3xl">Ready to book?</h2>
          <p className="mt-4 text-slate-200 max-w-2xl mx-auto">
            Pick your dates, choose your delivery zone, and tell us where to send it.
            We&apos;ll confirm availability and delivery details via email within a few
            hours during business hours.
          </p>
          <div className="mt-8">
            <Link href="/book" className="btn-primary text-lg" data-event="cta_book_click">
              Request the loader
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
