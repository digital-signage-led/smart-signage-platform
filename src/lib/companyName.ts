import type { CorpTitlePos } from '../types';

const CORP_KINDS = ['\u682a\u5f0f\u4f1a\u793e', '\u6709\u9650\u4f1a\u793e', '\u5408\u540c\u4f1a\u793e'] as const;

function corpKindOf(name: string): (typeof CORP_KINDS)[number] {
  const found = CORP_KINDS.find((k) => name.startsWith(k) || name.endsWith(k));
  return found ?? '\u682a\u5f0f\u4f1a\u793e';
}

function coreCompanyName(name: string): string {
  let core = name.trim();
  for (const k of CORP_KINDS) {
    if (core.startsWith(k)) core = core.slice(k.length);
    if (core.endsWith(k)) core = core.slice(0, -k.length);
  }
  return core.trim();
}

/** 入力から前株・後株・なしを判定 */
export function detectCorpTitlePos(name: string): CorpTitlePos {
  const raw = name.trim();
  for (const k of CORP_KINDS) {
    if (raw.startsWith(k)) return 'prefix';
    if (raw.endsWith(k)) return 'suffix';
  }
  return 'none';
}

/** 会社名を前株 / 後株 / なしで整形（入力に株が付いていても付け直す） */
export function formatLegalCompanyName(name: string, pos: CorpTitlePos = 'none'): string {
  const raw = name.trim();
  if (!raw) return '';
  const core = coreCompanyName(raw);
  if (!core) return raw;
  const kind = corpKindOf(raw);
  if (pos === 'prefix') return `${kind}${core}`;
  if (pos === 'suffix') return `${core}${kind}`;
  return core;
}
