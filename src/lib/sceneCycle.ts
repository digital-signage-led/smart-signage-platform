import type { SceneItem } from '../types';
import { isContentSceneId } from './contentScenes';
import { isExternalApiSceneId } from './externalApiScenes';
import { ROTATION_INTERRUPT_SCENES } from '../core/rotationPresets';

/** 割り込みブロックの表示順 */
export const INTERRUPT_SCENE_ORDER = [
  'rain_warn', 'landslide_info', 'flood_info', 'surge_info',
  'weather_warn',
  'nowcast', 'evac_info', 'jishin', 'bousai',
] as const;

/** 割り込み UI のグループ（分かりやすさのため分割） */
export const INTERRUPT_SCENE_GROUPS: {
  id: string;
  labelKey: 'interruptGroupAlertLevel' | 'interruptGroupWeatherWarn' | 'interruptGroupOther';
  /** グループ内の種別見出し（例: 警報・注意報） */
  subLabelKey?: 'interruptGroupAlertLevelSub';
  ids: readonly string[];
}[] = [
  {
    id: 'alertLevel',
    labelKey: 'interruptGroupAlertLevel',
    subLabelKey: 'interruptGroupAlertLevelSub',
    ids: ['rain_warn', 'landslide_info', 'flood_info', 'surge_info'],
  },
  {
    id: 'weatherWarn',
    labelKey: 'interruptGroupWeatherWarn',
    ids: ['weather_warn'],
  },
  {
    id: 'other',
    labelKey: 'interruptGroupOther',
    ids: ['nowcast', 'evac_info', 'jishin', 'bousai'],
  },
];

/** 巡回ループに入らないシーン（警報・地震・警戒アラート等） */
export const INTERRUPT_SCENE_IDS = new Set<string>([
  ...ROTATION_INTERRUPT_SCENES,
  'nowcast',
  'bousai',
  'flood_info',
  'landslide_info',
  'surge_info',
  'weather_warn',
  'evac_info',
]);

export const MIN_SCENE_LAPS = 1;
export const MAX_SCENE_LAPS = 9;

/** プレビューで 1周 に相当する時間（ミリ秒） */
export const PREVIEW_MS_PER_LAP = 10_000;

/** デプロイ・msgSec 換算で 1周 に相当する秒数 */
export const DEPLOY_SEC_PER_LAP = 9;

export function isRotationLoopScene(sceneId: string): boolean {
  return !INTERRUPT_SCENE_IDS.has(sceneId);
}

export function partitionScenes(scenes: SceneItem[]): { rotation: SceneItem[]; interrupt: SceneItem[] } {
  const rotation: SceneItem[] = [];
  const interrupt: SceneItem[] = [];
  for (const s of scenes) {
    if (isRotationLoopScene(s.id)) rotation.push(s);
    else interrupt.push(s);
  }
  return { rotation, interrupt };
}

/** プレビュー再生順：巡回ON → 割り込みON（発表時のみ枠もサンプル確認できる） */
export function enabledPreviewPlaybackScenes(scenes: SceneItem[]): SceneItem[] {
  const { rotation, interrupt } = partitionScenes(scenes);
  const rot = rotation.filter((s) => s.enabled);
  const byId = new Map(interrupt.map((s) => [s.id, s]));
  const int = INTERRUPT_SCENE_ORDER
    .map((id) => byId.get(id))
    .filter((s): s is SceneItem => !!s && s.enabled);
  const extra = interrupt.filter(
    (s) => s.enabled && !(INTERRUPT_SCENE_ORDER as readonly string[]).includes(s.id),
  );
  return [...rot, ...int, ...extra];
}

export function partitionRotationScenes(scenes: SceneItem[]): {
  core: SceneItem[];
  content: SceneItem[];
  externalApi: SceneItem[];
} {
  const { rotation } = partitionScenes(scenes);
  const core: SceneItem[] = [];
  const content: SceneItem[] = [];
  const externalApi: SceneItem[] = [];
  for (const s of rotation) {
    if (isExternalApiSceneId(s.id)) externalApi.push(s);
    else if (isContentSceneId(s.id)) content.push(s);
    else core.push(s);
  }
  return { core, content, externalApi };
}

export function reorderRotationScenes(scenes: SceneItem[], from: number, to: number): SceneItem[] {
  const { rotation, interrupt } = partitionScenes(scenes);
  if (from === to || from < 0 || to < 0 || from >= rotation.length || to >= rotation.length) return scenes;
  const next = [...rotation];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return sortPlaylistByEnabled([...next, ...interrupt]);
}

/** ON のシーンを上、OFF を下に並べ替え（プレイリスト・割り込みそれぞれ） */
export function sortPlaylistByEnabled(scenes: SceneItem[]): SceneItem[] {
  const { rotation, interrupt } = partitionScenes(scenes);
  const group = (list: SceneItem[]) => {
    const on = list.filter((s) => s.enabled);
    const off = list.filter((s) => !s.enabled);
    return [...on, ...off];
  };
  return [...group(rotation), ...group(interrupt)];
}

/** 1周計の対象（巡回シーンのみ） */
export function rotationScenesForCycle(scenes: SceneItem[], enabledOnly = true): SceneItem[] {
  const list = enabledOnly ? scenes.filter((s) => s.enabled) : scenes;
  return list.filter((s) => isRotationLoopScene(s.id));
}

export function clampSceneLaps(val: number): number {
  let n = Math.round(val);
  if (Number.isNaN(n)) n = MIN_SCENE_LAPS;
  return Math.max(MIN_SCENE_LAPS, Math.min(MAX_SCENE_LAPS, n));
}

/** ON の巡回シーンの「周」合計 */
export function cycleLapTotal(scenes: SceneItem[]): number {
  return rotationScenesForCycle(scenes, true).reduce((sum, s) => sum + clampSceneLaps(s.duration || 1), 0);
}

export function sceneLapDisplayMs(laps: number): number {
  return clampSceneLaps(laps) * PREVIEW_MS_PER_LAP;
}

export function sceneDurationSeconds(laps: number): number {
  return clampSceneLaps(laps) * DEPLOY_SEC_PER_LAP;
}
