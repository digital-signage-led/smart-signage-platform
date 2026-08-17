/** 本番 HTML（scene3 / t3lang）と同じ言語キー */
export type MultilangLangId = 'jp' | 'en' | 'id' | 'fil' | 'vn';

export const ALL_MULTILANG_LANGS: MultilangLangId[] = ['jp', 'en', 'id', 'fil', 'vn'];

export const MULTILANG_LANG_LABELS_JA: Record<MultilangLangId, string> = {
  jp: '日本語',
  en: '英語',
  id: 'インドネシア語',
  fil: 'フィリピン語',
  vn: 'ベトナム語',
};

export const MULTILANG_LANG_OPTIONS: { id: MultilangLangId; label: string }[] = [
  { id: 'jp', label: MULTILANG_LANG_LABELS_JA.jp },
  { id: 'en', label: MULTILANG_LANG_LABELS_JA.en },
  { id: 'id', label: MULTILANG_LANG_LABELS_JA.id },
  { id: 'fil', label: MULTILANG_LANG_LABELS_JA.fil },
  { id: 'vn', label: MULTILANG_LANG_LABELS_JA.vn },
];

export function normalizeMultilangLangs(langs?: MultilangLangId[] | null): MultilangLangId[] {
  if (!langs?.length) return [...ALL_MULTILANG_LANGS];
  const valid = langs.filter((id): id is MultilangLangId => ALL_MULTILANG_LANGS.includes(id));
  return valid.length ? valid : [...ALL_MULTILANG_LANGS];
}

export function toggleMultilangLangInList(
  langs: MultilangLangId[],
  lang: MultilangLangId,
): MultilangLangId[] {
  const has = langs.includes(lang);
  if (has && langs.length <= 1) return langs;
  if (has) return langs.filter((l) => l !== lang);
  const next = [...langs, lang];
  return ALL_MULTILANG_LANGS.filter((id) => next.includes(id));
}
