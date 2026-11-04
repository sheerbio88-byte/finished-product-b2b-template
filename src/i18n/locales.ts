export interface Locale {
  code: string;
  htmlLang: string;
  dir: 'ltr' | 'rtl';
  label: string;
}

export const LOCALES: Locale[] = [
  { code: 'en', htmlLang: 'en', dir: 'ltr', label: 'English' },
  { code: 'de', htmlLang: 'de', dir: 'ltr', label: 'Deutsch' },
  { code: 'ru', htmlLang: 'ru', dir: 'ltr', label: 'Русский' },
  { code: 'fr', htmlLang: 'fr', dir: 'ltr', label: 'Français' },
  { code: 'ar', htmlLang: 'ar', dir: 'rtl', label: 'العربية' },
  { code: 'es', htmlLang: 'es', dir: 'ltr', label: 'Español' },
  { code: 'ja', htmlLang: 'ja', dir: 'ltr', label: '日本語' },
  { code: 'ko', htmlLang: 'ko', dir: 'ltr', label: '한국어' },
  { code: 'it', htmlLang: 'it', dir: 'ltr', label: 'Italiano' },
  { code: 'vi', htmlLang: 'vi', dir: 'ltr', label: 'Tiếng Việt' },
  { code: 'nl', htmlLang: 'nl', dir: 'ltr', label: 'Nederlands' },
  { code: 'et', htmlLang: 'et', dir: 'ltr', label: 'Eesti' },
  { code: 'pt', htmlLang: 'pt', dir: 'ltr', label: 'Português' },
  { code: 'hy', htmlLang: 'hy', dir: 'ltr', label: 'Հայերեն' },
  { code: 'th', htmlLang: 'th', dir: 'ltr', label: 'ไทย' },
  { code: 'sv', htmlLang: 'sv', dir: 'ltr', label: 'Svenska' },
  { code: 'pl', htmlLang: 'pl', dir: 'ltr', label: 'Polski' },
  { code: 'zh', htmlLang: 'zh-Hans', dir: 'ltr', label: '中文' },
  { code: 'be', htmlLang: 'be', dir: 'ltr', label: 'Беларуская' },
  { code: 'hr', htmlLang: 'hr', dir: 'ltr', label: 'Hrvatski' },
  { code: 'cs', htmlLang: 'cs', dir: 'ltr', label: 'Čeština' },
  { code: 'da', htmlLang: 'da', dir: 'ltr', label: 'Dansk' },
  { code: 'bg', htmlLang: 'bg', dir: 'ltr', label: 'Български' },
  { code: 'fi', htmlLang: 'fi', dir: 'ltr', label: 'Suomi' },
  { code: 'ms', htmlLang: 'ms', dir: 'ltr', label: 'Bahasa Melayu' },
  { code: 'ka', htmlLang: 'ka', dir: 'ltr', label: 'ქართული' },
  { code: 'el', htmlLang: 'el', dir: 'ltr', label: 'Ελληνικά' },
  { code: 'he', htmlLang: 'he', dir: 'rtl', label: 'עברית' },
  { code: 'hu', htmlLang: 'hu', dir: 'ltr', label: 'Magyar' },
  { code: 'id', htmlLang: 'id', dir: 'ltr', label: 'Bahasa Indonesia' },
  { code: 'ga', htmlLang: 'ga', dir: 'ltr', label: 'Gaeilge' },
  { code: 'lv', htmlLang: 'lv', dir: 'ltr', label: 'Latviešu' },
  { code: 'no', htmlLang: 'nb', dir: 'ltr', label: 'Norsk' },
  { code: 'sr', htmlLang: 'sr', dir: 'ltr', label: 'Srpski' },
  { code: 'sk', htmlLang: 'sk', dir: 'ltr', label: 'Slovenčina' },
  { code: 'sl', htmlLang: 'sl', dir: 'ltr', label: 'Slovenščina' },
  { code: 'tr', htmlLang: 'tr', dir: 'ltr', label: 'Türkçe' },
];

export const LOCALE_CODES = LOCALES.map((locale) => locale.code);

const byCode = new Map(LOCALES.map((locale) => [locale.code, locale]));

export function getLocale(code: string | undefined): Locale {
  return byCode.get(code || 'en') || LOCALES[0];
}

export function localizePath(englishPath: string, lang: string): string {
  const path = englishPath.startsWith('/') ? englishPath : `/${englishPath}`;
  if (!lang || lang === 'en') return path;
  if (path === '/') return `/${lang}/`;
  return `/${lang}${path}`;
}
