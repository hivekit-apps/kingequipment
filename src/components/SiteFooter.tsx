import Link from 'next/link';
import { getSiteConfig } from '@/lib/config';

export function SiteFooter() {
  const cfg = getSiteConfig();
  return (
    <footer className="border-t border-slate-200 bg-slate-50 mt-16">
      <div className="container-page py-10 grid gap-8 md:grid-cols-3">
        <div>
          <p className="font-bold text-slate-950">{cfg.business.name}</p>
          <p className="text-sm text-slate-700 mt-2">{cfg.business.shortDescription}</p>
          <p className="text-xs text-slate-600 mt-3">
            Operated in partnership with{' '}
            <a href={cfg.partner.url} className="underline" target="_blank" rel="noopener noreferrer">
              {cfg.partner.business}
            </a>{' '}
            ({cfg.partner.name})
          </p>
        </div>
        <div>
          <p className="font-bold text-slate-950">Get in touch</p>
          <ul className="text-sm text-slate-700 mt-2 space-y-1">
            <li>
              <Link href="/book" className="hover:text-brand-orange font-semibold">
                Request the loader
              </Link>
            </li>
            <li>{cfg.business.hours}</li>
            <li className="text-xs text-slate-600 mt-2">
              Email us anytime — we&apos;ll get back to you within a few hours during business hours.
            </li>
          </ul>
        </div>
        <div>
          <p className="font-bold text-slate-950">Pages</p>
          <ul className="text-sm text-slate-700 mt-2 space-y-1">
            <li><Link href="/" className="hover:text-brand-orange">Home</Link></li>
            <li><Link href="/equipment" className="hover:text-brand-orange">Equipment</Link></li>
            <li><Link href="/service-area" className="hover:text-brand-orange">Service Area</Link></li>
            <li><Link href="/contact" className="hover:text-brand-orange">Contact</Link></li>
          </ul>
        </div>
      </div>
      <div className="container-page border-t border-slate-200 py-4 text-xs text-slate-600">
        &copy; {new Date().getFullYear()} {cfg.business.name}. All rights reserved.
      </div>
    </footer>
  );
}
