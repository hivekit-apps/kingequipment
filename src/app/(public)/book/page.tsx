import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { getSiteConfig } from '@/lib/config';
import { getSheetVars } from '@/lib/booking';
import { BookingForm } from '@/components/BookingForm';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Book the loader',
  description:
    'Request the mini stand-on track loader by the day, week, or month. Free delivery within King Township, $99.99 flat delivery across the GTA (includes drop-off and pickup).',
};

export default async function BookPage() {
  const cfg = getSiteConfig();
  const vars = await getSheetVars();
  const machine = cfg.equipment.find((e) => e.id === 'mini-stand-on');
  const hp = machine?.specs.engineHp;
  const bucket = machine?.specs.bucketWidthIn;
  const gateW = machine?.specs.gateWidthIn;

  return (
    <section className="bg-slate-50">
      <div className="container-page py-10 md:py-14">
        <Link href="/" className="text-sm text-slate-600 underline">
          ← Back to home
        </Link>
        <h1 className="mt-3 text-3xl md:text-4xl">Book the loader</h1>
        <p className="mt-3 text-base text-slate-700 max-w-2xl">
          Mini stand-on track loader{hp ? ` — ${hp} HP` : ''}
          {bucket ? `, ${bucket}-inch bucket` : ''}
          {gateW ? `, fits through a ${gateW.replace(/[^0-9]/g, '')}-inch gate` : ''}.
          Clean, maintained, ready to work. Ideal for backyards,
          tight-access jobs, and residential landscaping.
        </p>

        <div className="mt-10 grid lg:grid-cols-[1fr_1.2fr] gap-10 items-start">
          {/* Left: photos + pricing card */}
          <div className="space-y-6">
            {machine && machine.photos.length > 0 && (
              <div className="space-y-3">
                <div className="relative w-full aspect-[4/3] sm:aspect-[3/2] overflow-hidden rounded-md bg-slate-100">
                  <Image
                    src={machine.photos[0].src}
                    alt={machine.photos[0].alt}
                    fill
                    sizes="(max-width: 1024px) 100vw, 40vw"
                    className="object-cover"
                    priority
                  />
                </div>
                {machine.photos.length > 1 && (
                  <div className="grid grid-cols-2 gap-3">
                    {machine.photos.slice(1).map((p) => (
                      <div
                        key={p.src}
                        className="relative aspect-[4/3] overflow-hidden rounded-md bg-slate-100"
                      >
                        <Image
                          src={p.src}
                          alt={p.alt}
                          fill
                          sizes="(max-width: 1024px) 50vw, 20vw"
                          className="object-cover"
                          loading="lazy"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Pricing card */}
            <div className="rounded-lg border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-bold text-slate-950">Rental rates</h2>
              <dl className="mt-4 space-y-3">
                <div className="flex items-baseline justify-between border-b border-slate-100 pb-3">
                  <dt className="text-sm font-semibold">Per day</dt>
                  <dd className="text-xl font-bold text-brand-orange">{vars.pricePerDay}</dd>
                </div>
                <div className="flex items-baseline justify-between border-b border-slate-100 pb-3">
                  <dt className="text-sm font-semibold">Per week</dt>
                  <dd className="text-xl font-bold text-brand-orange">{vars.pricePerWeek}</dd>
                </div>
                <div className="flex items-baseline justify-between">
                  <dt className="text-sm font-semibold">Per month</dt>
                  <dd className="text-xl font-bold text-brand-orange">{vars.pricePerMonth}</dd>
                </div>
              </dl>
              <p className="mt-4 text-xs text-slate-600">
                Prices in CAD. Pricing is final after we confirm dates and delivery.
              </p>
            </div>

            {/* Delivery card */}
            <div className="rounded-lg border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-bold text-slate-950">Delivery</h2>
              <ul className="mt-4 space-y-4 text-sm">
                <li className="border-b border-slate-100 pb-3">
                  <div className="flex items-baseline justify-between">
                    <span className="font-semibold">King Township</span>
                    <span className="font-bold text-brand-orange">
                      {vars.kingTownshipDeliveryPrice || 'FREE'}
                    </span>
                  </div>
                </li>
                <li className="border-b border-slate-100 pb-3">
                  <div className="flex items-baseline justify-between">
                    <span className="font-semibold">Greater Toronto Area (GTA)</span>
                    <span className="font-bold text-brand-orange">{vars.gtaDeliveryPrice}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">
                    Includes delivery AND pickup by King Equipment Rental
                    (we drop off + come back for it). Cheapest delivery rate
                    in the industry.
                  </p>
                </li>
                <li>
                  <div className="flex items-baseline justify-between">
                    <span className="font-semibold">Other Southern Ontario</span>
                    <span className="font-bold text-brand-orange">By request</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">
                    Please request via the form — we&apos;ll quote delivery before we book.
                  </p>
                </li>
              </ul>
            </div>

            {/* Operator add-on card */}
            <div className="rounded-lg border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-bold text-slate-950">Trained operator (optional)</h2>
              <div className="mt-4 flex items-baseline justify-between border-b border-slate-100 pb-3 text-sm">
                <span className="font-semibold">Add a trained machine operator</span>
                <span className="font-bold text-brand-orange whitespace-nowrap">
                  {vars.operatorPricePerDay}/day
                </span>
              </div>
              <p className="mt-3 text-xs text-slate-600">
                Tick the box in the booking form to add an experienced operator
                to run the loader for you on-site.
              </p>
            </div>
          </div>

          {/* Right: booking form */}
          <div className="bg-white rounded-lg border border-slate-200 p-6 md:p-8">
            <h2 className="text-xl md:text-2xl font-bold text-slate-950">
              Request the loader
            </h2>
            <p className="mt-2 text-sm text-slate-700">
              Pick your dates, choose your delivery zone, add an operator if you
              need one, and tell us where to send it. We&apos;ll email you back
              to confirm.
            </p>
            <div className="mt-6">
              <BookingForm vars={vars} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
