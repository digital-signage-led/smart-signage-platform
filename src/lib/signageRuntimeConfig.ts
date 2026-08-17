/**
 * 本番 HTML 内 SignageConfig / SIGNAGE_CONFIG 相当（GAS config.json Phase2 兼用）
 */

import { moeCodesForPrefecture } from '../data/prefectureMoe';
import type { SignageMessageOptions } from './deploy';
import {
  DEFAULT_ECS_GAS_URL,
  resolveEcsDataId,
  resolveEcsLoId,
} from './externalApiScenes';
export { DEFAULT_ECS_GAS_URL };
import type { Project, CorpTitlePos } from '../types';
import { detectCorpTitlePos, formatLegalCompanyName } from './companyName';

export const DEFAULT_MOE_GAS_URL =
  'https://script.google.com/macros/s/AKfycbzSTsappgfJTaJruOBJsbnCXSTPkeTBp39CXpvoSZsPQ0mWGs4KjSonC8_eZ2b1EeUXTQ/exec';

/** ウェザーニューズ WxTech プロキシ GAS（APIキーは GAS 側のみ） */
export const DEFAULT_WXTECH_GAS_URL =
  import.meta.env.VITE_WXTECH_GAS_URL?.trim() ||
  'https://script.google.com/macros/s/AKfycbxIdjloOZpfmMCZYLlebfviFUr434H-LlAR1GLPLhDltaRUTqx6tQHAq6Q7Fxy-d_uG/exec';

export interface SignageRuntimeSiteConfig {
  /** true で防災情報のみ（時刻・WBGT・予報ループを出さない） */
  bosaiOnly?: boolean;
  site: {
    customer: string;
    rental: string;
    label: string;
    address: string;
    /** 画面の現地表示（市区町村など） */
    locationLabel?: string;
  };
  moe: {
    gasUrl: string;
    point: string;
    fallbackPoint: string;
    pointName: string;
    alertArea: string;
    region: string;
    prefecture: string;
  };
  ecs?: {
    enabled: boolean;
    publicUrl?: string;
    dataId: string;
    loId: string;
    locationLabel: string;
    baseUrl: string;
    proxyUrl: string;
    /** 環境クラウド専用 GAS URL（省略時は moe.gasUrl + type=ecs） */
    gasUrl?: string;
    liveJson: string;
    refreshMs: number;
  };
  jma: {
    amedasPoint: string;
    forecastArea: string;
    forecastLabel: string;
    warnArea: string;
    warnCity: string;
  };
  geo: { lat: number; lon: number };
  timeZone: string;
  refreshMs: number;
  footSource: string;
  footSourceEcs?: string;
  message?: {
    text: string;
    style: 'scroll' | 'fixed';
    enabled: boolean;
    durationSec: number;
  };
  ambient?: {
    enabled?: boolean;
    season?: boolean;
    month?: boolean;
    sky?: boolean;
  };
}

export interface SignageRuntimeLogoConfig {
  logoSrc: string;
  logoAlt: string;
  logoPanelBg: string;
  footLogoSrc: string;
  footBannerSrc: string;
}

export interface SignageRuntimePayload {
  SignageConfig: SignageRuntimeSiteConfig;
  SIGNAGE_CONFIG: SignageRuntimeLogoConfig;
}

function companyLabel(company: string, pos?: CorpTitlePos): string {
  return formatLegalCompanyName(company, pos ?? detectCorpTitlePos(company));
}

function ecsProxyUrl(): string {
  return import.meta.env.VITE_ECS_PROXY_URL?.trim() || DEFAULT_ECS_GAS_URL;
}

/** ECS 公開ページ URL（LoID + 組織コード。佐々木建設本番は 08122） */
export function ecsPublicUrlFor(loId: string, orgId = '08122'): string {
  const id = loId.trim();
  return `https://www.ecs-cloud.ne.jp/Public/${orgId}/Sokutei/WBGT/RN?LoID=${encodeURIComponent(id)}&KizaiType=ALL`;
}

function jsQuote(value: string): string {
  return `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

export function buildSignageRuntimeConfig(
  project: Project,
  prefecture = '',
  message?: SignageMessageOptions,
): SignageRuntimePayload {
  const customer = companyLabel(project.company, project.corpTitlePos);
  const siteLabel = customer || project.company.trim();
  const moePoint = project.moePoint?.trim() || project.jmaPoint?.trim() || '71106';
  const jmaPoint = project.jmaPoint?.trim() || moePoint;
  const jmaArea = project.jmaArea?.trim() || '360000';
  const moeCodes = moeCodesForPrefecture(prefecture || project.prefecture || '');
  const pointName = project.moePointName?.trim() || project.jmaForecastLabel?.trim() || '徳島';
  const forecastLabel = project.jmaForecastLabel?.trim() || project.site.trim() || '北島町';
  const locationLabel = project.site.trim() || '現場';
  const gasUrl = project.moeGasUrl?.trim() || DEFAULT_MOE_GAS_URL;
  const footSourceEcs =
    project.footSourceEcs?.trim() ||
    (project.source === 'device' ? `出典：環境クラウドサービス・${locationLabel}` : undefined);

  const SignageConfig: SignageRuntimeSiteConfig = {
    bosaiOnly: project.bosaiOnly === true,
    site: {
      customer: siteLabel,
      rental: '',
      label: siteLabel,
      address: project.siteAddress?.trim() || '',
      locationLabel: forecastLabel || locationLabel,
    },
    moe: {
      gasUrl,
      point: moePoint,
      fallbackPoint: '',
      pointName,
      alertArea: moeCodes.alertArea,
      region: moeCodes.region,
      prefecture: moeCodes.prefecture,
    },
    jma: {
      amedasPoint: jmaPoint,
      forecastArea: jmaArea,
      forecastLabel,
      warnArea: jmaArea,
      warnCity: project.jmaWarnCity?.trim() || '3640200',
    },
    geo: project.geo ?? { lat: 34.1256, lon: 134.547 },
    timeZone: 'Asia/Tokyo',
    refreshMs: 60000,
    footSource: '出典：気象庁・環境省データ',
  };

  if (project.source === 'device') {
    const dataId = resolveEcsDataId(project);
    const loId = resolveEcsLoId(project);
    const ecsGasUrl = project.ecsGasUrl?.trim() || DEFAULT_ECS_GAS_URL;
    SignageConfig.ecs = {
      enabled: true,
      ...(loId ? { publicUrl: ecsPublicUrlFor(loId) } : {}),
      dataId,
      loId,
      locationLabel,
      baseUrl: 'https://www.ecs-cloud.ne.jp',
      proxyUrl: ecsProxyUrl(),
      ...(ecsGasUrl ? { gasUrl: ecsGasUrl } : {}),
      liveJson: './assets/ecs-live.json',
      refreshMs: 60000,
    };
    if (footSourceEcs) SignageConfig.footSourceEcs = footSourceEcs;
  }

  if (message?.msgEnabled && message.msgText?.trim()) {
    SignageConfig.message = {
      text: message.msgText.trim(),
      style: message.msgStyle === 'fixed' ? 'fixed' : 'scroll',
      enabled: true,
      durationSec: message.msgDuration && message.msgDuration > 0 ? message.msgDuration : 9,
    };
  }

  const isEcs = project.source === 'device';
  const logoSrc =
    project.logoSrc?.trim() ||
    (isEcs ? './assets/sasakikensetu_logo.png' : './assets/greencross_logo.png');
  const footBanner =
    project.footBannerSrc?.trim() ||
    (isEcs ? './assets/sasakikensetu_foot_name.svg' : './assets/greencross_foot_name.svg');

  return {
    SignageConfig,
    SIGNAGE_CONFIG: {
      logoSrc,
      logoAlt: siteLabel,
      /* 住之江正本と同じ白背景（デザイン固定） */
      logoPanelBg: isEcs ? '#3a3a3a' : '#ffffff',
      footLogoSrc: logoSrc,
      footBannerSrc: footBanner,
    },
  };
}

/** HTML 内 IIFE の cfg / SIGNAGE_CONFIG ブロック（デザインは触らず設定のみ差替） */
export function buildSignageConfigScriptBlock(payload: SignageRuntimePayload): string {
  const c = payload.SignageConfig;
  const logo = payload.SIGNAGE_CONFIG;
  const ecsPublicLine = c.ecs?.publicUrl
    ? `\n      publicUrl: ${jsQuote(c.ecs.publicUrl)},`
    : '';
  const ecsBlock = c.ecs
    ? `    ecs: {
      enabled: true,${ecsPublicLine}
      dataId: ${jsQuote(c.ecs.dataId)},
      loId: ${jsQuote(c.ecs.loId)},
      locationLabel: ${jsQuote(c.ecs.locationLabel)},
      baseUrl: ${jsQuote(c.ecs.baseUrl)},
      proxyUrl: ${jsQuote(c.ecs.proxyUrl)},${c.ecs.gasUrl ? `\n      gasUrl: ${jsQuote(c.ecs.gasUrl)},` : ''}
      liveJson: ${jsQuote(c.ecs.liveJson)},
      refreshMs: ${c.ecs.refreshMs}
    },`
    : '';

  const footEcsLine = c.footSourceEcs
    ? `\n    footSourceEcs: ${jsQuote(c.footSourceEcs)}`
    : '';

  const messageBlock = c.message
    ? `,
    message: {
      text: ${jsQuote(c.message.text)},
      style: ${jsQuote(c.message.style)},
      enabled: true,
      durationSec: ${c.message.durationSec}
    }`
    : '';

  const amb = c.ambient;
  const ambientBlock = amb
    ? `,
    ambient: { enabled: ${amb.enabled !== false}, season: ${amb.season !== false}, month: ${amb.month !== false}, sky: ${amb.sky !== false} }`
    : '';

  return `  var cfg = {
    bosaiOnly: ${c.bosaiOnly === true},
    site: {
      customer: ${jsQuote(c.site.customer)},
      rental: ${jsQuote(c.site.rental)},
      label: ${jsQuote(c.site.label)},
      address: ${jsQuote(c.site.address)},
      locationLabel: ${jsQuote(c.site.locationLabel || c.jma.forecastLabel)}
    },
    moe: {
      gasUrl:
        ${jsQuote(c.moe.gasUrl)},
      point: ${jsQuote(c.moe.point)},
      fallbackPoint: ${jsQuote(c.moe.fallbackPoint)},
      pointName: ${jsQuote(c.moe.pointName)},
      alertArea: ${jsQuote(c.moe.alertArea)},
      region: ${jsQuote(c.moe.region)},
      prefecture: ${jsQuote(c.moe.prefecture)}
    },
${ecsBlock}
    jma: {
      amedasPoint: ${jsQuote(c.jma.amedasPoint)},
      forecastArea: ${jsQuote(c.jma.forecastArea)},
      forecastLabel: ${jsQuote(c.jma.forecastLabel)},
      warnArea: ${jsQuote(c.jma.warnArea)},
      warnCity: ${jsQuote(c.jma.warnCity)}
    },
    geo: { lat: ${c.geo.lat}, lon: ${c.geo.lon} },
    timeZone: ${jsQuote(c.timeZone)},
    refreshMs: ${c.refreshMs},
    footSource: ${jsQuote(c.footSource)}${footEcsLine}${messageBlock}${ambientBlock}
  };

  global.SignageConfig = cfg;

  global.SIGNAGE_CONFIG = {
    logoSrc: ${jsQuote(logo.logoSrc)},
    logoAlt: ${jsQuote(logo.logoAlt)},
    logoPanelBg: ${jsQuote(logo.logoPanelBg)},
    footLogoSrc: ${jsQuote(logo.footLogoSrc)},
    footBannerSrc: ${jsQuote(logo.footBannerSrc)}
  };`;
}

export function runtimeConfigJson(payload: SignageRuntimePayload): string {
  return JSON.stringify(payload, null, 2);
}

/** クイック作成プレビュー用 — 本番 HTML の SignageConfig 主要項目 */
export function runtimeConfigSummaryRows(payload: SignageRuntimePayload): { label: string; value: string }[] {
  const c = payload.SignageConfig;
  const logo = payload.SIGNAGE_CONFIG;
  const rows: { label: string; value: string }[] = [
    { label: 'site.customer', value: c.site.customer },
    { label: 'site.address', value: c.site.address || '—' },
    { label: 'moe.point / pointName', value: `${c.moe.point}（${c.moe.pointName}）` },
    { label: 'moe.alertArea', value: c.moe.alertArea },
  ];
  if (c.ecs) {
    rows.push(
      { label: 'ecs.dataId / loId', value: `${c.ecs.dataId} / ${c.ecs.loId || '—'}` },
      { label: 'ecs.locationLabel', value: c.ecs.locationLabel },
    );
    if (c.ecs.publicUrl) rows.push({ label: 'ecs.publicUrl', value: c.ecs.publicUrl });
  }
  if (c.message) {
    rows.push(
      { label: 'message.text', value: c.message.text },
      { label: 'message.style', value: c.message.style },
    );
  }
  rows.push(
    { label: 'bosaiOnly', value: c.bosaiOnly ? 'true' : 'false' },
    { label: 'jma.forecastLabel', value: c.jma.forecastLabel },
    { label: 'jma.warnCity', value: c.jma.warnCity },
    { label: 'footSourceEcs', value: c.footSourceEcs || '—' },
    { label: 'footBannerSrc', value: logo.footBannerSrc },
  );
  return rows;
}
