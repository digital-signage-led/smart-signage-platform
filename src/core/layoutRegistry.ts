/**
 * v3.0 ⑤ 解像度・面数・レイアウト台帳
 */

export type LayoutMode = 'layout512' | 'face5' | 'face3';

/** Cube＝立体（4/5面のみ）。ストリップ＝横長バー（3面のみ） */
export type SignageKind = 'cube' | 'strip';

export interface SignageKindMeta {
  id: SignageKind;
  label: string;
  description: string;
  faceOptions: number[];
}

export const SIGNAGE_KINDS: SignageKindMeta[] = [
  {
    id: 'cube',
    label: 'Cube（立体）',
    description: 'Cube4面 512×128 / Cube5面 640×128（ロゴ列あり）',
    faceOptions: [4, 5],
  },
  {
    id: 'strip',
    label: 'ストリップ（横長）',
    description: 'ストリップ 384×128',
    faceOptions: [3],
  },
];

export interface DisplaySpec {
  faces: number;
  signageKind: SignageKind;
  panelWidth: number;
  panelHeight: number;
  contentWidth: number;
  totalWidth: number;
  totalHeight: number;
  layoutMode: LayoutMode;
  logoRequired: boolean;
  native640: boolean;
  layout512: boolean;
  /** フォーム pixel 選択肢 */
  pixelLabel: string;
}

const SPECS: Record<number, DisplaySpec> = {
  3: {
    faces: 3,
    signageKind: 'strip',
    panelWidth: 128,
    panelHeight: 128,
    contentWidth: 384,
    totalWidth: 384,
    totalHeight: 128,
    layoutMode: 'face3',
    logoRequired: false,
    native640: false,
    layout512: false,
    pixelLabel: '384x128',
  },
  4: {
    faces: 4,
    signageKind: 'cube',
    panelWidth: 128,
    panelHeight: 128,
    contentWidth: 512,
    totalWidth: 512,
    totalHeight: 128,
    layoutMode: 'layout512',
    logoRequired: false,
    native640: true,
    layout512: true,
    pixelLabel: '512x128',
  },
  5: {
    faces: 5,
    signageKind: 'cube',
    panelWidth: 128,
    panelHeight: 128,
    contentWidth: 512,
    totalWidth: 640,
    totalHeight: 128,
    layoutMode: 'face5',
    logoRequired: true,
    native640: true,
    layout512: false,
    pixelLabel: '640x128',
  },
};

export interface LayoutRegistryEntry {
  siteId: string;
  company: string;
  site: string;
  faces: number;
  pixel: string;
  layoutMode: LayoutMode;
  logo: string;
  engineCore: string;
}

/** 設計書 VII の解像度台帳サンプル（Phase2: Sheets 同期） */
export const LAYOUT_REGISTRY_SAMPLE: LayoutRegistryEntry[] = [
  { siteId: 'suminoe', company: '\u30c7\u30b8\u30bf\u30eb\u30b5\u30a4\u30cd\u30fc\u30b8', site: '\u4f4f\u4e4b\u6c5f\u4f1a\u5834', faces: 4, pixel: '512x128', layoutMode: 'layout512', logo: 'greencross_logo.png', engineCore: '2.1.0' },
  { siteId: 'sasaki', company: '\u4f50\u3005\u6728\u5efa\u8a2d', site: '\u8001\u9580\u4f5c\u696d\u6240', faces: 4, pixel: '512x128', layoutMode: 'layout512', logo: '\u306a\u3057', engineCore: '2.1.0' },
  { siteId: 'naratetsu', company: '\u5948\u826f\u5927\u9244', site: '\u672c\u793e\u524d', faces: 4, pixel: '640x128', layoutMode: 'layout512', logo: '\u3042\u308a', engineCore: '2.1.0' },
  { siteId: 'oumi', company: '\u8fd1\u6c5f\u516b\u5e61\u7d44', site: '\u516b\u5e61\u5de5\u533a', faces: 5, pixel: '640x128', layoutMode: 'face5', logo: 'greencross_logo.png', engineCore: '2.0.0' },
  { siteId: 'himeji', company: '\u59eb\u8def\u5efa\u8a2d', site: '63383\u5de5\u533a', faces: 4, pixel: '512x128', layoutMode: 'layout512', logo: '\u306a\u3057', engineCore: '2.1.0' },
];

export function inferSignageKind(faces: number): SignageKind {
  return faces === 3 ? 'strip' : 'cube';
}

/** 案件カード等の表示用（Cube4面 / Cube5面 / ストリップ） */
export function signageFacesLabel(kind: SignageKind, faces: number): string {
  if (kind === 'cube') return `Cube${faces}面`;
  return 'ストリップ';
}

export function signageFacesLabelForProject(project: { faces: number; signageKind?: SignageKind }): string {
  const kind = project.signageKind ?? inferSignageKind(project.faces);
  return signageFacesLabel(kind, project.faces);
}

export function signageKindMeta(kind: SignageKind): SignageKindMeta {
  return SIGNAGE_KINDS.find((k) => k.id === kind) ?? SIGNAGE_KINDS[0];
}

export function defaultFacesForKind(kind: SignageKind): number {
  return kind === 'strip' ? 3 : 4;
}

export function pixelLabelFor(kind: SignageKind, faces: number): string {
  const meta = signageKindMeta(kind);
  if (!meta.faceOptions.includes(faces)) {
    return displaySpecFor(defaultFacesForKind(kind)).pixelLabel;
  }
  return displaySpecFor(faces).pixelLabel;
}

export function displaySpecFor(faces: number): DisplaySpec {
  return SPECS[faces] ?? SPECS[4];
}

export function displaySpecForSignage(kind: SignageKind, faces: number): DisplaySpec {
  const meta = signageKindMeta(kind);
  const f = meta.faceOptions.includes(faces) ? faces : defaultFacesForKind(kind);
  return displaySpecFor(f);
}

/** プレビュー iframe の表示ピクセル（四面 512・五面 640・三面 384） */
export function signagePreviewPixels(faces: number): { width: number; height: number } {
  const spec = displaySpecFor(faces);
  return {
    width: spec.logoRequired ? spec.totalWidth : spec.contentWidth,
    height: spec.totalHeight,
  };
}

export function validatePixel(faces: number, pixel: string): { ok: boolean; expected: string; message?: string } {
  const spec = displaySpecFor(faces);
  const normalized = pixel.trim().toLowerCase();
  const expected = spec.pixelLabel.toLowerCase();
  if (normalized === expected) return { ok: true, expected: spec.pixelLabel };
  return {
    ok: false,
    expected: spec.pixelLabel,
    message: `${faces}\u9762\u306f ${spec.pixelLabel} \u304c\u63a8\u5968\u89e3\u50cf\u5ea6\u3067\u3059\uff08\u73fe\u5728: ${pixel || '\u672a\u8a2d\u5b9a'}\uff09`,
  };
}

export function registryEntryFor(siteId: string): LayoutRegistryEntry | undefined {
  return LAYOUT_REGISTRY_SAMPLE.find((e) => e.siteId === siteId);
}
