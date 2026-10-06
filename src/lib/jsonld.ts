import type { SiteConfig, CityPage } from './config';
import { cityPageUrl, visibleEquipment } from './config';

export function localBusinessJsonLd(cfg: SiteConfig): string {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${cfg.business.siteUrl}#localbusiness`,
    name: cfg.business.name,
    description: cfg.business.shortDescription,
    email: cfg.business.email,
    url: cfg.business.siteUrl,
    sameAs: cfg.business.gbpUrl ? [cfg.business.gbpUrl] : [],
    areaServed: cfg.serviceAreas.map((city) => ({
      '@type': 'City',
      name: city,
    })),
    openingHours: 'Mo-Sa 07:00-19:00',
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Equipment rentals & sales',
      itemListElement: visibleEquipment(cfg).map((e) => ({
        '@type': 'Offer',
        name: e.name,
        description: e.tagline,
        category: 'Equipment rental and sales',
        priceSpecification: {
          '@type': 'UnitPriceSpecification',
          unitText: 'per day',
          price: e.displayRate,
        },
        itemOffered: {
          '@type': 'Product',
          name: e.name,
          description: e.tagline,
        },
      })),
    },
  };
  return JSON.stringify(data);
}

export function cityLocalBusinessJsonLd(cfg: SiteConfig, city: CityPage): string {
  const pageUrl = `${cfg.business.siteUrl}${cityPageUrl(city.slug, cfg)}`;
  const data = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${pageUrl}#localbusiness`,
    name: `${cfg.business.name} — ${city.name}`,
    description: `${cfg.business.name} delivers equipment rental and sales to ${city.name}, ${city.region}.`,
    email: cfg.business.email,
    url: pageUrl,
    sameAs: cfg.business.gbpUrl ? [cfg.business.gbpUrl] : [],
    areaServed: {
      '@type': 'City',
      name: city.name,
    },
    openingHours: 'Mo-Sa 07:00-19:00',
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: `Equipment rentals & sales available in ${city.name}`,
      itemListElement: visibleEquipment(cfg).map((e) => ({
        '@type': 'Offer',
        name: e.name,
        description: e.tagline,
        category: 'Equipment rental and sales',
        priceSpecification: {
          '@type': 'UnitPriceSpecification',
          unitText: 'per day',
          price: e.displayRate,
        },
        itemOffered: {
          '@type': 'Product',
          name: e.name,
          description: e.tagline,
        },
        availableAtOrFrom: {
          '@type': 'City',
          name: city.name,
        },
      })),
    },
  };
  return JSON.stringify(data);
}

export function cityBreadcrumbsJsonLd(cfg: SiteConfig, city: CityPage): string {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: cfg.business.siteUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Service area',
        item: `${cfg.business.siteUrl}/service-area`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: `Equipment rental in ${city.name}`,
        item: `${cfg.business.siteUrl}${cityPageUrl(city.slug, cfg)}`,
      },
    ],
  };
  return JSON.stringify(data);
}

// --- Category × city landing page helpers ---------------------------------

export function categoryCityUrl(categorySlug: string, citySlug: string): string {
  return `/${categorySlug}/${citySlug}`;
}

export function categoryCityLocalBusinessJsonLd(
  cfg: SiteConfig,
  categoryName: string,
  city: CityPage,
  equipmentItems: { name: string; tagline: string; displayRate: string }[],
): string {
  const pageUrl = `${cfg.business.siteUrl}/${slugifyCategory(categoryName)}/${city.slug}`;
  const data = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${pageUrl}#localbusiness`,
    name: `${cfg.business.name} — ${categoryName} rental in ${city.name}`,
    description: `${cfg.business.name} delivers ${categoryName.toLowerCase()} rental to ${city.name}, ${city.region}.`,
    email: cfg.business.email,
    url: pageUrl,
    sameAs: cfg.business.gbpUrl ? [cfg.business.gbpUrl] : [],
    areaServed: {
      '@type': 'City',
      name: city.name,
    },
    openingHours: 'Mo-Sa 07:00-19:00',
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: `${categoryName} rental available in ${city.name}`,
      itemListElement: equipmentItems.map((e) => ({
        '@type': 'Offer',
        name: e.name,
        description: e.tagline,
        category: `${categoryName} rental`,
        priceSpecification: {
          '@type': 'UnitPriceSpecification',
          unitText: 'per day',
          price: e.displayRate,
        },
        itemOffered: {
          '@type': 'Product',
          name: e.name,
          description: e.tagline,
        },
        availableAtOrFrom: {
          '@type': 'City',
          name: city.name,
        },
      })),
    },
  };
  return JSON.stringify(data);
}

export function categoryCityBreadcrumbsJsonLd(
  cfg: SiteConfig,
  categorySlug: string,
  categoryName: string,
  city: CityPage,
): string {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: cfg.business.siteUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Rent',
        item: `${cfg.business.siteUrl}/rent`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: categoryName,
        item: `${cfg.business.siteUrl}/rent#cat-${categorySlug}`,
      },
      {
        '@type': 'ListItem',
        position: 4,
        name: `${categoryName} rental in ${city.name}`,
        item: `${cfg.business.siteUrl}/${categorySlug}/${city.slug}`,
      },
    ],
  };
  return JSON.stringify(data);
}

function slugifyCategory(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// --- Guide (article) JSON-LD ---------------------------------------------

export function guideArticleJsonLd(
  cfg: SiteConfig,
  slug: string,
  title: string,
  description: string,
  datePublished: string,
): string {
  const pageUrl = `${cfg.business.siteUrl}/guides/${slug}`;
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': pageUrl,
    },
    author: {
      '@type': 'Organization',
      name: cfg.business.name,
      url: cfg.business.siteUrl,
    },
    publisher: {
      '@type': 'Organization',
      name: cfg.business.name,
      url: cfg.business.siteUrl,
    },
    datePublished,
    dateModified: datePublished,
  };
  return JSON.stringify(data);
}

export function guideBreadcrumbsJsonLd(
  cfg: SiteConfig,
  slug: string,
  title: string,
): string {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: cfg.business.siteUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Guides',
        item: `${cfg.business.siteUrl}/guides`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: title,
        item: `${cfg.business.siteUrl}/guides/${slug}`,
      },
    ],
  };
  return JSON.stringify(data);
}
