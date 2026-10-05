import { redirect } from 'next/navigation';

// Legacy entry: /equipment used to be the combined catalog. Rent + Buy now have
// their own pages. Redirect to /rent (default landing); ?view=buy routes to /buy.
export default function EquipmentIndexRedirect({
  searchParams,
}: {
  searchParams: { view?: string };
}) {
  if (searchParams.view === 'buy') redirect('/buy');
  redirect('/rent');
}
