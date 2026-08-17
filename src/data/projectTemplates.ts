import type { DataSource, Plan } from '../types';

export type SiteTemplateId = 'face4_jma' | 'face4_okinawa_kumejima' | 'face5_standard' | 'face4_ecs' | 'face4_wxtech';

export interface SiteTemplateDef {
  id: SiteTemplateId;
  label: string;
  description: string;
  /** デザイン固定の注意（UI表示用） */
  designNote: string;
  /** 本番エンジン HTML（CSS・見た目は変更不可） */
  engineFile: string;
  cloneProjectId: string;
  faces: number;
  pixel: string;
  source: DataSource;
  plan: Plan;
  contracted: string[];
  options: {
    rain_warn: boolean; flood_info: boolean; landslide_info: boolean; surge_info: boolean; weather_warn: boolean; evac_info: boolean; jishin: boolean; bousai: boolean; multilang: boolean;
    slogan: boolean; wind_meter: boolean; nowcast: boolean; video: boolean; pdf: boolean;
  };
  defaultEcsDataId?: string;
  footBannerSrc?: string;
  logoSrc?: string;
}

const DESIGN_LOCKED =
  'デザイン・CSS・DOMは固定です。地点・社名・ロゴ・コンテンツON/OFFのみ差し替えます。';

/**
 * 現場テンプレート — 正本エンジン HTML はデザイン固定。
 * 案件作成では SignageConfig / クエリのみを差し替える。
 */
export const SITE_TEMPLATES: Record<SiteTemplateId, SiteTemplateDef> = {
  face4_jma: {
    id: 'face4_jma',
    label: 'Cube4面 基本（鴻治組・庄原）',
    description: '512×128 / ロゴ列なし / 気象庁・環境省 — 庄原市鴻治組デザイン（本番4面の基本構成）',
    designNote: DESIGN_LOCKED,
    engineFile: 'wbgt-cube-hiroshima-koujigumi-4face.html',
    cloneProjectId: 'shobara',
    faces: 4,
    pixel: '512x128',
    source: 'jma',
    plan: 'standard',
    contracted: ['rain_warn', 'weather_warn', 'jishin', 'bousai', 'clock', 'message', 'multilang', 'nowcast'],
    options: {
      rain_warn: true, flood_info: true, landslide_info: true, surge_info: true, weather_warn: true,
      evac_info: true, jishin: true, bousai: true, multilang: true,
      slogan: false, wind_meter: false, nowcast: true, video: false, pdf: false,
    },
    footBannerSrc: './assets/kohji_logo.png',
    logoSrc: './assets/kohji_logo.png',
  },
  face4_okinawa_kumejima: {
    id: 'face4_okinawa_kumejima',
    label: 'Cube4面 沖縄・久米島',
    description: '512×128 / 通常は天気予報・WBGT、防災は発表時割り込み（色付き3段・r8警報）',
    designNote: DESIGN_LOCKED,
    engineFile: 'wbgt-cube-okinawa-kumejima-4face.html',
    cloneProjectId: 'kumejima',
    faces: 4,
    pixel: '512x128',
    source: 'jma',
    plan: 'standard',
    contracted: ['rain_warn', 'flood_info', 'landslide_info', 'surge_info', 'weather_warn', 'evac_info', 'jishin', 'bousai', 'clock', 'message', 'multilang', 'nowcast'],
    options: {
      rain_warn: true, flood_info: true, landslide_info: true, surge_info: true, weather_warn: true,
      evac_info: true, jishin: true, bousai: true, multilang: true,
      slogan: false, wind_meter: false, nowcast: true, video: false, pdf: false,
    },
    footBannerSrc: './assets/greencross_foot_name.svg',
    logoSrc: './assets/greencross_logo.png',
  },
  face5_standard: {
    id: 'face5_standard',
    label: 'Cube5面 基本（住之江）',
    description: '640×128 / 右端ロゴ128 / 気象庁・環境省 — 本番5面の基本構成',
    designNote: DESIGN_LOCKED,
    engineFile: 'wbgt-cube-osaka-suminoe-5face.html',
    cloneProjectId: 'oumi',
    faces: 5,
    pixel: '640x128',
    source: 'jma',
    plan: 'standard',
    contracted: ['rain_warn', 'weather_warn', 'jishin', 'bousai', 'clock', 'message', 'multilang', 'nowcast'],
    options: {
      rain_warn: true, flood_info: true, landslide_info: true, surge_info: true, weather_warn: true,
      evac_info: true, jishin: true, bousai: true, multilang: true,
      slogan: false, wind_meter: false, nowcast: true, video: false, pdf: false,
    },
    footBannerSrc: './assets/greencross_foot_name.svg',
    logoSrc: './assets/greencross_logo.png',
  },
  face4_ecs: {
    id: 'face4_ecs',
    label: 'Cube4面 ECS現場計測',
    description: '佐々木建設型 — ECS + 環境省フォールバック / 512×128',
    designNote: DESIGN_LOCKED,
    engineFile: 'wbgt-cube-sasakikensetu-4face.html',
    cloneProjectId: 'sasaki',
    faces: 4,
    pixel: '512x128',
    source: 'device',
    plan: 'standard',
    contracted: ['rain_warn', 'bousai', 'clock', 'message'],
    options: {
      rain_warn: false, flood_info: false, landslide_info: false, surge_info: false, weather_warn: false,
      evac_info: false, jishin: false, bousai: true, multilang: false,
      slogan: false, wind_meter: false, nowcast: false, video: false, pdf: false,
    },
    defaultEcsDataId: '1050',
    footBannerSrc: './assets/sasakikensetu_foot_name.svg',
    logoSrc: './assets/sasakikensetu_logo.png',
  },
  face4_wxtech: {
    id: 'face4_wxtech',
    label: 'Cube4面 WxTech（ウェザーニューズ）',
    description: '512×128 / ピンポイント予報・体感（≠WBGT）— 気象庁・環境省・警報は未使用',
    designNote: DESIGN_LOCKED,
    engineFile: 'wx-cube-4face.html',
    cloneProjectId: 'suminoe',
    faces: 4,
    pixel: '512x128',
    source: 'wxtech',
    plan: 'standard',
    contracted: ['clock', 'message'],
    options: {
      rain_warn: false, flood_info: false, landslide_info: false, surge_info: false, weather_warn: false,
      evac_info: false, jishin: false, bousai: false, multilang: false,
      slogan: false, wind_meter: false, nowcast: false, video: false, pdf: false,
    },
    footBannerSrc: './assets/greencross_foot_name.svg',
    logoSrc: './assets/greencross_logo.png',
  },
};

/** 既存案件から量産用テンプレートを推定（地点だけ変えて複製するとき） */
export function templateIdForProject(p: {
  source: DataSource;
  faces: number;
  engineFile?: string;
}): SiteTemplateId {
  if (p.source === 'wxtech') return 'face4_wxtech';
  if (p.source === 'device') return 'face4_ecs';
  if (p.faces === 5) return 'face5_standard';
  const file = (p.engineFile || '').toLowerCase();
  if (file.includes('kumejima')) return 'face4_okinawa_kumejima';
  return 'face4_jma';
}

/** 表示順: 4面基本 → 沖縄久米島 → 5面基本 → ECS → WxTech */
export const SITE_TEMPLATE_LIST: SiteTemplateDef[] = [
  SITE_TEMPLATES.face4_jma,
  SITE_TEMPLATES.face4_okinawa_kumejima,
  SITE_TEMPLATES.face5_standard,
  SITE_TEMPLATES.face4_ecs,
  SITE_TEMPLATES.face4_wxtech,
];
