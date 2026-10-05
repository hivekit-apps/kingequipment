// SINGLE SOURCE OF TRUTH for site content.
// LOAD-BEARING: do NOT hardcode phone, email, business name, partner name,
// or domain anywhere in JSX. Every literal goes through this module.
// (Per owner-inputs wall 2026-05-20 — configurable-by-design is LOAD_BEARING.)
//
// Catalog storage architecture (cycle 7 overhaul 2026-10-04):
// site.json is the SEED catalog. Admin edits via /admin/equipment are stored in
// a Supabase `equipment_overrides` table and MERGED at read-time (Option A per spec).
// This keeps the file-based scaffold for public rendering while allowing admin
// edits without redeploy.

import rawConfig from '../../config/site.json';

export type EquipmentClass = 'drying' | 'power' | 'climate' | 'heavy-duty' | 'mini' | string;
export type EquipmentAvailability = 'rent' | 'buy';

export type EquipmentPricing = {
  daily: number | null;
  weekly: number | null;
  monthly: number | null;
  buyNew: number | null;
  buyUsed: number | null;
  deposit: number;
};

export type EquipmentPhoto = { src: string; alt: string };

export type EquipmentItem = {
  id: string;
  class: EquipmentClass;
  visible?: boolean;
  bookable?: boolean;
  availability: EquipmentAvailability[];
  name: string;
  shortName: string;
  tagline: string;
  displayRate: string;
  pricing: EquipmentPricing;
  specs: {
    operatingWeightLbs: string;
    ratedOperatingCapacityLbs: string;
    engineHp: string;
    liftHeightIn: string | null;
    gateWidthIn: string | null;
    bucketWidthIn?: string | null;
  };
  attachmentsIncluded: string[];
  idealFor: string[];
  photos: EquipmentPhoto[];
  operatorNote: string;
  photoNote: string;
};

export type CityPage = {
  slug: string;
  name: string;
  region: string;
  coverage: 'core' | 'extended';
  neighborhoods: string[];
  typicalJobs: string[];
  localContext: string;
  driveTime: string;
  deliveryPrice: number;
};

export type CityPagesConfig = {
  basePath: string;
  coreCities: string[];
  cities: CityPage[];
};

export type SiteConfig = {
  business: {
    name: string;
    tagline: string;
    shortDescription: string;
    phone: string;
    email: string;
    siteUrl: string;
    gbpUrl: string;
    ga4Id: string;
    hours: string;
  };
  partner: {
    name: string;
    business: string;
    url: string;
    credentials: string;
  };
  pricing: {
    displayRate: string;
    deliveryNote: string;
    multiDayNote: string;
    comparisonNote: string;
  };
  heroPhoto: {
    src: string;
    alt: string;
    width: number;
    height: number;
  };
  equipment: EquipmentItem[];
  serviceAreas: string[];
  serviceAreaTagline: string;
  cityPages: CityPagesConfig;
  trustPoints: string[];
  faq: { q: string; a: string }[];
  ctas: {
    primary: string;
    secondary: string;
    formSubmit: string;
  };
};

export function getSiteConfig(): SiteConfig {
  const r = rawConfig as typeof rawConfig;
  return {
    business: {
      name: r.business.name,
      tagline: r.business.tagline,
      shortDescription: r.business.shortDescription,
      phone: process.env.NEXT_PUBLIC_PHONE || r.business.phoneFallback,
      email: process.env.NEXT_PUBLIC_EMAIL || r.business.emailFallback,
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL || r.business.siteUrlFallback,
      gbpUrl: process.env.NEXT_PUBLIC_GBP_URL || '',
      ga4Id: process.env.NEXT_PUBLIC_GA4_ID || '',
      hours: r.business.hours,
    },
    partner: r.partner,
    pricing: r.pricing,
    heroPhoto: r.heroPhoto,
    equipment: r.equipment as unknown as EquipmentItem[],
    serviceAreas: r.serviceAreas,
    serviceAreaTagline: r.serviceAreaTagline,
    cityPages: r.cityPages as unknown as CityPagesConfig,
    trustPoints: r.trustPoints,
    faq: r.faq,
    ctas: r.ctas,
  };
}

export function getCityPage(slug: string, cfg: SiteConfig): CityPage | undefined {
  return cfg.cityPages.cities.find((c) => c.slug === slug);
}

export function cityPageUrl(slug: string, cfg: SiteConfig): string {
  return `${cfg.cityPages.basePath}/${slug}`;
}

export function mailtoHref(email: string, subject = 'Equipment rental inquiry'): string {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}`;
}

export function allPhotos(cfg: SiteConfig): EquipmentPhoto[] {
  return visibleEquipment(cfg).flatMap((e) => e.photos);
}

export function visibleEquipment(cfg: SiteConfig): EquipmentItem[] {
  return cfg.equipment.filter((e) => e.visible !== false);
}

export function getEquipmentById(id: string, cfg: SiteConfig): EquipmentItem | undefined {
  return cfg.equipment.find((e) => e.id === id);
}

export function rentableEquipment(cfg: SiteConfig): EquipmentItem[] {
  return visibleEquipment(cfg).filter((e) => e.availability.includes('rent'));
}

export function buyableEquipment(cfg: SiteConfig): EquipmentItem[] {
  return visibleEquipment(cfg).filter((e) => e.availability.includes('buy'));
}

export function classLabel(c: EquipmentClass): string {
  switch (c) {
    case 'drying':
      return 'Drying';
    case 'power':
      return 'Power';
    case 'climate':
      return 'Climate';
    case 'heavy-duty':
      return 'Heavy-duty';
    case 'mini':
      return 'Mini';
    default:
      return String(c).charAt(0).toUpperCase() + String(c).slice(1);
  }
}
