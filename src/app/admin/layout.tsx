import type { Metadata } from 'next';

// This root admin layout is intentionally minimal — chrome (nav, sign-out,
// role gate) lives in the (chrome) route group. The login page (/admin/login)
// sits outside the group so it renders without chrome.
//
// The public site header/footer live in ../(public)/layout.tsx — they do NOT
// wrap /admin. This avoids marketing chrome bleeding into the operator UI.

export const metadata: Metadata = {
  title: { absolute: 'Admin — King Equipment Rental' },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
