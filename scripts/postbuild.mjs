import fs from 'node:fs';
import path from 'node:path';

const dist = path.resolve('dist');
const ORIGIN = 'https://sheerherb-oem.com';

// Sitemap check: keep only URLs built as real pages that are indexable,
// self-canonical on the apex host, and not redirect stubs.
function pageOk(loc) {
  if (!loc.startsWith(`${ORIGIN}/`)) return false;
  let rel = loc.slice(ORIGIN.length).replace(/^\//, '');
  try {
    rel = decodeURIComponent(rel);
  } catch {
    /* keep */
  }
  const file = path.join(dist, rel, 'index.html');
  if (!fs.existsSync(file)) return false;
  const html = fs.readFileSync(file, 'utf8');
  if (/http-equiv="refresh"/i.test(html)) return false;
  if (/<meta name="robots" content="[^"]*noindex/i.test(html)) return false;
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1] ?? '';
  return canonical === loc;
}
for (const name of fs.readdirSync(dist).filter((file) => /^sitemap-\d+\.xml$/.test(file))) {
  const file = path.join(dist, name);
  const xml = fs.readFileSync(file, 'utf8');
  let kept = 0;
  let dropped = 0;
  const out = xml.replace(/<url>[\s\S]*?<\/url>/g, (block) => {
    const loc = (block.match(/<loc>([^<]+)<\/loc>/)?.[1] ?? '').replace(/&amp;/g, '&');
    if (pageOk(loc)) {
      kept += 1;
      return block;
    }
    dropped += 1;
    return '';
  });
  fs.writeFileSync(file, out);
  console.log(`${name}: ${kept} kept, ${dropped} dropped`);
}

const index = path.join(dist, 'sitemap-index.xml');
if (fs.existsSync(index)) {
  fs.copyFileSync(index, path.join(dist, 'sitemap.xml'));
  fs.copyFileSync(index, path.join(dist, 'sitemap_index.xml'));
  fs.copyFileSync(index, path.join(dist, 'wp-sitemap.xml'));
}

const feed = path.join(dist, 'rss.xml');
const feedDir = path.join(dist, 'feed');
if (fs.existsSync(feed)) {
  fs.mkdirSync(feedDir, { recursive: true });
  fs.copyFileSync(feed, path.join(feedDir, 'index.xml'));
}

const required = [
  'index.html',
  'private-label-supplements/index.html',
  'product/nmn-capsules/index.html',
  'product-category/liposomal-supplement/index.html',
  'liposomes-technology/index.html',
  'de/index.html',
  'de/private-label-supplements/index.html',
  'zh/index.html',
  'pt/product/index.html',
];
const missing = required.filter((file) => !fs.existsSync(path.join(dist, file)));
console.log(missing.length ? `postbuild missing:\n${missing.join('\n')}` : 'postbuild aliases written');

// Workers static assets reject >2000 _redirects rules. Expand into a Worker map.
const redirectsData = JSON.parse(fs.readFileSync('src/data/redirects.json', 'utf8'));
const catalog = JSON.parse(fs.readFileSync('src/data/catalog.json', 'utf8'));
const langs = (catalog.site?.languages || []).filter((lang) => lang !== 'en');
const map = Object.create(null);
function put(from, to) {
  if (!from || !to || from === to) return;
  map[from] = to;
}
for (const item of redirectsData) {
  put(item.from, item.to);
  if (/\.xml$/i.test(item.from)) {
    put(`${item.from}/`, item.to);
    for (const lang of langs) put(`/${lang}${item.from}`, item.to);
    continue;
  }
  for (const lang of langs) {
    const from = `/${lang}${item.from}`;
    const to = item.to === '/' ? `/${lang}/` : `/${lang}${item.to}`;
    put(from, to);
  }
}
put('/feed/', '/rss.xml');
put('/feed', '/rss.xml');
put('/comments/feed/', '/rss.xml');
for (const lang of langs) {
  put(`/${lang}/feed/`, '/rss.xml');
  put(`/${lang}/comments/feed/`, '/rss.xml');
}
const workersDir = path.resolve('workers');
fs.mkdirSync(workersDir, { recursive: true });
fs.writeFileSync(path.join(workersDir, 'redirects.json'), `${JSON.stringify(map)}\n`);
// Do not ship Netlify-style _redirects to Workers (rule cap 2000).
const redirectsFile = path.join(dist, '_redirects');
if (fs.existsSync(redirectsFile)) fs.unlinkSync(redirectsFile);
console.log(`worker redirects ${Object.keys(map).length}; removed dist/_redirects`);
