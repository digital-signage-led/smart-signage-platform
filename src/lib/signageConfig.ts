/**
 * v3.0 IX — 地点ID → config.json 自動生成（GAS 登録・エンジン読込用）
 */

import { adapterVersion, fallbackAdapterForSource, primaryAdapterForSource } from '../core/adapters';
import { displaySpecFor } from '../core/layoutRegistry';
import {
  buildRotationConfig,
  DEFAULT_ROTATION_SETTINGS,
  type RotationSettings,
} from '../core/rotationPresets';
import { ENGINE_CORE_VERSION, moduleVersionsPayload } from '../core/signageModules';
import { deviceTokenFor, resolveSignageEngineFile } from './deploy';
import type { Equipment, Project, SceneItem } from '../types';

export const JMA_CREDIT = '\u30c7\u30fc\u30bf\u63d0\u4f9b\uff1a\u6c17\u8c61\u5e81';
export const WXTECH_CREDIT =
  '\u6c17\u8c61\u30c7\u30fc\u30bf\u63d0\u4f9b\uff1a\u682a\u5f0f\u4f1a\u793e\u30a6\u30a7\u30b6\u30fc\u30cb\u30e5\u30fc\u30ba\uff08WxTech\u00ae\uff09';

/** デプロイ UI の v2.x → GAS config 版 */
export const CONFIG_VERSION_BY_DEPLOY: Record<string, string> = {
  'v2.0': '1280',
  'v2.1': '1285',
  'v2.2': '1290',
  dev: 'dev',
};

export interface SignageDeployConfig {
  point_id: string;
  device_id: string;
  config_version: string;
  engine_core: string;
  engine_html: string;
  display: {
    faces: number;
    width: number;
    height: number;
    layout: string;
    native640: boolean;
    layout512: boolean;
  };
  data_source: {
    primary: { adapter: string; version: string; id?: string; loid?: string; data_id?: string } | null;
    fallback: { adapter: string; version: string; point?: string; label_required?: string } | null;
  };
  credit: string;
  modules: Record<string, { version: string; enabled: boolean }>;
  scenes: Array<{ id: string; enabled: boolean; duration: number }>;
  rotation: ReturnType<typeof buildRotationConfig>;
  logo?: { src: string; position: 'face5' | 'none' };
}

function pointIdFor(project: Project): string {
  if (project.source === 'device') return project.moePoint?.trim() || project.jmaPoint?.trim() || project.sourceId?.trim() || '';
  if (project.source === 'jma') return project.jmaPoint?.trim() || project.sourceId?.trim() || '';
  if (project.source === 'edam') return project.sourceId?.trim() || '';
  if (project.source === 'wxtech') {
    return (
      project.wxtechSite?.trim() ||
      project.sourceId?.trim() ||
      (project.geo ? `${project.geo.lat},${project.geo.lon}` : '') ||
      ''
    );
  }
  return project.moePoint?.trim() || project.sourceId?.trim() || '';
}

export function buildSignageConfig(
  project: Project,
  scenes: SceneItem[],
  equip: Equipment[],
  deployVersion: string,
  rotation: RotationSettings = DEFAULT_ROTATION_SETTINGS,
): SignageDeployConfig {
  const spec = displaySpecFor(project.faces);
  const primaryId = primaryAdapterForSource(project.source ?? 'edam');
  const fallbackId = fallbackAdapterForSource(project.source ?? 'edam');
  const point = pointIdFor(project);

  const primary =
    primaryId && project.source !== 'manual'
      ? {
          adapter: primaryId,
          version: adapterVersion(primaryId),
          ...(project.source === 'edam' ? { loid: project.sourceId?.trim() } : {}),
          ...(project.source === 'device' ? { data_id: project.sourceId?.trim() } : {}),
          ...(project.source === 'jma' ? { point: project.sourceId?.trim() } : {}),
          ...(project.source === 'wxtech'
            ? {
                site: project.wxtechSite?.trim() || project.sourceId?.trim(),
                lat: project.geo?.lat,
                lon: project.geo?.lon,
              }
            : {}),
        }
      : null;

  const fallback =
    fallbackId && project.source !== 'manual' && project.source !== 'jma'
      ? {
          adapter: fallbackId,
          version: adapterVersion(fallbackId),
          point: project.moePoint?.trim() || project.jmaPoint?.trim() || point,
          label_required: '\u6c17\u8c61\u5e81\u63a8\u5b9a\u5024',
        }
      : project.source === 'jma'
        ? null
        : fallbackId
          ? {
              adapter: fallbackId,
              version: adapterVersion(fallbackId),
              point: point || undefined,
              label_required: '\u6c17\u8c61\u5e81\u63a8\u5b9a\u5024',
            }
          : null;

  const cfg: SignageDeployConfig = {
    point_id: point,
    device_id: deviceTokenFor(project, equip),
    config_version: CONFIG_VERSION_BY_DEPLOY[deployVersion] ?? deployVersion,
    engine_core: ENGINE_CORE_VERSION,
    engine_html: resolveSignageEngineFile(project),
    display: {
      faces: spec.faces,
      width: spec.totalWidth,
      height: spec.totalHeight,
      layout: spec.layoutMode,
      native640: spec.native640,
      layout512: spec.layout512,
    },
    data_source: { primary, fallback },
    credit:
      project.source === 'manual'
        ? ''
        : project.source === 'wxtech'
          ? WXTECH_CREDIT
          : JMA_CREDIT,
    modules: moduleVersionsPayload(project.contracted ?? []),
    scenes: scenes.map((s) => ({ id: s.id, enabled: s.enabled, duration: s.duration })),
    rotation: buildRotationConfig(project.contracted ?? [], rotation),
  };

  if (project.logoSrc && spec.logoRequired) {
    cfg.logo = { src: project.logoSrc, position: 'face5' };
  } else if (project.logoSrc) {
    cfg.logo = { src: project.logoSrc, position: 'none' };
  }

  return cfg;
}

export function configRequiresCredit(project: Project): boolean {
  return project.source !== 'manual';
}

export function creditOk(project: Project): boolean {
  if (!configRequiresCredit(project)) return true;
  if (project.source === 'wxtech') return Boolean(WXTECH_CREDIT.trim());
  return Boolean(JMA_CREDIT.trim());
}
