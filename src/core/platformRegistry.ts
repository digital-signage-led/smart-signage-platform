/**
 * v3.0 — 6つのアップデート対象（完全独立・個別ロールバック）
 * 管理アプリはここを参照して「何がどの版か」を表示する。
 */

export type PlatformTargetId = 'system' | 'engine' | 'adapter' | 'jma' | 'layout' | 'monitor';

export interface PlatformTarget {
  id: PlatformTargetId;
  /** Unicode escape ラベル（i18n 未整備分） */
  label: string;
  current: string;
  next?: string;
  updateMethod: string;
  impactScope: string;
}

/** Google Sheets 台帳と同期する想定の現行版 */
export const PLATFORM_TARGETS: PlatformTarget[] = [
  {
    id: 'system',
    label: '\u2460 \u5168\u4f53\u30b7\u30b9\u30c6\u30e0',
    current: 'sys-3.0',
    next: 'sys-3.1',
    updateMethod: '\u7ba1\u7406\u30a2\u30d7\u30ea\u518d\u30c7\u30d7\u30ed\u30a4',
    impactScope: '\u793e\u5185\u306e\u307f\uff08\u73fe\u5834\u7121\u5f71\u97ff\uff09',
  },
  {
    id: 'engine',
    label: '\u2461 WBGT\u30a8\u30f3\u30b8\u30f3',
    current: 'engine-2.1.0',
    next: 'engine-2.2.0',
    updateMethod: 'GitHub push + ?v= / config modules',
    impactScope: '\u30d0\u30fc\u30b8\u30e7\u30f3\u56fa\u5b9a\u3067\u500b\u5225',
  },
  {
    id: 'adapter',
    label: '\u2462 \u8a08\u6e2c\u6a5f\u5668\u9023\u643a',
    current: 'adapter-1.4',
    next: 'adapter-1.5',
    updateMethod: 'GAS \u30a2\u30c0\u30d7\u30bf\u30fc / config',
    impactScope: '\u8a72\u5f53\u6a5f\u5668\u306e\u307f',
  },
  {
    id: 'jma',
    label: '\u2463 \u6c17\u8c61\u5e81\u30fb\u74b0\u5883\u7701',
    current: 'jma-2.0',
    next: 'jma-2.1',
    updateMethod: 'GAS \u53d6\u5f97\u30ed\u30b8\u30c3\u30af',
    impactScope: '\u5168\u73fe\u5834\uff08\u6a19\u6e96\u6a5f\u80fd\uff09',
  },
  {
    id: 'layout',
    label: '\u2464 \u89e3\u50cf\u5ea6\u30fb\u9762\u6570',
    current: 'res-1.2',
    updateMethod: '\u53f0\u5e33\u66f4\u65b0\u306e\u307f',
    impactScope: '\u30c7\u30fc\u30bf\u306e\u307f',
  },
  {
    id: 'monitor',
    label: '\u2465 \u30ec\u30fc\u30c0\u30fc\u30fb\u901a\u77e5',
    current: 'mon-1.1',
    next: 'mon-1.2',
    updateMethod: 'GAS \u30ec\u30fc\u30c0\u30fc\u95a2\u6570',
    impactScope: '\u30ec\u30fc\u30c0\u30fc\u306e\u307f\uff08\u8868\u793a\u7121\u5f71\u97ff\uff09',
  },
];

export function getPlatformTarget(id: PlatformTargetId): PlatformTarget | undefined {
  return PLATFORM_TARGETS.find((t) => t.id === id);
}
