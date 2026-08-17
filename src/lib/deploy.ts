import type { Equipment, Project, SceneItem } from '../types';
import { isControllerEquipType } from '../core/controllerRegistry';
import { displaySpecFor, validatePixel, signageFacesLabelForProject } from '../core/layoutRegistry';
import type { SceneMediaMap } from './sceneMedia';
import { isMediaSceneId } from './sceneMedia';
import { isContentSceneId } from './contentScenes';
import { INTERRUPT_SCENE_IDS, sceneDurationSeconds } from './sceneCycle';
import type { MultilangLangId } from './multilang';
import { ALL_MULTILANG_LANGS } from './multilang';
import { wxtechSiteKey, resolveEcsDataId, DEFAULT_ECS_GAS_URL } from './externalApiScenes';
import { formatLegalCompanyName } from './companyName';
import { asciiSiteKey } from './format';
import { persistProjectLogo } from './signageLogo';
import { logoSrcFromKey } from './companies';
import {
  buildSignageConfig,
  configRequiresCredit,
  creditOk,
  JMA_CREDIT,
  WXTECH_CREDIT,
} from './signageConfig';
import {
  isAlertLevelSceneId,
  type AlertLevelNum,
} from './alertLevelColumns';
/** プレビュー iframe の HTML キャッシュ回避（定数・デザイン更新のたびに上げる） */
export const SIGNAGE_DESIGN_REV = '20260817h';

/** 本番メインループで使うエンジンキー（?loop=） */
const MAIN_LOOP_ENGINE_KEYS = new Set(['s1', 's2', 's3', 's4', 's5', 'message']);

/** sceneList.ROTATION_LOOP_ORDER と同順（deploy↔sceneList 循環回避） */
const LOOP_SORT_ORDER = [
  'clock', 'ecs', 'wxtech', 'amedas', 'multilang', 'wbgt', 'forecast', 'message',
] as const;

function loopSortIndex_(id: string): number {
  return (LOOP_SORT_ORDER as readonly string[]).indexOf(id);
}

/**
 * ON の巡回シーンから HTML ?loop= 用キーを生成。
 * メッセージ等のオーバーレイ／割り込みは含めない。
 */
export function enabledEngineLoopKeys(
  scenes: SceneItem[],
  project?: Pick<Project, 'source' | 'faces'>,
): string[] {
  const ordered = [...scenes].sort((a, b) => {
    const ia = loopSortIndex_(a.id);
    const ib = loopSortIndex_(b.id);
    if (ia >= 0 && ib >= 0) return ia - ib;
    if (ia >= 0) return -1;
    if (ib >= 0) return 1;
    return 0;
  });
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const s of ordered) {
    if (!s.enabled) continue;
    if (INTERRUPT_SCENE_IDS.has(s.id)) continue;
    if (isMediaSceneId(s.id)) continue;
    const only = platformSceneToEngineOnly(s.id, project);
    if (!only || !MAIN_LOOP_ENGINE_KEYS.has(only)) continue;
    if (seen.has(only)) continue;
    seen.add(only);
    keys.push(only);
  }
  return keys;
}

const STD_JMA_LOOP = ['s1', 's3', 's4', 's5', 'message'];

function appendLoopParams(params: URLSearchParams, loopKeys?: string[] | null): void {
  if (loopKeys == null) return;
  if (!loopKeys.length) {
    params.set('loop', 'none');
    return;
  }
  const sameStd =
    loopKeys.length === STD_JMA_LOOP.length && STD_JMA_LOOP.every((k) => loopKeys.includes(k));
  params.set('loop', sameStd ? 'std' : loopKeys.join(','));
}

/** 本番エンジン HTML（デザイン固定）— docs/SIGNAGE_ENGINE_SPEC.md */
export const SIGNAGE_ENGINE_FILES = {
  /** 5面基本構成（住之江 / 640×128・右端ロゴ128） */
  face5Base: 'wbgt-cube-osaka-suminoe-5face.html',
  /** @deprecated face5Base と同内容の互換エイリアス */
  face5Greencross: 'wbgt-cube-osaka-suminoe-5face.html',
  /** 4面基本構成（庄原市・鴻治組 / 512×128・ロゴ列なし） */
  face4Base: 'wbgt-cube-hiroshima-koujigumi-4face.html',
  /** @deprecated face4Base と同内容の互換エイリアス */
  face4Koujigumi: 'wbgt-cube-hiroshima-koujigumi-4face.html',
  /** 熊本・警報＋地震・避難割り込み（避難/地震プレビュー用） */
  face4Kumamoto: 'wbgt-cube-kumamoto-4face.html',
  /** 沖縄・久米島（色付き3段・r8警報） */
  face4OkinawaKumejima: 'wbgt-cube-okinawa-kumejima-4face.html',
  /** ECS 連携バリアント（佐々木建設） */
  face4SasakiEcs: 'wbgt-cube-sasakikensetu-4face.html',
  /** WxTech（ウェザーニューズ）ピンポイント予報・体感 */
  face4Wxtech: 'wx-cube-4face.html',
} as const;

const DEFAULT_SIGNAGE_HOST = 'http://localhost:8765';

/** サイネージ HTML の配信ディレクトリ（末尾スラッシュなし） */
export function signageHostFromEnv(): string {
  const env = import.meta.env.VITE_SIGNAGE_URL?.trim();
  if (env) {
    if (env.endsWith('.html')) {
      return env.slice(0, env.lastIndexOf('/'));
    }
    const base = env.replace(/\/$/, '');
    if (base.endsWith('/signage') || base.includes(':8765')) return base;
    if (typeof window !== 'undefined' && import.meta.env.DEV && !base.endsWith('/signage')) {
      return `${base}/signage`;
    }
    return base;
  }
  if (typeof window !== 'undefined') {
    /* GitHub Pages でも localhost でも、今開いている管理画面の隣の /signage を指す */
    return new URL('signage', window.location.href).href.replace(/\/$/, '');
  }
  return DEFAULT_SIGNAGE_HOST;
}

/** iframe プレビュー用 — 同一オリジンの signage/（dist 同梱・base 相対パス対応） */
function previewSignageBase(project: Project): string {
  const base = import.meta.env.BASE_URL || '/';
  const root = base.endsWith('/') ? base : `${base}/`;
  return `${root}signage/${resolveSignageEngineFile(project)}`;
}

/** 案件設定から本番 HTML ファイル名を決定（デザイン固定エンジン） */
export function resolveSignageEngineFile(project: Project): string {
  if (project.engineFile?.trim()) return project.engineFile.trim();
  if (project.source === 'wxtech') return SIGNAGE_ENGINE_FILES.face4Wxtech;
  /* ECS Cloud 連携案件のみ佐々木バリアント。それ以外の 3/4 面は鴻治組4面基本 */
  const useSasakiEcs = project.source === 'device';
  if (project.faces === 4 || project.faces === 3) {
    return useSasakiEcs
      ? SIGNAGE_ENGINE_FILES.face4SasakiEcs
      : SIGNAGE_ENGINE_FILES.face4Base;
  }
  return SIGNAGE_ENGINE_FILES.face5Base;
}

/** 配信用ベース URL（ホスト + エンジン HTML） */
export function buildSignageBase(project: Project): string {
  return `${signageHostFromEnv()}/${resolveSignageEngineFile(project)}`;
}

/** @deprecated buildSignageBase(project) を使用 */
export const SIGNAGE_BASE =
  import.meta.env.VITE_SIGNAGE_URL ??
  `${DEFAULT_SIGNAGE_HOST}/${SIGNAGE_ENGINE_FILES.face5Base}`;

export interface DeployCheck {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
  blocking: boolean;
}

const A35_TOKEN_RE = /^a35_[a-z0-9_]+_\d{3}$/i;

function stableTokenNum(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return String((h % 900) + 100);
}

export function deviceTokenFor(project: Project, equip: Equipment[]): string {
  const eq = equip.find((e) => e.siteId === project.id && isControllerEquipType(e.type) && e.deviceToken !== '\u2014');
  const raw = eq?.deviceToken ?? project.deviceToken ?? '';
  if (A35_TOKEN_RE.test(raw)) return raw;
  return `a35_${asciiSiteKey(project.id)}_${stableTokenNum(project.id)}`;
}

function appendWeatherPointParams(params: URLSearchParams, project: Project): void {
  const moe = project.moePoint?.trim() || (project.source !== 'device' ? project.sourceId?.trim() : '');
  const jma = project.jmaPoint?.trim() || moe;
  if (moe) params.set('moePoint', moe);
  if (jma && jma !== moe) params.set('jmaPoint', jma);
  if (project.jmaArea?.trim()) params.set('jmaArea', project.jmaArea.trim());
  if (project.jmaWarnCity?.trim()) params.set('warnCity', project.jmaWarnCity.trim());
  if (project.bosaiOnly) params.set('bosaiOnly', '1');
  if (project.geo?.lat != null) params.set('rainLat', String(project.geo.lat));
  if (project.geo?.lon != null) params.set('rainLon', String(project.geo.lon));
}

function isKohjiCompany(name: string): boolean {
  return /鴻治/.test(name || '');
}

function assetUrlForQuery(src: string | undefined): string {
  const s = (src || '').trim();
  if (!s || s.startsWith('data:')) return '';
  return s;
}

function assetFileName(src: string): string {
  const s = src.trim().split('?')[0].replace(/^(\.\/)?assets\//, '');
  const m = s.match(/([^/]+)$/);
  return m ? m[1] : s;
}

function companyCoParam(project: Project): string {
  const id = (project.companyId || '').trim().toLowerCase();
  if (id === 'morishita-gumi' || /森下/.test(project.company)) return 'morishita';
  if (id === 'kohji-gumi' || /鴻治/.test(project.company)) return 'kohji';
  return '';
}

/** 社名・ロゴをクエリで差し替え（共有エンジン HTML の既定・鴻治組を上書き） */
function appendSiteIdentityParams(params: URLSearchParams, project: Project): void {
  const customer =
    formatLegalCompanyName(project.company, project.corpTitlePos ?? 'none').trim() ||
    project.company.trim();
  const co = companyCoParam(project);
  if (co && co !== 'kohji') params.set('co', co);
  else if (!co && customer) params.set('customer', customer);

  const loc = project.jmaForecastLabel?.trim() || project.site?.trim();
  if (loc && !params.has('loc')) params.set('loc', loc);

  const spec = displaySpecFor(project.faces);
  if (spec.logoRequired || project.faces === 5) {
    const logo = assetUrlForQuery(project.logoSrc) || logoSrcFromKey(project.logoKey) || '';
    if (logo && (isKohjiCompany(project.company) || !/kohji/i.test(logo))) {
      params.set('logo', assetFileName(logo));
    }
  }

  if (co === 'morishita' || co === 'kohji' || isKohjiCompany(project.company)) return;

  const banner = assetUrlForQuery(project.footBannerSrc);
  if (banner && !/kohji/i.test(banner)) {
    params.set('banner', assetFileName(banner));
  } else if (!isKohjiCompany(project.company)) {
    params.set('banner', '0');
  }
}

function withLogoDelivery(url: string, project: Project): string {
  persistProjectLogo(project);
  return url.split('#')[0];
}

/** 環境クラウド計測（device）— HTML 本番ループ: s1時刻 → s2現場計測 → s4WBGT → s5予報 → s3多言語 */
export function usesEcsSignageFlow(project: Pick<Project, 'source'>): boolean {
  return project.source === 'device';
}

/** WxTech（ウェザーニューズ）— 現況／体感／4日予報のみ。JMA・環境省は使わない */
export function usesWxtechSignageFlow(project: Pick<Project, 'source'>): boolean {
  return project.source === 'wxtech';
}

/** 割り込みシーン → 警報デザインエンジンの ?only= */
const ENGINE_ONLY_INTERRUPT: Record<string, string> = {
  rain_warn: 'rainwarn',
  flood_info: 'rainwarn',
  landslide_info: 'rainwarn',
  surge_info: 'rainwarn',
  weather_warn: 'rainwarn',
  evac_info: 'evac',
  jishin: 'quake',
  bousai: 'alert',
};

/** 避難・地震は熊本エンジン（鴻治組 HTML に sceneEvac/sceneQuake なし） */
const INTERRUPT_NEEDS_KUMAMOTO = new Set(['evac_info', 'jishin']);

/** 警報・避難・地震・熱中症は警報デザインエンジンでプレビュー（案件 engineFile 優先） */
function usesWarnDesignEngine_(sceneId?: string, fullRotation?: boolean, project?: Pick<Project, 'source'>): boolean {
  if (fullRotation) return false;
  if (project && usesWxtechSignageFlow(project)) return false;
  return !!sceneId && Object.prototype.hasOwnProperty.call(ENGINE_ONLY_INTERRUPT, sceneId);
}

function warnDesignPreviewBase_(project: Project, sceneId?: string): string {
  const base = import.meta.env.BASE_URL || '/';
  const root = base.endsWith('/') ? base : `${base}/`;
  let file = project.engineFile?.trim() || SIGNAGE_ENGINE_FILES.face4Base;
  if (!project.engineFile?.trim() && sceneId && INTERRUPT_NEEDS_KUMAMOTO.has(sceneId)) {
    file = SIGNAGE_ENGINE_FILES.face4Kumamoto;
  }
  return `${root}signage/${file}`;
}

export interface SignageMessageOptions {
  msgText?: string;
  msgStyle?: 'scroll' | 'fixed';
  msgEnabled?: boolean;
  msgDuration?: number;
}

export interface SignageMultilangOptions {
  multilangEnabled?: boolean;
  multilangLangs?: MultilangLangId[];
}

export type SignageContentOptions = SignageMessageOptions & SignageMultilangOptions;

export function resolveMessageOptions(
  scenes: SceneItem[],
  msgText: string,
  msgStyle: 'scroll' | 'fixed',
): SignageMessageOptions {
  const msgScene = scenes.find((s) => s.id === 'message');
  return {
    msgText,
    msgStyle,
    msgEnabled: !!msgScene?.enabled,
    msgDuration: msgScene?.enabled
      ? sceneDurationSeconds(msgScene.duration || 1)
      : undefined,
  };
}

export function resolveSignageContentOptions(
  scenes: SceneItem[],
  msgText: string,
  msgStyle: 'scroll' | 'fixed',
  multilangLangs: MultilangLangId[],
): SignageContentOptions {
  const msgScene = scenes.find((s) => s.id === 'message');
  const multilangScene = scenes.find((s) => s.id === 'multilang');
  const langs = multilangLangs.length ? multilangLangs : [...ALL_MULTILANG_LANGS];
  return {
    msgText,
    msgStyle,
    msgEnabled: !!msgScene?.enabled,
    msgDuration: msgScene?.enabled
      ? sceneDurationSeconds(msgScene.duration || 1)
      : undefined,
    multilangEnabled: !!multilangScene?.enabled,
    multilangLangs: langs,
  };
}

function appendMessageParams(params: URLSearchParams, message?: SignageMessageOptions): void {
  if (!message?.msgEnabled || !message.msgText?.trim()) return;
  params.set('siteMsg', message.msgText.trim());
  params.set('msgStyle', message.msgStyle === 'fixed' ? 'fixed' : 'scroll');
  if (message.msgDuration != null && message.msgDuration > 0) {
    params.set('msgSec', String(message.msgDuration));
  }
}

function appendMultilangParams(params: URLSearchParams, options?: SignageMultilangOptions): void {
  if (!options?.multilangEnabled) return;
  const langs = options.multilangLangs?.filter((l) => ALL_MULTILANG_LANGS.includes(l)) ?? [];
  if (!langs.length) return;
  if (langs.length === 1) {
    params.set('t3lang', langs[0]);
    return;
  }
  if (langs.length < ALL_MULTILANG_LANGS.length) {
    params.set('t3langs', langs.join(','));
  }
}

function appendScenePreviewParams(
  params: URLSearchParams,
  sceneId?: string,
  _alertLevel?: AlertLevelNum,
): void {
  /* 割り込みはサンプルを入れない。エンジンが気象庁・環境省の発表を見て出す */
  if (sceneId === 'amedas') {
    params.set('ecs', '0');
  }
}

/** 管理アプリのシーン ID → 本番 HTML の ?only= 値 */
export function platformSceneToEngineOnly(
  sceneId: string,
  project?: Pick<Project, 'source' | 'faces'>,
): string | null {
  if (ENGINE_ONLY_INTERRUPT[sceneId]) return ENGINE_ONLY_INTERRUPT[sceneId];

  if (sceneId === 'message') return 'message';

  if (sceneId === 'nowcast') return 'nowcast';

  if (isContentSceneId(sceneId)) return sceneId;

  if (sceneId === 'wxtech') return 's2';
  if (sceneId === 'ecs') return 's2';

  if (project && usesEcsSignageFlow(project)) {
    const ecsMap: Record<string, string> = {
      wbgt: 's4',
      ecs: 's2',
      amedas: 's2',
      clock: 's1',
      forecast: 's5',
      multilang: 's3',
    };
    return ecsMap[sceneId] ?? null;
  }

  if (project && usesWxtechSignageFlow(project)) {
    const wxMap: Record<string, string> = {
      wxtech: 's2',
      /* 体感（feeltmp）— WBGTではない */
      wbgt: 's3',
      amedas: 's2',
      forecast: 's4',
      clock: 's2',
    };
    return wxMap[sceneId] ?? null;
  }

  const map4: Record<string, string> = {
    wbgt: 's4',
    amedas: 's2',
    clock: 's1',
    forecast: 's5',
    multilang: 's3',
  };
  if (!project || project.faces === 4 || project.faces === 3) {
    return map4[sceneId] ?? null;
  }

  /* 5面エンジン: 1時刻(s1) → 2アメダス(s2) → 3WBGT(s4) → 4予報(s5) → 5多言語(s3) */
  const map5: Record<string, string> = {
    clock: 's1',
    amedas: 's2',
    wbgt: 's4',
    forecast: 's5',
    multilang: 's3',
  };
  return map5[sceneId] ?? null;
}

export function canPreviewScene(
  sceneId: string,
  project?: Pick<Project, 'source' | 'faces'>,
  mediaByScene?: SceneMediaMap,
): boolean {
  if (isMediaSceneId(sceneId)) {
    return !!mediaByScene?.[sceneId]?.dataUrl;
  }
  return platformSceneToEngineOnly(sceneId, project) != null;
}

export interface SignagePreviewOptions extends SignageContentOptions {
  /** 管理アプリのシーン ID（fullRotation 時は無視） */
  sceneId?: string;
  /** true: 本番同様に全シーン巡回（横スクロール含む） */
  fullRotation?: boolean;
  /** ON のメインループだけ流す（?loop=）。省略時は従来どおり全シーン */
  loopKeys?: string[];
  /** デモ WBGT レベル 1〜5（省略時は HTML 側デフォルト） */
  level?: number;
  /** 警戒レベル4種プレビュー用（2〜5）。気象庁凡例の注意報〜特別警報 */
  alertLevel?: AlertLevelNum;
  /** false のとき live 取得（既定: 本番データ） */
  demo?: boolean;
  /** false: 本番タブ表示（embed なし・native640） */
  embed?: boolean;
  version?: string;
}

function appendSourceParams(params: URLSearchParams, project: Project): void {
  if (project.source === 'device') {
    const dataId = resolveEcsDataId(project);
    if (dataId) params.set('ecsDataId', dataId);
    appendWeatherPointParams(params, project);
    const proxy = import.meta.env.VITE_ECS_PROXY_URL?.trim();
    if (proxy) params.set('ecsProxy', proxy);
    const ecsGas = import.meta.env.VITE_ECS_GAS_URL?.trim() || project.ecsGasUrl?.trim() || DEFAULT_ECS_GAS_URL;
    if (ecsGas) params.set('ecsGas', ecsGas);
  } else if (project.source === 'wxtech') {
    const wxGas =
      project.wxtechGasUrl?.trim() ||
      import.meta.env.VITE_WXTECH_GAS_URL?.trim() ||
      'https://script.google.com/macros/s/AKfycbxIdjloOZpfmMCZYLlebfviFUr434H-LlAR1GLPLhDltaRUTqx6tQHAq6Q7Fxy-d_uG/exec';
    if (wxGas) params.set('wxGas', wxGas);
    const siteKey = wxtechSiteKey(project);
    if (siteKey) params.set('wxSite', siteKey);
    if (project.geo?.lat != null) params.set('rainLat', String(project.geo.lat));
    if (project.geo?.lon != null) params.set('rainLon', String(project.geo.lon));
    const loc = project.jmaForecastLabel?.trim() || project.site?.trim();
    if (loc) params.set('loc', loc);
  } else if (project.source === 'jma') {
    appendWeatherPointParams(params, project);
  } else if (project.source === 'edam') {
    if (project.sourceId?.trim()) params.set('moePoint', project.sourceId.trim());
  } else {
    appendWeatherPointParams(params, project);
  }
}

function appendLayoutParams(params: URLSearchParams, faces: number): void {
  const spec = displaySpecFor(faces);
  /* 4面エンジンは HTML 既定で 512。URL に layout512 を載せない */
  if (spec.layout512) return;
  if (spec.native640) params.set('native640', '1');
}

export interface PublicSignageUrlOptions extends SignageContentOptions {
  version?: string;
  /** true: デモデータ（プレビュー用） */
  demo?: boolean;
  /** ON のメインループだけ流す（?loop=） */
  loopKeys?: string[];
}

/**
 * 一般公開用 URL（embed なし・本番タブと同じ表示）。
 * VITE_SIGNAGE_URL または開発時は /signage 配下の HTML を指す。
 */
export function buildPublicSignageUrl(
  project: Project,
  _equip: Equipment[],
  options: PublicSignageUrlOptions = {},
): string {
  const params = new URLSearchParams();
  appendLayoutParams(params, project.faces);
  if (options.demo) params.set('demo', '1');
  appendSourceParams(params, project);
  appendSiteIdentityParams(params, project);
  appendMessageParams(params, options);
  appendMultilangParams(params, options);
  appendLoopParams(params, options.loopKeys);
  return withLogoDelivery(`${buildSignageBase(project)}?${params.toString()}`, project);
}

/** 案件の現在の地点・シーンから、Chrome に貼る本番 URL を組み立てる */
export function buildProjectPublicUrl(
  project: Project,
  equip: Equipment[],
  sceneConfig?: {
    scenes?: SceneItem[];
    msgText?: string;
    msgStyle?: 'scroll' | 'fixed';
    multilangLangs?: MultilangLangId[];
  } | null,
): string {
  const scenes = sceneConfig?.scenes ?? [];
  const loopKeys = scenes.length ? enabledEngineLoopKeys(scenes, project) : undefined;
  return buildPublicSignageUrl(project, equip, {
    msgText: sceneConfig?.msgText,
    msgStyle: sceneConfig?.msgStyle,
    msgEnabled: Boolean(scenes.some((s) => s.id === 'message' && s.enabled)),
    multilangEnabled: Boolean(scenes.some((s) => s.id === 'multilang' && s.enabled)),
    multilangLangs: sceneConfig?.multilangLangs,
    loopKeys,
  });
}

/** シーン設定・プレビュー画面用 iframe URL（本番 HTML・デザイン固定） */
export function buildSignagePreviewUrl(
  project: Project,
  _equip: Equipment[],
  options: SignagePreviewOptions = {},
): string {
  const warnDesign = usesWarnDesignEngine_(options.sceneId, options.fullRotation, project);
  const params = new URLSearchParams();
  if (options.embed !== false) params.set('embed', '1');
  if (options.demo) params.set('demo', '1');

  if (!options.fullRotation && options.sceneId) {
    const only = platformSceneToEngineOnly(options.sceneId, project);
    if (only) params.set('only', only);
    appendScenePreviewParams(params, options.sceneId, options.alertLevel);
  } else if (options.fullRotation || options.loopKeys != null) {
    appendLoopParams(params, options.loopKeys ?? null);
  }

  if (options.level != null && options.level >= 1 && options.level <= 5) {
    /* WBGT デモ段階。警戒レベル4種プレビューでは送らない */
    if (!options.sceneId || !isAlertLevelSceneId(options.sceneId)) {
      params.set('level', String(options.level));
    }
  }

  appendSourceParams(params, project);
  appendSiteIdentityParams(params, project);
  appendMessageParams(params, options);
  appendMultilangParams(params, options);

  const base = warnDesign ? warnDesignPreviewBase_(project, options.sceneId) : previewSignageBase(project);
  params.set('_cb', SIGNAGE_DESIGN_REV);
  return withLogoDelivery(`${base}?${params.toString()}`, project);
}

export function buildDeployUrl(
  project: Project,
  _version: string,
  _equip: Equipment[],
  options?: SignageContentOptions & { loopKeys?: string[] },
): string {
  const params = new URLSearchParams();
  appendLayoutParams(params, project.faces);
  appendSourceParams(params, project);
  appendSiteIdentityParams(params, project);
  appendMessageParams(params, options);
  appendMultilangParams(params, options);
  appendLoopParams(params, options?.loopKeys);
  return withLogoDelivery(`${buildSignageBase(project)}?${params.toString()}`, project);
}

export function runDeployChecks(
  project: Project,
  scenes: SceneItem[],
  equip: Equipment[],
  pixel?: string,
): DeployCheck[] {
  const token = deviceTokenFor(project, equip);
  const tokenOk = A35_TOKEN_RE.test(token);
  const edamOk = project.source !== 'edam' || Boolean(project.sourceId?.trim());
  const deviceOk = project.source !== 'device' || Boolean(project.sourceId?.trim());
  const wxtechOk =
    project.source !== 'wxtech' ||
    Boolean(
      project.wxtechSite?.trim() ||
        project.sourceId?.trim() ||
        (project.geo?.lat != null && project.geo?.lon != null),
    );
  const deviceWeatherOk =
    project.source !== 'device' ||
    Boolean(project.moePoint?.trim() || project.jmaPoint?.trim());
  const loidOk = edamOk && deviceOk && wxtechOk;
  const spec = displaySpecFor(project.faces);
  const pixelCheck = pixel != null && pixel !== '' ? validatePixel(project.faces, pixel) : { ok: true, expected: spec.pixelLabel };
  const logoOk = !spec.logoRequired || Boolean(project.logoSrc?.trim());
  const creditCheckOk = creditOk(project);
  const enabled = scenes.filter((s) => s.enabled);
  const scenesOk = enabled.length >= 1;
  const durationOk = enabled.every((s) => s.duration > 0);
  const manualWarn = project.source === 'manual';
  const engineFile = resolveSignageEngineFile(project);
  const pointOk = manualWarn || Boolean(buildSignageConfig(project, scenes, equip, 'v2.1').point_id);

  return [
    {
      id: 'engine',
      label: '\u30b5\u30a4\u30cd\u30fc\u30b8\u30a8\u30f3\u30b8\u30f3',
      ok: true,
      detail:
        project.source === 'wxtech'
          ? `Cube4面 WxTech（${engineFile}）`
          : project.source === 'device' && project.faces === 4
          ? `Cube4面 ECS 連携（${engineFile}）`
          : `${signageFacesLabelForProject(project)} ${spec.pixelLabel}（${engineFile}）`,
      blocking: false,
    },
    {
      id: 'layout',
      label: '\u89e3\u50cf\u5ea6\u30fb\u9762\u6570',
      ok: pixelCheck.ok,
      detail: pixelCheck.ok
        ? `${signageFacesLabelForProject(project)} / ${spec.totalWidth}\u00d7${spec.totalHeight} / ${spec.layoutMode}`
        : pixelCheck.message ?? `\u63a8\u5968 ${pixelCheck.expected}`,
      blocking: !pixelCheck.ok,
    },
    {
      id: 'logo',
      label: '\u30ed\u30b4\uff085\u9762\u5fc5\u9808\uff09',
      ok: logoOk,
      detail: spec.logoRequired
        ? logoOk ? '\u30ed\u30b4\u8a2d\u5b9a\u6e08\u307f' : '5\u9762\u306f\u53f3\u7aef\u5217\u30ed\u30b4\u304c\u5fc5\u9808\u3067\u3059'
        : '\u4e0d\u8981\uff084\u9762\u306f\u30ed\u30b4\u5217\u306a\u3057\uff09',
      blocking: spec.logoRequired,
    },
    {
      id: 'credit',
      label: '\u6c17\u8c61\u696d\u52d9\u6cd5\u30af\u30ec\u30b8\u30c3\u30c8',
      ok: creditCheckOk,
      detail: configRequiresCredit(project)
        ? project.source === 'wxtech'
          ? WXTECH_CREDIT
          : JMA_CREDIT
        : '\u624b\u52d5\u5165\u529b\u6848\u4ef6\uff08\u81ea\u52d5\u66f4\u65b0\u306a\u3057\uff09',
      blocking: configRequiresCredit(project),
    },
    {
      id: 'loid',
      label: 'WBGT\u30dd\u30a4\u30f3\u30c8 / \u8a08\u6e2c\u5668ID',
      ok: loidOk && pointOk,
      detail: !loidOk
        ? project.source === 'wxtech'
          ? 'WxTech \u5730\u70b9\uff08site / lat\u30fblon\uff09\u304c\u672a\u8a2d\u5b9a\u3067\u3059'
          : project.source === 'device'
          ? 'ECS Data ID \u304c\u672a\u8a2d\u5b9a\u3067\u3059'
          : 'e-Dam \u306e LoID \u304c\u672a\u8a2d\u5b9a\u3067\u3059'
        : !pointOk
          ? '\u5730\u70b9ID\u304c\u672a\u8a2d\u5b9a\u3067\u3059'
          : project.source === 'wxtech'
            ? `WxTech: ${project.wxtechSite || project.sourceId || `${project.geo?.lat},${project.geo?.lon}`}`
            : project.source === 'device'
            ? `ECS: ${project.sourceId} / MOE: ${project.moePoint || '\u2014'}`
            : `\u8a2d\u5b9a\u6e08\u307f: ${project.sourceId || project.moePoint}`,
      blocking:
        project.source === 'edam' ||
        project.source === 'device' ||
        project.source === 'jma' ||
        project.source === 'wxtech',
    },
    {
      id: 'device_weather',
      label: '\u5929\u6c17\u30fbWBGT\u30d5\u30a9\u30fc\u30eb\u30d0\u30c3\u30af',
      ok: project.source !== 'device' || deviceWeatherOk,
      detail: deviceWeatherOk
        ? project.source === 'device'
          ? `\u74b0\u5883\u7701/${project.moePoint || project.jmaPoint || '\u672a\u8a2d\u5b9a'} \u2192 ECS\u5931\u6557\u6642\u30d5\u30a9\u30fc\u30eb\u30d0\u30c3\u30af`
          : '\u4e0d\u8981'
        : 'ECS \u9023\u643a\u6642\u306f\u74b0\u5883\u7701\u5730\u70b9\uFF08moePoint\uFF09\u3092\u8a2d\u5b9a\u3057\u3066\u304f\u3060\u3055\u3044',
      blocking: project.source === 'device',
    },
    {
      id: 'token',
      label: '\u30c7\u30d0\u30a4\u30b9\u30c8\u30fc\u30af\u30f3',
      ok: tokenOk,
      detail: tokenOk ? token : `a35_<\u62e1\u70b9>_001 \u5f62\u5f0f\u3067\u3042\u308a\u307e\u305b\u3093\uff08\u73fe\u5728: ${token}\uff09`,
      blocking: false,
    },
    {
      id: 'scenes',
      label: '\u30b7\u30fc\u30f3\u6574\u5408\u6027',
      ok: scenesOk && durationOk,
      detail: scenesOk && durationOk
        ? `\u6709\u52b9 ${enabled.length}\u30b7\u30fc\u30f3`
        : enabled.length < 1
          ? 'ON\u306e\u30b7\u30fc\u30f3\u304c\u3042\u308a\u307e\u305b\u3093'
          : '\u8868\u793a\u79d2\u6570\u304c\u4e0d\u5341\u5206\u3067\u3059',
      blocking: false,
    },
    {
      id: 'wbgt_test',
      label: 'WBGT\u53d6\u5f97\u30c6\u30b9\u30c8',
      ok: project.source === 'manual' ? true : loidOk && deviceWeatherOk && pointOk,
      detail: manualWarn
        ? '\u624b\u52d5\u5165\u529b\u306e\u305f\u3081\u81ea\u52d5\u66f4\u65b0\u306a\u3057\uff08\u53d6\u5f97\u5931\u6557\u6642\u306f\u300c\u53d6\u5f97\u4e0d\u53ef\u300d\u8868\u793a\uff09'
        : loidOk && deviceWeatherOk && pointOk
          ? project.source === 'device'
            ? 'ECS \u2192 \u74b0\u5883\u7701\u306e\u512a\u5148\u9806\u4f4d\u3067\u53d6\u5f97\u53ef\u80fd\u3068\u5224\u5b9a'
            : '\u30dd\u30a4\u30f3\u30c8\u8a2d\u5b9a\u304b\u3089\u53d6\u5f97\u53ef\u80fd\u3068\u5224\u5b9a'
          : '\u53d6\u5f97\u5931\u6557\u306e\u305f\u3081\u30c7\u30d7\u30ed\u30a4\u3067\u304d\u307e\u305b\u3093\uff08\u30d5\u30a9\u30fc\u30eb\u30d0\u30c3\u30af\u5024\u306f\u51fa\u3055\u306a\u3044\uff09',
      blocking: !manualWarn && (!loidOk || !deviceWeatherOk || !pointOk),
    },
  ];
}

export function deployBlocked(checks: DeployCheck[]): boolean {
  return checks.some((c) => c.blocking && !c.ok);
}

/** Chrome URL 発行に必要な地点が入っているか（トークン形式は問わない） */
export function locationReadyForPublish(project: Project): boolean {
  if (project.source === 'wxtech') {
    return Boolean(
      project.wxtechSite?.trim() ||
        project.sourceId?.trim() ||
        (project.geo?.lat != null && project.geo?.lon != null),
    );
  }
  if (project.source === 'device') {
    return Boolean(project.sourceId?.trim() || project.moePoint?.trim() || project.jmaPoint?.trim());
  }
  return Boolean(project.moePoint?.trim() || project.jmaPoint?.trim() || project.sourceId?.trim());
}

export { buildSignageConfig };
