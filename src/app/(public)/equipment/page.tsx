import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { getSiteConfig, visibleEquipment, type EquipmentItem } from '@/lib/config';

const cfg = getSiteConfig();
const equipment = visibleEquipment(cfg);

export const metadata: Metadata = {
  title: 'Equipment & Specs',
  description: `Mini stand-on track loader rental in the north GTA. Delivered. ${equipment.map((e) => e.shortName).join(' or ')}.`,
};

function EquipmentCard({ item }: { item: EquipmentItem }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <header>
        <p className="text-xs uppercase tracking-wide text-brand-orange font-bold">
          {item.class === 'heavy-duty' ? 'Heavy-duty option' : 'Mini option'}
        </p>
        <h2 className="mt-1 text-2xl md:text-3xl font-bold text-slate-950">{item.name}</h2>
        <p className="mt-2 text-base text-slate-700">{item.tagline}</p>
      </header>

      <div className="mt-6">
        {item.photos.length > 0 && (
          <div className="relative w-full aspect-[4/3] sm:aspect-[3/2] overflow-hidden rounded-md bg-slate-100">
            <Image
              src={item.photos[0].src}
              alt={item.photos[0].alt}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
        )}
        {item.photos.length > 1 && (
          <div className={`mt-3 grid gap-3 ${item.photos.length - 1 >= 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {item.photos.slice(1).map((p) => (
              <div key={p.src} className="relative aspect-[3/4] overflow-hidden rounded-md bg-slate-100">
                <Image
                  src={p.src}
                  alt={p.alt}
                  fill
                  sizes="(max-width: 768px) 33vw, 17vw"
                  className="object-cover"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6">
        <h3 className="text-sm uppercase tracking-wide text-slate-600 font-bold">Specs</h3>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between border-b border-slate-100 pb-2">
            <dt className="font-semibold">Operating weight</dt>
            <dd>{item.specs.operatingWeightLbs} lbs</dd>
          </div>
          <div className="flex justify-between border-b border-slate-100 pb-2">
            <dt className="font-semibold">Operating capacity</dt>
            <dd>{item.specs.ratedOperatingCapacityLbs} lbs</dd>
          </div>
          <div className="flex justify-between border-b border-slate-100 pb-2">
            <dt className="font-semibold">Engine</dt>
            <dd>{item.specs.engineHp} hp</dd>
          </div>
          {item.specs.liftHeightIn && (
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <dt className="font-semibold">Lift height</dt>
              <dd>{item.specs.liftHeightIn} in</dd>
            </div>
          )}
          {item.specs.gateWidthIn && (
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <dt className="font-semibold">Fits through</dt>
              <dd>{item.specs.gateWidthIn}-inch gate</dd>
            </div>
          )}
          {item.specs.bucketWidthIn && (
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <dt className="font-semibold">Bucket</dt>
              <dd>{item.specs.bucketWidthIn} inches</dd>
            </div>
          )}
        </dl>
      </div>

      <div className="mt-6">
        <h3 className="text-sm uppercase tracking-wide text-slate-600 font-bold">Attachments included</h3>
        <ul className="mt-3 list-disc list-inside text-sm text-slate-700">
          {item.attachmentsIncluded.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      </div>

      <div className="mt-6">
        <h3 className="text-sm uppercase tracking-wide text-slate-600 font-bold">Ideal for</h3>
        <ul className="mt-3 list-disc list-inside text-sm text-slate-700">
          {item.idealFor.map((j) => (
            <li key={j}>{j}</li>
          ))}
        </ul>
      </div>

      <p className="mt-6 text-sm text-slate-700 italic">{item.operatorNote}</p>

      <div className="mt-6 rounded-md bg-slate-50 border border-slate-200 p-4">
        <p className="text-sm font-semibold text-slate-950">Daily rate</p>
        <p className="mt-1 text-lg font-bold text-brand-orange">{item.displayRate}</p>
      </div>

      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        {item.bookable && (
          <Link href="/book" className="btn-primary" data-event={`equipment_book_${item.id}`}>
            Book this machine
          </Link>
        )}
      </div>
    </article>
  );
}

export default function EquipmentPage() {
  return (
    <section className="container-page py-12">
      <h1 className="text-3xl md:text-4xl">Equipment &amp; specs</h1>
      <p className="mt-4 text-base text-slate-700 max-w-2xl">
        Owner-operated mini stand-on track loader. Clean, maintained, ready to
        work. Fits through a standard 36-inch gate — ideal for backyards,
        tight-access jobs, residential landscaping, and small demolition.
      </p>

      <div className={`mt-10 grid gap-8 ${equipment.length > 1 ? 'lg:grid-cols-2' : 'lg:max-w-3xl'}`}>
        {equipment.map((item) => (
          <EquipmentCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}
