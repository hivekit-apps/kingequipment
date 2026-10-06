import type { Metadata } from 'next';
import Link from 'next/link';
import { getSiteConfig } from '@/lib/config';

export const revalidate = 60;

type Guide = {
  slug: string;
  title: string;
  description: string;
  readMinutes: number;
  category: string;
};

const GUIDES: Guide[] = [
  {
    slug: 'basement-flood-recovery',
    title: 'How to dry out a flooded basement — step by step',
    description:
      'A restoration-trades playbook: extract standing water, run LGR dehumidifiers, position air movers, scrub the air, verify dry-out, and prevent reoccurrence. Includes equipment specs and timelines.',
    readMinutes: 12,
    category: 'Water damage',
  },
];

export const metadata: Metadata = {
  title: 'Guides — King Equipment',
  description:
    'Practical restoration and job-site guides from King Equipment: drying flooded basements, running construction heaters, powering a site with inverter generators, and more. Written for homeowners and trades across Toronto, Markham, and Durham Region.',
  alternates: { canonical: '/guides' },
};

export default function GuidesIndexPage() {
  const cfg = getSiteConfig();
  return (
    <>
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="bg-slate-50 border-b border-slate-200">
        <ol className="container-page py-3 flex flex-wrap gap-x-2 text-sm text-slate-700">
          <li><Link href="/" className="hover:text-brand-orange">Home</Link></li>
          <li aria-hidden="true">/</li>
          <li className="font-semibold text-slate-950">Guides</li>
        </ol>
      </nav>

      <section className="bg-slate-950 text-white">
        <div className="container-page py-12 md:py-16">
          <p className="text-sm uppercase tracking-wide text-brand-orange font-bold">
            {cfg.business.name} · Resources
          </p>
          <h1 className="mt-2 text-3xl md:text-5xl leading-tight">
            Equipment guides &amp; restoration playbooks
          </h1>
          <p className="mt-4 text-lg text-slate-200 max-w-3xl">
            Practical write-ups from the field. Written for homeowners, property managers, and trades crews
            across Toronto, Markham, and the Durham Region. If a guide references equipment, you can
            rent that exact SKU from us the same day.
          </p>
        </div>
      </section>

      <section className="bg-white">
        <div className="container-page py-12">
          <ul className="grid md:grid-cols-2 gap-6">
            {GUIDES.map((g) => (
              <li key={g.slug}>
                <Link
                  href={`/guides/${g.slug}`}
                  className="block rounded-lg border border-slate-200 bg-white p-6 hover:border-brand-orange hover:shadow-sm transition-all group"
                  data-event={`guides_card_${g.slug}`}
                >
                  <p className="text-xs uppercase tracking-wide text-brand-orange font-bold">
                    {g.category} · ~{g.readMinutes} min read
                  </p>
                  <h2 className="mt-1 text-2xl font-bold text-slate-950 group-hover:text-brand-orange">
                    {g.title}
                  </h2>
                  <p className="mt-3 text-base text-slate-700">{g.description}</p>
                  <p className="mt-4 text-sm font-semibold text-brand-orange group-hover:underline">
                    Read guide →
                  </p>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-12 rounded-md border border-slate-200 bg-slate-50 p-6">
            <h2 className="text-xl font-bold">More guides coming</h2>
            <p className="mt-3 text-base text-slate-700">
              We&apos;re adding guides on sizing construction heaters for winter sites, running inverter
              generators during outages, and running air scrubbers for post-reno cleanup. Email us if there&apos;s
              a topic you&apos;d like us to cover first.
            </p>
            <p className="mt-4 text-sm">
              <Link href="/contact" className="underline font-semibold">
                Suggest a guide topic
              </Link>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
