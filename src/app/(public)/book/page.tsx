import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

// /book was the single-item booking page; the catalog is now multi-SKU and
// uses /equipment -> /cart -> /checkout. Redirect any lingering links.
export default function BookPage() {
  redirect('/equipment');
}
