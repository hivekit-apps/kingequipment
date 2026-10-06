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
  category?: string;
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
  // Cycle 10: optional long-form editorial content. All empty => public page
  // omits the "About this equipment" section entirely.
  description?: string;
  specsBullets?: string[];
};

export type Category = {
  slug: string;
  name: string;
  description: string;
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
    showPhone: boolean;
    email: string;
    siteUrl: string;
    gbpUrl: string;
    ga4Id: string;
    hours: string;
  };
  categories: Category[];
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
  const biz = r.business as typeof r.business & { showPhone?: boolean };
  const phone = sanitize(process.env.NEXT_PUBLIC_PHONE) || biz.phoneFallback || '';
  return {
    business: {
      name: r.business.name,
      tagline: r.business.tagline,
      shortDescription: r.business.shortDescription,
      phone,
      showPhone: biz.showPhone !== false && !!phone,
      email: sanitize(process.env.NEXT_PUBLIC_EMAIL) || r.business.emailFallback,
      siteUrl: sanitize(process.env.NEXT_PUBLIC_SITE_URL) || r.business.siteUrlFallback,
      gbpUrl: sanitize(process.env.NEXT_PUBLIC_GBP_URL),
      ga4Id: sanitize(process.env.NEXT_PUBLIC_GA4_ID),
      hours: r.business.hours,
    },
    categories: ((r as unknown as { categories?: Category[] }).categories ?? []) as Category[],
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

export function getCategory(slug: string, cfg: SiteConfig): Category | undefined {
  return cfg.categories.find((c) => c.slug === slug);
}

export function equipmentByCategory(cfg: SiteConfig): Map<string, EquipmentItem[]> {
  const map = new Map<string, EquipmentItem[]>();
  for (const cat of cfg.categories) map.set(cat.slug, []);
  for (const e of visibleEquipment(cfg)) {
    const key = e.category || 'uncategorized';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(e);
  }
  return map;
}

export function rentableByCategory(cfg: SiteConfig): Map<string, EquipmentItem[]> {
  const base = equipmentByCategory(cfg);
  const out = new Map<string, EquipmentItem[]>();
  for (const [k, items] of base.entries()) {
    const filtered = items.filter((e) => e.availability.includes('rent'));
    if (filtered.length > 0) out.set(k, filtered);
  }
  return out;
}

export function buyableByCategory(cfg: SiteConfig): Map<string, EquipmentItem[]> {
  const base = equipmentByCategory(cfg);
  const out = new Map<string, EquipmentItem[]>();
  for (const [k, items] of base.entries()) {
    const filtered = items.filter((e) => e.availability.includes('buy'));
    if (filtered.length > 0) out.set(k, filtered);
  }
  return out;
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
  name?: string | null;
  short_name?: string | null;
  tagline?: string | null;
  // cycle 10 long-form fields (all optional)
  description?: string | null;
  specs_bullets?: string[] | null;
  attachments_included?: string[] | null;
  ideal_for?: string[] | null;
};

// Admin-created equipment (new SKUs beyond the site.json seed). Stored in the
// equipment_custom Supabase table and merged into the catalog at read-time.
// Column names use snake_case per Postgres convention; translated to camelCase here.
type EquipmentCustomRow = {
  id: string;
  class?: string | null;
  category: string;
  name: string;
  short_name?: string | null;
  tagline?: string | null;
  display_rate?: string | null;
  pricing?: Partial<EquipmentPricing> | null;
  specs?: Partial<EquipmentItem['specs']> | null;
  attachments_included?: string[] | null;
  ideal_for?: string[] | null;
  photos?: EquipmentPhoto[] | null;
  availability?: EquipmentAvailability[] | null;
  visible?: boolean | null;
  bookable?: boolean | null;
  operator_note?: string | null;
  photo_note?: string | null;
  // cycle 10 long-form fields (all optional)
  description?: string | null;
  specs_bullets?: string[] | null;
};

async function fetchEquipmentOverrides(mode: 'cached' | 'live' = 'cached'): Promise<Map<string, EquipmentOverrideRow>> {
  const map = new Map<string, EquipmentOverrideRow>();
  // Soft-fail: if envs unset or Supabase unreachable, return empty map (site.json wins).
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  let key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return map;
  url = sanitize(url);
  key = sanitize(key);
  if (!url || !key) return map;
  try {
    // Cached mode: ISR revalidate 60s (public pages). Live mode: no-store (critical
    // server ops like orders API that must see admin edits immediately).
    const fetchInit: RequestInit =
      mode === 'live'
        ? { cache: 'no-store' }
        : ({ next: { revalidate: 60 } } as unknown as RequestInit);
    const res = await fetch(`${url}/rest/v1/equipment_overrides?select=*`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: 'application/json',
      },
      ...fetchInit,
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
  if (typeof ovr.name === 'string' && ovr.name.trim().length > 0) {
    merged.name = ovr.name;
  }
  if (typeof ovr.short_name === 'string' && ovr.short_name.trim().length > 0) {
    merged.shortName = ovr.short_name;
  }
  if (typeof ovr.tagline === 'string' && ovr.tagline.trim().length > 0) {
    merged.tagline = ovr.tagline;
  }
  // cycle 10 long-form fields. Only override when non-empty: an override row
  // with description=null / empty array should fall back to seed values, not
  // blank them out.
  if (typeof ovr.description === 'string' && ovr.description.trim().length > 0) {
    merged.description = ovr.description;
  }
  if (Array.isArray(ovr.specs_bullets) && ovr.specs_bullets.length > 0) {
    merged.specsBullets = ovr.specs_bullets;
  }
  if (Array.isArray(ovr.attachments_included) && ovr.attachments_included.length > 0) {
    merged.attachmentsIncluded = ovr.attachments_included;
  }
  if (Array.isArray(ovr.ideal_for) && ovr.ideal_for.length > 0) {
    merged.idealFor = ovr.ideal_for;
  }
  return merged;
}

// Translate an equipment_custom row (snake_case jsonb columns) into the full
// EquipmentItem shape expected by the public pages. Fills in sane empty defaults
// for optional fields so downstream rendering doesn't need to null-check.
function customRowToEquipmentItem(row: EquipmentCustomRow): EquipmentItem {
  const pricing: EquipmentPricing = {
    daily: row.pricing?.daily ?? null,
    weekly: row.pricing?.weekly ?? null,
    monthly: row.pricing?.monthly ?? null,
    buyNew: row.pricing?.buyNew ?? null,
    buyUsed: row.pricing?.buyUsed ?? null,
    deposit: typeof row.pricing?.deposit === 'number' ? row.pricing.deposit : 0,
  };
  return {
    id: row.id,
    class: (row.class ?? 'power') as EquipmentClass,
    category: row.category,
    visible: typeof row.visible === 'boolean' ? row.visible : true,
    bookable: typeof row.bookable === 'boolean' ? row.bookable : true,
    availability: Array.isArray(row.availability) && row.availability.length > 0 ? row.availability : ['rent'],
    name: row.name,
    shortName: row.short_name ?? row.name,
    tagline: row.tagline ?? '',
    displayRate: row.display_rate ?? '',
    pricing,
    specs: {
      operatingWeightLbs: row.specs?.operatingWeightLbs ?? '',
      ratedOperatingCapacityLbs: row.specs?.ratedOperatingCapacityLbs ?? '',
      engineHp: row.specs?.engineHp ?? '',
      liftHeightIn: row.specs?.liftHeightIn ?? null,
      gateWidthIn: row.specs?.gateWidthIn ?? null,
      bucketWidthIn: row.specs?.bucketWidthIn ?? null,
    },
    attachmentsIncluded: Array.isArray(row.attachments_included) ? row.attachments_included : [],
    idealFor: Array.isArray(row.ideal_for) ? row.ideal_for : [],
    photos: Array.isArray(row.photos) ? row.photos : [],
    operatorNote: row.operator_note ?? '',
    photoNote: row.photo_note ?? '',
    description: typeof row.description === 'string' && row.description.trim().length > 0 ? row.description : undefined,
    specsBullets: Array.isArray(row.specs_bullets) && row.specs_bullets.length > 0 ? row.specs_bullets : undefined,
  };
}

async function fetchEquipmentCustom(mode: 'cached' | 'live' = 'cached'): Promise<EquipmentCustomRow[]> {
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  let key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return [];
  url = sanitize(url);
  key = sanitize(key);
  if (!url || !key) return [];
  try {
    const fetchInit: RequestInit =
      mode === 'live'
        ? { cache: 'no-store' }
        : ({ next: { revalidate: 60 } } as unknown as RequestInit);
    const res = await fetch(`${url}/rest/v1/equipment_custom?select=*`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: 'application/json',
      },
      ...fetchInit,
    });
    if (!res.ok) return [];
    return (await res.json()) as EquipmentCustomRow[];
  } catch {
    return [];
  }
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

export async function getSiteConfigDynamic(mode: 'cached' | 'live' = 'cached'): Promise<SiteConfig> {
  const seed = getSiteConfig();
  const [overrides, customRows] = await Promise.all([
    fetchEquipmentOverrides(mode),
    fetchEquipmentCustom(mode),
  ]);

  // Merge rule (cycle 9): custom-created SKUs are indexed by id. On id collision
  // with the site.json seed, CUSTOM WINS — an admin who deliberately re-used an
  // id meant to replace that item. Seed entries with no custom twin pass through.
  const customById = new Map<string, EquipmentCustomRow>();
  for (const row of customRows) {
    if (row && typeof row.id === 'string') customById.set(row.id, row);
  }

  const seenIds = new Set<string>();
  const combined: EquipmentItem[] = [];
  for (const e of seed.equipment) {
    const custom = customById.get(e.id);
    if (custom) {
      combined.push(customRowToEquipmentItem(custom));
      seenIds.add(e.id);
    } else {
      combined.push(e);
      seenIds.add(e.id);
    }
  }
  for (const row of customRows) {
    if (!seenIds.has(row.id)) combined.push(customRowToEquipmentItem(row));
  }

  const mergedEquipment = combined.map((e) => {
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

// Convenience alias for server-side code that must see admin edits immediately
// (orders API, admin pages). Bypasses the 60s ISR cache.
export function getSiteConfigLive(): Promise<SiteConfig> {
  return getSiteConfigDynamic('live');
}

// Cycle 10: equipment_redirects lookup. Public equipment pages call this when
// getEquipmentById returns undefined OR when the item is hidden via override.
// Returns a redirect target like "/rent#cat-drying-water-damage" if the id
// was deleted, else null.
export async function getEquipmentRedirect(id: string): Promise<string | null> {
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  let key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  url = sanitize(url);
  key = sanitize(key);
  if (!url || !key) return null;
  try {
    const res = await fetch(
      `${url}/rest/v1/equipment_redirects?equipment_id=eq.${encodeURIComponent(id)}&select=redirect_to`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          Accept: 'application/json',
        },
        cache: 'no-store',
      },
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as { redirect_to: string }[];
    if (rows.length === 0) return null;
    return rows[0].redirect_to || null;
  } catch {
    return null;
  }
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
