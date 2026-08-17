import type { DataSource, Project, SceneItem } from '../types';

/** 外部API（ベンダー連携）シーン — 基本／追加コンテンツとは別枠 */
export const EXTERNAL_API_SCENE_IDS = [
  'ecs',
  'wxtech',
] as const;

/** 佐々木・老門作業所の本番計測（未設定時の自動取得用） */
export const DEFAULT_ECS_DATA_ID = '1050';
export const DEFAULT_ECS_LO_ID = '019373';
export const DEFAULT_ECS_GAS_URL =
  import.meta.env.VITE_ECS_GAS_URL?.trim() ||
  'https://script.google.com/macros/s/AKfycbw8QiGNbF9xw6UXlhfyu6lhsCJZCuVFc-jkru3NbjT9RR7DkyUP7f-fBtj5nQDOnp22Fw/exec';

/** ECS 計測IDは 3〜4 桁。5桁は AMeDAS なので使わない */
export function ecsDataIdOf(project: Pick<Project, 'sourceId'>): string {
  const id = project.sourceId?.trim() || '';
  if (/^\d{3,4}$/.test(id)) return id;
  return '';
}

export function resolveEcsDataId(project: Pick<Project, 'sourceId'>): string {
  return ecsDataIdOf(project) || DEFAULT_ECS_DATA_ID;
}

export function resolveEcsLoId(project: Pick<Project, 'ecsLoId'>): string {
  return project.ecsLoId?.trim() || DEFAULT_ECS_LO_ID;
}

export type ExternalApiSceneId = (typeof EXTERNAL_API_SCENE_IDS)[number];

export const WXTECH_ENGINE_FILE = 'wx-cube-4face.html';
export const ECS_ENGINE_FILE = 'wbgt-cube-sasakikensetu-4face.html';

export function isExternalApiSceneId(id: string): id is ExternalApiSceneId {
  return (EXTERNAL_API_SCENE_IDS as readonly string[]).includes(id);
}

export function enabledExternalApiId(scenes: SceneItem[] | undefined): ExternalApiSceneId | null {
  if (!scenes?.length) return null;
  if (scenes.some((s) => s.id === 'wxtech' && s.enabled)) return 'wxtech';
  if (scenes.some((s) => s.id === 'ecs' && s.enabled)) return 'ecs';
  return null;
}

/** AMeDAS 5桁や ECS Data ID を WxTech site キーにしない */
export function wxtechSiteKey(project: Pick<Project, 'wxtechSite' | 'sourceId'>): string {
  const site = project.wxtechSite?.trim();
  if (site) return site;
  const id = project.sourceId?.trim() || '';
  if (!id) return '';
  if (/^\d{3,5}$/.test(id)) return '';
  return id;
}

function rememberStd_(project: Project): Pick<Project, 'stdSource' | 'stdEngineFile'> {
  const switchingAway =
    project.source === 'wxtech' ||
    project.source === 'device' ||
    project.engineFile === WXTECH_ENGINE_FILE ||
    project.engineFile === ECS_ENGINE_FILE;
  return {
    stdSource: project.stdSource ?? (switchingAway ? undefined : project.source),
    stdEngineFile: project.stdEngineFile ?? (switchingAway ? undefined : project.engineFile),
  };
}

/** シーン設定の外部APIトグルに合わせて source / エンジンを切り替える */
export function projectAfterExternalApiToggle(
  project: Project,
  enabling: ExternalApiSceneId | null,
): Project {
  const remembered = rememberStd_(project);
  if (enabling === 'wxtech') {
    return {
      ...project,
      ...remembered,
      stdSource: remembered.stdSource ?? (project.source !== 'wxtech' ? project.source : 'jma'),
      stdEngineFile: remembered.stdEngineFile ?? (
        project.engineFile && project.engineFile !== WXTECH_ENGINE_FILE
          ? project.engineFile
          : undefined
      ),
      source: 'wxtech',
      engineFile: WXTECH_ENGINE_FILE,
    };
  }
  if (enabling === 'ecs') {
    return {
      ...project,
      ...remembered,
      stdSource: remembered.stdSource ?? (project.source !== 'device' ? project.source : 'jma'),
      stdEngineFile: remembered.stdEngineFile ?? (
        project.engineFile && project.engineFile !== ECS_ENGINE_FILE
          ? project.engineFile
          : undefined
      ),
      source: 'device',
      engineFile: ECS_ENGINE_FILE,
      sourceId: resolveEcsDataId(project),
      ecsLoId: resolveEcsLoId(project),
      ecsGasUrl: project.ecsGasUrl?.trim() || DEFAULT_ECS_GAS_URL,
    };
  }
  const restoredSource: DataSource =
    project.stdSource
    ?? ((project.jmaPoint || project.moePoint) ? 'jma' : 'jma');
  const restoredSourceId =
    restoredSource === 'wxtech'
      ? (project.wxtechSite?.trim() || project.sourceId)
      : restoredSource === 'device'
        ? resolveEcsDataId(project)
        : (project.jmaPoint?.trim() || project.moePoint?.trim() || project.sourceId);
  return {
    ...project,
    source: restoredSource,
    engineFile: project.stdEngineFile,
    sourceId: restoredSourceId,
  };
}

/** プレビュー／配信用。ON の外部APIを source・エンジンに反映する */
export function projectWithExternalApi(project: Project, scenes?: SceneItem[]): Project {
  const api = enabledExternalApiId(scenes);
  if (api === 'wxtech') {
    return { ...project, source: 'wxtech', engineFile: WXTECH_ENGINE_FILE };
  }
  if (api === 'ecs') {
    return {
      ...project,
      source: 'device',
      engineFile: ECS_ENGINE_FILE,
      sourceId: resolveEcsDataId(project),
      ecsLoId: resolveEcsLoId(project),
      ecsGasUrl: project.ecsGasUrl?.trim() || DEFAULT_ECS_GAS_URL,
    };
  }
  if (scenes?.some((s) => s.id === 'wxtech' || s.id === 'ecs')) {
    if (project.stdSource || project.stdEngineFile) {
      return {
        ...project,
        source: project.stdSource ?? project.source,
        engineFile: project.stdEngineFile,
      };
    }
  }
  return project;
}

/** カードタッププレビュー。OFF でもそのベンダーエンジンを出す */
export function projectForScenePreview(
  project: Project,
  scenes?: SceneItem[],
  sceneId?: string,
): Project {
  if (sceneId === 'wxtech') {
    return { ...project, source: 'wxtech', engineFile: WXTECH_ENGINE_FILE };
  }
  if (sceneId === 'ecs') {
    return {
      ...project,
      source: 'device',
      engineFile: ECS_ENGINE_FILE,
      sourceId: resolveEcsDataId(project),
      ecsLoId: resolveEcsLoId(project),
      ecsGasUrl: project.ecsGasUrl?.trim() || DEFAULT_ECS_GAS_URL,
    };
  }
  return projectWithExternalApi(project, scenes);
}
