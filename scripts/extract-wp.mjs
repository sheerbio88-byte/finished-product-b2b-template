/**
 * Stream-parse the WordPress dump into a URL-preserving content catalog.
 * Reads dbpjbpepourcrd.sql (prefix ajv_) and writes src/data/catalog.json.
 */
import fs from 'node:fs';
import path from 'node:path';

const SQL_PATH = process.env.SQL_PATH || 'C:\\Users\\Administrator\\Downloads\\dbpjbpepourcrd.sql';
const WP_ROOT = process.env.WP_ROOT || 'C:\\Users\\Administrator\\Desktop\\sheerherb-oem-wp';
const OUT_PATH = path.resolve('src/data/catalog.json');
const PUBLIC_DIR = path.resolve('public');

const KEEP_META = new Set([
  '_thumbnail_id',
  '_wp_attached_file',
  'rank_math_title',
  'rank_math_description',
  'rank_math_focus_keyword',
  'rank_math_canonical_url',
  'rank_math_robots',
]);

function decodeEntities(text) {
  return text
    .replace(/&#0*38;/g, '&')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;|&apos;|&#8217;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => {
      const code = Number(n);
      return code > 0 && code < 0x110000 ? String.fromCodePoint(code) : _;
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

function unescapeSqlString(raw) {
  let out = '';
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (c !== '\\') {
      out += c;
      continue;
    }
    const n = raw[++i];
    if (n === undefined) break;
    const map = { n: '\n', r: '\r', t: '\t', '0': '\0', Z: '\u001a', b: '\b', "'": "'", '"': '"', '\\': '\\' };
    out += map[n] ?? n;
  }
  return out;
}

/**
 * Yield field arrays for every tuple in INSERT statements for `table`.
 * The dump is read once; we scan only the requested table sections.
 */
function* iterateInserts(sql, table) {
  const needle = `INSERT INTO \`${table}\``;
  let from = 0;
  while (from < sql.length) {
    const at = sql.indexOf(needle, from);
    if (at === -1) return;
    const valuesAt = sql.indexOf('VALUES', at);
    if (valuesAt === -1) return;
    let i = valuesAt + 6;
    while (i < sql.length) {
      while (i < sql.length && /[\s,]/.test(sql[i])) i++;
      if (sql[i] !== '(') break;
      i++;
      const fields = [];
      let cur = '';
      let inStr = false;
      let strBuf = '';
      while (i < sql.length) {
        const c = sql[i];
        if (inStr) {
          if (c === '\\') {
            strBuf += c + (sql[i + 1] ?? '');
            i += 2;
            continue;
          }
          if (c === "'") {
            if (sql[i + 1] === "'") {
              strBuf += "\\'";
              i += 2;
              continue;
            }
            inStr = false;
            cur = unescapeSqlString(strBuf);
            strBuf = '';
            i++;
            continue;
          }
          strBuf += c;
          i++;
          continue;
        }
        if (c === "'") {
          inStr = true;
          strBuf = '';
          i++;
          continue;
        }
        if (c === ',') {
          fields.push(normalizeField(cur));
          cur = '';
          i++;
          continue;
        }
        if (c === ')') {
          fields.push(normalizeField(cur));
          yield fields;
          i++;
          break;
        }
        cur += c;
        i++;
      }
    }
    from = i;
  }
}

function normalizeField(raw) {
  const trimmed = raw.trim();
  if (trimmed === 'NULL') return null;
  return trimmed;
}

function cleanHtml(html) {
  if (!html) return '';
  let s = html.replace(/\r\n/g, '\n');
  s = s.replace(/\[[\w-]+[^\]]*\]/g, '');
  s = s.replace(/<script[\s\S]*?<\/script>/gi, '');
  s = s.replace(/<style[\s\S]*?<\/style>/gi, '');
  s = s.replace(/<iframe[\s\S]*?<\/iframe>/gi, '');
  s = s.replace(/\sdata-[\w-]+=(?:"[^"]*"|'[^']*')/gi, '');
  s = s.replace(/\s(?:sizes|srcset|loading|decoding|class|style|width|height|id|target|rel)=(?:"[^"]*"|'[^']*')/gi, (attr) => {
    if (attr.trim().startsWith('alt=')) return attr;
    return '';
  });
  s = s.replace(/<img([^>]*?)>/gi, (_, attrs) => {
    const src = attrs.match(/\ssrc=["']([^"']+)["']/i)?.[1] || attrs.match(/src=["']([^"']+)["']/i)?.[1] || '';
    const alt = attrs.match(/\salt=["']([^"']*)["']/i)?.[1] || '';
    const local = toLocalUpload(src);
    if (!local) return '';
    return `<img src="${local}" alt="${decodeEntities(alt).replace(/"/g, '&quot;')}">`;
  });
  s = s.replace(/<a[^>]*href=["']([^"']+)["'][^>]*>/gi, (_, href) => {
    const local = toLocalHref(href);
    return `<a href="${local}">`;
  });
  const allowed = new Set(['p', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'strong', 'em', 'b', 'a', 'img', 'blockquote', 'br', 'figure', 'figcaption']);
  s = s.replace(/<\/?([a-z0-9]+)(\s[^>]*)?>/gi, (full, tag) => {
    const name = tag.toLowerCase();
    if (!allowed.has(name)) return '';
    if (full.startsWith('</')) return `</${name}>`;
    if (name === 'img' || name === 'a' || name === 'br') return full.replace(/<br[^>]*>/i, '<br>');
    return `<${name}>`;
  });
  s = s.replace(/(<br>\s*){3,}/g, '<br><br>');
  s = s.replace(/<(p|h2|h3|h4|li|figcaption)>\s*<\/\1>/gi, '');
  s = s.replace(/\n{3,}/g, '\n\n');
  return decodeEntities(s).trim();
}

function toLocalUpload(url) {
  if (!url) return '';
  const cleaned = url.replace(/\\/g, '');
  const match = cleaned.match(/wp-content\/uploads\/[^"'?\s]+/i);
  if (!match) return '';
  return `/${match[0]}`;
}

function toLocalHref(href) {
  if (!href) return '#';
  const cleaned = decodeEntities(href).trim();
  if (cleaned.startsWith('mailto:') || cleaned.startsWith('tel:') || cleaned.startsWith('https://wa.me')) return cleaned;
  try {
    if (cleaned.startsWith('/')) return cleaned.endsWith('/') || cleaned.includes('.') ? cleaned : `${cleaned}/`;
    const u = new URL(cleaned, 'https://www.sheerherb-oem.com');
    if (!/sheerherb-oem\.com$|sheerherb\.com$/i.test(u.hostname) && !u.hostname.endsWith('sheerherb-oem.com')) {
      return cleaned;
    }
    const pathName = u.pathname || '/';
    if (pathName.startsWith('/wp-content/')) return pathName;
    if (pathName === '/') return '/';
    return pathName.endsWith('/') ? pathName : `${pathName}/`;
  } catch {
    return cleaned;
  }
}

function textExcerpt(html, max = 180) {
  const text = decodeEntities(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).replace(/\s+\S*$/, '')}…`;
}

function resolveSeo(template, ctx) {
  if (!template) return '';
  let s = decodeEntities(template);
  const map = {
    '%sep%': '|',
    '%sitename%': ctx.siteName,
    '%sitedesc%': ctx.tagline,
    '%title%': ctx.title,
    '%excerpt%': ctx.excerpt,
    '%excerpt_only%': ctx.excerpt,
    '%focuskw%': ctx.focus,
    '%name%': ctx.siteName,
    '%org_name%': 'Sheerherb',
    '%post_author%': '',
    '%page%': '',
    '%sep%': '|',
  };
  for (const [token, value] of Object.entries(map)) {
    s = s.split(token).join(value);
  }
  s = s.replace(/%[a-z0-9_]+%/gi, '');
  return s.replace(/\s+/g, ' ').replace(/\s+\|\s*$/g, '').replace(/^\|\s*/g, '').trim();
}

function pagePath(pagesById, page) {
  const slugs = [];
  let current = page;
  const guard = new Set();
  while (current && !guard.has(current.id)) {
    guard.add(current.id);
    if (String(current.id) === String(pagesById.frontId)) break;
    slugs.unshift(current.slug);
    current = current.parent ? pagesById.map.get(current.parent) : null;
  }
  if (!slugs.length) return '/';
  return `/${slugs.join('/')}/`;
}

function categoryPath(termsById, term) {
  const slugs = [];
  let current = term;
  const guard = new Set();
  while (current && !guard.has(current.termId)) {
    guard.add(current.termId);
    slugs.unshift(current.slug);
    current = current.parent ? termsById.get(current.parent) : null;
  }
  return `/${slugs.join('/')}/`;
}

console.log('Reading SQL dump…');
const sql = fs.readFileSync(SQL_PATH, 'utf8');
console.log(`Dump size ${(sql.length / 1024 / 1024).toFixed(1)} MB`);

const options = new Map();
for (const row of iterateInserts(sql, 'ajv_options')) {
  if (row.length >= 3) options.set(row[1], row[2]);
}

const siteName = decodeEntities(options.get('blogname') || "Xi'an Sheerherb Biological Technology Co., Ltd.").replace(/\s+/g, ' ').trim();
const tagline = decodeEntities(options.get('blogdescription') || 'Supplement OEM / ODM manufacturer').replace(/\s+/g, ' ').trim();
const frontId = options.get('page_on_front') || '4106';
const home = options.get('home') || options.get('siteurl') || 'https://www.sheerherb-oem.com';
let siteUrl = 'https://www.sheerherb-oem.com';
try {
  const host = new URL(home).hostname.replace(/^www\./, '');
  siteUrl = `https://www.${host}`;
} catch {
  /* keep default */
}

const trp = options.get('transposh_options') || '';
const viewableMatch = trp.match(/viewable_languages";s:\d+:"([^"]+)"/);
const languages = (viewableMatch?.[1] || 'en,de').split(',').map((s) => s.trim()).filter(Boolean);

const wppop = options.get('wppopoption') || '';
const removeCat = /remove-product-category-url";s:\d+:"1"/.test(wppop) || /remove-product-category-url";i:1/.test(wppop);
const productBase = /permalink-product-url-pre";s:\d+:"products"/.test(wppop) ? 'products' : 'product';

console.log({ siteName, siteUrl, frontId, languages: languages.length, removeCat, productBase, permalink: options.get('permalink_structure') });

const metaByPost = new Map();
for (const row of iterateInserts(sql, 'ajv_postmeta')) {
  const postId = row[1];
  const key = row[2];
  if (!KEEP_META.has(key)) continue;
  if (!metaByPost.has(postId)) metaByPost.set(postId, {});
  metaByPost.get(postId)[key] = row[3];
}

const posts = [];
for (const row of iterateInserts(sql, 'ajv_posts')) {
  const [id, , date, , content, title, excerpt, status, , , , slug, , , modified, , , parent, guid, , type, mime] = row;
  posts.push({
    id,
    date,
    content: content || '',
    title: decodeEntities(title || '').replace(/\s+/g, ' ').trim(),
    excerpt: decodeEntities(excerpt || '').replace(/\s+/g, ' ').trim(),
    status,
    slug: decodeURIComponent(slug || ''),
    modified,
    parent,
    guid,
    type,
    mime: mime || '',
  });
}

const attachments = new Map();
for (const post of posts) {
  if (post.type !== 'attachment') continue;
  const meta = metaByPost.get(post.id) || {};
  const file = meta._wp_attached_file;
  const fromGuid = toLocalUpload(post.guid || '');
  const local = file ? `/wp-content/uploads/${file.replace(/^\/+/, '')}` : fromGuid;
  attachments.set(post.id, local);
}

const terms = [];
for (const row of iterateInserts(sql, 'ajv_terms')) {
  terms.push({
    termId: row[0],
    name: decodeEntities(row[1] || '').replace(/\s+/g, ' ').trim(),
    slug: row[2],
  });
}
const termById = new Map(terms.map((t) => [t.termId, t]));

const taxonomies = [];
for (const row of iterateInserts(sql, 'ajv_term_taxonomy')) {
  const term = termById.get(row[1]);
  if (!term) continue;
  taxonomies.push({
    taxId: row[0],
    termId: row[1],
    taxonomy: row[2],
    description: row[3] || '',
    parent: row[4] || '0',
    count: Number(row[5] || 0),
    name: term.name,
    slug: term.slug,
  });
}
const taxById = new Map(taxonomies.map((t) => [t.taxId, t]));

const rels = new Map();
for (const row of iterateInserts(sql, 'ajv_term_relationships')) {
  const objectId = row[0];
  const tax = taxById.get(row[1]);
  if (!tax) continue;
  if (!rels.has(objectId)) rels.set(objectId, []);
  rels.get(objectId).push(tax);
}

const rankPages = [];
for (const row of iterateInserts(sql, 'ajv_rank_math_analytics_objects')) {
  rankPages.push({ page: row[3], type: row[5], id: row[6], indexable: row[10] });
}

function buildRecord(post) {
  const meta = metaByPost.get(post.id) || {};
  const html = cleanHtml(post.content);
  const plainExcerpt = post.excerpt || textExcerpt(html, 220);
  const focus = decodeEntities(meta.rank_math_focus_keyword || '');
  const seoTitle = resolveSeo(meta.rank_math_title, { siteName, tagline, title: post.title, excerpt: plainExcerpt, focus }) || post.title;
  const seoDescription = resolveSeo(meta.rank_math_description, { siteName, tagline, title: post.title, excerpt: plainExcerpt, focus }) || textExcerpt(html || plainExcerpt, 160);
  const robots = meta.rank_math_robots || '';
  const noindex = /noindex/i.test(robots);
  const thumbId = meta._thumbnail_id;
  const image = thumbId ? attachments.get(thumbId) || '' : '';
  const firstContentImage = html.match(/<img[^>]+src="([^"]+)"/i)?.[1] || '';
  const assigned = rels.get(post.id) || [];
  return {
    id: Number(post.id),
    slug: post.slug,
    title: post.title,
    seoTitle,
    seoDescription,
    excerpt: textExcerpt(plainExcerpt, 220),
    html,
    image: image || firstContentImage,
    date: (post.date || '').slice(0, 10),
    modified: (post.modified || '').slice(0, 10),
    parent: Number(post.parent || 0),
    noindex,
    focus,
    canonicalHint: meta.rank_math_canonical_url || '',
    categories: assigned.filter((t) => t.taxonomy === 'product_cat' || t.taxonomy === 'category').map((t) => t.slug),
    tags: assigned.filter((t) => t.taxonomy === 'product_tag' || t.taxonomy === 'post_tag').map((t) => t.slug),
  };
}

const published = posts.filter((p) => p.status === 'publish' && p.slug);
const pagePosts = published.filter((p) => p.type === 'page');
const pageMap = new Map(pagePosts.map((p) => [p.id, p]));
const pagesById = { map: pageMap, frontId };

const pages = pagePosts.map((post) => {
  const rec = buildRecord(post);
  rec.path = pagePath(pagesById, { id: post.id, slug: post.slug, parent: post.parent });
  rec.kind = 'page';
  return rec;
});

const products = published
  .filter((p) => p.type === 'product')
  .map((post) => {
    const rec = buildRecord(post);
    rec.path = `/${productBase}/${post.slug}/`;
    rec.kind = 'product';
    return rec;
  });

const articles = published
  .filter((p) => p.type === 'post')
  .map((post) => {
    const rec = buildRecord(post);
    rec.path = `/${post.slug}/`;
    rec.kind = 'post';
    return rec;
  });

function termRecord(tax, path) {
  const html = cleanHtml(tax.description || '');
  return {
    id: Number(tax.termId),
    slug: tax.slug,
    title: tax.name,
    seoTitle: tax.name,
    seoDescription: textExcerpt(html, 160) || `${tax.name} from ${siteName}`,
    excerpt: textExcerpt(html, 220),
    html,
    image: '',
    path,
    parent: Number(tax.parent || 0),
    count: tax.count,
    noindex: false,
    kind: tax.taxonomy,
  };
}

const productCategories = taxonomies
  .filter((t) => t.taxonomy === 'product_cat')
  .map((t) => termRecord(t, `/product-category/${t.slug}/`));

const postCategories = taxonomies
  .filter((t) => t.taxonomy === 'category')
  .map((t) => {
    const byTerm = new Map(taxonomies.filter((x) => x.taxonomy === 'category').map((x) => [x.termId, x]));
    return termRecord(t, categoryPath(byTerm, t));
  });

const productTags = taxonomies
  .filter((t) => t.taxonomy === 'product_tag' && t.count > 0)
  .map((t) => termRecord(t, `/product-tag/${t.slug}/`));

const imageSet = new Set();
function collectImages(html, image) {
  if (image && image.startsWith('/wp-content/uploads/')) imageSet.add(image);
  if (!html) return;
  for (const match of html.matchAll(/\/wp-content\/uploads\/[^"')\s]+/g)) imageSet.add(match[0]);
}
for (const item of [...pages, ...products, ...articles, ...productCategories, ...postCategories]) {
  collectImages(item.html, item.image);
}

let copied = 0;
let missing = 0;
for (const rel of imageSet) {
  const src = path.join(WP_ROOT, rel.replace(/^\//, '').replace(/\//g, path.sep));
  const dest = path.join(PUBLIC_DIR, rel.replace(/^\//, '').replace(/\//g, path.sep));
  if (!fs.existsSync(src)) {
    missing++;
    continue;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (!fs.existsSync(dest)) fs.copyFileSync(src, dest);
  copied++;
}

const logoSrc = path.join(WP_ROOT, 'wp-content', 'themes', 'WPPOP', 'images', 'logo.png');
const logoDest = path.join(PUBLIC_DIR, 'brand', 'logo.png');
if (fs.existsSync(logoSrc)) {
  fs.mkdirSync(path.dirname(logoDest), { recursive: true });
  fs.copyFileSync(logoSrc, logoDest);
}

const paths = new Map();
function claim(item) {
  if (!item.path || item.path === '//') return;
  if (!paths.has(item.path)) paths.set(item.path, []);
  paths.get(item.path).push(`${item.kind}:${item.slug}`);
}
for (const item of [...pages, ...products, ...articles, ...productCategories, ...postCategories, ...productTags]) claim(item);
const collisions = [...paths.entries()].filter(([, owners]) => owners.length > 1);

const catalog = {
  generatedAt: new Date().toISOString(),
  site: {
    name: siteName,
    legalName: "Xi'an Sheerherb Biological Technology Co., Ltd.",
    url: siteUrl,
    tagline,
    email: 'sales@example.com',
    phone: '+86 000 0000 0000',
    phoneHref: 'tel:+86 000 0000 0000',
    whatsapp: '+86 000 0000 0000',
    whatsappDisplay: '+86 000 0000 0000',
    address: "Room 1204, Vanke Huizhi Center, Yanta District, Xi'an, Shaanxi, China",
    frontId: Number(frontId),
    languages,
    productBase,
    removeProductCategoryBase: removeCat,
    permalink: options.get('permalink_structure') || '/%postname%/',
  },
  pages,
  products,
  posts: articles,
  productCategories,
  postCategories,
  productTags,
  rankPaths: rankPages.map((r) => r.page).filter(Boolean),
  stats: {
    pages: pages.length,
    products: products.length,
    posts: articles.length,
    productCategories: productCategories.length,
    postCategories: postCategories.length,
    productTags: productTags.length,
    imagesCopied: copied,
    imagesMissing: missing,
    collisions,
  },
};

fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
fs.writeFileSync(OUT_PATH, JSON.stringify(catalog));
const size = fs.statSync(OUT_PATH).size;
console.log(JSON.stringify({ ...catalog.stats, catalogMB: (size / 1024 / 1024).toFixed(2), rankPaths: catalog.rankPaths.length }, null, 2));
console.log('Sample paths:');
for (const item of [...pages, ...products, ...articles, ...productCategories].slice(0, 0)) void item;
console.log('PAGES', pages.map((p) => p.path).join('\n'));
console.log('---CATS', productCategories.map((p) => `${p.path} (${p.count})`).join('\n'));
console.log('---POSTS', articles.map((p) => p.path).join('\n'));
console.log('---COLLISIONS', JSON.stringify(collisions, null, 2));
