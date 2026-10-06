import type { Metadata } from 'next';
import Link from 'next/link';
import { getSiteConfig, cityPageUrl } from '@/lib/config';
import { guideArticleJsonLd, guideBreadcrumbsJsonLd } from '@/lib/jsonld';

export const revalidate = 60;

const SLUG = 'basement-flood-recovery';
const TITLE = 'How to dry out a flooded basement — step by step';
const DESCRIPTION =
  'A restoration-trades playbook for drying a flooded basement: extract standing water, run LGR dehumidifiers, position air movers, scrub the air, verify, and prevent reoccurrence. With equipment specs and timelines.';
const DATE_PUBLISHED = '2026-10-04';

export const metadata: Metadata = {
  title: `${TITLE} — King Equipment Guides`,
  description: DESCRIPTION,
  alternates: { canonical: `/guides/${SLUG}` },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `/guides/${SLUG}`,
    siteName: 'King Equipment',
    locale: 'en_CA',
    type: 'article',
  },
};

export default function BasementFloodGuidePage() {
  const cfg = getSiteConfig();
  const cities = cfg.cityPages.cities;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: guideArticleJsonLd(cfg, SLUG, TITLE, DESCRIPTION, DATE_PUBLISHED) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: guideBreadcrumbsJsonLd(cfg, SLUG, TITLE) }}
      />

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="bg-slate-50 border-b border-slate-200">
        <ol className="container-page py-3 flex flex-wrap gap-x-2 text-sm text-slate-700">
          <li><Link href="/" className="hover:text-brand-orange">Home</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link href="/guides" className="hover:text-brand-orange">Guides</Link></li>
          <li aria-hidden="true">/</li>
          <li className="font-semibold text-slate-950">Flooded basement recovery</li>
        </ol>
      </nav>

      {/* Hero */}
      <section className="bg-slate-950 text-white">
        <div className="container-page py-12 md:py-16">
          <p className="text-sm uppercase tracking-wide text-brand-orange font-bold">
            Water damage · Restoration guide
          </p>
          <h1 className="mt-2 text-3xl md:text-5xl leading-tight">{TITLE}</h1>
          <p className="mt-4 text-lg text-slate-200 max-w-3xl">
            Written for homeowners and small-contractor crews across Toronto, Markham, and the Durham Region.
            Based on how restoration professionals actually dry a flooded basement — not a consumer-magazine checklist.
          </p>
          <p className="mt-4 text-sm text-slate-400">
            Updated {new Date(DATE_PUBLISHED).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })}
            {' · ~12 min read'}
          </p>
        </div>
      </section>

      {/* Article body */}
      <article className="bg-white">
        <div className="container-page py-12 max-w-3xl">
          {/* Intro */}
          <section>
            <h2 className="text-2xl md:text-3xl mt-0">Why speed matters</h2>
            <p className="mt-4 text-base text-slate-800 leading-relaxed">
              The clock starts the moment water hits the floor. Mould begins to colonize porous materials
              (drywall, insulation, carpet underlay, baseboards, framing) within <strong>24 to 48 hours</strong>.
              Standing water also pushes humidity into cavities you can&apos;t see, which keeps feeding mould
              growth long after the visible pool is gone. Beyond mould, prolonged wet exposure delaminates
              engineered wood, swells baseboards and door frames, corrodes nail plates and electrical boxes,
              and can lift and cup hardwood.
            </p>
            <p className="mt-4 text-base text-slate-800 leading-relaxed">
              There&apos;s an insurance angle too: most Canadian home policies require you to <em>mitigate</em>
              damage promptly. If an adjuster can show that waiting an extra 48 hours doubled the scope,
              coverage for the extra damage can be denied. The practical rule: start water extraction and air drying
              <strong> within 12 hours</strong>, keep the equipment running continuously until you&apos;ve verified
              dry-out with meter readings, and document everything with time-stamped photos.
            </p>
            <div className="mt-6 rounded-md border-l-4 border-brand-orange bg-amber-50 p-5 text-sm text-slate-900">
              <p className="font-bold">The restoration triangle</p>
              <p className="mt-2">
                Successful drying is a three-leg stool: <strong>extract liquid water</strong>, <strong>dry the air</strong>,
                and <strong>move the air across wet surfaces</strong>. Skip any leg and you&apos;ll get mould. The sections
                below walk through each leg plus air cleaning, verification, and prevention.
              </p>
            </div>
          </section>

          {/* Section 1 — Safety */}
          <section className="mt-12">
            <h2 className="text-2xl md:text-3xl">1 — Safety first</h2>
            <p className="mt-4 text-base text-slate-800 leading-relaxed">
              Water + electricity + submerged structural elements is the most common injury scenario in flooded
              basement work. Before you touch anything wet:
            </p>
            <ul className="mt-4 space-y-2 list-disc pl-6 text-base text-slate-800">
              <li>
                <strong>Shut off power at the panel</strong> to all basement circuits. If the panel itself is in
                the flooded area, call your utility — do <em>not</em> wade in to flip breakers.
              </li>
              <li>
                <strong>Shut off the water source.</strong> If this is a burst pipe or a leaking appliance,
                close the main shutoff before anything else. For sewer backups, close the backwater valve if you have one.
              </li>
              <li>
                <strong>Check for structural damage.</strong> Sagging ceilings, bowed walls, cracked foundation,
                or lifted hardwood tell you the water load has stressed the structure. If anything looks compromised,
                get an engineer or inspector before continuing.
              </li>
              <li>
                <strong>PPE.</strong> Rubber boots (not leather), N95 or better respirator, nitrile gloves, safety
                glasses. For a sewer backup (black water): full Tyvek suit, respirator with organic-vapor cartridge,
                and don&apos;t let anyone pregnant or immunocompromised near it.
              </li>
              <li>
                <strong>Document.</strong> Photo and video the whole affected area, the water line on walls,
                any damaged items, and the source. Your insurer will want this. Time-stamp everything.
              </li>
            </ul>
          </section>

          {/* Section 2 — Extract */}
          <section className="mt-12">
            <h2 className="text-2xl md:text-3xl">2 — Extract standing water</h2>
            <p className="mt-4 text-base text-slate-800 leading-relaxed">
              You can&apos;t dry a basement with a dehumidifier until the liquid water is gone. The equipment
              you need depends on how much water there is and what&apos;s under it:
            </p>
            <h3 className="mt-6 text-xl font-bold">Deep water (over 2 inches / 5 cm)</h3>
            <p className="mt-3 text-base text-slate-800 leading-relaxed">
              Use a <strong>submersible pump</strong> or a trash pump. Discharge to a floor drain, a sump pit,
              or outside to a surface where water will drain away from the foundation. For sewer backups you need
              a trash pump (handles solids); a standard submersible will clog.
            </p>
            <h3 className="mt-6 text-xl font-bold">Shallow water on hard surfaces (concrete, tile, LVP)</h3>
            <p className="mt-3 text-base text-slate-800 leading-relaxed">
              A <strong>wet-dry vac</strong> (shop vac) works for small areas. For a larger area, go straight to
              a professional-grade extractor — it&apos;s faster and more thorough.
            </p>
            <h3 className="mt-6 text-xl font-bold">Water in carpet or on padding</h3>
            <p className="mt-3 text-base text-slate-800 leading-relaxed">
              This is where a wet-dry vac is wrong. Carpet with a soaked underlay holds a <em>lot</em> of water,
              and a shop vac can only lift about 10–15% of what&apos;s in there. You need a carpet water extractor
              — a machine with a heated solution tank, a vacuum motor, and a wand that pulls water out of carpet
              fibres and backing in one pass.
            </p>
            <div className="mt-6 rounded-md border border-slate-200 bg-slate-50 p-5">
              <p className="font-bold">What you need from our rental fleet</p>
              <ul className="mt-3 space-y-1 text-sm text-slate-800">
                <li>
                  <Link href="/equipment/carpet-extractor-mytee-hp100" className="font-semibold underline text-brand-orange">
                    Mytee HP100 Grand Prix II Carpet Water Extractor
                  </Link>{' '}
                  — 12 gallon tank, floor wand, upholstery tool, hoses. Pulls water out of carpet and padding with
                  pressure-feed extraction. $40/day · $160/week.
                </li>
                <li>
                  <Link href="/equipment/carpet-cleaner-tornado-walk-behind" className="font-semibold underline text-brand-orange">
                    Tornado Walk-Behind Carpet Cleaner
                  </Link>{' '}
                  — for larger carpeted areas (commercial or large residential), 17&quot; cleaning path. $40/day · $160/week.
                </li>
              </ul>
            </div>
            <p className="mt-4 text-base text-slate-800 leading-relaxed">
              <strong>Rule of thumb for carpet:</strong> if the carpet has been wet for more than 48 hours or the
              water was category 2 (grey water — dishwasher, washing machine) or category 3 (black water — sewer,
              river flood), <em>cut and discard the padding</em> no matter what. Padding doesn&apos;t dry safely
              once contaminated. Extract the carpet, lift it, remove and bag the pad, then dry the subfloor and
              the back side of the carpet with air movers.
            </p>
          </section>

          {/* Section 3 — Dry the air */}
          <section className="mt-12">
            <h2 className="text-2xl md:text-3xl">3 — Dry the air with LGR dehumidifiers</h2>
            <p className="mt-4 text-base text-slate-800 leading-relaxed">
              Once standing water is extracted, humidity is the enemy. Wet surfaces release moisture into the air
              continuously — if you don&apos;t pull it out of the air, it just redeposits on cold surfaces (walls,
              floor joists, outside foundation) and keeps feeding mould. This is where the LGR
              (<strong>Low-Grain Refrigerant</strong>) dehumidifier earns its keep.
            </p>
            <p className="mt-4 text-base text-slate-800 leading-relaxed">
              An LGR dehumidifier pre-cools incoming air before it hits the main refrigerant coil, which lets it
              pull water out of air that&apos;s already dry (down to ~40% RH) — where consumer dehumidifiers give
              up. A properly sized LGR will drop a flooded basement from 85–95% RH to below 50% RH in 24–48 hours,
              and keep it there until the building materials are dry.
            </p>
            <h3 className="mt-6 text-xl font-bold">Sizing</h3>
            <p className="mt-3 text-base text-slate-800 leading-relaxed">
              A rough field heuristic: <strong>one LGR 7000-class unit per 1,000–1,500 sq ft</strong> of
              water-damaged area for class 2 water loss (wet carpet + wet walls partway up). For class 3 (fully
              saturated, water through walls and ceiling), double that. For a typical 800–1200 sq ft basement
              with wet floor and 12&quot; of wet drywall, one LGR 7000 XLi is enough.
            </p>
            <div className="mt-6 rounded-md border border-slate-200 bg-slate-50 p-5">
              <p className="font-bold">What you need from our rental fleet</p>
              <ul className="mt-3 space-y-1 text-sm text-slate-800">
                <li>
                  <Link href="/equipment/dehumidifier-lgr-7000-xli" className="font-semibold underline text-brand-orange">
                    Dri-Eaz LGR 7000 XLi Dehumidifier
                  </Link>{' '}
                  — industry-standard LGR, ~130 pints/day at saturation. The default pick for restoration. $80/day · $320/week.
                </li>
                <li>
                  <Link href="/equipment/dehumidifier-evolution-lgr" className="font-semibold underline text-brand-orange">
                    Dri-Eaz Evolution LGR
                  </Link>{' '}
                  — mid-size LGR, ~95 pints/day. For general restoration and secondary units in a larger stack.
                  $60/day · $240/week.
                </li>
                <li>
                  <Link href="/equipment/dehumidifier-drizair-1200" className="font-semibold underline text-brand-orange">
                    Dri-Eaz Drizair 1200
                  </Link>{' '}
                  — compact refrigerant, ~75 pints/day. For small rooms, finished basements with
                  minor damage, or secondary drying support. $50/day · $200/week.
                </li>
              </ul>
            </div>
            <h3 className="mt-6 text-xl font-bold">Operation</h3>
            <ul className="mt-3 space-y-2 list-disc pl-6 text-base text-slate-800">
              <li>Plug directly into a dedicated circuit — LGRs draw 7–9 amps continuous.</li>
              <li>
                Run the drain hose to a floor drain or sump pit; don&apos;t rely on the condensate reservoir
                (it&apos;ll fill in under an hour).
              </li>
              <li>Close the basement off from the rest of the house — don&apos;t try to dry the whole building.</li>
              <li>
                Set the target to <strong>40% RH</strong> and leave it running 24/7 until structural moisture
                meter readings confirm dry-out.
              </li>
            </ul>
          </section>

          {/* Section 4 — Move the air */}
          <section className="mt-12">
            <h2 className="text-2xl md:text-3xl">4 — Move the air across wet surfaces</h2>
            <p className="mt-4 text-base text-slate-800 leading-relaxed">
              A dehumidifier dries the <em>air</em>; air movers push that dry air across <em>wet surfaces</em>, which
              accelerates the moisture-release from the material into the air (where the LGR can then grab it). Without
              air movers, drying can take 2–3× longer, and interior framing stays wet while the room feels dry.
            </p>
            <h3 className="mt-6 text-xl font-bold">Placement</h3>
            <ul className="mt-3 space-y-2 list-disc pl-6 text-base text-slate-800">
              <li>
                <strong>Carpet:</strong> point air movers along the wall base, angled slightly up (15–45°) so the
                airflow runs across the carpet surface.
              </li>
              <li>
                <strong>Walls:</strong> if drywall is wet, drill 2&quot; relief holes every 12&quot; along the wet
                baseboard line and point an air mover at the row of holes. This dries inside the wall cavity.
                If you can&apos;t drill, remove baseboards and point air movers at the bottom plate.
              </li>
              <li>
                <strong>Hard floors (concrete, tile):</strong> one air mover per 10–12 linear feet, pointed along
                the floor surface in a rotation pattern that covers the whole area.
              </li>
              <li>
                <strong>Confined spaces (closets, under stairs):</strong> small centrifugal air movers (F259-SM
                style) fit where axials won&apos;t.
              </li>
            </ul>
            <h3 className="mt-6 text-xl font-bold">Count</h3>
            <p className="mt-3 text-base text-slate-800 leading-relaxed">
              A typical ratio is <strong>one air mover per 10–16 linear feet of wet wall</strong>, plus one
              additional for every 50 sq ft of wet floor. For an 800 sq ft basement with wet walls on three sides,
              plan for 6–8 air movers running continuously.
            </p>
            <div className="mt-6 rounded-md border border-slate-200 bg-slate-50 p-5">
              <p className="font-bold">What you need from our rental fleet</p>
              <ul className="mt-3 space-y-1 text-sm text-slate-800">
                <li>
                  <Link href="/equipment/air-mover-f259-sm" className="font-semibold underline text-brand-orange">
                    Dri-Eaz F259-SM Air Mover
                  </Link>{' '}
                  — stackable centrifugal, 2,200 CFM, daisy-chain power outlet so you can run several from a single
                  circuit. $30/day · $120/week. Rent one per 10–15 linear feet of wet area.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 5 — Clean the air */}
          <section className="mt-12">
            <h2 className="text-2xl md:text-3xl">5 — Clean the air with a HEPA scrubber</h2>
            <p className="mt-4 text-base text-slate-800 leading-relaxed">
              Even if visible mould hasn&apos;t appeared yet, water-damaged materials release spores and bacteria
              into the air during drying. A HEPA (<strong>High-Efficiency Particulate Air</strong>) scrubber pulls
              those airborne particles out of circulation, which prevents secondary contamination of unaffected
              rooms and protects anyone with respiratory sensitivity. HEPA scrubbers also set up
              <strong> negative pressure</strong> (if ducted out of the affected area), which keeps contaminated
              air from spreading.
            </p>
            <h3 className="mt-6 text-xl font-bold">When to use a scrubber</h3>
            <ul className="mt-3 space-y-2 list-disc pl-6 text-base text-slate-800">
              <li>Any flood where water sat for more than 48 hours</li>
              <li>Any category 2 or 3 water loss</li>
              <li>Any visible mould or detectable musty odour</li>
              <li>Occupied home where someone has asthma, allergies, or compromised immunity</li>
              <li>During demolition of wet drywall, insulation, or flooring</li>
            </ul>
            <div className="mt-6 rounded-md border border-slate-200 bg-slate-50 p-5">
              <p className="font-bold">What you need from our rental fleet</p>
              <ul className="mt-3 space-y-1 text-sm text-slate-800">
                <li>
                  <Link href="/equipment/air-scrubber-airbeast-2000" className="font-semibold underline text-brand-orange">
                    Express Air Beast 2000 CFM Industrial HEPA Air Scrubber
                  </Link>{' '}
                  — large-area mould remediation and negative-air containment. HEPA filter + pre-filter + ducting
                  adapter. $100/day · $400/week.
                </li>
                <li>
                  <Link href="/equipment/air-scrubber-airbeast-600" className="font-semibold underline text-brand-orange">
                    Express Airbeast 600 HEPA Air Scrubber
                  </Link>{' '}
                  — compact unit for residential mould, construction dust, and smaller remediation.
                  $80/day · $320/week.
                </li>
              </ul>
            </div>
            <p className="mt-4 text-base text-slate-800 leading-relaxed">
              Air changes per hour (ACH) is the metric: aim for <strong>4–6 ACH</strong> during active drying,
              and <strong>8+ ACH</strong> during any mould removal. For a 10&apos; × 20&apos; × 8&apos; basement
              (1,600 ft³), one Airbeast 600 at 600 CFM gives you ~22 ACH — more than enough.
            </p>
          </section>

          {/* Section 6 — Monitor */}
          <section className="mt-12">
            <h2 className="text-2xl md:text-3xl">6 — Monitor and verify</h2>
            <p className="mt-4 text-base text-slate-800 leading-relaxed">
              The single biggest mistake in DIY basement drying is pulling the equipment too early. The air feels
              dry, the carpet feels mostly dry, and the gear gets returned — but the inside of the wall cavity and
              the subfloor are still at 25% moisture content, and mould starts within a week.
            </p>
            <h3 className="mt-6 text-xl font-bold">What to measure</h3>
            <ul className="mt-3 space-y-2 list-disc pl-6 text-base text-slate-800">
              <li>
                <strong>Ambient RH:</strong> use a hygrometer. Target is below 50% RH in the drying area, matched
                to the RH of an unaffected area of the house.
              </li>
              <li>
                <strong>Material moisture content:</strong> use a moisture meter on wood framing, drywall, and
                baseboards. Target is &lt;15% MC for wood, matched to an unaffected reference reading from the same
                building. Measure daily.
              </li>
              <li>
                <strong>Temperature:</strong> dehumidifiers lose efficiency below ~15°C. If you&apos;re drying a
                cold basement in winter, warm the space first with a construction heater — see our{' '}
                <Link href="/construction-heaters/toronto" className="font-semibold underline text-brand-orange">
                  heater rentals
                </Link>{' '}
                for sizing.
              </li>
            </ul>
            <h3 className="mt-6 text-xl font-bold">When to stop</h3>
            <p className="mt-3 text-base text-slate-800 leading-relaxed">
              Three consecutive daily readings showing moisture content within 2% of the reference reading, AND
              ambient RH matching the reference area. That&apos;s the signal that the drying is done — not a
              surface touch-test.
            </p>
          </section>

          {/* Section 7 — Prevention */}
          <section className="mt-12">
            <h2 className="text-2xl md:text-3xl">7 — Prevent the next one</h2>
            <p className="mt-4 text-base text-slate-800 leading-relaxed">
              The best time to prevent a basement flood is after you&apos;ve just dried one and remember how awful
              it was. The common failure modes in the GTA and Durham Region:
            </p>
            <ul className="mt-3 space-y-2 list-disc pl-6 text-base text-slate-800">
              <li>
                <strong>Sump pump failure.</strong> Test monthly: lift the float, confirm it kicks on. Add a
                battery backup or a water-powered backup pump — power usually goes out during the exact storms
                that overwhelm sumps.
              </li>
              <li>
                <strong>No backwater valve.</strong> Toronto, Markham, and most Durham municipalities offer
                subsidies for installing a backwater valve. These prevent sewer backups during heavy rain.
              </li>
              <li>
                <strong>Negative grading.</strong> Soil should slope <em>away</em> from the foundation at least
                6&quot; over the first 10 feet. Over the years, settling reverses this; regrade as needed.
              </li>
              <li>
                <strong>Downspouts dumping at the foundation.</strong> Extend them at least 6 feet from the house.
                A 10-minute fix that prevents thousands in damage.
              </li>
              <li>
                <strong>Washing machine hoses.</strong> Burst rubber hoses behind laundry are a top-5 water damage
                cause. Replace with braided stainless-steel hoses, and close the taps when leaving for more than
                48 hours.
              </li>
              <li>
                <strong>Weeping tile and foundation seal.</strong> If you&apos;ve had basement water intrusion more
                than once, get a foundation specialist to inspect the weeping tile and exterior waterproofing.
              </li>
            </ul>
          </section>

          {/* CTA */}
          <section className="mt-12 rounded-lg border-2 border-brand-orange bg-amber-50 p-8">
            <h2 className="text-2xl md:text-3xl mt-0">Need equipment delivered tonight?</h2>
            <p className="mt-4 text-base text-slate-800">
              We deliver dehumidifiers, air movers, air scrubbers, and carpet extractors across Toronto, Markham,
              and the full Durham Region. Daily and weekly rates — you always get the cheapest tier automatically.
              Email us with your postal code and we&apos;ll confirm within business hours.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Link
                href="/rent#cat-drying-water-damage"
                className="btn-primary text-lg"
                data-event="guide_basement_flood_cta_catalog"
              >
                Browse drying &amp; water damage rentals →
              </Link>
              <Link
                href="/contact"
                className="btn-secondary text-lg"
                data-event="guide_basement_flood_cta_contact"
              >
                Email us a question
              </Link>
            </div>
          </section>
        </div>
      </article>

      {/* Related city pages */}
      <section className="bg-slate-50">
        <div className="container-page py-12">
          <h2 className="text-2xl md:text-3xl">Drying &amp; water damage rental by city</h2>
          <p className="mt-3 text-base text-slate-700 max-w-3xl">
            We deliver the full drying and water damage fleet to every city in our service area. Click your
            city for local pricing, delivery details, and the catalog filtered for your area.
          </p>
          <ul className="mt-6 grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {cities.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/drying-water-damage/${c.slug}`}
                  className="block px-4 py-3 rounded-md bg-white border border-slate-200 font-semibold hover:bg-slate-100 hover:border-slate-300"
                >
                  Drying rental in {c.name}
                  <span className="block text-xs font-normal text-slate-600">${c.deliveryPrice} delivery</span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm">
            <Link href={cityPageUrl(cities[0].slug, cfg)} className="underline font-semibold">
              See full equipment catalog for {cities[0].name}
            </Link>
            {' · '}
            <Link href="/service-area" className="underline font-semibold">
              Full service area
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
