import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import redirects from './src/data/redirects.json';
import { LOCALE_CODES, localizePath } from './src/i18n/locales';

const redirectPaths = new Set<string>();
for (const item of redirects as Array<{ from: string; to: string }>) {
  if (/\.xml\/?$/i.test(item.from)) continue;
  for (const lang of LOCALE_CODES) {
    redirectPaths.add(localizePath(item.from, lang));
  }
}

export default defineConfig({
  site: 'https://sheerherb-oem.com',
  trailingSlash: 'always',
  integrations: [
    sitemap({
      filter: (page) => {
        const pathname = new URL(page).pathname;
        if (pathname === '/landing' || pathname.startsWith('/landing/')) return false;
        // Only the localized home pages are real translations; other /<lang>/
        // copies canonicalize to English and stay out of the sitemap.
        const parts = pathname.split('/').filter(Boolean);
        if (parts.length > 1 && parts[0] !== 'en' && LOCALE_CODES.includes(parts[0])) return false;
        return !redirectPaths.has(pathname);
      },
      serialize: (item) => {
        if (!item.url.endsWith('/')) item.url += '/';
        return item;
      },
    }),
  ],
});
