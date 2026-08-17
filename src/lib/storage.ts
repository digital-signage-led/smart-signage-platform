import { INITIAL_DEPLOY_HISTORY, INITIAL_EQUIP, INITIAL_PROJECTS } from '../data/mock';
import { INITIAL_COMPANIES } from '../data/companies';
import { normalizeProjectContracted } from './sceneList';
import { stripRetiredContentIds } from './contentScenes';
import {
  deriveCompaniesFromProjects,
  enrichProjectRegistry,
} from './companies';
import type { Company, DeployRecord, Equipment, Project, SceneItem } from '../types';
import type { RotationSettings } from '../core/rotationPresets';
import { inferSignageKind } from '../core/layoutRegistry';
import type { MultilangLangId } from './multilang';
import type { SceneMediaMap } from './sceneMedia';

export interface SceneConfig {
  scenes: SceneItem[];
  msgText: string;
  msgStyle: 'scroll' | 'fixed';
  multilangLangs?: MultilangLangId[];
  rotation?: RotationSettings;
  /** シーン ID → アップロード済みメディア（video / pdf） */
  mediaByScene?: SceneMediaMap;
}

export interface AppStorage {
  projects: Project[];
  companies: Company[];
  sceneByProject: Record<string, SceneConfig>;
  deployHistory: DeployRecord[];
  equip: Equipment[];
}

const KEY = 'ssp_v1';

const JA_CHAR = /[\u3040-\u30ff\u3400-\u9fff]/;

/** True when CJK was replaced with ASCII '?' (mojibake / encoding loss). */
function isGarbledJa(s: string | undefined | null): boolean {
  if (!s) return false;
  return s.includes('?') && !JA_CHAR.test(s);
}

function takeJa(stored: string | undefined, seed: string | undefined): string | undefined {
  if (seed && isGarbledJa(stored)) return seed;
  return stored ?? seed;
}

function mergeProjectWithSeed(stored: Project): Project {
  const seed = INITIAL_PROJECTS.find((p) => p.id === stored.id);
  const merged = seed ? { ...seed, ...stored } : stored;
  if (seed) {
    merged.company = takeJa(stored.company, seed.company) ?? merged.company;
    merged.site = takeJa(stored.site, seed.site) ?? merged.site;
    merged.prefecture = takeJa(stored.prefecture, seed.prefecture) ?? merged.prefecture;
    merged.siteAddress = takeJa(stored.siteAddress, seed.siteAddress) ?? merged.siteAddress;
    merged.moePointName = takeJa(stored.moePointName, seed.moePointName) ?? merged.moePointName;
    merged.jmaForecastLabel = takeJa(stored.jmaForecastLabel, seed.jmaForecastLabel) ?? merged.jmaForecastLabel;
    merged.footSourceEcs = takeJa(stored.footSourceEcs, seed.footSourceEcs) ?? merged.footSourceEcs;
  }
  const faces = merged.faces ?? seed?.faces ?? 4;
  const options = stripRetiredContentIds(
    seed
      ? [...new Set([...(seed.options ?? []), ...(stored.options ?? [])])]
      : (merged.options ?? []),
  );
  const contractedSeed = stripRetiredContentIds(
    seed
      ? [...new Set([...(seed.contracted ?? []), ...(stored.contracted ?? [])])]
      : (merged.contracted ?? []),
  );
  const withOpts = {
    ...merged,
    options,
    contracted: contractedSeed,
    faces,
    pixel: stored.pixel ?? seed?.pixel,
    signageKind: stored.signageKind ?? seed?.signageKind ?? inferSignageKind(faces),
    footBannerSrc: stored.footBannerSrc ?? seed?.footBannerSrc,
    footSourceEcs: takeJa(stored.footSourceEcs, seed?.footSourceEcs),
    geo: stored.geo ?? seed?.geo,
    ecsLoId: stored.ecsLoId ?? seed?.ecsLoId,
    wxtechSite: stored.wxtechSite ?? seed?.wxtechSite,
    wxtechGasUrl: stored.wxtechGasUrl ?? seed?.wxtechGasUrl,
    stdSource: stored.stdSource ?? seed?.stdSource,
    stdEngineFile: stored.stdEngineFile ?? seed?.stdEngineFile,
    moePointName: takeJa(stored.moePointName, seed?.moePointName),
    jmaForecastLabel: takeJa(stored.jmaForecastLabel, seed?.jmaForecastLabel),
    jmaWarnCity: stored.jmaWarnCity ?? seed?.jmaWarnCity,
    logoSrc: stored.logoSrc ?? seed?.logoSrc,
    companyId: stored.companyId ?? seed?.companyId,
    logoKey: stored.logoKey ?? seed?.logoKey,
    lifecycle: stored.lifecycle ?? seed?.lifecycle,
    listing: stored.listing ?? seed?.listing,
    corpTitlePos: stored.corpTitlePos ?? seed?.corpTitlePos,
  };
  return {
    ...withOpts,
    source: stored.source ?? seed?.source,
    moePoint: stored.moePoint ?? seed?.moePoint,
    jmaPoint: stored.jmaPoint ?? seed?.jmaPoint,
    jmaArea: stored.jmaArea ?? seed?.jmaArea,
    sourceId: stored.sourceId ?? seed?.sourceId,
    contracted: normalizeProjectContracted(withOpts),
  };
}

function loadCompanies(parsed: Partial<AppStorage>, projects: Project[]): Company[] {
  const stored = parsed.companies?.length ? parsed.companies : INITIAL_COMPANIES;
  const repaired = stored.map((c) => {
    const seed = INITIAL_COMPANIES.find((s) => s.id === c.id);
    const withPos = seed ? { ...c, corpTitlePos: c.corpTitlePos ?? seed.corpTitlePos } : c;
    if (seed && isGarbledJa(c.name)) return { ...withPos, name: seed.name };
    if (isGarbledJa(c.name)) {
      const fromProj = projects.find((p) => p.companyId === c.id && p.company && !isGarbledJa(p.company));
      if (fromProj) return { ...withPos, name: fromProj.company };
    }
    return withPos;
  });
  const byId = new Map(repaired.map((c) => [c.id, c]));
  INITIAL_COMPANIES.forEach((seed) => {
    const cur = byId.get(seed.id);
    if (!cur) {
      byId.set(seed.id, seed);
      return;
    }
    byId.set(seed.id, {
      ...cur,
      logoKey: seed.id === 'morishita-gumi' ? (seed.logoKey || cur.logoKey) : (cur.logoKey || seed.logoKey),
      footBannerKey: seed.id === 'morishita-gumi' ? (seed.footBannerKey || cur.footBannerKey) : (cur.footBannerKey || seed.footBannerKey),
      corpTitlePos: cur.corpTitlePos ?? seed.corpTitlePos,
    });
  });
  INITIAL_COMPANIES.forEach((seed) => {
    const seedKey = seed.name.replace(/株式会社/g, '').replace(/\s+/g, '').trim();
    const named = [...byId.values()].find((c) => c.name.replace(/株式会社/g, '').replace(/\s+/g, '').trim() === seedKey);
    if (!named || named.id === seed.id) return;
    if (named.footBannerKey && named.logoKey) return;
    byId.set(named.id, {
      ...named,
      logoKey: named.logoKey || seed.logoKey,
      footBannerKey: named.footBannerKey || seed.footBannerKey,
      corpTitlePos: named.corpTitlePos ?? seed.corpTitlePos,
    });
  });
  return deriveCompaniesFromProjects(projects, [...byId.values()]);
}

function repairEquip(eq: Equipment): Equipment {
  const seed = INITIAL_EQUIP.find((e) => e.id === eq.id);
  if (!seed) return eq;
  return {
    ...eq,
    siteName: takeJa(eq.siteName, seed.siteName) ?? eq.siteName,
    model: takeJa(eq.model, seed.model) ?? eq.model,
  };
}

export function loadStorage(): AppStorage {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const projects = INITIAL_PROJECTS.map((p) => enrichProjectRegistry(p, INITIAL_COMPANIES));
      return {
        projects,
        companies: deriveCompaniesFromProjects(projects, INITIAL_COMPANIES),
        sceneByProject: {},
        deployHistory: INITIAL_DEPLOY_HISTORY,
        equip: INITIAL_EQUIP,
      };
    }
    const parsed = JSON.parse(raw) as AppStorage;
    const rawProjects = (Array.isArray(parsed.projects) ? parsed.projects : INITIAL_PROJECTS).map(mergeProjectWithSeed);
    const companies = loadCompanies(parsed, rawProjects);
    const projects = rawProjects.map((p) => enrichProjectRegistry(p, companies));
    return {
      projects,
      companies,
      sceneByProject: parsed.sceneByProject ?? {},
      deployHistory: parsed.deployHistory ?? INITIAL_DEPLOY_HISTORY,
      equip: parsed.equip?.length ? parsed.equip.map(repairEquip) : INITIAL_EQUIP,
    };
  } catch {
    const projects = INITIAL_PROJECTS.map((p) => enrichProjectRegistry(p, INITIAL_COMPANIES));
    return {
      projects,
      companies: deriveCompaniesFromProjects(projects, INITIAL_COMPANIES),
      sceneByProject: {},
      deployHistory: INITIAL_DEPLOY_HISTORY,
      equip: INITIAL_EQUIP,
    };
  }
}

export function saveStorage(data: AppStorage) {
  localStorage.setItem(KEY, JSON.stringify(data));
}
