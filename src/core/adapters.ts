/**
 * v3.0 ③ 外部計測機器連携 — アダプター registry（機器ごと独立更新）
 */

import type { DataSource } from '../types';

export type AdapterId = 'edam' | 'ecs' | 'sooki' | 'iot-bridge' | 'jma' | 'wxtech';

export interface AdapterManifest {
  id: AdapterId;
  version: string;
  file: string;
  label: string;
}

export const DATA_ADAPTERS: Record<AdapterId, AdapterManifest> = {
  edam: { id: 'edam', version: '1.4.0', file: 'edam-1.4.js', label: 'e-Dam' },
  ecs: { id: 'ecs', version: '1.0.0', file: 'ecs-1.0.js', label: 'ECS Cloud' },
  sooki: { id: 'sooki', version: '1.2.0', file: 'sooki-1.2.js', label: 'SOOKI Cloud' },
  'iot-bridge': { id: 'iot-bridge', version: '1.0.0', file: 'iot-bridge-1.0.js', label: 'IoT Bridge' },
  jma: { id: 'jma', version: '2.0.0', file: 'jma-2.0.js', label: '\u6c17\u8c61\u5e81\u30fb\u74b0\u5883\u7701' },
  wxtech: { id: 'wxtech', version: '1.0.0', file: 'wxtech-1.0.js', label: 'Weathernews WxTech' },
};

/** 統一出力（全アダプター共通） */
export interface AdapterReading {
  wbgt: number | null;
  temp: number | null;
  humidity: number | null;
  source: AdapterId;
  loid?: string;
  data_id?: string;
  fetched_at: string;
  status: 'ok' | 'unavailable' | 'error';
}

export function primaryAdapterForSource(source: DataSource): AdapterId | null {
  switch (source) {
    case 'edam': return 'edam';
    case 'device': return 'ecs';
    case 'jma': return 'jma';
    case 'wxtech': return 'wxtech';
    case 'manual': return null;
    default: return null;
  }
}

export function fallbackAdapterForSource(source: DataSource): AdapterId | null {
  if (source === 'device' || source === 'edam') return 'jma';
  /* WxTech は他ソースへフォールバックしない（証明書方針） */
  return null;
}

export function adapterVersion(id: AdapterId): string {
  return DATA_ADAPTERS[id].version;
}
