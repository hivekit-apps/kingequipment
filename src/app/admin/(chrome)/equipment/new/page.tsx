import Link from 'next/link';
import { getSiteConfig } from '@/lib/config';
import { NewEquipmentForm } from './NewEquipmentForm';

export const dynamic = 'force-dynamic';

export default function AdminEquipmentNewPage() {
  const cfg = getSiteConfig();
  const categories = cfg.categories.map((c) => ({ slug: c.slug, name: c.name }));
  return (
    <div>
      <div className="mb-6 flex items-center gap-3 text-sm">
        <Link href="/admin/equipment" className="text-gray-600 hover:text-gray-900">
          ← Back
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-gray-900">New equipment</h1>
      <p className="mt-1 text-sm text-gray-600">
        Create a new SKU. After it&apos;s created you&apos;ll be able to edit specs, pricing, and upload photos.
      </p>
      <NewEquipmentForm categories={categories} />
    </div>
  );
}
