import fs from 'node:fs';
import path from 'node:path';

const catalog = JSON.parse(fs.readFileSync('src/data/catalog.json', 'utf8'));
const sql = fs.readFileSync('C:/Users/Administrator/Downloads/dbpjbpepourcrd.sql', 'utf8');

const byId = new Map();
const live = new Set();
for (const item of [...catalog.pages, ...catalog.products, ...catalog.posts, ...catalog.productCategories, ...catalog.postCategories, ...catalog.productTags]) {
  byId.set(String(item.id), item);
  live.add(item.path);
}
live.add('/product/');
live.add('/');

const redirects = [];
const seen = new Set();

function add(from, to, reason) {
  if (!from || !to || from === to) return;
  if (!from.startsWith('/')) from = `/${from}`;
  if (!to.startsWith('/')) to = `/${to}`;
  if (!from.endsWith('/') && !/\.xml$/i.test(from)) from += '/';
  if (to !== '/' && !to.endsWith('/') && !/\.xml$/i.test(to)) to += '/';
  if (from === to || live.has(from) || seen.has(from)) return;
  seen.add(from);
  redirects.push({ from, to, reason });
}

const re = /\((\d+),\s*(\d+),\s*'_wp_old_slug',\s*'([^']+)'\)/g;
let match;
while ((match = re.exec(sql))) {
  const item = byId.get(match[2]);
  if (!item) continue;
  const slug = match[3];
  const from = item.kind === 'product' ? `/product/${slug}/` : `/${slug}/`;
  add(from, item.path, 'wp-old-slug');
}

add('/contact-us/', '/contact-sheerherb/', 'legacy-menu');
add('/home/', '/', 'legacy-home');
add('/home1/', '/', 'front-page-slug');
add('/privacy-policy/', '/about-us/privacy-policy/', 'legacy-footer');
add('/download/rosemount-8750w-manual-pdf/', '/', 'off-topic-demo');
add('/product-category/anxiety-relief-supplement/', '/product-category/relaxation-restful-sleep-supplements/', 'retired-category');
add('/product-category/brain-health-supplements/', '/product-category/cognitive-support-supplements/', 'retired-category');
add('/product-category/mens-health-supplements-oem-custom/', '/product-category/mens-wellness-supplements/', 'retired-category');
add('/product-category/cardiovascular-health-supplement-oem/', '/product-category/heart-circulation-support-oem/', 'retired-category');
add('/sitemap.xml', '/sitemap-index.xml', 'sitemap-alias');
add('/sitemap_index.xml', '/sitemap-index.xml', 'sitemap-alias');
add('/wp-sitemap.xml', '/sitemap-index.xml', 'sitemap-alias');

fs.mkdirSync('src/data', { recursive: true });
fs.writeFileSync('src/data/redirects.json', JSON.stringify(redirects, null, 2));

const langs = catalog.site.languages.filter((lang) => lang !== 'en');
const lines = ['# Generated legacy redirects. First match wins.', ''];
function rule(from, to) {
  lines.push(`${from}  ${to}  301`);
}
for (const item of redirects) {
  rule(item.from, item.to);
  if (/\.xml$/i.test(item.from)) {
    rule(`${item.from}/`, item.to);
    for (const lang of langs) rule(`/${lang}${item.from}`, item.to);
    continue;
  }
  for (const lang of langs) {
    const from = `/${lang}${item.from}`;
    const to = item.to === '/' ? `/${lang}/` : `/${lang}${item.to}`;
    rule(from, to);
  }
}
rule('/feed/', '/rss.xml');
rule('/feed', '/rss.xml');
rule('/comments/feed/', '/rss.xml');
for (const lang of langs) {
  rule(`/${lang}/feed/`, '/rss.xml');
  rule(`/${lang}/comments/feed/`, '/rss.xml');
}
fs.writeFileSync('public/_redirects', lines.join('\n') + '\n');

const vercelRedirects = [
  ...redirects.map((item) => ({
    source: item.from.replace(/\/$/, '') || '/',
    destination: item.to,
    permanent: true,
  })),
  { source: '/feed', destination: '/rss.xml', permanent: true },
  { source: '/comments/feed', destination: '/rss.xml', permanent: true },
  ...langs.flatMap((lang) => [
    { source: `/${lang}/feed`, destination: '/rss.xml', permanent: true },
    { source: `/${lang}/comments/feed`, destination: '/rss.xml', permanent: true },
  ]),
];

const vercel = {
  trailingSlash: true,
  redirects: vercelRedirects,
  headers: [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      ],
    },
    {
      source: '/_astro/(.*)',
      headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
    },
  ],
};
fs.writeFileSync('vercel.json', JSON.stringify(vercel, null, 2));
console.log(`redirects ${redirects.length}, netlify rules ${lines.length}`);
