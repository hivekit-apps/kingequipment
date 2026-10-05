import Link from 'next/link';
import Image from 'next/image';
import { getSiteConfig } from '@/lib/config';
import { CartBadge } from './CartBadge';

export function SiteHeader() {
  const cfg = getSiteConfig();
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="container-page flex items-center justify-between py-4 gap-2">
        <Link href="/" className="flex items-center gap-2 sm:gap-3 text-slate-950" aria-label={`${cfg.business.name} home`}>
          <Image
            src="/logo.png"
            alt=""
            width={40}
            height={40}
            priority
            className="h-9 w-9 sm:h-10 sm:w-10"
          />
          <span className="font-bold text-base sm:text-xl leading-tight">
            {cfg.business.name}
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm font-semibold">
          <Link href="/equipment" className="hover:text-brand-orange">Equipment</Link>
          <Link href="/service-area" className="hover:text-brand-orange">Service Area</Link>
          <Link href="/contact" className="hover:text-brand-orange">Contact</Link>
        </nav>
        <div className="flex items-center gap-3 sm:gap-4">
          <CartBadge />
          <Link
            href="/equipment"
            className="btn-primary text-sm px-3 py-2 min-h-[44px]"
            data-event="header_shop_click"
          >
            Shop
          </Link>
        </div>
      </div>
    </header>
  );
}
