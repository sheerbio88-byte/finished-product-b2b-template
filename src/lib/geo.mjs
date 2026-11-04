const EMPTY = { ip_address: null, country: null, country_code: null, region: null };

async function fetchJson(url) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 2500);
  try {
    const res = await fetch(url, { signal: controller.signal, credentials: 'omit' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}

function pack(data) {
  if (!data || data.success === false) return null;
  const region = [data.region, data.city].filter((part) => part && String(part).trim()).join(' · ');
  return {
    ip_address: data.ip?.trim() || null,
    country: data.country?.trim() || null,
    country_code: data.country_code?.trim()?.toUpperCase() || null,
    region: region || null,
  };
}

export async function resolveClientGeo() {
  if (typeof window === 'undefined') return EMPTY;
  const primary = pack(await fetchJson('https://ipwho.is/'));
  if (primary?.country || primary?.ip_address) return primary;
  const backup = pack(await fetchJson('https://get.geojs.io/v1/ip/geo.json'));
  return backup || EMPTY;
}
