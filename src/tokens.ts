/** Smart Signage ロゴ由来のブランドカラー（RGB） */
export const brand = {
  /** アイコン背景ブルー — rgb(26, 140, 255) */
  blue: { hex: '#1A8CFF', rgb: '26, 140, 255' },
  /** グリッド・見出し白 — rgb(255, 255, 255) */
  white: { hex: '#FFFFFF', rgb: '255, 255, 255' },
  /** 背景黒 — rgb(0, 0, 0) */
  black: { hex: '#000000', rgb: '0, 0, 0' },
  /** サブテキスト灰 — rgb(142, 142, 147) */
  grey: { hex: '#8E8E93', rgb: '142, 142, 147' },
  /** ロゴ内グリッド — R / G / B（青背景上の B は濃い青） */
  grid: {
    red: { hex: '#FF453B', rgb: '255, 69, 59' },
    green: { hex: '#30D158', rgb: '48, 209, 88' },
    blue: { hex: '#1A8CFF', rgb: '26, 140, 255' },
    blueTile: { hex: '#004AB5', rgb: '0, 74, 181' },
  },
} as const;

export const tokens = {
  bg: { base: brand.black.hex, sidebar: '#0B0B0D', s1: '#141416', s2: '#0F0F11', s3: '#161618' },
  text: {
    primary: '#F5F5F7',
    secondary: '#C7C7CC',
    tertiary: '#98989D',
    muted: brand.grey.hex,
    faint: '#6E6E73',
  },
  border: 'rgba(255,255,255,0.07)',
  accent: brand.blue.hex,
  status: { ok: '#30D158', warn: '#FFD60A', repair: '#FF9F0A', down: '#FF453B', spare: brand.grey.hex },
} as const;

export const STATUS_MAP = {
  ok: ['正常', tokens.status.ok] as const,
  warn: ['警告', tokens.status.warn] as const,
  down: ['異常', tokens.status.down] as const,
  repair: ['修理中', tokens.status.repair] as const,
  spare: ['予備', tokens.status.spare] as const,
  new: ['新規', '#64D2FF'] as const,
  off: ['オフシーズン', tokens.status.spare] as const,
  fault: ['故障', tokens.status.down] as const,
};

export const mono = "'SF Mono', ui-monospace, Menlo, monospace";
export const font = "'Noto Sans JP', -apple-system, BlinkMacSystemFont, 'Hiragino Sans', system-ui, sans-serif";

/** rgba(brand.blue, α) */
export function brandBlueAlpha(alpha: number): string {
  return `rgba(${brand.blue.rgb}, ${alpha})`;
}
