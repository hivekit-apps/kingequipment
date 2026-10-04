import type { Metadata } from 'next';
import './globals.css';
import { getSiteConfig } from '@/lib/config';

const cfg = getSiteConfig();

export const metadata: Metadata = {
  metadataBase: new URL(cfg.business.siteUrl),
  title: {
    default: `${cfg.business.name} — ${cfg.business.tagline}`,
    template: `%s — ${cfg.business.name}`,
  },
  description: cfg.business.shortDescription,
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/logo-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
