import type { ComponentType } from 'react';
import type { Page } from '../types';
import { ListPage } from '../pages/ListPage';
import { FormPage } from '../pages/FormPage';
import { ScenePage } from '../pages/ScenePage';
import { PreviewPage } from '../pages/PreviewPage';
import { DeployPage } from '../pages/DeployPage';
import { EquipPage } from '../pages/EquipPage';
import { ReportPage } from '../pages/ReportPage';
import { UrlsPage } from '../pages/UrlsPage';
import { QuickSetupPage } from '../pages/QuickSetupPage';
import { StudioHomePage } from '../pages/StudioHomePage';
import { MODULE_VERSIONS } from './version';

export type NavGroup = 'studio' | 'cases' | 'equip' | 'urls';

export interface PageModule {
  id: Page;
  version: string;
  component: ComponentType;
  navGroup?: NavGroup;
  /** サイドバーに表示しない（form/preview等） */
  hiddenInNav?: boolean;
}

/** 画面モジュール登録 — 追加・更新はここだけ触ればOK */
export const PAGE_MODULES: PageModule[] = [
  { id: 'studio', version: MODULE_VERSIONS.studio, component: StudioHomePage, navGroup: 'studio' },
  { id: 'quick', version: MODULE_VERSIONS.studio, component: QuickSetupPage, navGroup: 'studio', hiddenInNav: true },
  { id: 'form', version: MODULE_VERSIONS.studio, component: FormPage, navGroup: 'studio', hiddenInNav: true },
  { id: 'scene', version: MODULE_VERSIONS.studio, component: ScenePage, navGroup: 'studio', hiddenInNav: true },
  { id: 'preview', version: MODULE_VERSIONS.studio, component: PreviewPage, navGroup: 'studio', hiddenInNav: true },
  { id: 'deploy', version: MODULE_VERSIONS.studio, component: DeployPage, navGroup: 'studio', hiddenInNav: true },
  { id: 'list', version: MODULE_VERSIONS.cases, component: ListPage, navGroup: 'cases' },
  { id: 'equip', version: MODULE_VERSIONS.equip, component: EquipPage, navGroup: 'equip', hiddenInNav: true },
  { id: 'urls', version: MODULE_VERSIONS.urls, component: UrlsPage, navGroup: 'urls' },
  { id: 'report', version: MODULE_VERSIONS.report, component: ReportPage, navGroup: 'urls', hiddenInNav: true },
];

const byId = new Map(PAGE_MODULES.map((m) => [m.id, m]));

export function getPageModule(page: Page): PageModule {
  if (page === 'monitor') return byId.get('list') ?? PAGE_MODULES[0];
  return byId.get(page) ?? PAGE_MODULES[0];
}

export function isNavActive(page: Page, group: NavGroup): boolean {
  const effective = page === 'monitor' ? 'list' : page;
  const mod = byId.get(effective);
  return mod?.navGroup === group;
}

export function getNavTarget(group: NavGroup): Page {
  const targets: Record<NavGroup, Page> = {
    studio: 'studio',
    cases: 'list',
    equip: 'equip',
    urls: 'urls',
  };
  return targets[group];
}
