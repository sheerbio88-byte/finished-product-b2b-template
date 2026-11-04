import fs from 'node:fs';
import path from 'node:path';

const dist = path.resolve('dist');
const catalog = JSON.parse(fs.readFileSync('src/data/catalog.json', 'utf8'));
const redirects = JSON.parse(fs.readFileSync('src/data/redirects.json', 'utf8'));
const failures = [];

function fileFor(urlPath) {
  const clean = urlPath.replace(/^\/|\/$/g, '');
  return clean ? path.join(dist, clean, 'index.html') : path.join(dist, 'index.html');
}

function check(urlPath, label) {
  if (!fs.existsSync(fileFor(urlPath))) failures.push(`missing ${label}: ${urlPath}`);
}

for (const list of [catalog.pages, catalog.products, catalog.posts, catalog.productCategories, catalog.postCategories, catalog.productTags]) {
  for (const item of list) check(item.path, item.kind);
}
check('/product/', 'archive');
check('/liposomes-technology/', 'restored');
check('/', 'home');

for (const item of redirects) {
  if (/\.xml\/?$/i.test(item.from)) continue;
  check(item.from, 'redirect');
  check(`/de${item.from === '/' ? '/' : item.from}`, 'de-redirect');
}

const home = fs.readFileSync(fileFor('/'), 'utf8');
const product = fs.readFileSync(fileFor('/product/nmn-capsules/'), 'utf8');
const german = fs.readFileSync(fileFor('/de/'), 'utf8');
if (!home.includes('<h1>')) failures.push('home missing h1');
if (!home.includes('rel="canonical" href="https://sheerherb-oem.com/"')) failures.push('home canonical');
if (!home.includes('hreflang="de"')) failures.push('home hreflang');
if (!home.includes('application/ld+json')) failures.push('home schema');
if (!home.includes('FAQPage')) failures.push('home faq schema');
if (/POP\.COM/i.test(home)) failures.push('demo logo leaked');
if (!product.includes('"@type":"Product"') && !product.includes('"@type": "Product"')) failures.push('product schema');
if (!german.includes('hreflang="zh-Hans"') && !german.includes('hreflang="zh"')) failures.push('german hreflang');
if (!german.includes('Hersteller') && !german.includes('Eigenmarken')) failures.push('german hero not translated');
if (home.includes('href="/contact-us/"') || home.includes('href="/contact-us"')) failures.push('home still links contact-us');

const title = home.match(/<title>([^<]+)<\/title>/)?.[1] || '';
if (title.length < 20 || title.length > 70) failures.push(`home title length ${title.length}: ${title}`);
const desc = home.match(/name="description" content="([^"]+)"/)?.[1] || '';
if (desc.length < 80 || desc.length > 180) failures.push(`home description length ${desc.length}`);

console.log(failures.length ? failures.join('\n') : 'audit ok');
process.exit(failures.length ? 1 : 0);
