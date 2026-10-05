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

function sanitize(v: string | undefined): string {
  if (!v) return '';
  let out = v.trim();
  while (out.startsWith('"') || out.startsWith("'")) out = out.slice(1);
  while (out.endsWith('"') || out.endsWith("'")) out = out.slice(0, -1);
  return out.trim();
}

export function getSiteConfig(): SiteConfig {
  const r = rawConfig as typeof rawConfig;
  return {
    business: {
      name: r.business.name,
      tagline: r.business.tagline,
      shortDescription: r.business.shortDescription,
      phone: sanitize(process.env.NEXT_PUBLIC_PHONE) || r.business.phoneFallback,
      email: sanitize(process.env.NEXT_PUBLIC_EMAIL) || r.business.emailFallback,
      siteUrl: sanitize(process.env.NEXT_PUBLIC_SITE_URL) || r.business.siteUrlFallback,
      gbpUrl: sanitize(process.env.NEXT_PUBLIC_GBP_URL),
      ga4Id: sanitize(process.env.NEXT_PUBLIC_GA4_ID),
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

// ---------------------------------------------------------------------------
// Admin override merge — Option A: site.json is seed, equipment_overrides is diff.
// `getSiteConfigDynamic()` is the async variant. Server components should prefer
// it when they want admin edits to show up without a redeploy.
// ---------------------------------------------------------------------------

type EquipmentOverrideRow = {
  equipment_id: string;
  pricing?: Partial<EquipmentPricing> | null;
  specs?: Partial<EquipmentItem['specs']> | null;
  photos?: EquipmentPhoto[] | null;
  availability?: EquipmentAvailability[] | null;
  visible?: boolean | null;
  city_delivery?: Record<string, number> | null;
};

async function fetchEquipmentOverrides(): Promise<Map<string, EquipmentOverrideRow>> {
  const map = new Map<string, EquipmentOverrideRow>();
  // Soft-fail: if envs unset or Supabase unreachable, return empty map (site.json wins).
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  let key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return map;
  url = sanitize(url);
  key = sanitize(key);
  if (!url || !key) return map;
  try {
    const res = await fetch(`${url}/rest/v1/equipment_overrides?select=*`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: 'application/json',
      },
      // Allow Next to cache for 60s so public pages are fast but admin edits
      // propagate within a minute.
      next: { revalidate: 60 },
    });
    if (!res.ok) return map;
    const rows = (await res.json()) as EquipmentOverrideRow[];
    for (const row of rows) {
      if (row && typeof row.equipment_id === 'string') map.set(row.equipment_id, row);
    }
  } catch {
    // network/DB unreachable: fall back to seed
  }
  return map;
}

function applyEquipmentOverride(base: EquipmentItem, ovr: EquipmentOverrideRow): EquipmentItem {
  const merged: EquipmentItem = { ...base };
  if (ovr.pricing && typeof ovr.pricing === 'object') {
    merged.pricing = { ...base.pricing, ...ovr.pricing } as EquipmentPricing;
  }
  if (ovr.specs && typeof ovr.specs === 'object') {
    merged.specs = { ...base.specs, ...ovr.specs };
  }
  if (Array.isArray(ovr.photos) && ovr.photos.length > 0) {
    merged.photos = ovr.photos;
  }
  if (Array.isArray(ovr.availability) && ovr.availability.length > 0) {
    merged.availability = ovr.availability;
  }
  if (typeof ovr.visible === 'boolean') {
    merged.visible = ovr.visible;
  }
  return merged;
}

function applyCityDeliveryOverrides(
  cities: CityPage[],
  overrides: Map<string, EquipmentOverrideRow>,
): CityPage[] {
  // city_delivery is per-equipment per-city; it does NOT override the city's
  // base deliveryPrice (that's shown as the default). The per-equipment × city
  // calc lives in getEquipmentDeliveryPrice() below.
  void overrides;
  return cities;
}

export async function getSiteConfigDynamic(): Promise<SiteConfig> {
  const seed = getSiteConfig();
  const overrides = await fetchEquipmentOverrides();
  if (overrides.size === 0) return seed;
  const mergedEquipment = seed.equipment.map((e) => {
    const ovr = overrides.get(e.id);
    return ovr ? applyEquipmentOverride(e, ovr) : e;
  });
  return {
    ...seed,
    equipment: mergedEquipment,
    cityPages: {
      ...seed.cityPages,
      cities: applyCityDeliveryOverrides(seed.cityPages.cities, overrides),
    },
  };
}

// Per-equipment × per-city delivery price. Falls back to the city's base price
// when no override exists for this SKU. Reads overrides on demand (cached 60s).
export async function getEquipmentDeliveryPrice(
  equipmentId: string,
  citySlug: string,
  cfg: SiteConfig,
): Promise<number | null> {
  const city = cfg.cityPages.cities.find((c) => c.slug === citySlug);
  if (!city) return null;
  const base = typeof city.deliveryPrice === 'number' ? city.deliveryPrice : null;
  const overrides = await fetchEquipmentOverrides();
  const ovr = overrides.get(equipmentId);
  const perCityCents = ovr?.city_delivery?.[citySlug];
  if (typeof perCityCents === 'number' && Number.isFinite(perCityCents)) {
    // city_delivery is stored in cents to match orders; convert to dollars for display.
    return Math.round(perCityCents / 100);
  }
  return base;
}
