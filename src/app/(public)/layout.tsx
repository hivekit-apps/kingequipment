import type { Metadata } from 'next';
import Script from 'next/script';
import { getSiteConfig } from '@/lib/config';
import { localBusinessJsonLd } from '@/lib/jsonld';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { CartProvider } from '@/components/CartContext';

const cfg = getSiteConfig();

export const metadata: Metadata = {
  openGraph: {
    title: cfg.business.name,
    description: cfg.business.shortDescription,
    url: cfg.business.siteUrl,
    siteName: cfg.business.name,
    locale: 'en_CA',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: cfg.business.name }],
  },
  twitter: {
    card: 'summary_large_image',
    title: cfg.business.name,
    description: cfg.business.shortDescription,
    images: ['/og-image.png'],
  },
  robots: { index: true, follow: true },
};

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: localBusinessJsonLd(cfg) }}
      />
      {cfg.business.ga4Id && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${cfg.business.ga4Id}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${cfg.business.ga4Id}');
            `}
          </Script>
        </>
      )}
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </CartProvider>
  );
}
