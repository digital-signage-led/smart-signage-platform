import { createContext, useContext, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  INITIAL_EQUIP_LOG,
  SCENE_CATALOG, CURRENT_USER, MON_DATA,
} from '../data/mock';
import { genToken, nowStr, slugId } from '../lib/format';
import { loadStorage, saveStorage, type SceneConfig } from '../lib/storage';
import type { SceneMediaAsset, SceneMediaMap } from '../lib/sceneMedia';
import type { SignageDeployConfig } from '../lib/signageConfig';
import { buildDeployUrl, buildPublicSignageUrl, buildProjectPublicUrl, buildSignageConfig, canPreviewScene, enabledEngineLoopKeys, locationReadyForPublish, resolveSignageContentOptions, runDeployChecks, type DeployCheck } from '../lib/deploy';
import {
  buildRuntimeExportBundle,
  buildSiteSignageHtml,
  downloadTextFile,
  fetchSignageTemplateHtml,
  suggestedHtmlFilename,
} from '../lib/signageHtmlExport';
import { runtimeConfigJson } from '../lib/signageRuntimeConfig';
import { ensureEcsScene, ensureWxtechScene, ensureAmedasScene, ensureMultilangScene, ensureContractedScenes, defaultSceneIds, normalizeProjectContracted, sortRotationByLoopOrder, syncExternalApiScenes } from '../lib/sceneList';
import { isRetiredContentSceneId } from '../lib/contentScenes';
import { isExternalApiSceneId, projectAfterExternalApiToggle } from '../lib/externalApiScenes';
import { sceneLapDisplayMs, reorderRotationScenes, isRotationLoopScene, clampSceneLaps, sortPlaylistByEnabled, enabledPreviewPlaybackScenes } from '../lib/sceneCycle';
import {
  normalizeMultilangLangs,
  toggleMultilangLangInList,
  MULTILANG_LANG_LABELS_JA,
  type MultilangLangId,
} from '../lib/multilang';
import {
  DEFAULT_ROTATION_SETTINGS,
  sceneDurationsFromPreset,
  type RotationSettings,
} from '../core/rotationPresets';
import type {
  Page, Project, ProjectForm, SceneItem, DeployRecord, Equipment, EquipLogEntry,
  MonRecord, ConfirmConfig, MonSite, Company,
} from '../types';
import { L } from '../i18n/labels';
import { printAllListsPdf } from '../lib/listPdf';
import {
  applyCompanyToProjectFields,
  companyIdFromName,
  enrichProjectRegistry,
  lifecycleOf,
  logoSrcFromKey,
  normalizeLogoKey,
} from '../lib/companies';
import {
  buildAutoSetup,
  cloneQuickInputFromProject,
  emptyQuickInput,
  patchFormFromPoint,
  patchQuickInputFromPoint,
  validateQuickSetup,
  type AutoSetupResult,
  type QuickSetupInput,
} from '../lib/siteAutoSetup';
import { controllerMeta, isControllerEquipType } from '../core/controllerRegistry';
import {
  inferSignageKind,
  displaySpecForSignage,
  signageKindMeta,
} from '../core/layoutRegistry';
import { SITE_TEMPLATES } from '../data/projectTemplates';

function emptyForm(): ProjectForm {
  return {
    company: '', companyId: '', corpTitlePos: 'none', lifecycle: 'draft', listing: 'paid', site: '', prefecture: '', contactName: '', tel: '', email: '',
    plan: 'standard', signageKind: 'cube', faces: '4', pixel: '512x128',
    options: { rain_warn: false, flood_info: false, landslide_info: false, surge_info: false, weather_warn: false, evac_info: false, jishin: false, bousai: false, multilang: false, slogan: false, wind_meter: false, nowcast: false, video: false, pdf: false },
    contractDate: '', source: 'edam', sourceId: '', moePoint: '', jmaPoint: '', jmaArea: '',
    siteAddress: '', ecsLoId: '', moeGasUrl: '', moePointName: '', jmaForecastLabel: '',
    jmaWarnCity: '', geoLat: '', geoLon: '',
    fallback: false, controller: 'a35', serial: '',
  };
}

function formFromProject(p: Project): ProjectForm {
  const kind = p.signageKind ?? inferSignageKind(p.faces);
  const spec = displaySpecForSignage(kind, p.faces);
  return {
    company: p.company, companyId: p.companyId ?? '', corpTitlePos: p.corpTitlePos ?? 'none', lifecycle: lifecycleOf(p),
    listing: p.listing === 'demo' ? 'demo' : 'paid',
    site: p.site, prefecture: p.prefecture ?? '', contactName: '', tel: '', email: '',
    plan: p.plan, signageKind: kind, faces: String(spec.faces), pixel: spec.pixelLabel,
    options: {
      rain_warn: p.options.includes('rain_warn'),
      flood_info: p.options.includes('flood_info'),
      landslide_info: p.options.includes('landslide_info'),
      surge_info: p.options.includes('surge_info'),
      weather_warn: p.options.includes('weather_warn'),
      evac_info: p.options.includes('evac_info'),
      jishin: p.options.includes('jishin'),
      bousai: p.options.includes('bousai'),
      multilang: p.options.includes('multilang'),
      slogan: p.options.includes('slogan'),
      wind_meter: p.options.includes('wind_meter'),
      nowcast: p.options.includes('nowcast'),
      video: p.options.includes('video'),
      pdf: p.options.includes('pdf'),
    },
    contractDate: p.lastDeploy || '', source: p.source ?? 'edam', sourceId: p.sourceId ?? '',
    moePoint: p.moePoint ?? '', jmaPoint: p.jmaPoint ?? '', jmaArea: p.jmaArea ?? '',
    siteAddress: p.siteAddress ?? '', ecsLoId: p.ecsLoId ?? '', moeGasUrl: p.moeGasUrl ?? '',
    moePointName: p.moePointName ?? '', jmaForecastLabel: p.jmaForecastLabel ?? '',
    jmaWarnCity: p.jmaWarnCity ?? '',
    geoLat: p.geo?.lat != null ? String(p.geo.lat) : '',
    geoLon: p.geo?.lon != null ? String(p.geo.lon) : '',
    fallback: false, controller: 'a35', serial: '',
  };
}

function geoFromForm(form: ProjectForm): { lat: number; lon: number } | undefined {
  const lat = Number.parseFloat(form.geoLat.trim());
  const lon = Number.parseFloat(form.geoLon.trim());
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return undefined;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return undefined;
  return { lat, lon };
}

function contractedFromForm(form: ProjectForm): string[] {
  const c = ['clock', 'message'];
  if (form.options.rain_warn) c.push('rain_warn');
  if (form.options.flood_info) c.push('flood_info');
  if (form.options.landslide_info) c.push('landslide_info');
  if (form.options.surge_info) c.push('surge_info');
  if (form.options.weather_warn) c.push('weather_warn');
  if (form.options.evac_info) c.push('evac_info');
  if (form.options.jishin) c.push('jishin');
  if (form.options.bousai) c.push('bousai');
  if (form.options.multilang) c.push('multilang');
  if (form.options.nowcast) c.push('nowcast');
  if (form.options.video) c.push('video');
  if (form.options.pdf) c.push('pdf');
  return normalizeProjectContracted({
    contracted: c,
    options: optionsFromForm(form),
    plan: form.plan,
  });
}

function optionsFromForm(form: ProjectForm): string[] {
  return Object.entries(form.options).filter(([, v]) => v).map(([k]) => k);
}

function loadSceneConfig(proj: Project, saved: Record<string, SceneConfig>) {
  const project = { ...proj, contracted: normalizeProjectContracted(proj) };
  const cfg = saved[project.id];
  if (cfg?.scenes?.length) {
    let scenes = normalizeScenes(cfg.scenes);
    scenes = ensureEcsScene(scenes, project);
    scenes = ensureWxtechScene(scenes, project);
    scenes = syncExternalApiScenes(scenes, project);
    scenes = ensureAmedasScene(scenes, project);
    scenes = ensureMultilangScene(scenes, project);
    scenes = ensureContractedScenes(scenes, project);
    scenes = sortRotationByLoopOrder(scenes);
    scenes = sortPlaylistByEnabled(scenes);
    return {
      ...cfg,
      scenes,
      multilangLangs: normalizeMultilangLangs(cfg.multilangLangs),
      rotation: cfg.rotation ?? DEFAULT_ROTATION_SETTINGS,
      mediaByScene: cfg.mediaByScene ?? {},
    };
  }
  const durations = sceneDurationsFromPreset('standard', project.contracted ?? []);
  let scenes = ensureContractedScenes(initScenes(project, durations), project);
  scenes = ensureEcsScene(scenes, project);
  scenes = ensureWxtechScene(scenes, project);
  scenes = syncExternalApiScenes(scenes, project);
  scenes = ensureAmedasScene(scenes, project);
  scenes = ensureMultilangScene(scenes, project);
  return {
    scenes: sortPlaylistByEnabled(sortRotationByLoopOrder(scenes)),
    msgText: '\u6c34\u5206\u88dc\u7d66\u3092\u5fd8\u308c\u305a\u306b\uff01',
    msgStyle: 'scroll' as const,
    multilangLangs: normalizeMultilangLangs(),
    rotation: DEFAULT_ROTATION_SETTINGS,
    mediaByScene: {},
  };
}

function initScenes(p: Project, durations?: Record<string, number>): SceneItem[] {
  return normalizeScenes(defaultSceneIds(p).map((id) => ({
    id,
    enabled: true,
    duration: durations?.[id] ?? SCENE_CATALOG[id].dur,
  })));
}

function normalizeScenes(scenes: SceneItem[]): SceneItem[] {
  /* enabled はユーザー選択を尊重（カタログ basic で強制 ON しない） */
  return scenes.filter((s) => Boolean(SCENE_CATALOG[s.id]) && !isRetiredContentSceneId(s.id));
}

function defaultQuickInput(): QuickSetupInput {
  return emptyQuickInput('face4_jma');
}

interface AppContextValue {
  page: Page;
  setPage: (p: Page) => void;
  projects: Project[];
  companies: Company[];
  upsertCompany: (c: Omit<Company, 'id'> & { id?: string }) => void;
  applyCompanyToForm: (companyId: string) => void;
  copyProjectUrl: (p: Project) => void;
  projectPublicUrl: (p: Project) => string;
  exportListsPdf: () => void;
  formMode: 'new' | 'edit';
  form: ProjectForm;
  formProject: Project | null;
  errors: Record<string, string>;
  logo: { name: string; url: string } | null;
  openNew: () => void;
  openQuickSetup: () => void;
  openCloneSetup: (p: Project) => void;
  openEdit: (p: Project) => void;
  askDeleteProject: (p: Project) => void;
  backToList: (msg?: string) => void;
  backToStudio: (msg?: string) => void;
  setFormField: (k: keyof ProjectForm, v: ProjectForm[keyof ProjectForm]) => void;
  toggleFormOpt: (k: keyof ProjectForm['options']) => void;
  validateAndSave: () => void;
  setLogo: (logo: { name: string; url: string } | null) => void;
  listSearch: string;
  setListSearch: (s: string) => void;
  listCompanyId: string;
  setListCompanyId: (s: string) => void;
  listPrefecture: string;
  setListPrefecture: (s: string) => void;
  listListing: string;
  setListListing: (s: string) => void;
  listView: 'card' | 'list';
  setListView: (v: 'card' | 'list') => void;
  sceneProject: Project | null;
  scenes: SceneItem[];
  openScene: (p?: Project) => void;
  selectSceneProject: (id: string) => void;
  saveScenesNow: () => void;
  toggleScene: (id: string) => void;
  patchSceneProject: (partial: Partial<Project>) => void;
  setSceneDuration: (id: string, val: number) => void;
  setSceneLaps: (id: string, laps: number) => void;
  setCycleTotal: (seconds: number) => void;
  reorderScenes: (from: number, to: number) => void;
  reorderRotationScenes: (from: number, to: number) => void;
  dragIndex: number | null;
  setDragIndex: (i: number | null) => void;
  msgText: string;
  setMsgText: (s: string) => void;
  msgStyle: 'scroll' | 'fixed';
  setMsgStyle: (s: 'scroll' | 'fixed') => void;
  multilangLangs: MultilangLangId[];
  toggleMultilangLang: (lang: MultilangLangId) => void;
  mediaByScene: SceneMediaMap;
  setSceneMedia: (sceneId: string, asset: SceneMediaAsset) => void;
  removeSceneMedia: (sceneId: string) => void;
  rotation: RotationSettings;
  setRotation: (patch: Partial<RotationSettings>) => void;
  pvIdx: number;
  pvProgress: number;
  pvPlaying: boolean;
  setPvPlaying: (b: boolean) => void;
  pvSpeed: number;
  setPvSpeed: (n: number) => void;
  pvFull: boolean;
  setPvFull: (b: boolean) => void;
  jumpPreview: (i: number) => void;
  pvPrev: () => void;
  pvNext: () => void;
  openPreview: (p?: Project) => void;
  dpVersion: string;
  setDpVersion: (v: string) => void;
  dpTestEnv: boolean;
  setDpTestEnv: (b: boolean) => void;
  dpStatus: string;
  dpProgress: number;
  dpHistory: DeployRecord[];
  openDeploy: (p?: Project) => void;
  deployUrl: string;
  publicSignageUrl: string;
  deployConfig: SignageDeployConfig | null;
  deployRuntimeJson: string;
  downloadSiteHtml: () => Promise<void>;
  deployChecks: DeployCheck[];
  askDeploy: () => void;
  askRollback: (v: string) => void;
  monSearch: string;
  setMonSearch: (s: string) => void;
  monStatus: string;
  setMonStatus: (s: string) => void;
  monPlan: string;
  setMonPlan: (s: string) => void;
  monNow: number;
  monRecords: Record<string, MonRecord>;
  monDetailId: string | null;
  openMonDetail: (id: string) => void;
  closeMonDetail: () => void;
  monDraftStatus: string;
  setMonDraftStatus: (s: string) => void;
  monDraftNote: string;
  setMonDraftNote: (s: string) => void;
  saveMonRecord: () => void;
  monData: MonSite[];
  monElapsed: (s: MonSite) => number | null;
  monNavBadge: boolean;
  monNavCount: number;
  equip: Equipment[];
  equipLog: EquipLogEntry[];
  eqType: string;
  setEqType: (s: string) => void;
  eqStatus: string;
  setEqStatus: (s: string) => void;
  eqSearch: string;
  setEqSearch: (s: string) => void;
  eqDetailId: string | null;
  openEqDetail: (id: string) => void;
  closeEqDetail: () => void;
  eqReplaceOpen: boolean;
  eqReplaceId: string | null;
  eqNewSerial: string;
  setEqNewSerial: (s: string) => void;
  openReplace: (id: string) => void;
  closeReplace: () => void;
  confirmReplace: () => void;
  eqAddOpen: boolean;
  eqAddForm: { type: string; serial: string; purchase: string; siteId: string };
  setAddField: (k: string, v: string) => void;
  openAddEquip: () => void;
  closeAddEquip: () => void;
  confirmAddEquip: () => void;
  gotoEqSite: (siteId: string) => void;
  eqNavBadge: boolean;
  eqNavCount: number;
  confirm: ConfirmConfig;
  openConfirm: (cfg: Omit<ConfirmConfig, 'open'>) => void;
  closeConfirm: () => void;
  toast: { show: boolean; msg: string };
  showToast: (msg: string) => void;
  previewSample: (id: string) => { main: string; sub: string; color: string; credit: boolean };
  quickInput: QuickSetupInput;
  setQuickField: <K extends keyof QuickSetupInput>(k: K, v: QuickSetupInput[K]) => void;
  autoPreview: AutoSetupResult | null;
  quickBuildAndDeploy: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const boot = loadStorage();
  const [page, setPage] = useState<Page>('studio');
  const [projects, setProjects] = useState<Project[]>(boot.projects);
  const [companies, setCompanies] = useState<Company[]>(boot.companies);
  const [sceneByProject, setSceneByProject] = useState(boot.sceneByProject);
  const [formMode, setFormMode] = useState<'new' | 'edit'>('new');
  const [form, setForm] = useState<ProjectForm>(emptyForm());
  const [formProject, setFormProject] = useState<Project | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [logo, setLogo] = useState<{ name: string; url: string } | null>(null);
  const [listSearch, setListSearch] = useState('');
  const [listCompanyId, setListCompanyId] = useState('all');
  const [listPrefecture, setListPrefecture] = useState('all');
  const [listListing, setListListing] = useState('all');
  const [listView, setListView] = useState<'card' | 'list'>('list');
  const [sceneProject, setSceneProject] = useState<Project | null>(null);
  const [scenes, setScenes] = useState<SceneItem[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [msgText, setMsgText] = useState('水分補給を忘れずに！');
  const [msgStyle, setMsgStyle] = useState<'scroll' | 'fixed'>('scroll');
  const [multilangLangs, setMultilangLangs] = useState<MultilangLangId[]>(normalizeMultilangLangs());
  const [mediaByScene, setMediaByScene] = useState<SceneMediaMap>({});
  const [rotation, setRotationState] = useState<RotationSettings>(DEFAULT_ROTATION_SETTINGS);
  const [pvIdx, setPvIdx] = useState(0);
  const [pvProgress, setPvProgress] = useState(0);
  const [pvPlaying, setPvPlaying] = useState(true);
  const [pvSpeed, setPvSpeed] = useState(1);
  const [pvFull, setPvFull] = useState(false);
  const [dpVersion, setDpVersion] = useState('v2.1');
  const [dpTestEnv, setDpTestEnv] = useState(false);
  const [dpStatus, setDpStatus] = useState('idle');
  const [dpProgress, setDpProgress] = useState(0);
  const [dpHistory, setDpHistory] = useState<DeployRecord[]>(boot.deployHistory);
  const [monSearch, setMonSearch] = useState('');
  const [monStatus, setMonStatus] = useState('all');
  const [monPlan, setMonPlan] = useState('all');
  const [monNow, setMonNow] = useState(Date.now());
  const [monRecords, setMonRecords] = useState<Record<string, MonRecord>>({});
  const [monDetailId, setMonDetailId] = useState<string | null>(null);
  const [monDraftStatus, setMonDraftStatus] = useState('未対応');
  const [monDraftNote, setMonDraftNote] = useState('');
  const [equip, setEquip] = useState<Equipment[]>(boot.equip);
  const [equipLog, setEquipLog] = useState<EquipLogEntry[]>(INITIAL_EQUIP_LOG);
  const [eqType, setEqType] = useState('all');
  const [eqStatus, setEqStatus] = useState('all');
  const [eqSearch, setEqSearch] = useState('');
  const [eqDetailId, setEqDetailId] = useState<string | null>(null);
  const [eqReplaceOpen, setEqReplaceOpen] = useState(false);
  const [eqReplaceId, setEqReplaceId] = useState<string | null>(null);
  const [eqNewSerial, setEqNewSerial] = useState('');
  const [eqAddOpen, setEqAddOpen] = useState(false);
  const [eqAddForm, setEqAddForm] = useState({ type: 'a35', serial: '', purchase: '', siteId: '' });
  const [confirm, setConfirm] = useState<ConfirmConfig>({ open: false });
  const [toast, setToast] = useState({ show: false, msg: '' });
  const [quickInput, setQuickInput] = useState<QuickSetupInput>(defaultQuickInput);
  const monEpoch = useRef(Date.now());
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const dpTimer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const showToast = useCallback((msg: string) => {
    setToast({ show: true, msg });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast((t) => ({ ...t, show: false })), 2600);
  }, []);

  const upsertCompany = (input: Omit<Company, 'id'> & { id?: string }) => {
    const id = input.id?.trim() || companyIdFromName(input.name);
    const next: Company = {
      id,
      name: input.name.trim(),
      logoKey: input.logoKey?.trim() || undefined,
      footBannerKey: input.footBannerKey?.trim() || undefined,
      note: input.note?.trim() || undefined,
    };
    setCompanies((prev) => {
      const exists = prev.some((c) => c.id === id);
      const list = exists ? prev.map((c) => (c.id === id ? next : c)) : [...prev, next];
      return list.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
    });
    setProjects((prev) => prev.map((p) => {
      if (p.companyId !== id && p.company !== next.name) return p;
      return {
        ...p,
        companyId: id,
        company: next.name,
        logoKey: next.logoKey ?? p.logoKey,
        logoSrc: logoSrcFromKey(next.logoKey) ?? p.logoSrc,
        footBannerSrc: logoSrcFromKey(next.footBannerKey) ?? p.footBannerSrc,
      };
    }));
    showToast('会社マスタを保存しました');
  };

  const applyCompanyToForm = (companyId: string) => {
    if (!companyId) {
      setForm((f) => ({ ...f, companyId: '', company: f.company }));
      return;
    }
    const co = companies.find((c) => c.id === companyId);
    if (!co) return;
    const fields = applyCompanyToProjectFields(co);
    setForm((f) => ({
      ...f,
      companyId: fields.companyId ?? '',
      company: fields.company,
      corpTitlePos: fields.corpTitlePos ?? f.corpTitlePos,
    }));
    if (fields.logoSrc) {
      setLogo({ name: fields.logoKey || co.name, url: fields.logoSrc });
    }
  };

  const projectPublicUrl = (p: Project) => buildProjectPublicUrl(p, equip, sceneByProject[p.id]);

  const copyProjectUrl = (p: Project) => {
    const url = projectPublicUrl(p);
    if (!url) {
      showToast('URLを生成できませんでした');
      return;
    }
    void navigator.clipboard.writeText(url).then(
      () => showToast('URLをコピーしました'),
      () => showToast(url),
    );
  };

  const exportListsPdf = () => {
    printAllListsPdf(projects, companies, projectPublicUrl);
    showToast(L.list.pdfPrintHint);
  };

  const openNew = () => {
    setFormMode('new');
    setFormProject(null);
    setForm(emptyForm());
    setErrors({});
    setLogo(null);
    setPage('form');
  };

  const openQuickSetup = () => {
    setQuickInput(defaultQuickInput());
    setPage('quick');
  };

  const openCloneSetup = (p: Project) => {
    setQuickInput(cloneQuickInputFromProject(p));
    setPage('quick');
    showToast('地点と現場名を入れてURLを発行してください');
  };

  const setQuickField = <K extends keyof QuickSetupInput>(k: K, v: QuickSetupInput[K]) => {
    setQuickInput((q) => {
      if (k === 'templateId') {
        const nextId = v as QuickSetupInput['templateId'];
        const tpl = SITE_TEMPLATES[nextId];
        return {
          ...q,
          templateId: nextId,
          ecsDataId: tpl.source === 'device' ? (q.ecsDataId || '') : '',
          ecsLoId: tpl.source === 'device' ? (q.ecsLoId || '') : '',
        };
      }
      let next = { ...q, [k]: v };
      if (k === 'locationId') {
        next = { ...next, ...patchQuickInputFromPoint(next, String(v)) };
      }
      return next;
    });
  };

  const autoPreview = useMemo(() => {
    if (!quickInput.locationId.trim() && !quickInput.company.trim()) return null;
    const tpl = SITE_TEMPLATES[quickInput.templateId];
    const clone = projects.find((p) => p.id === tpl.cloneProjectId) ?? null;
    try {
      return buildAutoSetup(quickInput, clone);
    } catch {
      return null;
    }
  }, [quickInput, projects]);

  const quickBuildAndDeploy = () => {
    const errs = validateQuickSetup(quickInput);
    if (errs.length) {
      showToast(errs[0]);
      return;
    }
    const tpl = SITE_TEMPLATES[quickInput.templateId];
    const clone = projects.find((p) => p.id === tpl.cloneProjectId) ?? null;
    const result = buildAutoSetup(quickInput, clone);
    const id = slugId(quickInput.company, quickInput.site);
    const token = genToken('a35', id);
    const newProject: Project = {
      id,
      status: 'new',
      lifecycle: 'draft',
      lastDeploy: null,
      engine: 'v2.1',
      deviceToken: token,
      ...result.projectFields,
    };
    const co = (quickInput.companyId
      ? companies.find((c) => c.id === quickInput.companyId)
      : undefined)
      ?? companies.find((c) => c.name === newProject.company)
      ?? (newProject.company ? { id: companyIdFromName(newProject.company), name: newProject.company } satisfies Company : undefined);
    if (co && !companies.some((c) => c.id === co.id)) {
      setCompanies((prev) => [...prev, co].sort((a, b) => a.name.localeCompare(b.name, 'ja')));
    }
    const enriched = enrichProjectRegistry({
      ...newProject,
      companyId: co?.id ?? newProject.companyId,
    }, co ? [...companies.filter((c) => c.id !== co.id), co] : companies);
    const loopKeysNew = enabledEngineLoopKeys(result.sceneConfig.scenes, enriched);
    const pubUrl = buildPublicSignageUrl(enriched, [], {
      msgText: result.sceneConfig.msgText,
      msgStyle: result.sceneConfig.msgStyle,
      msgEnabled: Boolean(result.sceneConfig.scenes.some((s) => s.id === 'message' && s.enabled)),
      multilangEnabled: Boolean(result.sceneConfig.scenes.some((s) => s.id === 'multilang' && s.enabled)),
      multilangLangs: result.sceneConfig.multilangLangs,
      loopKeys: loopKeysNew,
    });
    const today = nowStr().slice(0, 10);
    const published: Project = {
      ...enriched,
      publishedUrl: pubUrl,
      lifecycle: 'published',
      lastDeploy: today,
      engine: 'v2.1',
      status: 'ok',
    };
    setProjects((prev) => [...prev.filter((p) => p.id !== id), published]);
    setSceneByProject((prev) => ({ ...prev, [id]: result.sceneConfig }));
    setSceneProject(published);
    setScenes(result.sceneConfig.scenes);
    setMsgText(result.sceneConfig.msgText);
    setMsgStyle(result.sceneConfig.msgStyle);
    setMultilangLangs(normalizeMultilangLangs(result.sceneConfig.multilangLangs));
    setRotationState(result.sceneConfig.rotation ?? DEFAULT_ROTATION_SETTINGS);
    setDpStatus('done');
    setDpProgress(100);
    setPage('deploy');
    showToast('案件を作成しURLを発行しました');
  };

  const openEdit = (p: Project) => {
    setFormMode('edit');
    setFormProject(p);
    setForm(formFromProject(p));
    setErrors({});
    setLogo(p.logoSrc ? { name: '\u4fdd\u5b58\u6e08\u307f\u30ed\u30b4', url: p.logoSrc } : null);
    setPage('form');
  };

  const askDeleteProject = (p: Project) => {
    setConfirm({
      open: true,
      title: L.list.deleteTitle,
      message: L.list.deleteMessage(p.company, p.site),
      confirmLabel: L.list.delete,
      danger: true,
      onConfirm: () => {
        const id = p.id;
        setProjects((prev) => prev.filter((x) => x.id !== id));
        setSceneByProject((prev) => {
          if (!(id in prev)) return prev;
          const next = { ...prev };
          delete next[id];
          return next;
        });
        setSceneProject((cur) => (cur?.id === id ? null : cur));
        setFormProject((cur) => (cur?.id === id ? null : cur));
        setPage((pg) => {
          const onThisProject =
            (pg === 'form' && formProject?.id === id) ||
            ((pg === 'scene' || pg === 'preview' || pg === 'deploy') && sceneProject?.id === id);
          return onThisProject ? 'list' : pg;
        });
        showToast(L.list.deleted);
      },
    });
  };

  const backToList = (msg?: string) => {
    setPage('list');
    if (msg) showToast(msg);
  };

  const backToStudio = (msg?: string) => {
    setPage('studio');
    if (msg) showToast(msg);
  };

  const setFormField = (k: keyof ProjectForm, v: ProjectForm[keyof ProjectForm]) => {
    setForm((f) => {
      let next = { ...f, [k]: v };
      const applyPointPatch = (code: string, source: ProjectForm['source']) => {
        if (!/^\d{5}$/.test(code.trim())) return;
        next = { ...next, ...patchFormFromPoint(code.trim(), next.prefecture, { source, site: next.site, siteAddress: next.siteAddress }) };
      };
      if (k === 'moePoint') applyPointPatch(String(v), next.source);
      if (k === 'prefecture' && /^\d{5}$/.test(f.moePoint.trim())) {
        next = { ...next, ...patchFormFromPoint(f.moePoint, String(v), { source: next.source, site: next.site, siteAddress: next.siteAddress }) };
      }
      if (k === 'sourceId' && next.source === 'jma') applyPointPatch(String(v), 'jma');
      if (k === 'source' && next.source === 'jma' && /^\d{5}$/.test(next.sourceId.trim())) {
        applyPointPatch(next.sourceId, 'jma');
      }
      return next;
    });
    setErrors((e) => {
      const next = { ...e };
      delete next[k as string];
      return next;
    });
  };

  const toggleFormOpt = (k: keyof ProjectForm['options']) => {
    setForm((f) => ({ ...f, options: { ...f.options, [k]: !f.options[k] } }));
  };

  const validateAndSave = () => {
    const errs: Record<string, string> = {};
    if (!form.company.trim()) errs.company = '会社名を入力してください';
    if (!form.site.trim()) errs.site = '現場名を入力してください';
    if (!form.contactName.trim()) errs.contactName = '担当者名を入力してください';
    if (form.email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) {
      errs.email = 'メールアドレスの形式が正しくありません';
    }
    if (form.source === 'device' && !form.moePoint.trim() && !form.jmaPoint.trim()) {
      errs.moePoint = 'ECS連携時は環境省地点（フォールバック）を入力してください';
    }
    const geo = geoFromForm(form);
    if ((form.geoLat.trim() || form.geoLon.trim()) && !geo) {
      errs.geoLat = '緯度・経度は有効な数値で入力してください（緯度 -90〜90 / 経度 -180〜180）';
    }
    const faces = parseInt(form.faces, 10) || 4;
    const signageKind = form.signageKind;
    const spec = displaySpecForSignage(signageKind, faces);
    if (!signageKindMeta(signageKind).faceOptions.includes(faces)) {
      errs.faces = '選択したサイネージ種別と面数が一致しません';
    }
    const hasLogo = Boolean(logo?.url || (formMode === 'edit' && formProject?.logoSrc));
    if (spec.logoRequired && !hasLogo) {
      errs.logo = 'Cube5面サイネージはロゴのアップロードが必須です';
    }
    setErrors(errs);
    if (Object.keys(errs).length === 0) {
      const contracted = contractedFromForm(form);
      const opts = optionsFromForm(form);
      const pixel = spec.pixelLabel;
      let companyId = form.companyId.trim();
      let companyName = form.company.trim();
      if (!companyId && companyName) {
        const existing = companies.find((c) => c.name === companyName);
        companyId = existing?.id ?? companyIdFromName(companyName);
        if (!existing) {
          setCompanies((prev) => [...prev, { id: companyId, name: companyName }].sort((a, b) => a.name.localeCompare(b.name, 'ja')));
        }
      }
      const co = companies.find((c) => c.id === companyId);
      if (co) companyName = co.name;
      const logoKey = normalizeLogoKey(logo?.url) || co?.logoKey || formProject?.logoKey;
      const logoSrc = logo?.url ?? logoSrcFromKey(logoKey) ?? formProject?.logoSrc ?? logoSrcFromKey(co?.logoKey);
      const footBannerSrc = formProject?.footBannerSrc ?? logoSrcFromKey(co?.footBannerKey);
      const lifecycle = form.lifecycle;
      if (formMode === 'edit' && formProject) {
        setProjects((prev) => prev.map((p) => p.id === formProject.id ? {
          ...p,
          company: companyName,
          companyId: companyId || undefined,
          corpTitlePos: form.corpTitlePos,
          logoKey,
          site: form.site.trim(),
          lifecycle,
          listing: form.listing,
          plan: form.plan,
          signageKind,
          faces: spec.faces,
          pixel,
          logoSrc,
          options: opts,
          contracted,
          source: form.source,
          sourceId: form.sourceId.trim(),
          moePoint: form.moePoint.trim(),
          jmaPoint: form.jmaPoint.trim(),
          jmaArea: form.jmaArea.trim(),
          prefecture: form.prefecture.trim(),
          siteAddress: form.siteAddress.trim(),
          ecsLoId: form.ecsLoId.trim(),
          moeGasUrl: form.moeGasUrl.trim(),
          moePointName: form.moePointName.trim(),
          jmaForecastLabel: form.jmaForecastLabel.trim() || form.site.trim(),
          jmaWarnCity: form.jmaWarnCity.trim() || undefined,
          geo,
          footBannerSrc,
          ...(form.source === 'wxtech'
            ? {
                wxtechSite: form.sourceId.trim() || 'suminoe',
                engineFile: 'wx-cube-4face.html',
              }
            : form.source === 'device'
              ? {
                  engineFile: p.engineFile === 'wx-cube-4face.html'
                    ? 'wbgt-cube-sasakikensetu-4face.html'
                    : p.engineFile,
                }
              : p.engineFile === 'wx-cube-4face.html'
                ? { engineFile: p.stdEngineFile }
                : {}),
        } : p));
        backToList('\u5909\u66f4\u3092\u4fdd\u5b58\u3057\u307e\u3057\u305f');
      } else {
        const id = slugId(form.company, form.site);
        const token = genToken('a35', id);
        const created: Project = {
          id,
          company: companyName,
          companyId: companyId || undefined,
          corpTitlePos: form.corpTitlePos,
          logoKey,
          site: form.site.trim(),
          status: 'new',
          lifecycle: lifecycle || 'draft',
          listing: form.listing,
          plan: form.plan,
          signageKind,
          faces: spec.faces,
          pixel,
          logoSrc,
          lastDeploy: null,
          engine: null,
          options: opts,
          contracted,
          source: form.source,
          sourceId: form.sourceId.trim(),
          moePoint: form.moePoint.trim(),
          jmaPoint: form.jmaPoint.trim(),
          jmaArea: form.jmaArea.trim(),
          prefecture: form.prefecture.trim(),
          siteAddress: form.siteAddress.trim(),
          ecsLoId: form.ecsLoId.trim(),
          moeGasUrl: form.moeGasUrl.trim(),
          moePointName: form.moePointName.trim(),
          jmaForecastLabel: form.jmaForecastLabel.trim() || form.site.trim(),
          jmaWarnCity: form.jmaWarnCity.trim() || undefined,
          geo,
          footBannerSrc,
          deviceToken: token,
          ...(form.source === 'wxtech'
            ? {
                wxtechSite: form.sourceId.trim() || 'suminoe',
                engineFile: 'wx-cube-4face.html',
              }
            : {}),
        };
        setProjects((prev) => [...prev, created]);
        openScene(created);
        showToast('\u6848\u4ef6\u3092\u4f5c\u6210\u3057\u307e\u3057\u305f \u2014 \u30b7\u30fc\u30f3\u7de8\u96c6\u3078');
      }
    } else {
      showToast('未入力の必須項目があります');
    }
  };

  const openScene = (p?: Project) => {
    const proj = p || sceneProject || projects[0];
    if (!proj) return;
    const cfg = loadSceneConfig(proj, sceneByProject);
    setSceneProject(proj);
    setScenes(cfg.scenes);
    setMsgText(cfg.msgText);
    setMsgStyle(cfg.msgStyle);
    setMultilangLangs(normalizeMultilangLangs(cfg.multilangLangs));
    setMediaByScene(cfg.mediaByScene ?? {});
    setRotationState(cfg.rotation ?? DEFAULT_ROTATION_SETTINGS);
    setDragIndex(null);
    setPage('scene');
  };

  const selectSceneProject = (id: string) => {
    const proj = projects.find((x) => x.id === id);
    if (proj) openScene(proj);
  };

  const setRotation = useCallback((patch: Partial<RotationSettings>) => {
    setRotationState((prev) => ({ ...prev, ...patch }));
  }, []);

  const toggleMultilangLang = useCallback((lang: MultilangLangId) => {
    setMultilangLangs((prev) => toggleMultilangLangInList(prev, lang));
  }, []);

  const setSceneMedia = useCallback((sceneId: string, asset: SceneMediaAsset) => {
    setMediaByScene((prev) => ({ ...prev, [sceneId]: asset }));
  }, []);

  const removeSceneMedia = useCallback((sceneId: string) => {
    setMediaByScene((prev) => {
      const next = { ...prev };
      delete next[sceneId];
      return next;
    });
  }, []);

  const saveScenesNow = () => {
    if (!sceneProject) return;
    setSceneByProject((prev) => ({
      ...prev,
      [sceneProject.id]: { scenes, msgText, msgStyle, multilangLangs, rotation, mediaByScene },
    }));
    showToast('\u30b7\u30fc\u30f3\u8a2d\u5b9a\u3092\u4fdd\u5b58\u3057\u307e\u3057\u305f');
  };

  const toggleScene = (id: string) => {
    const target = scenes.find((x) => x.id === id);
    if (!target) return;
    if (target.enabled && isRotationLoopScene(id)) {
      const rotEnabled = scenes.filter((x) => x.enabled && isRotationLoopScene(x.id));
      if (rotEnabled.length <= 1) return;
    }
    const enabling = !target.enabled;
    setScenes((s) => {
      const row = s.find((x) => x.id === id);
      if (!row) return s;
      const turningOn = !row.enabled;
      const defaultDur = SCENE_CATALOG[id]?.dur ?? 5;
      let next = s.map((x) => {
        if (x.id !== id) return x;
        return {
          ...x,
          enabled: turningOn,
          duration: turningOn && (!x.duration || x.duration < 1) ? defaultDur : x.duration,
        };
      });
      if (turningOn && id === 'wxtech') {
        next = next.map((x) => (x.id === 'ecs' ? { ...x, enabled: false } : x));
      }
      if (turningOn && id === 'ecs') {
        next = next.map((x) => (x.id === 'wxtech' ? { ...x, enabled: false } : x));
      }
      return sortPlaylistByEnabled(next);
    });
    if (isExternalApiSceneId(id) && sceneProject) {
      const patched = projectAfterExternalApiToggle(sceneProject, enabling ? id : null);
      setSceneProject(patched);
      setProjects((prev) => prev.map((p) => (p.id === patched.id ? patched : p)));
    }
  };

  const patchSceneProject = (partial: Partial<Project>) => {
    if (!sceneProject) return;
    const next = { ...sceneProject, ...partial };
    setSceneProject(next);
    setProjects((prev) => prev.map((p) => (p.id === next.id ? next : p)));
  };

  const setSceneLaps = useCallback((id: string, laps: number) => {
    const n = clampSceneLaps(laps);
    setScenes((s) => s.map((x) => (x.id === id ? { ...x, duration: n } : x)));
  }, []);

  const setSceneDuration = (id: string, val: number) => {
    let n = val;
    if (Number.isNaN(n)) n = 0;
    if (n > 60) n = 60;
    if (n < 0) n = 0;
    setScenes((s) => s.map((x) => (x.id === id ? { ...x, duration: n } : x)));
  };

  const setCycleTotal = (target: number) => {
    let t = target;
    if (Number.isNaN(t) || t < 1) t = 1;
    if (t > 300) t = 300;
    setScenes((s) => {
      const enabledScenes = s.filter((x) => x.enabled);
      const current = enabledScenes.reduce((sum, x) => sum + (x.duration || 0), 0);
      if (!current) return s;
      const ratio = t / current;
      return s.map((x) => (x.enabled ? { ...x, duration: Math.max(1, Math.round((x.duration || 1) * ratio)) } : x));
    });
  };

  const reorderRotationScenesList = (from: number, to: number) => {
    if (from === to) return;
    setScenes((arr) => reorderRotationScenes(arr, from, to));
    setDragIndex(to);
  };

  const reorderScenes = (from: number, to: number) => {
    if (from === to) return;
    setScenes((arr) => {
      const next = [...arr];
      const [it] = next.splice(from, 1);
      next.splice(to, 0, it);
      return next;
    });
    setDragIndex(to);
  };

  const previewSample = (id: string) => {
    const wx = sceneProject?.source === 'wxtech';
    const t: Record<string, { main: string; sub: string; color: string; credit: boolean }> = {
      wbgt: wx
        ? { main: '体感 31℃', sub: '気温 29℃（≠WBGT）', color: '#FF7E00', credit: true }
        : { main: '28.5℃', sub: '厳重警戒', color: '#FF9F0A', credit: true },
      forecast: { main: '晴れ 32℃', sub: '湿度 65%', color: '#64D2FF', credit: true },
      rain_warn: { main: '大雨', sub: '警報・注意報', color: '#5E9EFF', credit: false },
      flood_info: { main: '氾濫', sub: '警報・注意報', color: '#2EAAF8', credit: false },
      landslide_info: { main: '土砂災害', sub: '警報・注意報', color: '#A67C52', credit: false },
      surge_info: { main: '高潮', sub: '警報・注意報', color: '#00A8C8', credit: false },
      weather_warn: { main: '気象警報（その他）', sub: 'レベルなし・注意報／警報／特別警報', color: '#F2E700', credit: false },
      evac_info: { main: '避難指示', sub: '指定避難所へ避難', color: '#FF453B', credit: false },
      jishin: { main: '緊急地震速報', sub: '強い揺れに警戒', color: '#FF6482', credit: false },
      bousai: { main: '警戒アラート', sub: '発表中', color: '#FF9F0A', credit: false },
      clock: { main: '14:32', sub: '2025 / 06 / 27', color: '#30D158', credit: false },
      message: { main: msgText || 'メッセージ', sub: msgStyle === 'scroll' ? 'スクロール表示' : '固定表示', color: '#BF5AF2', credit: false },
      multilang: { main: '多言語表示', sub: multilangLangs.map((l) => MULTILANG_LANG_LABELS_JA[l]).join(' / '), color: '#5E5CE6', credit: false },
      nowcast: { main: '【雨接近】30〜60分以内', sub: '降水ナウキャスト', color: '#00B0F0', credit: true },
      video: { main: '動画（MP4）', sub: mediaByScene.video?.fileName ?? '未アップロード', color: '#FF375F', credit: false },
      pdf: { main: 'PDF資料', sub: mediaByScene.pdf?.fileName ?? '未アップロード', color: '#FF9500', credit: false },
      ecs: { main: '環境クラウドサービス', sub: 'WBGT・黒球・湿度', color: '#32ADE6', credit: false },
      wxtech: { main: 'ウェザーニューズ', sub: 'WxTech ピンポイント予報・体感', color: '#00A0E9', credit: true },
      amedas: wx
        ? { main: '現況（予報）', sub: 'WxTech srf[0]', color: '#5AC8FA', credit: true }
        : { main: 'アメダス', sub: '気象庁観測', color: '#5AC8FA', credit: true },
    };
    return t[id] ?? { main: '—', sub: '', color: '#8e8e93', credit: false };
  };

  const openPreview = (p?: Project) => {
    const proj = p || sceneProject || projects[0];
    if (!proj) return;
    const same = sceneProject?.id === proj.id && scenes.length;
    const cfg = same
      ? { scenes, msgText, msgStyle, multilangLangs, rotation, mediaByScene }
      : loadSceneConfig(proj, sceneByProject);
    setSceneProject(proj);
    setScenes(cfg.scenes);
    setMsgText(cfg.msgText);
    setMsgStyle(cfg.msgStyle);
    setMultilangLangs(normalizeMultilangLangs(cfg.multilangLangs));
    setMediaByScene(cfg.mediaByScene ?? {});
    setRotationState(cfg.rotation ?? DEFAULT_ROTATION_SETTINGS);
    setPvIdx(0);
    setPvProgress(0);
    setPvPlaying(true);
    setPvSpeed(1);
    setPvFull(false);
    setPage('preview');
  };

  const jumpPreview = (i: number) => { setPvIdx(i); setPvProgress(0); };
  const previewPlaybackList = () =>
    enabledPreviewPlaybackScenes(scenes).filter((s) =>
      canPreviewScene(s.id, sceneProject ?? undefined, mediaByScene),
    );
  const pvPrev = () => {
    const en = previewPlaybackList();
    if (!en.length) return;
    setPvIdx((i) => (i - 1 + en.length) % en.length);
    setPvProgress(0);
  };
  const pvNext = () => {
    const en = previewPlaybackList();
    if (!en.length) return;
    setPvIdx((i) => (i + 1) % en.length);
    setPvProgress(0);
  };

  const openDeploy = (p?: Project) => {
    const proj = p || sceneProject || projects[0];
    if (!proj) return;
    const cfg = loadSceneConfig(proj, sceneByProject);
    setSceneProject(proj);
    setScenes(cfg.scenes);
    setMsgText(cfg.msgText);
    setMsgStyle(cfg.msgStyle);
    setMultilangLangs(normalizeMultilangLangs(cfg.multilangLangs));
    setMediaByScene(cfg.mediaByScene ?? {});
    setRotationState(cfg.rotation ?? DEFAULT_ROTATION_SETTINGS);
    setDpStatus('idle');
    setDpProgress(0);
    setPage('deploy');
  };

  const contentOpts = useMemo(
    () => resolveSignageContentOptions(scenes, msgText, msgStyle, multilangLangs),
    [scenes, msgText, msgStyle, multilangLangs],
  );

  const loopKeys = useMemo(
    () => (sceneProject ? enabledEngineLoopKeys(scenes, sceneProject) : []),
    [sceneProject, scenes],
  );

  const deployChecks = useMemo(
    () => (sceneProject ? runDeployChecks(sceneProject, scenes, equip, sceneProject.pixel) : []),
    [sceneProject, scenes, equip],
  );

  const deployUrl = useMemo(
    () => (sceneProject ? buildDeployUrl(sceneProject, dpVersion, equip, { ...contentOpts, loopKeys }) : ''),
    [sceneProject, dpVersion, equip, contentOpts, loopKeys],
  );

  const publicSignageUrl = useMemo(
    () => (sceneProject ? buildPublicSignageUrl(sceneProject, equip, { version: dpVersion, ...contentOpts, loopKeys }) : ''),
    [sceneProject, dpVersion, equip, contentOpts, loopKeys],
  );

  useEffect(() => {
    if (!sceneProject || !publicSignageUrl) return;
    if (sceneProject.publishedUrl === publicSignageUrl) return;
    const id = sceneProject.id;
    setSceneProject((p) => (p && p.id === id ? { ...p, publishedUrl: publicSignageUrl } : p));
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, publishedUrl: publicSignageUrl } : p)));
  }, [publicSignageUrl, sceneProject?.id]);

  const deployConfig = useMemo(
    () => (sceneProject ? buildSignageConfig(sceneProject, scenes, equip, dpVersion, rotation) : null),
    [sceneProject, scenes, equip, dpVersion, rotation],
  );

  const deployRuntimeJson = useMemo(
    () => (sceneProject ? runtimeConfigJson(buildRuntimeExportBundle(sceneProject, sceneProject.prefecture, contentOpts)) : ''),
    [sceneProject, contentOpts],
  );

  const downloadSiteHtml = useCallback(async () => {
    if (!sceneProject) return;
    try {
      const template = await fetchSignageTemplateHtml(sceneProject);
      const html = buildSiteSignageHtml(sceneProject, template, sceneProject.prefecture, contentOpts);
      downloadTextFile(suggestedHtmlFilename(sceneProject), html, 'text/html;charset=utf-8');
      showToast('現場用 HTML をダウンロードしました');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      showToast(`HTML 生成失敗: ${msg}`);
    }
  }, [sceneProject, contentOpts, showToast]);

  const runDeploy = () => {
    if (!sceneProject) return;
    if (!locationReadyForPublish(sceneProject)) {
      showToast('地点ID（WBGT／AMeDAS）を入れてから発行してください');
      return;
    }
    const pubUrl = buildPublicSignageUrl(sceneProject, equip, { version: dpVersion, ...contentOpts, loopKeys });
    const today = nowStr().slice(0, 10);
    const entry: DeployRecord = { dt: nowStr(), user: CURRENT_USER, version: dpVersion, status: 'success', target: '本番' };
    setDpHistory((h) => [entry, ...h]);
    setProjects((prev) => prev.map((x) => x.id === sceneProject.id
      ? { ...x, lastDeploy: today, engine: dpVersion, publishedUrl: pubUrl, lifecycle: 'published', status: x.status === 'new' ? 'ok' : x.status }
      : x));
    setSceneProject((p) => (p ? { ...p, lastDeploy: today, engine: dpVersion, publishedUrl: pubUrl, lifecycle: 'published' } : p));
    setDpStatus('done');
    setDpProgress(100);
    void navigator.clipboard.writeText(pubUrl).then(
      () => showToast('URLを発行してコピーしました'),
      () => showToast('URLを発行しました'),
    );
  };

  const askDeploy = () => {
    runDeploy();
  };

  const askRollback = (v: string) => {
    setConfirm({
      open: true,
      title: 'ロールバックの確認',
      message: `本番バージョンを ${v} に戻します。この操作は現在の稼働内容を置き換えます。`,
      confirmLabel: 'このバージョンに戻す',
      danger: true,
      onConfirm: () => {
        const entry: DeployRecord = { dt: nowStr(), user: CURRENT_USER, version: v, status: 'success', target: '本番', rollback: true };
        setDpHistory((h) => [entry, ...h]);
        setDpVersion(v);
        setDpStatus('done');
        setDpProgress(100);
        showToast(`${v} にロールバックしました`);
      },
    });
  };

  const openConfirm = (cfg: Omit<ConfirmConfig, 'open'>) => setConfirm({ open: true, ...cfg });
  const closeConfirm = () => setConfirm((c) => ({ ...c, open: false }));

  const monElapsed = (site: MonSite) =>
    site.agoSec == null ? null : Math.max(0, site.agoSec + Math.floor((monNow - monEpoch.current) / 1000));

  const openMonDetail = (id: string) => {
    const rec = monRecords[id];
    setMonDetailId(id);
    setMonDraftStatus(rec?.status ?? '未対応');
    setMonDraftNote(rec?.note ?? '');
  };

  const saveMonRecord = () => {
    if (!monDetailId) return;
    setMonRecords((r) => ({
      ...r,
      [monDetailId]: { status: monDraftStatus, note: monDraftNote.trim(), at: nowStr() },
    }));
    showToast('対応状況を記録しました');
  };

  const openReplace = (id: string) => { setEqReplaceOpen(true); setEqReplaceId(id); setEqNewSerial(''); };
  const closeReplace = () => setEqReplaceOpen(false);

  const confirmReplace = () => {
    if (!eqNewSerial.trim()) { showToast('新しいシリアル番号を入力してください'); return; }
    const eq = equip.find((e) => e.id === eqReplaceId);
    if (!eq) return;
    const newToken = eq.siteId ? genToken(eq.type, eq.siteId) : '—';
    const entry: EquipLogEntry = {
      dt: nowStr(), user: CURRENT_USER, action: '機材交換',
      detail: `${eq.id}：${eq.serial} → ${eqNewSerial.trim()}　device_id: ${eq.deviceToken} → ${newToken}`,
    };
    setEquip((list) =>
      list.map((e) =>
        e.id === eqReplaceId
          ? { ...e, serial: eqNewSerial.trim(), deviceToken: newToken, status: 'ok', firmware: '1.8.2', lastSeen: nowStr() }
          : e,
      ),
    );
    setEquipLog((l) => [entry, ...l]);
    setEqReplaceOpen(false);
    showToast('機材を交換しました（新device_idを発行）');
  };

  const confirmAddEquip = () => {
    if (!eqAddForm.serial.trim()) { showToast('シリアル番号を入力してください'); return; }
    const ctrl = controllerMeta(eqAddForm.type);
    const prefix = eqAddForm.type === 'led' ? 'EQ-LED' : ctrl.equipIdPrefix;
    const n = String(equip.filter((e) => e.type === eqAddForm.type).length + 1).padStart(3, '0');
    const site = projects.find((p) => p.id === eqAddForm.siteId);
    const token = eqAddForm.siteId && isControllerEquipType(eqAddForm.type as Equipment['type'])
      ? genToken(eqAddForm.type, eqAddForm.siteId)
      : '—';
    const today = nowStr().slice(0, 10);
    const eq: Equipment = {
      id: `${prefix}-${n}`,
      type: eqAddForm.type as Equipment['type'],
      model: eqAddForm.type === 'led' ? 'P5 屋外LEDモジュール' : ctrl.model,
      serial: eqAddForm.serial.trim(),
      purchase: eqAddForm.purchase || today,
      intro: eqAddForm.siteId ? today : '—',
      siteId: eqAddForm.siteId,
      siteName: site ? `${site.company} / ${site.site}` : '予備倉庫（未割当）',
      status: eqAddForm.siteId ? 'ok' : 'spare',
      firmware: eqAddForm.type === 'led' ? '—' : '1.8.2',
      deviceToken: token,
      lastSeen: eqAddForm.siteId ? nowStr() : '—',
    };
    setEquip((l) => [eq, ...l]);
    setEquipLog((log) => [{ dt: nowStr(), user: CURRENT_USER, action: '機材追加', detail: `${eq.id} を登録` }, ...log]);
    setEqAddOpen(false);
    showToast('新しい機材を追加しました');
  };

  const gotoEqSite = (siteId: string) => {
    const p = projects.find((x) => x.id === siteId);
    if (p) openEdit(p);
  };

  const monCounts = useMemo(() => {
    const c = { down: 0, fault: 0 };
    MON_DATA.forEach((s) => { if (s.status === 'down') c.down++; });
    equip.forEach((e) => { if (e.status === 'fault') c.fault++; });
    return c;
  }, [equip]);

  useEffect(() => {
    saveStorage({ projects, companies, sceneByProject, deployHistory: dpHistory, equip });
  }, [projects, companies, sceneByProject, dpHistory, equip]);

  useEffect(() => {
    if (!sceneProject || page === 'list' || page === 'form') return;
    setSceneByProject((prev) => ({
      ...prev,
      [sceneProject.id]: { scenes, msgText, msgStyle, multilangLangs, rotation, mediaByScene },
    }));
  }, [sceneProject?.id, scenes, msgText, msgStyle, multilangLangs, rotation, mediaByScene, page]);

  useEffect(() => {
    const pvTimer = setInterval(() => {
      if (page !== 'preview' || !pvPlaying) return;
      const en = enabledPreviewPlaybackScenes(scenes).filter((s) =>
        canPreviewScene(s.id, sceneProject ?? undefined, mediaByScene),
      );
      if (!en.length) return;
      const idx = Math.min(pvIdx, en.length - 1);
      const durMs = sceneLapDisplayMs(en[idx].duration || 1);
      setPvProgress((p) => {
        const next = p + 100 * pvSpeed;
        if (next >= durMs) {
          setPvIdx((i) => (i + 1) % en.length);
          return 0;
        }
        return next;
      });
    }, 100);
    const monTimer = setInterval(() => {
      if (page === 'list') setMonNow(Date.now());
    }, 1000);
    return () => { clearInterval(pvTimer); clearInterval(monTimer); clearInterval(dpTimer.current); };
  }, [page, pvPlaying, pvIdx, pvSpeed, scenes, sceneProject, mediaByScene]);

  const value: AppContextValue = {
    page, setPage, projects, companies, upsertCompany, applyCompanyToForm, copyProjectUrl, projectPublicUrl, exportListsPdf,
    formMode, form, formProject, errors, logo,
    openNew, openQuickSetup, openCloneSetup, openEdit, askDeleteProject, backToList, backToStudio, setFormField, toggleFormOpt, validateAndSave, setLogo,
    listSearch, setListSearch, listCompanyId, setListCompanyId, listPrefecture, setListPrefecture,
    listListing, setListListing, listView, setListView,
    sceneProject, scenes, openScene, selectSceneProject, saveScenesNow, toggleScene, patchSceneProject, setSceneDuration, setSceneLaps, setCycleTotal, reorderScenes, reorderRotationScenes: reorderRotationScenesList, dragIndex, setDragIndex,
    msgText, setMsgText, msgStyle, setMsgStyle, multilangLangs, toggleMultilangLang, mediaByScene, setSceneMedia, removeSceneMedia, rotation, setRotation,
    pvIdx, pvProgress, pvPlaying, setPvPlaying, pvSpeed, setPvSpeed, pvFull, setPvFull,
    jumpPreview, pvPrev, pvNext, openPreview,
    dpVersion, setDpVersion, dpTestEnv, setDpTestEnv, dpStatus, dpProgress, dpHistory,
    openDeploy, deployUrl, publicSignageUrl, deployConfig, deployRuntimeJson, downloadSiteHtml, deployChecks, askDeploy, askRollback,
    monSearch, setMonSearch, monStatus, setMonStatus, monPlan, setMonPlan, monNow,
    monRecords, monDetailId, openMonDetail, closeMonDetail: () => setMonDetailId(null),
    monDraftStatus, setMonDraftStatus, monDraftNote, setMonDraftNote, saveMonRecord,
    monData: MON_DATA, monElapsed,
    monNavBadge: monCounts.down > 0, monNavCount: monCounts.down,
    equip, equipLog, eqType, setEqType, eqStatus, setEqStatus, eqSearch, setEqSearch,
    eqDetailId, openEqDetail: setEqDetailId, closeEqDetail: () => setEqDetailId(null),
    eqReplaceOpen, eqReplaceId, eqNewSerial, setEqNewSerial, openReplace, closeReplace, confirmReplace,
    eqAddOpen, eqAddForm, setAddField: (k, v) => setEqAddForm((f) => ({ ...f, [k]: v })),
    openAddEquip: () => setEqAddOpen(true), closeAddEquip: () => setEqAddOpen(false), confirmAddEquip,
    gotoEqSite,
    eqNavBadge: monCounts.fault > 0, eqNavCount: monCounts.fault,
    confirm, openConfirm, closeConfirm, toast, showToast, previewSample,
    quickInput, setQuickField, autoPreview, quickBuildAndDeploy,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
