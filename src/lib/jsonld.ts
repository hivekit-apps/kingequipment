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
      name: 'Equipment rentals',
      itemListElement: visibleEquipment(cfg).map((e) => ({
        '@type': 'Offer',
        name: e.name,
        description: e.tagline,
        category: e.class === 'heavy-duty' ? 'Compact track loader rental' : 'Mini track loader rental',
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
    description: `${cfg.business.name} delivers mini stand-on track loader rental to ${city.name}, ${city.region}.`,
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
      name: `Equipment rentals available in ${city.name}`,
      itemListElement: visibleEquipment(cfg).map((e) => ({
        '@type': 'Offer',
        name: e.name,
        description: e.tagline,
        category: e.class === 'heavy-duty' ? 'Compact track loader rental' : 'Mini track loader rental',
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
        name: `Skid-steer rental in ${city.name}`,
        item: `${cfg.business.siteUrl}${cityPageUrl(city.slug, cfg)}`,
      },
    ],
  };
  return JSON.stringify(data);
}
