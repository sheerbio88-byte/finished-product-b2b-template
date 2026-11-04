import fs from 'node:fs';

const sql = fs.readFileSync('C:/Users/Administrator/Downloads/dbpjbpepourcrd.sql', 'utf8');
const catalog = JSON.parse(fs.readFileSync('src/data/catalog.json', 'utf8'));

const byId = new Map();
for (const item of [...catalog.pages, ...catalog.products, ...catalog.posts]) byId.set(String(item.id), item);

const needle = "'_wp_old_slug', '";
let idx = 0;
const redirects = [];
while ((idx = sql.indexOf(needle, idx)) !== -1) {
  const start = idx + needle.length;
  const end = sql.indexOf("'", start);
  const slug = sql.slice(start, end);
  const before = sql.slice(Math.max(0, idx - 40), idx);
  const idMatch = before.match(/\((\d+),\s*(\d+),\s*$/);
  const postId = idMatch?.[2];
  const item = postId ? byId.get(postId) : null;
  redirects.push({ postId, slug, path: item?.path || null, kind: item?.kind || null, title: item?.title || null });
  idx = end + 1;
}

const missingTargets = redirects.filter((r) => !r.path);
console.log('old slugs', redirects.length, 'without current path', missingTargets.length);
console.log(redirects.filter((r) => r.path).map((r) => `${r.kind} /${r.slug}/ -> ${r.path}`).join('\n'));
console.log('--- missing targets');
console.log(missingTargets.map((r) => `${r.postId} ${r.slug}`).join('\n'));

for (const slug of ['liposomes-technology', 'liposome-encapsulation']) {
  const at = sql.indexOf(`'${slug}'`);
  console.log('\nSLUG', slug, at);
  if (at > 0) console.log(sql.slice(at - 120, at + 80).replaceAll('\n', ' '));
}
