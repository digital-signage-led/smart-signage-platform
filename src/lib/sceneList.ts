import { SCENE_CATALOG } from '../data/mock';
import type { Project, SceneItem } from '../types';
import { CONTENT_SCENE_IDS, stripRetiredContentIds } from './contentScenes';
import { usesEcsSignageFlow } from './deploy';
import { INTERRUPT_SCENE_IDS, INTERRUPT_SCENE_ORDER, partitionScenes, sortPlaylistByEnabled } from './sceneCycle';

/**
 * 通常ループの固定順（コンテンツ政策 / HTML エンジン準拠）
 * 基本: 1 時刻 → 2 アメダス（気象庁）→ 3 多言語 → 4 WBGT → 5 予報
 * 外部API: ecs（環境クラウド）は基本シーンとは別枠（番号なし）
 * 追加: メッセージほか（番号なし）
 */
export const ROTATION_LOOP_ORDER = [
  'clock',
  'ecs',
  'wxtech',
  'amedas',
  'multilang',
  'wbgt',
  'forecast',
  'message',
] as const;

export function rotationLoopOrderIndex(id: string): number {
  const i = (ROTATION_LOOP_ORDER as readonly string[]).indexOf(id);
  return i >= 0 ? i : -1;
}

/**
 * 基本シーンに出す順番番号。
 * アメダスのみ観測枠（2）。環境クラウドは外部API枠のため番号なし。
 */
export function rotationLoopDisplayOrder(id: string): number {
  switch (id) {
    case 'clock': return 1;
    case 'amedas': return 2;
    case 'multilang': return 3;
    case 'wbgt': return 4;
    case 'forecast': return 5;
    default: return -1;
  }
}

/** 通常ループ対象を固定順に並べ、それ以外の巡回・割り込みは後ろに維持 */
export function sortRotationByLoopOrder(scenes: SceneItem[]): SceneItem[] {
  const { rotation, interrupt } = partitionScenes(scenes);
  const inLoop: SceneItem[] = [];
  const rest: SceneItem[] = [];
  for (const s of rotation) {
    if (rotationLoopOrderIndex(s.id) >= 0) inLoop.push(s);
    else rest.push(s);
  }
  inLoop.sort((a, b) => rotationLoopOrderIndex(a.id) - rotationLoopOrderIndex(b.id));
  return [...inLoop, ...rest, ...interrupt];
}

/** 契約オプション（プレイリスト・割り込み） */
const CONTRACTED_OPTION_IDS = [
  'rain_warn', 'flood_info', 'landslide_info', 'surge_info', 'weather_warn', 'evac_info', 'jishin', 'bousai', 'clock', 'message', 'multilang', 'amedas',
  ...CONTENT_SCENE_IDS,
] as const;

const OPTION_SYNC_IDS = [
  'rain_warn', 'flood_info', 'landslide_info', 'surge_info', 'weather_warn', 'evac_info', 'jishin', 'bousai', 'multilang',
  ...CONTENT_SCENE_IDS,
] as const;

/** 地震速報 — 契約・オプション、または standard で警報系が有効な場合 */
export function usesJishinScene(project: Pick<Project, 'contracted' | 'options' | 'plan'>): boolean {
  const contracted = project.contracted || [];
  const options = project.options || [];
  if (contracted.includes('jishin') || options.includes('jishin')) return true;
  if (project.plan === 'standard' && (contracted.includes('rain_warn') || contracted.includes('bousai'))) return true;
  return false;
}

/** options / 警報バンドルから contracted を補完 */
export function normalizeProjectContracted(project: Pick<Project, 'contracted' | 'options' | 'plan'>): string[] {
  const c = new Set(stripRetiredContentIds(project.contracted || []));
  for (const id of stripRetiredContentIds(project.options || [])) {
    if ((OPTION_SYNC_IDS as readonly string[]).includes(id)) c.add(id);
  }
  if (usesJishinScene({ ...project, contracted: [...c] })) c.add('jishin');
  if (c.has('rain_warn')) {
    c.add('flood_info');
    c.add('landslide_info');
    c.add('surge_info');
    c.add('evac_info');
  }
  /* 警戒レベル4種のいずれかがあれば、その他気象警報も契約に含める（発表時のみ表示） */
  if (c.has('rain_warn') || c.has('flood_info') || c.has('landslide_info') || c.has('surge_info')) {
    c.add('weather_warn');
  }
  return [...c];
}

/** 環境クラウド現場計測（HTML エンジン s2・ECS）— device ソースのみ ON */
export function usesEcsMeasureScene(project: Pick<Project, 'source'>): boolean {
  return project.source === 'device';
}

export function usesWxtechScene(project: Pick<Project, 'source'>): boolean {
  return project.source === 'wxtech';
}

/** 保存済みシーンに環境クラウド行が無ければ挿入（外部API枠・アメダスとは別） */
export function ensureEcsScene(scenes: SceneItem[], project: Project): SceneItem[] {
  if (scenes.some((s) => s.id === 'ecs')) return sortRotationByLoopOrder(scenes);
  const clockIdx = scenes.findIndex((s) => s.id === 'clock');
  const insertAt = clockIdx >= 0 ? clockIdx + 1 : 0;
  const next = [...scenes];
  next.splice(insertAt, 0, {
    id: 'ecs',
    enabled: usesEcsMeasureScene(project),
    duration: SCENE_CATALOG.ecs?.dur ?? 5,
  });
  return sortRotationByLoopOrder(next);
}

/** 保存済みシーンにウェザーニューズ行が無ければ挿入（外部API枠） */
export function ensureWxtechScene(scenes: SceneItem[], project: Project): SceneItem[] {
  if (scenes.some((s) => s.id === 'wxtech')) return sortRotationByLoopOrder(scenes);
  const ecsIdx = scenes.findIndex((s) => s.id === 'ecs');
  const clockIdx = scenes.findIndex((s) => s.id === 'clock');
  const insertAt = ecsIdx >= 0 ? ecsIdx + 1 : clockIdx >= 0 ? clockIdx + 1 : 0;
  const next = [...scenes];
  next.splice(insertAt, 0, {
    id: 'wxtech',
    enabled: usesWxtechScene(project),
    duration: SCENE_CATALOG.wxtech?.dur ?? 5,
  });
  return sortRotationByLoopOrder(next);
}

/** 案件の source と外部APIトグルを揃える */
export function syncExternalApiScenes(scenes: SceneItem[], project: Project): SceneItem[] {
  return sortRotationByLoopOrder(scenes.map((s) => {
    if (s.id === 'wxtech') return { ...s, enabled: usesWxtechScene(project) };
    if (s.id === 'ecs') return { ...s, enabled: usesEcsMeasureScene(project) };
    return s;
  }));
}

/** 気象庁 AMeDAS（HTML エンジン s2・JMA）— 5桁地点が設定されている場合 */
export function usesAmedasScene(project: Pick<Project, 'contracted' | 'moePoint' | 'jmaPoint'>): boolean {
  if ((project.contracted || []).includes('amedas')) return true;
  const pt = (project.jmaPoint || project.moePoint || '').trim();
  return /^\d{5}$/.test(pt);
}

/** 多言語（HTML エンジン s3）— 契約または ECS フロー */
export function usesMultilangScene(project: Pick<Project, 'contracted' | 'source'>): boolean {
  if ((project.contracted || []).includes('multilang')) return true;
  return usesEcsSignageFlow(project);
}

export function defaultSceneIds(project: Project): string[] {
  if (project.source === 'wxtech') {
    const ids = ['wxtech', 'clock', 'amedas', 'wbgt', 'forecast', 'message'].filter((id) => {
      if (id === 'wxtech' || id === 'amedas' || id === 'wbgt' || id === 'forecast') return true;
      return (project.contracted || []).includes(id);
    });
    return ids;
  }
  const contracted = normalizeProjectContracted(project);
  const has = (id: string) => contracted.includes(id);
  const ids: string[] = [];

  if (has('clock')) ids.push('clock');
  if (usesEcsMeasureScene(project)) ids.push('ecs');
  if (usesAmedasScene(project) || has('amedas')) ids.push('amedas');
  if (usesMultilangScene(project) || has('multilang')) ids.push('multilang');
  ids.push('wbgt');
  ids.push('forecast');
  if (has('message')) ids.push('message');

  const extras = [
    'rain_warn', 'nowcast', 'flood_info', 'landslide_info', 'surge_info', 'weather_warn',
    'evac_info', 'jishin', 'bousai',
    ...CONTENT_SCENE_IDS,
  ].filter((id) => has(id) && !ids.includes(id));

  return [...ids, ...extras];
}

/** 保存済みシーンにアメダス行が無ければ挿入（基本シーン・観測枠2） */
export function ensureAmedasScene(scenes: SceneItem[], project: Project): SceneItem[] {
  if (!usesAmedasScene(project)) return scenes;
  if (scenes.some((s) => s.id === 'amedas')) return sortRotationByLoopOrder(scenes);
  const clockIdx = scenes.findIndex((s) => s.id === 'clock');
  const ecsIdx = scenes.findIndex((s) => s.id === 'ecs');
  const insertAt = ecsIdx >= 0 ? ecsIdx + 1 : clockIdx >= 0 ? clockIdx + 1 : 0;
  const next = [...scenes];
  next.splice(insertAt, 0, {
    id: 'amedas',
    enabled: true,
    duration: SCENE_CATALOG.amedas?.dur ?? 5,
  });
  return sortRotationByLoopOrder(next);
}

/** 保存済みシーンに多言語行が無ければ挿入（ループ3番） */
export function ensureMultilangScene(scenes: SceneItem[], project: Project): SceneItem[] {
  if (!usesMultilangScene(project)) return scenes;
  if (scenes.some((s) => s.id === 'multilang')) return sortRotationByLoopOrder(scenes);
  const amedasIdx = scenes.findIndex((s) => s.id === 'amedas');
  const ecsIdx = scenes.findIndex((s) => s.id === 'ecs');
  const clockIdx = scenes.findIndex((s) => s.id === 'clock');
  const insertAt = amedasIdx >= 0
    ? amedasIdx + 1
    : ecsIdx >= 0
      ? ecsIdx + 1
      : clockIdx >= 0
        ? clockIdx + 1
        : 0;
  const next = [...scenes];
  next.splice(insertAt, 0, {
    id: 'multilang',
    enabled: true,
    duration: SCENE_CATALOG.multilang?.dur ?? 6,
  });
  return sortRotationByLoopOrder(next);
}

/** 割り込みシーン（大雨警報・降水ナウキャスト・地震速報等）を契約に応じて挿入・並べ替え */
export function ensureInterruptScenes(scenes: SceneItem[], project: Project): SceneItem[] {
  const contracted = normalizeProjectContracted(project);
  let next = [...scenes];

  const { rotation: rot0, interrupt: int0 } = partitionScenes(next);
  const nowcastInRotation = rot0.find((s) => s.id === 'nowcast');
  if (nowcastInRotation) {
    const rotation = rot0.filter((s) => s.id !== 'nowcast');
    const interrupt = int0.some((s) => s.id === 'nowcast') ? int0 : [...int0, nowcastInRotation];
    next = [...rotation, ...interrupt];
  }

  for (const id of INTERRUPT_SCENE_ORDER) {
    if (!contracted.includes(id)) continue;
    if (next.some((s) => s.id === id)) continue;
    next.push({
      id,
      enabled: true,
      duration: SCENE_CATALOG[id]?.dur ?? 5,
    });
  }

  const { rotation, interrupt } = partitionScenes(next);
  const sortedInterrupt = INTERRUPT_SCENE_ORDER
    .map((id) => interrupt.find((s) => s.id === id))
    .filter((s): s is SceneItem => !!s);
  const extraInterrupt = interrupt.filter((s) => !(INTERRUPT_SCENE_ORDER as readonly string[]).includes(s.id));
  return sortPlaylistByEnabled([...rotation, ...sortedInterrupt, ...extraInterrupt]);
}

/** 契約済みオプションの行が無ければ挿入（地震速報・大雨警報など） */
export function ensureContractedScenes(scenes: SceneItem[], project: Project): SceneItem[] {
  const contracted = normalizeProjectContracted(project);
  let next = [...scenes];

  for (const id of CONTRACTED_OPTION_IDS) {
    if (!contracted.includes(id)) continue;
    if (INTERRUPT_SCENE_IDS.has(id)) continue;
    if (next.some((s) => s.id === id)) continue;

    const item: SceneItem = {
      id,
      enabled: true,
      duration: SCENE_CATALOG[id]?.dur ?? 5,
    };

    const { rotation, interrupt } = partitionScenes(next);
    next = [...rotation, item, ...interrupt];
  }

  return sortRotationByLoopOrder(
    ensureInterruptScenes(next, project),
  );
}
