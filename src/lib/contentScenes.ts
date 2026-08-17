/** 追加コンテンツ（HTML ?only= / メッセージテロップ） */
export const CONTENT_SCENE_IDS = [
  'message',
  'video',
  'pdf',
] as const;

export type ContentSceneId = (typeof CONTENT_SCENE_IDS)[number];

/** 廃止した追加コンテンツ（保存データから除去） */
export const RETIRED_CONTENT_SCENE_IDS = [
  'slogan',
  'wind_meter',
  'rigging',
  'safe_days',
  'noon_bell',
  'sdgs',
  'elevation',
  'safety_logo',
  'news',
] as const;

const RETIRED_SET = new Set<string>(RETIRED_CONTENT_SCENE_IDS);

export function isContentSceneId(id: string): id is ContentSceneId {
  return (CONTENT_SCENE_IDS as readonly string[]).includes(id);
}

export function isRetiredContentSceneId(id: string): boolean {
  return RETIRED_SET.has(id);
}

export function stripRetiredContentIds(ids: string[]): string[] {
  return ids.filter((id) => !RETIRED_SET.has(id));
}
