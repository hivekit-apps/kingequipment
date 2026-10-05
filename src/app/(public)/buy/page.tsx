import type { Metadata } from 'next';
import Link from 'next/link';
import { getSiteConfigDynamic, buyableByCategory, visibleEquipment } from '@/lib/config';
import { EquipmentCard } from '@/components/EquipmentCard';

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const cfg = await getSiteConfigDynamic();
  return {
    title: `Buy used equipment — ${cfg.business.name}`,
    description: `Select used construction heaters, drying and water damage equipment, inverter generators, and more. Owner-operated, honest pricing, well-maintained equipment.`,
  };
}

export default async function BuyPage() {
  const cfg = await getSiteConfigDynamic();
  const grouped = buyableByCategory(cfg);
  const totalBuyable = visibleEquipment(cfg).filter((e) => e.availability.includes('buy')).length;

  return (
    <section className="container-page py-12">
      <nav aria-label="Breadcrumb" className="text-sm text-slate-600">
        <Link href="/" className="hover:text-brand-orange">Home</Link>
        <span className="mx-2">/</span>
        <span className="text-slate-950 font-semibold">Buy</span>
      </nav>

      <div className="mt-4 flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl">Used equipment for sale</h1>
          <p className="mt-3 text-base text-slate-700 max-w-2xl">
            {totalBuyable} item{totalBuyable === 1 ? '' : 's'} available for purchase (used, well-maintained).
            Owner-operated, honest pricing. Rentals also available — many items in both the rental and sales
            catalogs.
          </p>
        </div>
        <Link href="/rent" className="btn-secondary text-sm px-4 py-2 min-h-[44px]">
          See rentals →
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
        return (
          <section key={cat.slug} id={`cat-${cat.slug}`} className="mt-12 scroll-mt-24">
            <h2 className="text-2xl font-bold">{cat.name}</h2>
            {cat.description && (
              <p className="mt-2 text-sm text-slate-700 max-w-3xl">{cat.description}</p>
            )}
            <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((item) => (
                <EquipmentCard key={`b-${item.id}`} item={item} mode="buy" />
              ))}
            </div>
          </section>
        );
      })}

      {totalBuyable === 0 && (
        <p className="mt-10 text-sm text-slate-700">
          No items are currently listed for sale. Please check back soon or{' '}
          <Link href="/contact" className="underline font-semibold">
            contact us
          </Link>{' '}
          to request a quote.
        </p>
      )}
    </section>
  );
}
