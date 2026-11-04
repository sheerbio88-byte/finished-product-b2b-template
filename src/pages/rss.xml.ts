import type { APIRoute } from 'astro';
import { absoluteUrl, posts, site } from '~/lib/site';

export const GET: APIRoute = () => {
  const items = posts
    .map(
      (post) => `<item>
        <title><![CDATA[${post.title}]]></title>
        <link>${absoluteUrl(post.path)}</link>
        <guid>${absoluteUrl(post.path)}</guid>
        <pubDate>${new Date(post.date || '2024-01-01').toUTCString()}</pubDate>
        <description><![CDATA[${post.excerpt || ''}]]></description>
      </item>`,
    )
    .join('');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${site.legalName}</title>
    <link>${absoluteUrl('/')}</link>
    <description>${site.tagline}</description>
    ${items}
  </channel>
</rss>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
};
