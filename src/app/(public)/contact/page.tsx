import type { Metadata } from 'next';
import Link from 'next/link';
import { getSiteConfig, mailtoHref } from '@/lib/config';
import { ContactForm } from '@/components/ContactForm';

const cfg = getSiteConfig();

export const metadata: Metadata = {
  title: 'Contact',
  description: `Email ${cfg.business.email} or browse ${cfg.business.name} to rent or buy equipment delivered across Toronto, Markham, and Durham Region.`,
};

export default function ContactPage() {
  return (
    <section className="container-page py-12">
      <h1 className="text-3xl md:text-4xl">Contact</h1>
      <p className="mt-4 text-base text-slate-700 max-w-2xl">
        The fastest way to get started is to add what you need to the cart and
        check out — we&apos;ll email you back within a few hours during business
        hours to confirm delivery.
      </p>

      <div className="mt-10 grid md:grid-cols-2 gap-10">
        <div className="space-y-6">
          <Link
            href="/equipment"
            className="block bg-slate-950 text-white rounded-md p-6 hover:bg-slate-800 transition-colors"
            data-event="contact_shop_click"
          >
            <p className="text-sm uppercase tracking-wide opacity-80">Browse the catalog</p>
            <p className="text-2xl md:text-3xl font-bold mt-1">See equipment →</p>
          </Link>

          <a
            href={mailtoHref(cfg.business.email)}
            className="block bg-slate-50 border border-slate-200 rounded-md p-6 hover:bg-slate-100 transition-colors"
            data-event="contact_email_click"
          >
            <p className="text-sm uppercase tracking-wide text-slate-600">Email</p>
            <p className="text-xl font-bold mt-1 break-all">{cfg.business.email}</p>
          </a>

          <div className="bg-slate-50 border border-slate-200 rounded-md p-6">
            <p className="text-sm uppercase tracking-wide text-slate-600">Hours</p>
            <p className="text-base mt-1">{cfg.business.hours}</p>
          </div>

          {cfg.business.gbpUrl && (
            <a
              href={cfg.business.gbpUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-slate-50 border border-slate-200 rounded-md p-6 hover:bg-slate-100 transition-colors"
            >
              <p className="text-sm uppercase tracking-wide text-slate-600">Google Business Profile</p>
              <p className="text-base mt-1 font-semibold">See our listing &amp; reviews →</p>
            </a>
          )}
        </div>

        <ContactForm />
      </div>
    </section>
  );
}
