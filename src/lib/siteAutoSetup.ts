/**
 * 地点ID入力 → 案件・フォーム・シーン設定を自動生成（コード不要）
 */

import { lookupAmedasPoint } from '../data/amedasPoints';
import { jmaAreaForPrefecture } from '../data/jmaAreaCodes';
import { SITE_TEMPLATES, templateIdForProject, type SiteTemplateId } from '../data/projectTemplates';
import { DEFAULT_MOE_GAS_URL } from './signageRuntimeConfig';
import { displaySpecFor, inferSignageKind, signageFacesLabel } from '../core/layoutRegistry';
import {
  DEFAULT_ROTATION_SETTINGS,
  sceneDurationsFromPreset,
} from '../core/rotationPresets';
import { SCENE_CATALOG } from '../data/mock';
import { L } from '../i18n/labels';
import { cycleLapTotal } from './sceneCycle';
import { defaultSceneIds } from './sceneList';
import type { Project, ProjectForm, SceneItem, DataSource } from '../types';
import type { SceneConfig } from './storage';
import { normalizeMultilangLangs } from './multilang';

export type LocationIdKind = 'amedas' | 'ecs' | 'loid' | 'unknown';

export interface QuickSetupInput {
  templateId: SiteTemplateId;
  company: string;
  companyId?: string;
  listing?: 'paid' | 'demo';
  site: string;
  prefecture: string;
  /** 5桁 AMeDAS / 3–4桁 ECS Data ID */
  locationId: string;
  ecsDataId?: string;
  ecsLoId?: string;
  siteAddress?: string;
  contactName?: string;
}

export interface AutoSetupSummaryRow {
  label: string;
  value: string;
}

export interface AutoSetupResult {
  form: ProjectForm;
  projectFields: Omit<Project, 'id' | 'status' | 'lastDeploy' | 'engine' | 'deviceToken'>;
  sceneConfig: SceneConfig;
  summary: AutoSetupSummaryRow[];
  warnings: string[];
  deployUrlHint: string;
}

/** 入力IDの種別を推定 */
export function detectLocationIdKind(raw: string): LocationIdKind {
  const v = raw.trim();
  if (/^\d{5}$/.test(v)) return 'amedas';
  if (/^\d{3,4}$/.test(v)) return 'ecs';
  if (/^LOID-/i.test(v) || /^[A-Za-z0-9_-]{8,}$/.test(v)) return 'loid';
  return 'unknown';
}

function initScenesFromTemplate(
  contracted: string[],
  durations: Record<string, number>,
  source: Project['source'] = 'edam',
): SceneItem[] {
  const project = { contracted, source } as Project;
  return defaultSceneIds(project).map((id) => ({
    id,
    enabled: true,
    duration: durations[id] ?? SCENE_CATALOG[id]?.dur ?? 8,
  }));
}

function buildSceneConfig(contracted: string[], source: Project['source'] = 'edam'): SceneConfig {
  const durations = sceneDurationsFromPreset('standard', contracted);
  return {
    scenes: initScenesFromTemplate(contracted, durations, source),
    msgText: '水分補給を忘れずに！',
    msgStyle: 'scroll',
    multilangLangs: normalizeMultilangLangs(),
    rotation: DEFAULT_ROTATION_SETTINGS,
  };
}

function resolvePointMeta(pointCode: string, prefecture: string) {
  const known = lookupAmedasPoint(pointCode);
  if (known) {
    return {
      prefecture: known.prefecture,
      jmaArea: known.jmaArea,
      moePointName: known.name,
      jmaForecastLabel: known.forecastLabel,
      warnCity: known.warnCity,
      geo: known.geo,
    };
  }
  const jma = jmaAreaForPrefecture(prefecture);
  return {
    prefecture,
    jmaArea: jma.area,
    moePointName: jma.pointName,
    jmaForecastLabel: prefecture.replace(/[都道府県]$/, '') || '現場',
    warnCity: undefined as string | undefined,
    geo: undefined as { lat: number; lon: number } | undefined,
  };
}

/** 地点ID + テンプレートからフォーム・案件を一括生成 */
export function buildAutoSetup(input: QuickSetupInput, cloneProject?: Project | null): AutoSetupResult {
  const tpl = SITE_TEMPLATES[input.templateId];
  const warnings: string[] = [];
  const summary: AutoSetupSummaryRow[] = [];
  const locationId = input.locationId.trim();
  const kind = detectLocationIdKind(locationId);

  let source: DataSource = tpl.source;
  let moePoint = '';
  let jmaPoint = '';
  let sourceId = '';
  let ecsLoId = input.ecsLoId?.trim() || cloneProject?.ecsLoId || '';

  if (tpl.source === 'device') {
    if (kind === 'amedas') {
      moePoint = locationId;
      jmaPoint = locationId;
      sourceId = input.ecsDataId?.trim() || tpl.defaultEcsDataId || cloneProject?.sourceId || '';
      if (!sourceId) {
        warnings.push('ECS Data ID が未入力です。現場計測器のIDを入力してください。');
      }
    } else if (kind === 'ecs') {
      sourceId = locationId;
      moePoint = cloneProject?.moePoint || '';
      jmaPoint = cloneProject?.jmaPoint || moePoint;
      if (!moePoint) {
        warnings.push('AMeDAS地点（5桁）を別途指定してください（フォールバック用）。');
      }
    } else {
      warnings.push('地点IDは5桁（AMeDAS）または3–4桁（ECS Data ID）で入力してください。');
    }
  } else if (tpl.source === 'jma') {
    if (kind === 'amedas') {
      moePoint = locationId;
      jmaPoint = locationId;
      sourceId = locationId;
    } else if (kind === 'ecs') {
      warnings.push('気象庁連携テンプレートには5桁のAMeDAS地点を入力してください。');
    } else {
      warnings.push('地点ID（5桁）を入力してください。例: 67437');
    }
  } else if (tpl.source === 'wxtech') {
    source = 'wxtech';
    sourceId = locationId || cloneProject?.wxtechSite || cloneProject?.sourceId || 'suminoe';
  } else {
    source = 'edam';
    if (kind === 'loid') {
      sourceId = locationId;
    } else if (kind === 'amedas') {
      source = 'jma';
      sourceId = locationId;
      moePoint = locationId;
      jmaPoint = locationId;
    } else {
      sourceId = locationId || cloneProject?.sourceId || '';
    }
  }

  const pointMeta = moePoint ? resolvePointMeta(moePoint, input.prefecture) : resolvePointMeta('', input.prefecture);
  if (tpl.source === 'wxtech' && !pointMeta.geo && !cloneProject?.geo) {
    pointMeta.geo = { lat: 34.605184, lon: 135.470949 };
    pointMeta.jmaForecastLabel = '住之江区';
  }
  const prefecture = input.prefecture.trim() || (tpl.source === 'wxtech' ? '大阪府' : pointMeta.prefecture);
  const jma = jmaAreaForPrefecture(prefecture);
  const jmaArea = pointMeta.jmaArea || jma.area;
  const spec = displaySpecFor(tpl.faces);
  const signageKind = inferSignageKind(tpl.faces);

  const contracted = [...tpl.contracted];
  const options = tpl.options;

  const form: ProjectForm = {
    company: input.company.trim(),
    companyId: input.companyId?.trim() || cloneProject?.companyId || '',
    lifecycle: 'draft',
    listing: input.listing === 'demo' ? 'demo' : (cloneProject?.listing === 'demo' ? 'demo' : 'paid'),
    site: input.site.trim(),
    prefecture,
    contactName: input.contactName?.trim() || '担当者',
    tel: '',
    email: '',
    plan: tpl.plan,
    signageKind,
    faces: String(tpl.faces),
    pixel: spec.pixelLabel,
    options: { ...options },
    contractDate: new Date().toISOString().slice(0, 10),
    source,
    sourceId,
    moePoint,
    jmaPoint: jmaPoint || moePoint,
    jmaArea,
    siteAddress: input.siteAddress?.trim() || '',
    ecsLoId,
    moeGasUrl: cloneProject?.moeGasUrl || DEFAULT_MOE_GAS_URL,
    moePointName: pointMeta.moePointName,
    jmaForecastLabel: pointMeta.jmaForecastLabel,
    jmaWarnCity: pointMeta.warnCity || cloneProject?.jmaWarnCity || '',
    geoLat: pointMeta.geo ? String(pointMeta.geo.lat) : (cloneProject?.geo != null ? String(cloneProject.geo.lat) : ''),
    geoLon: pointMeta.geo ? String(pointMeta.geo.lon) : (cloneProject?.geo != null ? String(cloneProject.geo.lon) : ''),
    fallback: false,
    controller: 'a35',
    serial: '',
  };

  const siteLabel = form.site.trim();
  const footSourceEcs =
    source === 'device' && siteLabel
      ? `出典：環境クラウドサービス・${siteLabel}`
      : cloneProject?.footSourceEcs;

  const projectFields: AutoSetupResult['projectFields'] = {
    company: form.company,
    site: form.site,
    plan: form.plan,
    listing: form.listing,
    signageKind,
    faces: tpl.faces,
    pixel: spec.pixelLabel,
    options: Object.entries(options).filter(([, v]) => v).map(([k]) => k),
    contracted,
    source: form.source,
    sourceId: form.sourceId,
    moePoint: form.moePoint,
    jmaPoint: form.jmaPoint,
    jmaArea: form.jmaArea,
    prefecture: form.prefecture,
    siteAddress: form.siteAddress,
    ecsLoId: form.ecsLoId,
    moeGasUrl: form.moeGasUrl,
    moePointName: form.moePointName,
    jmaForecastLabel: form.jmaForecastLabel,
    jmaWarnCity: form.jmaWarnCity.trim() || pointMeta.warnCity || cloneProject?.jmaWarnCity,
    engineFile: tpl.engineFile,
    bosaiOnly: cloneProject?.bosaiOnly === true ? true : false,
    footBannerSrc: tpl.footBannerSrc ?? cloneProject?.footBannerSrc,
    footSourceEcs,
    wxtechSite: source === 'wxtech' ? sourceId : undefined,
    wxtechGasUrl: cloneProject?.wxtechGasUrl,
    geo: (() => {
      const lat = Number.parseFloat(form.geoLat.trim());
      const lon = Number.parseFloat(form.geoLon.trim());
      if (Number.isFinite(lat) && Number.isFinite(lon)) return { lat, lon };
      return pointMeta.geo ?? cloneProject?.geo;
    })(),
    logoSrc: tpl.logoSrc ?? cloneProject?.logoSrc ?? './assets/greencross_logo.png',
  };

  const sceneConfig = buildSceneConfig(contracted, source);

  /** デザイン固定エンジン（CSS は差し替えない） */
  const engine = tpl.engineFile;

  summary.push(
    { label: 'テンプレート', value: tpl.label },
    { label: 'エンジン HTML', value: engine },
    { label: 'デザイン', value: '固定（CSS・DOM 変更なし / 設定のみ差替）' },
    { label: '解像度', value: `${spec.totalWidth}×${spec.totalHeight}（${signageFacesLabel(signageKind, tpl.faces)}）` },
    { label: 'データソース', value: source === 'device' ? 'ECS + 環境省' : source === 'jma' ? '気象庁AMeDAS' : source === 'wxtech' ? 'ウェザーニューズ WxTech' : 'e-Dam' },
    { label: 'AMeDAS / WBGT地点', value: source === 'wxtech' ? '—（未使用）' : moePoint || '—' },
  );
  if (source === 'wxtech') {
    summary.push({ label: 'WxTech site', value: sourceId || 'suminoe' });
  }
  if (source === 'device') {
    summary.push({ label: 'ECS Data ID', value: sourceId || '—' });
    if (ecsLoId) summary.push({ label: 'ECS LoID', value: ecsLoId });
  }
  if (projectFields.geo) {
    summary.push({
      label: '位置（緯度・経度）',
      value: `${projectFields.geo.lat}, ${projectFields.geo.lon}`,
    });
  }
  summary.push(
    { label: '予報区域', value: jmaArea },
    { label: '地点名', value: form.moePointName },
    { label: '契約シーン', value: contracted.map((c) => SCENE_CATALOG[c]?.label ?? c).join(' / ') },
    { label: '1周計', value: L.scene.totalCycle(cycleLapTotal(sceneConfig.scenes)) },
  );

  const deployParams = new URLSearchParams({
    native640: '1',
    layout512: tpl.faces === 4 ? '1' : '0',
    faces: String(tpl.faces),
  });
  if (sourceId && source === 'device') deployParams.set('ecsDataId', sourceId);
  if (source === 'wxtech') {
    deployParams.set('wxSite', sourceId || 'suminoe');
    if (projectFields.geo) {
      deployParams.set('rainLat', String(projectFields.geo.lat));
      deployParams.set('rainLon', String(projectFields.geo.lon));
    }
    if (form.jmaForecastLabel) deployParams.set('loc', form.jmaForecastLabel);
  }
  if (moePoint) {
    deployParams.set('moePoint', moePoint);
    deployParams.set('jmaPoint', jmaPoint || moePoint);
  }
  if (jmaArea) deployParams.set('jmaArea', jmaArea);
  if (projectFields.jmaWarnCity) deployParams.set('warnCity', projectFields.jmaWarnCity);
  if (projectFields.bosaiOnly) deployParams.set('bosaiOnly', '1');

  return {
    form,
    projectFields,
    sceneConfig,
    summary,
    warnings,
    deployUrlHint: `${engine}?${deployParams.toString()}`,
  };
}

/** 既存案件を複製して地点だけ変える（会社・テンプレは引き継ぎ、地点と現場名は空） */
export function cloneQuickInputFromProject(p: Project): QuickSetupInput {
  return {
    templateId: templateIdForProject(p),
    company: p.company,
    companyId: p.companyId ?? '',
    listing: p.listing === 'demo' ? 'demo' : 'paid',
    site: '',
    prefecture: p.prefecture ?? '',
    locationId: '',
    ecsDataId: p.source === 'device' ? '' : '',
    ecsLoId: p.source === 'device' ? '' : '',
    siteAddress: '',
    contactName: '',
  };
}

/** フォームの地点フィールド変更時に差分パッチを返す */
export function patchFormFromPoint(
  pointCode: string,
  prefecture: string,
  partial: Pick<ProjectForm, 'source' | 'site'>,
): Partial<ProjectForm> {
  const code = pointCode.trim();
  if (!/^\d{5}$/.test(code)) return {};

  const meta = resolvePointMeta(code, prefecture);
  const jma = jmaAreaForPrefecture(meta.prefecture || prefecture);

  return {
    moePoint: code,
    jmaPoint: code,
    jmaArea: meta.jmaArea || jma.area,
    moePointName: meta.moePointName,
    jmaForecastLabel: meta.jmaForecastLabel || partial.site.trim(),
    prefecture: meta.prefecture || prefecture,
    ...(meta.warnCity ? { jmaWarnCity: meta.warnCity } : {}),
    ...(meta.geo
      ? { geoLat: String(meta.geo.lat), geoLon: String(meta.geo.lon) }
      : {}),
    ...(partial.source === 'jma' ? { sourceId: code } : {}),
  };
}

/** テンプレート複製元からクイック作成の初期値を生成 */
export function quickSampleForTemplate(templateId: SiteTemplateId, clone?: Project | null): QuickSetupInput {
  const tpl = SITE_TEMPLATES[templateId];
  const base: QuickSetupInput = {
    templateId,
    company: clone?.company ?? '',
    companyId: clone?.companyId ?? '',
    listing: clone?.listing === 'demo' ? 'demo' : 'paid',
    site: clone?.site ?? '',
    prefecture: clone?.prefecture ?? '',
    locationId: clone?.moePoint ?? clone?.sourceId ?? '',
    ecsDataId: tpl.source === 'device' ? (clone?.sourceId ?? tpl.defaultEcsDataId ?? '') : '',
    ecsLoId: clone?.ecsLoId ?? '',
    siteAddress: clone?.siteAddress ?? '',
    contactName: '',
  };
  if (templateId === 'face4_jma') {
    base.locationId = base.locationId || '67116';
    base.prefecture = base.prefecture || '広島県';
    if (!base.company) base.company = '鴻治組';
    if (!base.site) base.site = '庄原市会場';
    if (!base.siteAddress) base.siteAddress = '〒729-5601 広島県庄原市西城町小鳥原';
  } else if (templateId === 'face4_okinawa_kumejima') {
    base.locationId = base.locationId || '91166';
    base.prefecture = base.prefecture || '沖縄県';
    if (!base.company) base.company = '沖縄DS';
    if (!base.site) base.site = '久米島';
    if (!base.siteAddress) base.siteAddress = '沖縄県島尻郡久米島町';
  } else if (templateId === 'face5_standard') {
    base.locationId = base.locationId || '62078';
    base.prefecture = base.prefecture || '大阪府';
    if (!base.company) base.company = clone?.company || '近江八幡組';
    if (!base.site) base.site = clone?.site || '八幡工区';
    if (!base.siteAddress) {
      base.siteAddress = clone?.siteAddress || '大阪府大阪市住之江区新北島一丁目';
    }
  } else if (templateId === 'face4_ecs') {
    base.locationId = base.locationId || '71106';
    base.ecsDataId = base.ecsDataId || '1050';
    base.ecsLoId = base.ecsLoId || '019373';
    base.prefecture = base.prefecture || '徳島県';
    if (!base.company) base.company = '佐々木建設';
    if (!base.site) base.site = '老門作業所';
    if (!base.siteAddress) {
      base.siteAddress = '〒771-0203 徳島県板野郡北島町中村前須13-9';
    }
  }
  return base;
}

export function patchQuickInputFromPoint(
  input: QuickSetupInput,
  pointCode: string,
): Partial<QuickSetupInput> {
  const code = pointCode.trim();
  if (!/^\d{5}$/.test(code)) return {};
  const meta = lookupAmedasPoint(code);
  if (!meta) return {};
  return {
    prefecture: input.prefecture.trim() || meta.prefecture,
    ...(input.templateId === 'face4_ecs' && code === '71106' && !input.ecsDataId?.trim()
      ? { ecsDataId: '1050', ecsLoId: input.ecsLoId?.trim() || '019373' }
      : {}),
  };
}

export function validateQuickSetup(input: QuickSetupInput): string[] {
  const errs: string[] = [];
  if (!input.company.trim()) errs.push('会社名を入力してください');
  if (!input.site.trim()) errs.push('現場名を入力してください');
  if (!input.locationId.trim()) errs.push('地点IDを入力してください');
  const tpl = SITE_TEMPLATES[input.templateId];
  if (tpl.source === 'device') {
    const kind = detectLocationIdKind(input.locationId);
    if (kind === 'amedas' && !input.ecsDataId?.trim()) {
      errs.push('ECS Data ID を入力してください');
    }
    if (kind === 'ecs' && !input.ecsDataId?.trim() && !/^\d{3,4}$/.test(input.locationId.trim())) {
      errs.push('ECS Data ID を入力してください');
    }
  }
  return errs;
}
