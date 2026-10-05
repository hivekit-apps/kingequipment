/** @type {import('next-sitemap').IConfig} */
function sanitize(v) {
  if (!v) return '';
  let out = String(v).trim();
  while (out.startsWith('"') || out.startsWith("'")) out = out.slice(1);
  while (out.endsWith('"') || out.endsWith("'")) out = out.slice(0, -1);
  return out.trim();
}

module.exports = {
  siteUrl: sanitize(process.env.NEXT_PUBLIC_SITE_URL) || 'https://kingequipment.ca',
  generateRobotsTxt: true,
  changefreq: 'weekly',
  priority: 0.7,
  sitemapSize: 5000,
  exclude: ['/admin', '/admin/*', '/book', '/cart', '/checkout'],
  robotsTxtOptions: {
    policies: [
      { userAgent: '*', allow: '/', disallow: ['/admin', '/admin/', '/book', '/cart', '/checkout'] },
    ],
  },
};
