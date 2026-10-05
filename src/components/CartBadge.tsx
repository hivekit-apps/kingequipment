'use client';

import Link from 'next/link';
import { useCart } from './CartContext';

export function CartBadge() {
  const { items, hydrated } = useCart();
  const count = hydrated ? items.reduce((n, i) => n + (i.qty || 1), 0) : 0;
  return (
    <Link
      href="/cart"
      className="relative inline-flex items-center gap-1 text-sm font-semibold text-slate-950 hover:text-brand-orange"
      aria-label={`Cart (${count} item${count === 1 ? '' : 's'})`}
      data-event="header_cart_click"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
        aria-hidden="true"
      >
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>
      <span className="hidden sm:inline">Cart</span>
      {hydrated && count > 0 && (
        <span className="absolute -top-2 -right-3 inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full bg-brand-orange text-white text-[11px] font-bold">
          {count}
        </span>
      )}
    </Link>
  );
}
