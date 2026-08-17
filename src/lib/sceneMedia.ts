/** メディア系追加コンテンツ（HTML ?only= と同一キー） */
export const MEDIA_SCENE_IDS = ['video', 'pdf'] as const;

export type MediaSceneId = (typeof MEDIA_SCENE_IDS)[number];

export interface SceneMediaAsset {
  fileName: string;
  mimeType: string;
  dataUrl: string;
  uploadedAt: string;
}

export type SceneMediaMap = Partial<Record<string, SceneMediaAsset>>;

export const MEDIA_MAX_BYTES: Record<MediaSceneId, number> = {
  video: 20 * 1024 * 1024,
  pdf: 8 * 1024 * 1024,
};

export const MEDIA_ACCEPT: Record<MediaSceneId, string> = {
  video: 'video/mp4,video/webm,.mp4,.webm',
  pdf: 'application/pdf,.pdf',
};

export function isMediaSceneId(id: string): id is MediaSceneId {
  return (MEDIA_SCENE_IDS as readonly string[]).includes(id);
}

export function mediaKindFromSceneId(id: string): MediaSceneId | null {
  return isMediaSceneId(id) ? id : null;
}

export function formatMediaSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function validateMediaFile(file: File, kind: MediaSceneId): string | null {
  const max = MEDIA_MAX_BYTES[kind];
  if (file.size > max) {
    return `ファイルサイズが上限（${formatMediaSize(max)}）を超えています`;
  }
  if (kind === 'video' && !file.type.startsWith('video/') && !/\.(mp4|webm)$/i.test(file.name)) {
    return 'MP4 または WebM 形式の動画を選択してください';
  }
  if (kind === 'pdf' && file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) {
    return 'PDF 形式のファイルを選択してください';
  }
  return null;
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
