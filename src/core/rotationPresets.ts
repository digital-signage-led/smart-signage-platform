/**
 * v3.0 ローテーション標準仕様 — ⑤解像度とは独立・個別更新可能（rot-x.x）
 * サイネージ config.rotation にそのまま出力する。
 */

export const ROTATION_MODULE_VERSION = 'rot-1.0';

export type RotationPresetId = 'standard' | 'danger' | 'offseason';

export interface RotationStep {
  scene: string;
  sec: number;
}

export interface RotationScroll {
  speed_px_per_sec: number;
  /** true: 全文流れ切るまで sec より優先 */
  until_complete: boolean;
}

export interface RotationAutoRules {
  enabled: boolean;
  /** WBGT がこの値以上で danger_preset に切替 */
  danger_wbgt_gte: number;
  danger_preset: RotationPresetId;
  /** この月（1–12）は offseason_preset（危険レベルより優先度低） */
  offseason_months: number[];
  offseason_preset: RotationPresetId;
}

export interface RotationConfig {
  version: string;
  preset: RotationPresetId;
  transition_ms: number;
  presets: Record<RotationPresetId, RotationStep[]>;
  scroll: RotationScroll;
  /** 巡回ループに入れず割り込み優先 */
  interrupt: string[];
  auto: RotationAutoRules;
}

export interface RotationSettings {
  preset: RotationPresetId;
  dangerPreset: RotationPresetId;
  offseasonPreset: RotationPresetId;
  autoSwitch: boolean;
  dangerWbgtGte: number;
  offseasonMonths: number[];
}

export const DANGER_WBGT_THRESHOLD = 31;

/** 警報・地震速報は巡回に含めない */
export const ROTATION_INTERRUPT_SCENES = ['rain_warn', 'nowcast', 'jishin'] as const;

export const DEFAULT_ROTATION_SETTINGS: RotationSettings = {
  preset: 'standard',
  dangerPreset: 'danger',
  offseasonPreset: 'offseason',
  autoSwitch: true,
  dangerWbgtGte: DANGER_WBGT_THRESHOLD,
  offseasonMonths: [12, 1, 2],
};

/** 設計書 ローテーション標準仕様（秒数固定） */
export const ROTATION_PRESETS: Record<RotationPresetId, RotationStep[]> = {
  standard: [
    { scene: 'wbgt', sec: 9 },
    { scene: 'clock', sec: 6 },
    { scene: 'ecs', sec: 6 },
    { scene: 'amedas', sec: 6 },
    { scene: 'forecast', sec: 7 },
    { scene: 'wbgt', sec: 9 },
    { scene: 'multilang', sec: 5 },
    { scene: 'message', sec: 9 },
  ],
  danger: [
    { scene: 'wbgt', sec: 10 },
    { scene: 'wbgt', sec: 10 },
    { scene: 'forecast', sec: 6 },
    { scene: 'wbgt', sec: 10 },
    { scene: 'message', sec: 8 },
  ],
  offseason: [
    { scene: 'clock', sec: 6 },
    { scene: 'forecast', sec: 8 },
    { scene: 'message', sec: 10 },
  ],
};

const BASE_SCENES = new Set([
  'wbgt', 'ecs', 'wxtech', 'amedas', 'forecast', 'clock', 'message',
]);

/** 契約シーンに合わせてプリセット手順をフィルタ（interrupt は常に除外） */
export function filterPresetSteps(steps: RotationStep[], contracted: string[]): RotationStep[] {
  const allowed = new Set([...BASE_SCENES, ...contracted]);
  const interrupt = new Set<string>(ROTATION_INTERRUPT_SCENES);
  return steps.filter((step) => !interrupt.has(step.scene) && allowed.has(step.scene));
}

export function presetCycleTotal(steps: RotationStep[]): number {
  return steps.reduce((sum, s) => sum + s.sec, 0);
}

export function buildFilteredPresets(contracted: string[]): Record<RotationPresetId, RotationStep[]> {
  return {
    standard: filterPresetSteps(ROTATION_PRESETS.standard, contracted),
    danger: filterPresetSteps(ROTATION_PRESETS.danger, contracted),
    offseason: filterPresetSteps(ROTATION_PRESETS.offseason, contracted),
  };
}

/**
 * サイネージ側が参照する active preset（エンジンが WBGT・月で再判定する想定）
 */
export function resolveActivePreset(
  wbgt: number | null,
  month: number,
  settings: RotationSettings,
): RotationPresetId {
  if (!settings.autoSwitch) return settings.preset;
  if (wbgt != null && wbgt >= settings.dangerWbgtGte) return settings.dangerPreset;
  if (settings.offseasonMonths.includes(month)) return settings.offseasonPreset;
  return settings.preset;
}

export function buildRotationConfig(
  contracted: string[],
  settings: RotationSettings = DEFAULT_ROTATION_SETTINGS,
): RotationConfig {
  const presets = buildFilteredPresets(contracted);
  return {
    version: ROTATION_MODULE_VERSION,
    preset: settings.preset,
    transition_ms: 400,
    presets,
    scroll: { speed_px_per_sec: 100, until_complete: true },
    interrupt: [...ROTATION_INTERRUPT_SCENES],
    auto: {
      enabled: settings.autoSwitch,
      danger_wbgt_gte: settings.dangerWbgtGte,
      danger_preset: settings.dangerPreset,
      offseason_months: settings.offseasonMonths,
      offseason_preset: settings.offseasonPreset,
    },
  };
}

/** 制作アプリのシーン一覧初期値（standard プリセットから各 scene の初出 sec を採用） */
export function sceneDurationsFromPreset(
  presetId: RotationPresetId,
  contracted: string[],
): Record<string, number> {
  const steps = filterPresetSteps(ROTATION_PRESETS[presetId], contracted);
  const out: Record<string, number> = {};
  for (const step of steps) {
    if (!(step.scene in out)) out[step.scene] = step.sec;
  }
  return out;
}
