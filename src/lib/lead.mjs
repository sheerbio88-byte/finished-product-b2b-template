/** First-touch store. Keep in sync with LeadCapture.astro. */
export const LEAD_ATTR_STORAGE_KEY = 'aw_lead_attribution';
export const LEAD_ATTR_TTL_MS = 90 * 24 * 60 * 60 * 1000;

const PAID_MEDIUMS = new Set(['cpc', 'ppc', 'paid', 'paidsearch', 'display', 'ads', 'ad', 'cpm', 'cpa']);
const CHATGPT_HOSTS = ['chatgpt.com', 'openai.com', 'perplexity.ai'];
const OTHER_AI_HOSTS = [
  'claude.ai', 'anthropic.com', 'gemini.google.com', 'bard.google.com',
  'copilot.microsoft.com', 'copilot.bing.com', 'grok.com', 'x.ai',
  'deepseek.com', 'kimi.com', 'moonshot.cn', 'you.com', 'phind.com',
  'meta.ai', 'poe.com', 'mistral.ai', 'character.ai',
];
const AI_HOSTS = [...CHATGPT_HOSTS, ...OTHER_AI_HOSTS];
const LEAD_VALUES = new Set([
  'google_organic', 'google_ads', 'chatgpt', 'ai', 'yahoo', 'bing', 'baidu',
  'alibaba', 'facebook', 'linkedin', 'whatsapp', 'email', 'direct', 'other',
]);

function normalize(value) {
  return (value ?? '').trim().toLowerCase();
}

function stripWww(host) {
  return host.replace(/^www\./, '').toLowerCase();
}

export function hostFromUrl(url) {
  if (!url) return null;
  try {
    return stripWww(new URL(url).hostname);
  } catch {
    return null;
  }
}

function hostMatchesDomain(host, domain) {
  const h = stripWww(host);
  const d = stripWww(domain);
  return h === d || h.endsWith(`.${d}`);
}

function isChatGptHost(host) {
  return Boolean(host && CHATGPT_HOSTS.some((domain) => hostMatchesDomain(host, domain)));
}

function isAiHost(host) {
  return Boolean(host && AI_HOSTS.some((domain) => hostMatchesDomain(host, domain)));
}

function isChatGptToken(token) {
  const t = normalize(token);
  return t.includes('chatgpt') || t.includes('openai') || t === 'gpt' || t.includes('perplexity');
}

function isGenericAiToken(token) {
  const t = normalize(token);
  return t === 'ai' || t === 'llm' || t === 'aichat' || t === 'llms_txt' || t === 'llms.txt';
}

function isOtherAiBrandToken(token) {
  const t = normalize(token);
  if (!t) return false;
  return (
    t.includes('claude') || t.includes('anthropic') || t.includes('gemini') ||
    t.includes('bard') || t.includes('copilot') || t.includes('grok') ||
    t.includes('xai') || t.includes('deepseek') || t.includes('kimi') ||
    t.includes('moonshot') || t.includes('tongyi') || t.includes('qwen') ||
    t.includes('phind') || t.includes('poe') || t.includes('mistral')
  );
}

function matchSourceFromToken(token) {
  const t = normalize(token);
  if (!t) return null;
  if (isChatGptToken(t)) return 'chatgpt';
  if (isGenericAiToken(t) || isOtherAiBrandToken(t)) return 'ai';
  if (t.includes('yahoo')) return 'yahoo';
  if (t.includes('bing') || t === 'msn') return 'bing';
  if (t.includes('baidu')) return 'baidu';
  if (t.includes('alibaba') || t.includes('1688') || t.includes('aliexpress')) return 'alibaba';
  if (t.includes('facebook') || t === 'fb' || t.includes('instagram') || t === 'ig' || t === 'meta') return 'facebook';
  if (t.includes('linkedin') || t === 'li') return 'linkedin';
  if (t.includes('whatsapp') || t === 'wa') return 'whatsapp';
  if (t.includes('email') || t === 'newsletter' || t === 'mail') return 'email';
  if (t.includes('google')) return 'google_organic';
  return null;
}

function matchFromReferrerHost(host) {
  if (!host) return null;
  if (isChatGptHost(host)) return 'chatgpt';
  if (isAiHost(host)) return 'ai';
  if (host.includes('google.')) return 'google_organic';
  if (host.includes('yahoo.')) return 'yahoo';
  if (host.includes('bing.') || host === 'bing.com' || host.includes('msn.')) return 'bing';
  if (host.includes('baidu.')) return 'baidu';
  if (host.includes('alibaba.') || host.includes('1688.com') || host.includes('aliexpress.')) return 'alibaba';
  if (host.includes('facebook.') || host.includes('fb.com') || host.includes('instagram.') || host.includes('l.facebook')) return 'facebook';
  if (host.includes('linkedin.') || host.includes('lnkd.in')) return 'linkedin';
  if (host.includes('whatsapp.') || host === 'wa.me') return 'whatsapp';
  return null;
}

export function detectLeadSource(input = {}) {
  const search = input.search ?? '';
  const host = input.host ?? null;
  const rawReferrer = input.referrer ?? null;
  const referrerHost = hostFromUrl(rawReferrer);
  const referrer = referrerHost && host && stripWww(referrerHost) === stripWww(host) ? null : rawReferrer;
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const utmSource = params.get('utm_source');
  const utmMedium = params.get('utm_medium');
  const utmCampaign = params.get('utm_campaign');
  const gclid = params.get('gclid') || params.get('gbraid') || params.get('wbraid');
  const referrer_host = hostFromUrl(referrer);
  const attribution = {
    utm_source: utmSource?.trim() || null,
    utm_medium: utmMedium?.trim() || null,
    utm_campaign: utmCampaign?.trim() || null,
    gclid: gclid?.trim() || null,
    referrer: referrer?.trim() || null,
    referrer_host,
  };
  const medium = normalize(utmMedium);
  const source = normalize(utmSource);
  const campaign = normalize(utmCampaign);
  const genericAi = (isGenericAiToken(source) || isGenericAiToken(medium) || campaign === 'llms_txt') && !isChatGptToken(source);
  const isPaid = Boolean(gclid) || PAID_MEDIUMS.has(medium) || medium.includes('paid') || medium.includes('cpc') || medium.includes('ppc');

  if (gclid || (isPaid && (source.includes('google') || source === 'adwords' || source === 'ads' || !source))) {
    return { lead_source: 'google_ads', attribution };
  }
  if (source && !genericAi) {
    if (source.includes('google') && !isOtherAiBrandToken(source) && !isChatGptToken(source)) {
      return { lead_source: isPaid ? 'google_ads' : 'google_organic', attribution };
    }
    const fromUtm = matchSourceFromToken(source);
    if (fromUtm) return { lead_source: fromUtm, attribution };
  }
  if (genericAi) {
    const fromRef = matchFromReferrerHost(referrer_host);
    if (fromRef) return { lead_source: fromRef, attribution };
    return { lead_source: 'ai', attribution };
  }
  if (medium) {
    if (medium === 'organic' && referrer_host?.includes('google.')) return { lead_source: 'google_organic', attribution };
    const fromMedium = matchSourceFromToken(medium);
    if (fromMedium) return { lead_source: fromMedium, attribution };
  }
  const fromRef = matchFromReferrerHost(referrer_host);
  if (fromRef) return { lead_source: fromRef === 'google_organic' && isPaid ? 'google_ads' : fromRef, attribution };
  if (!referrer_host && !source && !gclid) return { lead_source: 'direct', attribution };
  if (referrer_host) return { lead_source: 'other', attribution };
  return { lead_source: null, attribution };
}

function parseStored(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.v !== 1 || !parsed.first?.captured_at) return null;
    const age = Date.now() - Date.parse(parsed.first.captured_at);
    if (!Number.isFinite(age) || age > LEAD_ATTR_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function readStoredLeadAttribution() {
  if (typeof window === 'undefined') return null;
  try {
    const fromLs = parseStored(localStorage.getItem(LEAD_ATTR_STORAGE_KEY));
    if (fromLs) return fromLs;
  } catch { /* private mode */ }
  try {
    const fromSs = parseStored(sessionStorage.getItem(LEAD_ATTR_STORAGE_KEY));
    if (fromSs) return fromSs;
  } catch { /* ignore */ }
  const parts = document.cookie.split(';');
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.startsWith(`${LEAD_ATTR_STORAGE_KEY}=`)) {
      try {
        return parseStored(decodeURIComponent(trimmed.slice(LEAD_ATTR_STORAGE_KEY.length + 1)));
      } catch {
        return null;
      }
    }
  }
  return null;
}

export function resolveLeadSource() {
  const stored = readStoredLeadAttribution();
  const first = stored?.first;
  const detected = detectLeadSource({
    search: first?.search ?? (typeof window !== 'undefined' ? window.location.search : ''),
    referrer: first ? first.referrer : (typeof document !== 'undefined' ? document.referrer : null),
    host: typeof window !== 'undefined' ? window.location.hostname : null,
  });
  if (!LEAD_VALUES.has(detected.lead_source)) detected.lead_source = 'other';
  detected.attribution.landing_page = first?.landing_page || (typeof window !== 'undefined' ? window.location.href : null);
  detected.attribution.first_captured_at = first?.captured_at || null;
  if (stored?.last) {
    detected.attribution.last_landing_page = stored.last.landing_page;
    detected.attribution.last_search = stored.last.search;
  }
  return detected;
}
