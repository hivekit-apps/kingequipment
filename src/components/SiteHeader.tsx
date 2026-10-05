'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { CartBadge } from './CartBadge';

const NAV_LINKS: { href: string; label: string }[] = [
  { href: '/rent', label: 'Rent' },
  { href: '/buy', label: 'Buy' },
  { href: '/service-area', label: 'Service Area' },
  { href: '/contact', label: 'Contact' },
];

export function SiteHeader({ businessName }: { businessName: string }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="border-b border-slate-200 bg-white relative">
      <div className="container-page flex items-center justify-between py-4 gap-2">
        <Link href="/" className="flex items-center gap-2 sm:gap-3 text-slate-950" aria-label={`${businessName} home`}>
          <Image
            src="/logo.png"
            alt=""
            width={40}
            height={40}
            priority
            className="h-9 w-9 sm:h-10 sm:w-10"
          />
          <span className="font-bold text-base sm:text-xl leading-tight">
            {businessName}
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-semibold">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-brand-orange">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3 sm:gap-4">
          <CartBadge />
          <Link
            href="/rent"
            className="hidden sm:inline-flex btn-primary text-sm px-3 py-2 min-h-[44px]"
            data-event="header_rent_click"
          >
            Rent
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-md border border-slate-200 hover:border-slate-400"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
          >
            {menuOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="7" x2="21" y2="7"></line>
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="17" x2="21" y2="17"></line>
              </svg>
            )}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav
          id="mobile-nav"
          className="md:hidden absolute left-0 right-0 top-full z-40 bg-white border-b border-slate-200 shadow-sm"
        >
          <ul className="container-page py-2">
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  className="block py-3 px-1 text-base font-semibold text-slate-950 hover:text-brand-orange border-b border-slate-100 last:border-b-0"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
