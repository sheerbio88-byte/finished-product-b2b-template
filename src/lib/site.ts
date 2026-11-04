import catalogJson from '~/data/catalog.json';
import redirectJson from '~/data/redirects.json';
import { categoryLabel } from '~/i18n/ui';
import { getLocale, localizePath, type Locale } from '~/i18n/locales';
import { getMessages, type Messages } from '~/i18n/messages';

export interface Entry {
  id?: number;
  slug: string;
  path: string;
  title: string;
  seoTitle?: string;
  seoDescription?: string;
  excerpt?: string;
  html?: string;
  image?: string;
  date?: string;
  modified?: string;
  kind: string;
  categories?: string[];
  tags?: string[];
  noindex?: boolean;
  count?: number;
}

export interface Redirect {
  from: string;
  to: string;
  reason: string;
}

interface Catalog {
  site: {
    name: string;
    legalName: string;
    url: string;
    tagline: string;
    email: string;
    phone: string;
    phoneHref: string;
    whatsapp: string;
    whatsappDisplay: string;
    address: string;
    languages: string[];
  };
  pages: Entry[];
  products: Entry[];
  posts: Entry[];
  productCategories: Entry[];
  postCategories: Entry[];
  productTags: Entry[];
}

const catalog = catalogJson as Catalog;
const redirects = redirectJson as Redirect[];

export const site = catalog.site;
export const SITE_URL = 'https://sheerherb-oem.com';

const LIPOSOME_HTML = `
<p>Sheerherb manufactures private-label liposomal supplements for brands that want a lipid-based format alongside conventional capsules and gummies. Production covers liquids, powders, capsules, softgels, drops, and sachets.</p>
<h2>Formats on this line</h2>
<ul>
<li>Liposomal vitamin C</li>
<li>Liposomal NMN</li>
<li>Liposomal glutathione</li>
<li>Liposomal NAD+</li>
</ul>
<p>Share a target ingredient, dose, and pack. The team confirms a sample, then scales filling and export packing. Browse the <a href="/product-category/liposomal-supplement/">liposomal supplement category</a> or the <a href="/liposomal-supplement/">liposomal manufacturer overview</a>. Related process pages: <a href="/pellet-technology/">micropellet technology</a> and <a href="/innovative-technology/">innovative technology</a>.</p>
`.trim();

const extraPages: Entry[] = [
  {
    slug: 'liposomes-technology',
    path: '/liposomes-technology/',
    title: 'Liposomal Supplement Technology',
    seoTitle: 'Liposomal Supplement Technology | OEM Manufacturer',
    seoDescription:
      'Liposomal supplement OEM in Xi’an: liquids, powders, capsules, softgels, and drops, including vitamin C, NMN, glutathione, and NAD+ formats.',
    excerpt: 'Private label liposomal liquids, powders, capsules, softgels, drops, and sachets.',
    html: LIPOSOME_HTML,
    image: '/wp-content/uploads/2024/01/c81e728d9d4c2f636f0655-1024x576.jpg',
    kind: 'page',
    noindex: false,
  },
];

export const pages = [...catalog.pages, ...extraPages];
export const products = catalog.products;
export const posts = catalog.posts;
export const productCategories = catalog.productCategories;
export const postCategories = catalog.postCategories;
export const productTags = catalog.productTags;

const contentByPath = new Map<string, Entry>();
for (const entry of [...pages, ...products, ...posts, ...productCategories, ...postCategories, ...productTags]) {
  contentByPath.set(entry.path, entry);
}

const redirectByFrom = new Map(redirects.map((item) => [item.from, item]));

export function absoluteUrl(pathname: string): string {
  if (!pathname || pathname === '/') return `${SITE_URL}/`;
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${SITE_URL}${path.endsWith('/') ? path : `${path}/`}`;
}

export function whatsappHref(text: string): string {
  return `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(text)}`;
}

export function plainText(html = ''): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\[\/?[^\]]+\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function cleanTitle(value: string): string {
  return value.replace(/Provate/g, 'Private').replace(/\bManufactuer\b/g, 'Manufacturer').replace(/\s+/g, ' ').trim();
}

function polishTitle(value: string): string {
  let title = cleanTitle(value);
  title = title.replace(/^20\d{2}\s+hotsale\s+/i, '');
  title = title.replace(/^[a-z0-9][^A-Z]{0,60}(?=[A-Z])/, '').trim();
  title = title.replace(/\s*[|\-–—]\s*Xi['’]an Sheerherb Biological Technology Co\.,?\s*Ltd\.?/gi, '');
  title = title.replace(/\bOEM\s+OEM\b/g, 'OEM');
  title = title.replace(/\s+Sheerherb\s*$/i, '');
  title = title.replace(/\s*[|\-–—]\s*$/g, '').replace(/\s+/g, ' ').trim();
  while (title.length > 62 && title.includes(' | ')) {
    const shorter = title.replace(/\s+\|[^|]*$/, '').trim();
    if (shorter.length < 28) break;
    title = shorter;
  }
  return title;
}

function decodeEntities(value: string): string {
  return value
    .replace(/&#38;|&amp;/g, '&')
    .replace(/&#39;|&apos;|&#x27;/g, "'")
    .replace(/&quot;|&#34;/g, '"')
    .replace(/&nbsp;|&#160;/g, ' ');
}

export function displayTitle(value: string): string {
  return cleanTitle(value)
    .replace(/^20\d{2}\s+hot\s*sale\s+/i, '')
    .replace(/^top\s+quality\s+/i, '');
}

export function metaDescription(entry: Entry): string {
  const raw = decodeEntities(cleanTitle(entry.seoDescription || ''))
    .replace(/\s+/g, ' ')
    .replace(/,(\S)/g, ', $1')
    .replace(/&(?=\S)/g, '& ')
    .replace(/Int ernational/g, 'International')
    .trim();
  const repeatedBrand = (raw.match(/sheerherb/gi) || []).length >= 2;
  const keywordDump = (raw.match(/&/g) || []).length >= 2 && !/[.。]/.test(raw);
  const junk = raw.length < 80 || repeatedBrand || keywordDump || /\[\/caption\]|description of|&#/i.test(raw);
  if (!junk && raw.length <= 170) return raw;
  const sentence = decodeEntities(plainText(entry.html || entry.excerpt || entry.title))
    .replace(/\bDescription of [^.:]{0,80}[.:]\s*/i, '')
    .split(/(?<=\.)\s+/)[0] || entry.title;
  let desc = sentence.length < 70 ? `${cleanTitle(entry.title)}. ${sentence}` : sentence;
  if (!/oem|private label|manufacturer|supplement/i.test(desc)) {
    desc = `${desc.replace(/\.$/, '')}. OEM and private label manufacturing by Sheerherb.`;
  }
  if (desc.length > 165) desc = `${desc.slice(0, 156).replace(/\s+\S*$/, '')}…`;
  return desc;
}

export function documentTitle(entry: Entry, lang: string): string {
  if (entry.path === '/') return getMessages(lang).heroTitle;
  const title = polishTitle(entry.seoTitle || entry.title);
  if (/^sheerherb$/i.test(title)) return 'Sheerherb supplement OEM manufacturer';
  return title;
}

export function titleTag(entry: Entry, lang: string): string {
  const title = documentTitle(entry, lang);
  const heading = displayTitle(entry.title).replace(/\s+/g, ' ').trim().toLowerCase();
  const sameAsH1 = title.replace(/\s+/g, ' ').trim().toLowerCase() === heading;
  if (!sameAsH1 && (/sheerherb/i.test(title) || title.length > 46)) return title;
  if (title.length <= 48) return `${title} | Sheerherb`;
  // Title would repeat the H1 and is too long for a suffix: keep the lead
  // keyword phrase and brand it, so title and H1 differ.
  const lead = title.split(/\s+[|–—-]\s+/)[0]?.trim() || title;
  if (lead !== title && lead.length >= 20 && lead.length <= 48) return `${lead} | Sheerherb`;
  const afterColon = title.includes(': ') ? title.slice(title.indexOf(': ') + 2).replace(/^(?:a|an|the)\s+/i, '').trim() : '';
  if (afterColon.length >= 20 && afterColon.length <= 48) return `${afterColon.charAt(0).toUpperCase()}${afterColon.slice(1)} | Sheerherb`;
  return `${title.slice(0, 48).replace(/\s+\S*$/, '')} | Sheerherb`;
}

const LINK_FIXES: Record<string, string> = {
  '/contact-us/': '/contact-sheerherb/',
  '/contact-us': '/contact-sheerherb/',
  '/feedback/': '/contact-sheerherb/',
  '/feedback': '/contact-sheerherb/',
  '/privacy-policy/': '/about-us/privacy-policy/',
  '/dosage-form-oem/capsule-supplement/': '/capsule-supplement/',
  '/dosage-form-oem/oem-powder-supplement/': '/dosage-form-oem/powder-supplement-oem/',
  '/dosage-form-oem/powder-supplement/': '/dosage-form-oem/powder-supplement-oem/',
  '/product-category/anxiety-relief-supplement/': '/product-category/relaxation-restful-sleep-supplements/',
  '/product-category/brain-health-supplements/': '/product-category/cognitive-support-supplements/',
  '/product-category/mens-health-supplements-oem-custom/': '/product-category/mens-wellness-supplements/',
  '/product-category/cardiovascular-health-supplement-oem/': '/product-category/heart-circulation-support-oem/',
  '/product-category/womens-health-supplement/': '/product-category/womens-health-supplements/',
  '/product-category/liver-support-supplements/': '/product-category/liver-cleamse-supplements/',
  '/product-category/anti-aging-supplements/': '/product-category/healthy-aging-supplements/',
  '/product-category/weight-loss-supplements/': '/product-category/weight-management-supplements/',
  '/product/melatonin-gummies/': '/product-category/relaxation-restful-sleep-supplements/',
  '/product-tag/herbal-supplement-oem/': '/herbal-supplement-oem/',
};

export function prepareHtml(html = '', lang = 'en'): string {
  if (!html) return '';
  let next = html.replace(/\[\/?[^\]]+\]/g, '');
  next = next.replace(/<img[^>]*src="\/wp-content\/uploads\/2024\/01\/13-1-300x152\.jpg"[^>]*>/gi, '');
  next = next.replace(/<h3>\s*Customers Reviews\s*<\/h3>[\s\S]*?(?=<h3>\s*Contact Us\s*<\/h3>)/i, '');
  next = next.replace(/<h[1-6][^>]*>\s*google map[\s\S]*?<\/h[1-6]>/gi, '');
  next = next.replace(/Whatapp/g, 'WhatsApp');
  next = next.replace(/<img\b([^>]*?)\balt="([^"]+)"([^>]*)>\s*([^<]{1,180})/gi, (full, pre, alt, post, after) => {
    const caption = String(after).replace(/\s+/g, ' ').trim();
    const cleanAlt = String(alt).replace(/\s+/g, ' ').trim();
    if (!cleanAlt || caption.toLowerCase() !== cleanAlt.toLowerCase()) return full;
    return `<figure><img${pre}alt="${alt}"${post}><figcaption>${cleanAlt}</figcaption></figure>`;
  });
  next = next.replace(/<table\b/gi, '<div class="table-scroll"><table');
  next = next.replace(/<\/table>/gi, '</table></div>');
  next = next.replace(
    /<a href="https?:\/\/wa\.me\/[^"]+"[^>]*>\s*LIve Chat\s*<\/a>\s*<a href="">\s*Email\s*<\/a>/gi,
    `<p class="actions"><button class="btn" type="button" data-open-quote>Request a quote</button></p>`,
  );
  next = next.replace(/<a\b[^>]*href="https?:\/\/(?:wa\.me|api\.whatsapp\.com)[^"]*"[^>]*>([\s\S]*?)<\/a>/gi, '<button class="linkish" type="button" data-open-quote>Request a quote</button>');
  next = next.replace(/<a href="mailto:([^"]+)">\s*([^<]*?)\s*<\/a>\s*<a href="mailto:\1">\s*([^<]*?)\s*<\/a>/gi, (_m, email, left, right) => {
    return `<a href="mailto:${email}">${String(left) + String(right)}</a>`;
  });
  next = next.replace(/href="https?:\/\/(?:www\.)?sheerherb-oem\.com([^"]*)"/gi, (_match, path: string) => {
    const local = path && path !== '' ? path : '/';
    return `href="${local.endsWith('/') || local.includes('.') ? local : `${local}/`}"`;
  });
  next = next.replace(/href="([^"]+)"/g, (_match, href: string) => {
    if (!href.startsWith('/') || href.startsWith('//') || href.startsWith('/wp-content/') || href.startsWith('/wp-admin/')) {
      return `href="${href}"`;
    }
    const cut = [href.indexOf('#'), href.indexOf('?')].filter((index) => index >= 0).sort((a, b) => a - b)[0] ?? href.length;
    const bare = href.slice(0, cut) || '/';
    const suffix = href.slice(cut);
    const slashed = bare.endsWith('/') || bare.includes('.') ? bare : `${bare}/`;
    const mapped = LINK_FIXES[bare] || LINK_FIXES[slashed] || redirectByFrom.get(slashed)?.to || redirectByFrom.get(bare)?.to || slashed;
    const normalized = mapped.endsWith('/') || /\.[a-z0-9]+$/i.test(mapped) ? mapped : `${mapped}/`;
    const keepSuffix = mapped === slashed || mapped === bare;
    return `href="${localizePath(normalized, lang)}${keepSuffix ? suffix : ''}"`;
  });
  next = next.replace(/<\/a>\s*,\s*(<a\b)/gi, '</a>, $1');
  next = next.replace(/>([^<]+)</g, (_match, text: string) => {
    const cleaned = text.replace(/,(\S)/g, ', $1').replace(/:([A-Za-z])/g, ': $1');
    return `>${cleaned}<`;
  });
  return next;
}

export function stripShownSpecTable(html: string, specs: Array<{ label: string; value: string }>): string {
  if (specs.length < 3) return html;
  const labels = specs.slice(0, 3).map((row) => row.label);
  return html.replace(
    /(?:<h[1-6][^>]*>\s*specification\b[\s\S]*?<\/h[1-6]>\s*)?<div class="table-scroll"><table\b[\s\S]*?<\/table><\/div>/gi,
    (block) => {
      const text = block.replace(/<[^>]+>/g, ' ');
      return labels.every((label) => text.includes(label)) ? '' : block;
    },
  );
}

export function specRows(html = ''): Array<{ label: string; value: string }> {
  const rows: Array<{ label: string; value: string }> = [];
  const re = /<tr>\s*<t[dh][^>]*>([\s\S]*?)<\/t[dh]>\s*<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) && rows.length < 6) {
    const label = plainText(match[1]);
    const value = plainText(match[2])
      .replace(/\s+/g, ' ')
      .replace(/,(\S)/g, ', $1')
      .replace(/\.([a-z]{2,})/g, '. $1')
      .replace(/\/([a-z])/g, '/ $1')
      .trim();
    if (label && value && label.length < 80) rows.push({ label, value });
  }
  return rows;
}

export function stripFirstImage(html: string, src: string): string {
  if (!src) return html;
  const next = html.replace(new RegExp(`<img[^>]*src="${src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>`, 'i'), '');
  return next.replace(/<h[1-6][^>]*>\s*<\/h[1-6]>/gi, '');
}

const FEATURED_SLUGS = [
  'nmn-capsules',
  'creatine-monohydrate',
  'glutathione-gummies-oem',
  'ashwagandha-capsules',
  'collagen-peptides-supplements-oem',
  'organic-shilajit-resin',
  'probiotic-gummies',
  'omega-3-dha-gummies',
  'berberine-capsules',
  'vitamin-d3-gummies',
  'sea-moss-gummies',
  'liposomal-vitamin-c-softgel',
];

export function featuredProducts(limit = 8): Entry[] {
  const bySlug = new Map(products.map((product) => [product.slug, product]));
  const picked = FEATURED_SLUGS.map((slug) => bySlug.get(slug)).filter((item): item is Entry => Boolean(item));
  if (picked.length >= limit) return picked.slice(0, limit);
  for (const product of products) {
    if (picked.length >= limit) break;
    if (!picked.includes(product)) picked.push(product);
  }
  return picked;
}

export function productsInCategory(slug: string): Entry[] {
  return products.filter((product) => product.categories?.includes(slug));
}

export function productsWithTag(slug: string): Entry[] {
  return products.filter((product) => product.tags?.includes(slug));
}

export function relatedProducts(entry: Entry, limit = 4): Entry[] {
  const category = entry.categories?.[0];
  const pool = category ? productsInCategory(category) : products;
  return pool.filter((product) => product.path !== entry.path).slice(0, limit);
}

export function categoryName(slug: string, lang = 'en'): string {
  const fallback = productCategories.find((category) => category.slug === slug)?.title || slug;
  return categoryLabel(slug, lang, fallback);
}

export function dosageLinksFor(t: Messages) {
  return [
    { href: '/dosage-form-oem/', label: t.navAllDosage },
    { href: '/gummies-supplements-oem/', label: t.navGummies },
    { href: '/capsule-supplement/', label: t.navCapsules },
    { href: '/softgels/', label: t.navSoftgels },
    { href: '/dosage-form-oem/tablets-supplements-oem/', label: t.navTablets },
    { href: '/dosage-form-oem/powder-supplement-oem/', label: t.navPowders },
    { href: '/throat-lozenges/', label: t.navLozenges },
    { href: '/liposomal-supplement/', label: t.navLiposomal },
    { href: '/pellet-technology/', label: t.navMicropellets },
  ];
}

export function aboutLinksFor(t: Messages) {
  return [
    { href: '/about-us/', label: t.navAbout },
    { href: '/about-us/certificates/', label: t.navCertificates },
    { href: '/about-us/sales-network/', label: t.navSales },
    { href: '/about-us/blog/', label: t.navArticles },
    { href: '/herbal-supplement-oem/', label: t.navGuide },
  ];
}

export function techLinksFor(t: Messages) {
  return [
    { href: '/liposomes-technology/', label: t.navLipoTech },
    { href: '/pellet-technology/', label: t.navPelletTech },
    { href: '/innovative-technology/', label: t.navInnovative },
    { href: '/product-category/liposomal-supplement/', label: t.navLipoProducts },
  ];
}

export function postsInCategory(slug: string): Entry[] {
  return posts.filter((post) => post.categories?.includes(slug));
}

export interface RouteEntry {
  path: string;
  kind: 'content' | 'redirect';
  entry?: Entry;
  to?: string;
}

function paramFromPath(pathname: string): string {
  return pathname.replace(/^\/|\/$/g, '');
}

function isXmlPath(pathname: string): boolean {
  return /\.xml\/?$/i.test(pathname);
}

export function contentRoutes(): RouteEntry[] {
  const routes: RouteEntry[] = [];
  for (const entry of [...pages, ...posts, ...postCategories]) {
    if (entry.path === '/') continue;
    routes.push({ path: paramFromPath(entry.path), kind: 'content', entry });
  }
  for (const redirect of redirects) {
    if (redirect.from.startsWith('/product/') || redirect.from.startsWith('/product-category/') || isXmlPath(redirect.from)) continue;
    if (contentByPath.has(redirect.from)) continue;
    routes.push({ path: paramFromPath(redirect.from), kind: 'redirect', to: redirect.to });
  }
  return routes;
}

export function categoryRoutes(): RouteEntry[] {
  const routes: RouteEntry[] = productCategories.map((entry) => ({
    path: entry.slug,
    kind: 'content' as const,
    entry,
  }));
  for (const redirect of redirects) {
    if (!redirect.from.startsWith('/product-category/')) continue;
    const slug = paramFromPath(redirect.from).replace(/^product-category\//, '');
    if (productCategories.some((category) => category.slug === slug)) continue;
    routes.push({ path: slug, kind: 'redirect', to: redirect.to });
  }
  return routes;
}

export function productRoutes(): RouteEntry[] {
  const routes: RouteEntry[] = products.map((entry) => ({
    path: entry.slug,
    kind: 'content' as const,
    entry,
  }));
  for (const redirect of redirects) {
    if (!redirect.from.startsWith('/product/')) continue;
    const slug = paramFromPath(redirect.from).replace(/^product\//, '');
    if (products.some((product) => product.slug === slug)) continue;
    routes.push({ path: slug, kind: 'redirect', to: redirect.to });
  }
  return routes;
}

export function localeContext(lang: string): { locale: Locale; t: Messages } {
  return { locale: getLocale(lang), t: getMessages(lang) };
}

export function englishRedirectTarget(pathname: string): string | null {
  return redirectByFrom.get(pathname)?.to || null;
}

export const redirectSources = redirects.map((item) => item.from);

export const dosageLinks = [
  { href: '/dosage-form-oem/', label: 'All dosage forms' },
  { href: '/gummies-supplements-oem/', label: 'Gummies' },
  { href: '/capsule-supplement/', label: 'Capsules' },
  { href: '/softgels/', label: 'Softgels' },
  { href: '/dosage-form-oem/tablets-supplements-oem/', label: 'Tablets' },
  { href: '/dosage-form-oem/powder-supplement-oem/', label: 'Powders' },
  { href: '/throat-lozenges/', label: 'Throat lozenges' },
  { href: '/liposomal-supplement/', label: 'Liposomal' },
  { href: '/pellet-technology/', label: 'Micropellets' },
];

export const aboutLinks = [
  { href: '/about-us/', label: 'About Sheerherb' },
  { href: '/about-us/certificates/', label: 'Certificates' },
  { href: '/about-us/sales-network/', label: 'Sales network' },
  { href: '/about-us/blog/', label: 'Articles' },
  { href: '/herbal-supplement-oem/', label: 'OEM launch guide' },
];

export const techLinks = [
  { href: '/liposomes-technology/', label: 'Liposomal technology' },
  { href: '/pellet-technology/', label: 'Micropellet technology' },
  { href: '/innovative-technology/', label: 'Innovative technology' },
  { href: '/product-category/liposomal-supplement/', label: 'Liposomal products' },
];

export const socialLinks = [
  { href: 'https://www.facebook.com/profile.php?id=61550949181675', label: 'Facebook' },
  { href: 'https://www.instagram.com/sheerbio88/', label: 'Instagram' },
  { href: 'https://www.youtube.com/@sheerherb-antiage', label: 'YouTube' },
  { href: 'https://www.pinterest.com/sheerherb/', label: 'Pinterest' },
];

export const faqs = [
  {
    q: 'What dosage forms can you manufacture?',
    a: 'Gummies, capsules, softgels, tablets, powders, drops, liposomal liquids and powders, micropellets, and throat lozenges. Each form has its own page with the current OEM scope.',
  },
  {
    q: 'What is the minimum order?',
    a: 'On many finished private-label SKUs the minimum is 500–1,000 units. The exact MOQ depends on the ingredient, dosage form, and packaging.',
  },
  {
    q: 'Can you support Amazon and Shopify brands?',
    a: 'Yes. Private-label packing can be prepared for Amazon and Shopify sellers, including export cartons and label artwork supplied by the buyer.',
  },
  {
    q: 'Do you offer organic or non-GMO ingredients?',
    a: 'Yes, when the formula calls for them. Sheerherb can source certified organic and non-GMO ingredients for private-label runs.',
  },
  {
    q: 'How does a project start?',
    a: 'Send the dosage form, target market, quantity, and any label files. The factory confirms formula options, a sample, then production, inspection, packing, and shipping.',
  },
  {
    q: 'Where is the factory?',
    a: 'Xi’an Sheerherb Biological Technology Co., Ltd., Room 1204, Vanke Huizhi Center, Yanta District, Xi’an, Shaanxi, China. Shipments go to brands and distributors worldwide.',
  },
];

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': 'https://sheerherb-oem.com/#organization',
    name: 'Sheerherb',
    alternateName: ['新维禾'],
    legalName: site.legalName,
    url: `${SITE_URL}/`,
    logo: `${SITE_URL}/brand/logo.png`,
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Room 1204, Vanke Huizhi Center, Yanta District',
      addressLocality: "Xi'an",
      addressRegion: 'Shaanxi',
      addressCountry: 'CN',
    },
    subOrganization: [
      { '@type': 'Organization', '@id': 'https://sheerdds.com/#organization', url: 'https://sheerdds.com/' },
      { '@type': 'Organization', '@id': 'https://sheersuperfood.com/#organization', url: 'https://sheersuperfood.com/' },
      { '@type': 'Organization', '@id': 'https://naturalsheerherb.com/#organization', url: 'https://naturalsheerherb.com/' },
    ],
    sameAs: [...socialLinks.map((link) => link.href), ...['https://sheerdds.com/', 'https://sheersuperfood.com/', 'https://naturalsheerherb.com/']],
  };
}

export function productSchema(input: {
  name: string;
  description?: string;
  image?: string | null;
  url: string;
  category?: string;
  manufacturerName?: string;
  priceValidUntil?: string;
}) {
  const priceValidUntil =
    input.priceValidUntil ?? `${new Date().getUTCFullYear() + 1}-12-31`;
  const image =
    input.image == null || input.image === ''
      ? undefined
      : input.image.startsWith('http')
        ? [input.image]
        : [absoluteUrl(input.image)];

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: input.name,
    description: input.description || undefined,
    image,
    url: input.url,
    brand: { '@type': 'Brand', name: 'Sheerherb' },
    manufacturer: {
      '@type': 'Organization',
      name: input.manufacturerName || site.legalName,
    },
    category: input.category || undefined,
    // B2B OEM: no public retail price. Offer with price 0 = quote-on-request
    // so GSC Product snippets get required offers|review|aggregateRating.
    // Do not invent review/aggregateRating.
    offers: {
      '@type': 'Offer',
      url: input.url,
      priceCurrency: 'USD',
      price: '0',
      availability: 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
      priceValidUntil,
      seller: {
        '@type': 'Organization',
        name: 'Sheerherb',
        url: `${SITE_URL}/`,
      },
    },
  };
}

export function breadcrumbSchema(items: Array<{ name: string; path: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function faqSchema(items: Array<{ q: string; a: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };
}
