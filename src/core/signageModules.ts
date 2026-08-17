/**
 * v3.0 ② WBGT表示エンジン — モジュール独立バージョン + 依存マニフェスト
 * Phase1: 現行 HTML 固定。config/GAS 連携時に modules 版を参照する。
 */

export type SignageModuleId =
  | 'wbgt'
  | 'forecast'
  | 'rain_warn'
  | 'earthquake'
  | 'bousai'
  | 'clock'
  | 'message'
  | 'multilang';

export interface SignageModuleManifest {
  id: SignageModuleId;
  version: string;
  file: string;
  depends_on: string[];
  safe_to_update_alone: boolean;
  breaking_change: boolean;
}

export const ENGINE_CORE_VERSION = '2.1.0';

export const SIGNAGE_ENGINE_MODULES: Record<SignageModuleId, SignageModuleManifest> = {
  wbgt: {
    id: 'wbgt',
    version: '1.3.0',
    file: 'wbgt-1.3.0.js',
    depends_on: ['core>=2.1.0'],
    safe_to_update_alone: true,
    breaking_change: false,
  },
  forecast: {
    id: 'forecast',
    version: '1.1.0',
    file: 'forecast-1.1.0.js',
    depends_on: ['core>=2.1.0'],
    safe_to_update_alone: true,
    breaking_change: false,
  },
  rain_warn: {
    id: 'rain_warn',
    version: '1.0.2',
    file: 'rain_warn-1.0.2.js',
    depends_on: ['core>=2.1.0', 'jma>=2.0'],
    safe_to_update_alone: true,
    breaking_change: false,
  },
  earthquake: {
    id: 'earthquake',
    version: '0.2.1',
    file: 'earthquake-0.2.1.js',
    depends_on: ['core>=2.1.0', 'wbgtLevel()'],
    safe_to_update_alone: true,
    breaking_change: false,
  },
  bousai: {
    id: 'bousai',
    version: '0.1.0',
    file: 'bousai-0.1.0.js',
    depends_on: ['core>=2.1.0'],
    safe_to_update_alone: true,
    breaking_change: false,
  },
  clock: {
    id: 'clock',
    version: '1.0.0',
    file: 'clock-1.0.0.js',
    depends_on: ['core>=2.1.0'],
    safe_to_update_alone: true,
    breaking_change: false,
  },
  message: {
    id: 'message',
    version: '1.0.1',
    file: 'message-1.0.1.js',
    depends_on: ['core>=2.1.0'],
    safe_to_update_alone: true,
    breaking_change: false,
  },
  multilang: {
    id: 'multilang',
    version: '1.2.0',
    file: 'multilang-1.2.0.js',
    depends_on: ['core>=2.1.0', 'wbgt>=1.3.0'],
    safe_to_update_alone: true,
    breaking_change: false,
  },
};

/** 契約オプション → 有効モジュール */
export function modulesForContract(contracted: string[]): SignageModuleId[] {
  const base: SignageModuleId[] = ['clock', 'wbgt', 'forecast', 'message'];
  const extra: SignageModuleId[] = [];
  if (contracted.includes('rain_warn')) extra.push('rain_warn');
  if (contracted.includes('jishin')) extra.push('earthquake');
  if (contracted.includes('bousai')) extra.push('bousai');
  if (contracted.includes('multilang')) extra.push('multilang');
  return [...base, ...extra];
}

export function moduleVersionsPayload(contracted: string[]): Record<string, { version: string; enabled: boolean }> {
  const enabled = new Set(modulesForContract(contracted));
  const out: Record<string, { version: string; enabled: boolean }> = {};
  (Object.keys(SIGNAGE_ENGINE_MODULES) as SignageModuleId[]).forEach((id) => {
    out[id] = {
      version: SIGNAGE_ENGINE_MODULES[id].version,
      enabled: enabled.has(id),
    };
  });
  return out;
}
