/**
 * 気象庁「新たな防災気象情報」（令和8年5月29日運用開始）
 * 4列 × レベル2〜5（情報名はレベル数字付き公式名の短縮表示）
 * 更新: 2026-08-12
 * 出典: https://www.jma.go.jp/jma/kishou/know/bosai/keiho-update2026/
 */

export const ALERT_LEVEL_SCENE_IDS = [
  'rain_warn',
  'landslide_info',
  'flood_info',
  'surge_info',
] as const;

export type AlertLevelSceneId = (typeof ALERT_LEVEL_SCENE_IDS)[number];

/** 警戒レベル番号（2〜5）。プレビュー・表示用 */
export type AlertLevelNum = 2 | 3 | 4 | 5;

/** エンジン ?rainwarn= 値 */
export type RainWarnLevelKey = 'advisory' | 'warning' | 'danger' | 'special';

export const ALERT_LEVEL_NUMS: readonly AlertLevelNum[] = [2, 3, 4, 5];

/** 気象庁凡例色（レベル5→2） */
export const ALERT_LEVEL_COLORS: Record<AlertLevelNum, string> = {
  5: '#000000',
  4: '#AB00AA',
  3: '#FA2900',
  2: '#F2E700',
};

export const ALERT_LEVEL_TO_RAINWARN: Record<AlertLevelNum, RainWarnLevelKey> = {
  2: 'advisory',
  3: 'warning',
  4: 'danger',
  5: 'special',
};

export const ALERT_COLUMN_WARNTYPE: Record<AlertLevelSceneId, string> = {
  rain_warn: 'rain',
  landslide_info: 'landslide',
  flood_info: 'flood',
  surge_info: 'surge',
};

export const ALERT_COLUMN_LABEL: Record<AlertLevelSceneId, string> = {
  rain_warn: '大雨',
  landslide_info: '土砂災害',
  flood_info: '氾濫',
  surge_info: '高潮',
};

/**
 * 列×レベルごとの表示名（中央帯）。
 * 上帯は「警戒レベルN」＋本名称。公式発表名は「レベルN＋本名称」。
 */
export const ALERT_COLUMN_TITLES: Record<AlertLevelSceneId, Record<AlertLevelNum, string>> = {
  rain_warn: {
    2: '大雨注意報',
    3: '大雨警報',
    4: '大雨危険警報',
    5: '大雨特別警報',
  },
  landslide_info: {
    2: '土砂災害注意報',
    3: '土砂災害警報',
    4: '土砂災害危険警報',
    5: '土砂災害特別警報',
  },
  flood_info: {
    2: '氾濫注意報',
    3: '氾濫警報',
    4: '氾濫危険警報',
    5: '氾濫特別警報',
  },
  surge_info: {
    2: '高潮注意報',
    3: '高潮警報',
    4: '高潮危険警報',
    5: '高潮特別警報',
  },
};

/** 公式発表名（レベル数字付き） */
export function alertOfficialName(sceneId: AlertLevelSceneId, level: AlertLevelNum): string {
  return `レベル${level}${ALERT_COLUMN_TITLES[sceneId][level]}`;
}

export function isAlertLevelSceneId(id: string): id is AlertLevelSceneId {
  return (ALERT_LEVEL_SCENE_IDS as readonly string[]).includes(id);
}

/** チップ／プレビュー既定: 大雨は L3、他列は L4（発表例として多い段階） */
export function defaultAlertLevelForScene(sceneId: AlertLevelSceneId): AlertLevelNum {
  return sceneId === 'rain_warn' ? 3 : 4;
}

export function alertLevelChipLabel(n: AlertLevelNum): string {
  return `警戒レベル${n}`;
}

export function alertLevelChipFg(n: AlertLevelNum): string {
  return n === 2 ? '#1a1a1a' : '#ffffff';
}
