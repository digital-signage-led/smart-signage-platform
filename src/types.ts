export type Page = 'list' | 'quick' | 'form' | 'studio' | 'scene' | 'preview' | 'deploy' | 'monitor' | 'equip' | 'report' | 'urls';
export type ProjectStatus = 'ok' | 'warn' | 'down' | 'new';
/** 案件の運用状態（台帳）。モニターの ok/warn/down とは別 */
export type LifecycleStatus = 'draft' | 'published' | 'stopped' | 'archived';
/** 契約（有料）かデモか */
export type ProjectListing = 'paid' | 'demo';
export type Plan = 'basic' | 'standard';
export type EquipStatus = 'ok' | 'fault' | 'repair' | 'spare';
export type EquipType = 'a35' | 'hide' | 'led' | 'other';
export type MonStatus = 'ok' | 'warn' | 'down' | 'off';
export type DataSource = 'edam' | 'jma' | 'manual' | 'device' | 'wxtech';
export type SignageKind = 'cube' | 'strip';
/** 会社名の株式会社の位置。prefix=前株 / suffix=後株 / none=付けない */
export type CorpTitlePos = 'prefix' | 'suffix' | 'none';

/** 会社マスタ — 社名・ロゴは会社単位（現場では共有） */
export interface Company {
  id: string;
  name: string;
  /** 株式会社の位置（会社マスタの初期値） */
  corpTitlePos?: CorpTitlePos;
  /** public/signage/assets 内のファイル名（例: sasakikensetu_logo.png） */
  logoKey?: string;
  /** 下帯バナーのファイル名（任意） */
  footBannerKey?: string;
  note?: string;
}

export interface Project {
  id: string;
  company: string;
  /** 株式会社の位置（前株 / 後株 / なし） */
  corpTitlePos?: CorpTitlePos;
  /** 会社マスタへの参照 */
  companyId?: string;
  /** assets 内ロゴファイル名（会社マスタから同期） */
  logoKey?: string;
  site: string;
  status: ProjectStatus;
  /** 台帳上の運用状態 */
  lifecycle?: LifecycleStatus;
  /** 契約（有料） / デモ */
  listing?: ProjectListing;
  plan: Plan;
  faces: number;
  /** Cube（立体）またはストリップ（横長3面） */
  signageKind?: SignageKind;
  lastDeploy: string | null;
  engine: string | null;
  options: string[];
  contracted: string[];
  source?: DataSource;
  sourceId?: string;
  /** ECS 取得失敗時の環境省 WBGT 5桁地点（device ソース時） */
  moePoint?: string;
  /** 気象庁 AMeDAS 地点（省略時 moePoint と同値） */
  jmaPoint?: string;
  /** 気象庁予報区域コード 例: 360000 */
  jmaArea?: string;
  deviceToken?: string;
  /** 解像度台帳 pixel 例: 512x128 */
  pixel?: string;
  /** 5面ロゴ（data URL または公開パス） */
  logoSrc?: string;
  prefecture?: string;
  siteAddress?: string;
  /** ECS ロケーション ID（device ソース） */
  ecsLoId?: string;
  /** 環境クラウド専用 GAS URL（省略時は moeGasUrl + type=ecs） */
  ecsGasUrl?: string;
  /** WxTech プロキシ GAS URL（source=wxtech） */
  wxtechGasUrl?: string;
  /** GAS SITES キー（例: suminoe）。省略時は geo の lat/lon */
  wxtechSite?: string;
  /** 外部API切替前の標準データ源（シーン設定で復元） */
  stdSource?: DataSource;
  /** 外部API切替前のエンジン HTML */
  stdEngineFile?: string;
  moeGasUrl?: string;
  moePointName?: string;
  jmaForecastLabel?: string;
  jmaWarnCity?: string;
  /** 本番エンジン HTML 上書き（例: wbgt-cube-okinawa-kumejima-4face.html） */
  engineFile?: string;
  /** true で防災のみ表示（時刻・WBGT・予報ループを出さない） */
  bosaiOnly?: boolean;
  footBannerSrc?: string;
  /** ECS 現場計測時のシーン4下帯出典（例: 出典：環境クラウドサービス・老門作業所） */
  footSourceEcs?: string;
  geo?: { lat: number; lon: number };
  /** デプロイ後に発行した一般公開 URL */
  publishedUrl?: string;
}

export interface ProjectForm {
  company: string;
  corpTitlePos: CorpTitlePos;
  companyId: string;
  lifecycle: LifecycleStatus;
  listing: ProjectListing;
  site: string;
  prefecture: string;
  contactName: string;
  tel: string;
  email: string;
  plan: Plan;
  signageKind: SignageKind;
  faces: string;
  pixel: string;
  options: { rain_warn: boolean; flood_info: boolean; landslide_info: boolean; surge_info: boolean; weather_warn: boolean; evac_info: boolean; jishin: boolean; bousai: boolean; multilang: boolean; slogan: boolean; wind_meter: boolean; nowcast: boolean; video: boolean; pdf: boolean };
  contractDate: string;
  source: DataSource;
  sourceId: string;
  moePoint: string;
  jmaPoint: string;
  jmaArea: string;
  siteAddress: string;
  ecsLoId: string;
  moeGasUrl: string;
  moePointName: string;
  jmaForecastLabel: string;
  /** 気象庁警報・注意報の市町村コード（例: 4736100） */
  jmaWarnCity: string;
  /** 緯度（文字列。保存時に数値化） */
  geoLat: string;
  /** 経度（文字列。保存時に数値化） */
  geoLon: string;
  fallback: boolean;
  controller: string;
  serial: string;
}

export interface SceneItem {
  id: string;
  enabled: boolean;
  duration: number;
}

export interface DeployRecord {
  dt: string;
  user: string;
  version: string;
  status: 'success' | 'failed';
  target: '本番' | 'テスト';
  rollback?: boolean;
}

export interface Equipment {
  id: string;
  type: EquipType;
  model: string;
  serial: string;
  purchase: string;
  intro: string;
  siteId: string;
  siteName: string;
  status: EquipStatus;
  firmware: string;
  deviceToken: string;
  lastSeen: string;
}

export interface EquipLogEntry {
  dt: string;
  user: string;
  action: string;
  detail: string;
}

export interface MonSite {
  id: string;
  company: string;
  site: string;
  plan: Plan;
  status: MonStatus;
  agoSec: number | null;
  uptimeH: number | null;
  run: string;
  engine: string;
  issueType?: string;
  cause?: string;
  recommend?: string;
}

export interface MonRecord {
  status: string;
  note: string;
  at: string;
}

export interface ConfirmConfig {
  open: boolean;
  title?: string;
  message?: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm?: () => void;
}

export interface MeasurementReading {
  timestamp: string;
  wbgt: number;
  deviceId: string;
  source: 'external' | 'edam' | 'manual';
}

export interface ReproducibilityResult {
  rate: number;
  sampleCount: number;
  referenceMean: number;
  measuredMean: number;
  maxDeviation: number;
  passed: boolean;
  threshold: number;
}
