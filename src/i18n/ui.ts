import { categoryNames } from './category-names';
import type { Chrome } from './chrome';
import { extraCentral } from './extra-central';
import { extraEuAsia } from './extra-eu-asia';
import { extraFull } from './extra-full';
import { extraRest } from './extra-rest';

export const extra: Record<string, Partial<Chrome>> = {
  ...extraFull,
  ...extraEuAsia,
  ...extraCentral,
  ...extraRest,
};

export function categoryLabel(slug: string, lang: string, fallback: string): string {
  return categoryNames[lang]?.[slug] || fallback;
}

export const toTopLabels: Record<string, string> = {
  de: 'Nach oben',
  ru: 'Наверх',
  fr: 'Haut de page',
  ar: 'إلى الأعلى',
  es: 'Arriba',
  ja: 'ページ上部',
  ko: '맨 위로',
  it: 'Torna su',
  vi: 'Lên đầu trang',
  nl: 'Naar boven',
  et: 'Üles',
  pt: 'Topo',
  hy: 'Վերև',
  th: 'ขึ้นบนสุด',
  sv: 'Till toppen',
  pl: 'Do góry',
  zh: '回到顶部',
  be: 'Уверх',
  hr: 'Na vrh',
  cs: 'Nahoru',
  da: 'Til toppen',
  bg: 'Нагоре',
  fi: 'Alkuun',
  ms: 'Ke atas',
  ka: 'ზემოთ',
  el: 'Πάνω',
  he: 'לראש העמוד',
  hu: 'Az oldal tetejére',
  id: 'Ke atas',
  ga: 'Barr an leathanaigh',
  lv: 'Uz augšu',
  no: 'Til toppen',
  sr: 'Na vrh',
  sk: 'Nahor',
  sl: 'Na vrh',
  tr: 'Yukarı',
};
