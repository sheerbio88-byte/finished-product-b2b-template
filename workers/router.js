/**
 * Static assets + legacy redirect map (Workers static _redirects max 2000).
 * Map is generated into workers/redirects.json by scripts/postbuild.mjs.
 */
import redirects from './redirects.json';

const APEX = 'sheerherb-oem.com';

function withSlash(pathname) {
  if (pathname === '/') return pathname;
  if (pathname.endsWith('/')) return pathname;
  const leaf = pathname.split('/').pop() || '';
  if (/\.[a-z0-9]{1,8}$/i.test(leaf)) return pathname;
  return `${pathname}/`;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const host = url.hostname.toLowerCase();

    // Prefer apex; www custom domain may also be attached — redirect www→apex.
    if (host === `www.${APEX}`) {
      url.hostname = APEX;
      return Response.redirect(url.toString(), 301);
    }

    const path = withSlash(url.pathname);
    const hit = redirects[path] || redirects[url.pathname];
    if (hit && hit !== path && hit !== url.pathname) {
      url.pathname = hit;
      return Response.redirect(url.toString(), 301);
    }

    if (url.pathname !== path) {
      url.pathname = path;
      return Response.redirect(url.toString(), 308);
    }

    return env.ASSETS.fetch(request);
  },
};
