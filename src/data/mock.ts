import type { Project, Equipment, MonSite, DeployRecord, EquipLogEntry } from '../types';

export const INITIAL_PROJECTS: Project[] = [
  {
    id: 'sasaki', companyId: 'sasaki-kensetsu', company: '\u4f50\u3005\u6728\u5efa\u8a2d', site: '\u8001\u9580\u4f5c\u696d\u6240', status: 'ok', lifecycle: 'published',
    plan: 'standard', signageKind: 'cube', faces: 4, pixel: '512x128', lastDeploy: '2025-06-15', engine: 'v2.1',
    options: ['bousai', 'multilang', 'jishin', 'flood_info', 'landslide_info', 'surge_info', 'weather_warn', 'evac_info', 'nowcast'],
    contracted: ['rain_warn', 'flood_info', 'landslide_info', 'surge_info', 'weather_warn', 'evac_info', 'jishin', 'bousai', 'clock', 'message', 'multilang', 'nowcast'],
    source: 'device', sourceId: '1050', moePoint: '71106', jmaPoint: '71106', jmaArea: '360000', prefecture: '\u5fb3\u5cf6\u770c',
    siteAddress: '\u3012771-0203 \u5fb3\u5cf6\u770c\u677f\u91ce\u90e1\u5317\u5cf6\u753a\u4e2d\u6751\u524d\u980813-9', ecsLoId: '019373', moePointName: '\u5fb3\u5cf6', jmaForecastLabel: '\u5317\u5cf6\u753a',
    jmaWarnCity: '3640200', footSourceEcs: '\u51fa\u5178\uff1a\u74b0\u5883\u30af\u30e9\u30a6\u30c9\u30b5\u30fc\u30d3\u30b9\u30fb\u8001\u9580\u4f5c\u696d\u6240', geo: { lat: 34.1256, lon: 134.547 },
    footBannerSrc: './assets/sasakikensetu_foot_name.svg', logoKey: 'sasakikensetu_logo.png', logoSrc: './assets/sasakikensetu_logo.png',
    deviceToken: 'a35_sasaki_001', engineFile: 'wbgt-cube-sasakikensetu-4face.html',
  },
  {
    id: 'suminoe', companyId: 'digital-signage', company: '\u30c7\u30b8\u30bf\u30eb\u30b5\u30a4\u30cd\u30fc\u30b8', site: '\u4f4f\u4e4b\u6c5f\u4f1a\u5834', status: 'ok', lifecycle: 'published',
    listing: 'demo', plan: 'standard', signageKind: 'cube', faces: 4, pixel: '512x128', lastDeploy: '2025-08-01', engine: 'v2.1',
    options: [], contracted: ['clock', 'message'], source: 'wxtech', sourceId: 'suminoe', wxtechSite: 'suminoe', prefecture: '\u5927\u962a\u5e9c',
    siteAddress: '\u5927\u962a\u5e9c\u5927\u962a\u5e02\u4f4f\u4e4b\u6c5f\u533a\u65b0\u5317\u5cf6\u4e00\u4e01\u76ee', jmaForecastLabel: '\u4f4f\u4e4b\u6c5f\u533a', geo: { lat: 34.605184, lon: 135.470949 },
    engineFile: 'wx-cube-4face.html', footBannerSrc: './assets/greencross_foot_name.svg', logoKey: 'greencross_logo.png',
    logoSrc: './assets/greencross_logo.png', deviceToken: 'a35_suminoe_001',
  },
  {
    id: 'miyagawa', companyId: 'miyagawa-kogyo', company: '\u5bae\u5ddd\u8208\u696d', site: '\u5e83\u5cf6\u4f1a\u5834', status: 'ok', lifecycle: 'published',
    plan: 'standard', signageKind: 'cube', faces: 4, pixel: '512x128', lastDeploy: '2025-06-20', engine: 'v2.1',
    options: ['multilang'], contracted: ['clock', 'message', 'multilang'], source: 'jma', sourceId: '67437', moePoint: '67437',
    jmaPoint: '67437', jmaArea: '340000', prefecture: '\u5e83\u5cf6\u770c', siteAddress: '\u5e83\u5cf6\u770c\u5e83\u5cf6\u5e02\u4e2d\u533a\u57fa\u753a6\u4e01\u76ee',
    moePointName: '\u5e83\u5cf6', jmaForecastLabel: '\u5e83\u5cf6\u5e02', jmaWarnCity: '34105', geo: { lat: 34.3963, lon: 132.4596 },
    footBannerSrc: './assets/greencross_foot_name.svg', deviceToken: 'a35_miyagawa_001',
  },
  {
    id: 'naratetsu', companyId: 'nara-daitetsu', company: '\u5948\u826f\u5927\u9244', site: '\u5948\u826f\u5e02', status: 'ok', lifecycle: 'published',
    plan: 'standard', signageKind: 'cube', faces: 4, pixel: '640x128', lastDeploy: '2025-05-20', engine: 'v2.1',
    options: [], contracted: ['clock', 'message'], source: 'edam', sourceId: 'LOID-NARA-001', deviceToken: 'a35_naratetsu_001',
  },
  {
    id: 'fujiken', companyId: 'fujiken-nagasaki', company: '\u30d5\u30b8\u30b1\u30f3\u9577\u5d0e', site: '\u73fe\u5834A', status: 'new', lifecycle: 'draft',
    listing: 'demo', plan: 'basic', signageKind: 'cube', faces: 4, pixel: '512x128', lastDeploy: null, engine: null,
    options: ['logo', 'message'], contracted: ['clock', 'message', 'multilang'], source: 'manual', sourceId: '',
    deviceToken: 'a35_fujiken_001',
  },
  {
    id: 'sendai', companyId: 'sendai-62078', company: '\u4ed9\u53f0_62078', site: '\u672c\u753a\u4f5c\u696d\u6240', status: 'down', lifecycle: 'stopped',
    plan: 'standard', signageKind: 'strip', faces: 3, pixel: '384x128', lastDeploy: '2025-04-10', engine: 'v2.1',
    options: [], contracted: ['clock'], source: 'edam', sourceId: 'LOID-SENDAI-001', deviceToken: 'a35_sendai_001',
  },
  {
    id: 'himeji', companyId: 'himeji-kensetsu', company: '\u59eb\u8def\u5efa\u8a2d', site: '63383\u59eb\u8def', status: 'warn', lifecycle: 'published',
    plan: 'standard', signageKind: 'cube', faces: 4, pixel: '512x128', lastDeploy: '2025-06-22', engine: 'v2.1',
    options: ['jishin'], contracted: ['jishin', 'clock', 'message'], source: 'edam', sourceId: 'LOID-HIMEJI-001',
    deviceToken: 'a35_himeji_001',
  },
  {
    id: 'oumi', companyId: 'oumi-hachiman', company: '\u8fd1\u6c5f\u516b\u5e61\u7d44', site: '\u516b\u5e61\u5de5\u533a', status: 'ok', lifecycle: 'published',
    plan: 'standard', signageKind: 'cube', faces: 5, pixel: '640x128', logoKey: 'greencross_logo.png', logoSrc: './assets/greencross_logo.png',
    lastDeploy: '2025-03-30', engine: 'v2.0',
    options: ['bousai', 'jishin', 'flood_info', 'landslide_info', 'surge_info', 'weather_warn', 'evac_info', 'nowcast'],
    contracted: ['rain_warn', 'flood_info', 'landslide_info', 'surge_info', 'weather_warn', 'evac_info', 'jishin', 'bousai', 'clock', 'message', 'multilang', 'nowcast'],
    source: 'jma', sourceId: '62078', moePoint: '62078', jmaPoint: '62078', jmaArea: '270000', prefecture: '\u5927\u962a\u5e9c',
    siteAddress: '\u5927\u962a\u5e9c\u5927\u962a\u5e02\u4f4f\u4e4b\u6c5f\u533a\u65b0\u5317\u5cf6\u4e00\u4e01\u76ee', moePointName: '\u5927\u962a', jmaForecastLabel: '\u5927\u962a\u5e02', jmaWarnCity: '2710000',
    geo: { lat: 34.605184, lon: 135.470949 }, footBannerSrc: './assets/greencross_foot_name.svg', deviceToken: 'a35_oumi_001',
  },
  {
    id: 'kumejima', companyId: 'okinawa-ds', company: '\u6c96\u7e04DS', site: '\u4e45\u7c73\u5cf6', status: 'ok', lifecycle: 'published',
    plan: 'standard', signageKind: 'cube', faces: 4, pixel: '512x128', lastDeploy: '2026-05-01', engine: 'v2.1',
    options: ['bousai', 'multilang', 'jishin', 'flood_info', 'landslide_info', 'surge_info', 'weather_warn', 'evac_info', 'nowcast'],
    contracted: ['rain_warn', 'flood_info', 'landslide_info', 'surge_info', 'weather_warn', 'evac_info', 'jishin', 'bousai', 'clock', 'message', 'multilang', 'nowcast'],
    source: 'jma', sourceId: '91166', moePoint: '91166', jmaPoint: '91166', jmaArea: '471000', prefecture: '\u6c96\u7e04\u770c',
    siteAddress: '\u6c96\u7e04\u770c\u5cf6\u5c3b\u90e1\u4e45\u7c73\u5cf6\u753a', moePointName: '\u4e45\u7c73\u5cf6', jmaForecastLabel: '\u4e45\u7c73\u5cf6', jmaWarnCity: '4736100',
    geo: { lat: 26.3406, lon: 126.805 }, engineFile: 'wbgt-cube-okinawa-kumejima-4face.html', bosaiOnly: false,
    footBannerSrc: './assets/greencross_foot_name.svg', logoKey: 'greencross_logo.png', logoSrc: './assets/greencross_logo.png',
    deviceToken: 'a35_kumejima_001',
  },
  {
    id: 'shobara', companyId: 'kohji-gumi', company: '\u9d3b\u6cbb\u7d44', site: '\u5e84\u539f\u5e02\u4f1a\u5834', status: 'ok', lifecycle: 'published',
    plan: 'standard', signageKind: 'cube', faces: 4, pixel: '512x128', lastDeploy: '2026-08-01', engine: 'v2.1',
    options: ['bousai', 'multilang', 'jishin', 'flood_info', 'landslide_info', 'surge_info', 'weather_warn', 'evac_info', 'nowcast'],
    contracted: ['rain_warn', 'flood_info', 'landslide_info', 'surge_info', 'weather_warn', 'evac_info', 'jishin', 'bousai', 'clock', 'message', 'multilang', 'nowcast'],
    source: 'jma', sourceId: '67116', moePoint: '67116', jmaPoint: '67116', jmaArea: '340000', prefecture: '\u5e83\u5cf6\u770c',
    siteAddress: '\u3012729-5601 \u5e83\u5cf6\u770c\u5e84\u539f\u5e02\u897f\u57ce\u753a\u5c0f\u9ce5\u539f', moePointName: '\u5e84\u539f', jmaForecastLabel: '\u5e84\u539f\u5e02', jmaWarnCity: '3421000',
    geo: { lat: 35.0375, lon: 133.1601 }, engineFile: 'wbgt-cube-hiroshima-koujigumi-4face.html',
    footBannerSrc: './assets/kohji_logo.png', logoKey: 'kohji_logo.png', logoSrc: './assets/kohji_logo.png',
    deviceToken: 'a35_shobara_001',
  },
];

export const INITIAL_EQUIP: Equipment[] = [
  { id: 'EQ-A35-001', type: 'a35', model: 'Colorlight A35', serial: 'A35-ROUMON-001', purchase: '2024-03-10', intro: '2024-03-15', siteId: 'sasaki', siteName: '\u4f50\u3005\u6728\u5efa\u8a2d / \u8001\u9580\u4f5c\u696d\u6240', status: 'ok', firmware: '1.8.2', deviceToken: 'a35_sasaki_001', lastSeen: '2026-06-28 13:09' },
  { id: 'EQ-A35-002', type: 'a35', model: 'Colorlight A35', serial: 'A35-HONMACHI-001', purchase: '2023-11-02', intro: '2023-11-08', siteId: 'sendai', siteName: '\u4ed9\u53f0_62078 / \u672c\u753a\u4f5c\u696d\u6240', status: 'fault', firmware: '1.8.0', deviceToken: 'a35_sendai_001', lastSeen: '2026-06-28 12:53' },
  { id: 'EQ-A35-003', type: 'a35', model: 'Colorlight A35', serial: 'A35-HIMEJI-001', purchase: '2024-05-20', intro: '2024-05-25', siteId: 'himeji', siteName: '\u59eb\u8def\u5efa\u8a2d / 63383\u59eb\u8def', status: 'ok', firmware: '1.8.2', deviceToken: 'a35_himeji_001', lastSeen: '2026-06-28 13:08' },
  { id: 'EQ-A35-004', type: 'a35', model: 'Colorlight A35', serial: 'A35-NARA-001', purchase: '2023-08-14', intro: '2023-08-20', siteId: 'naratetsu', siteName: '\u5948\u826f\u5927\u9244 / \u5948\u826f\u5e02', status: 'ok', firmware: '1.8.2', deviceToken: 'a35_naratetsu_001', lastSeen: '2026-06-28 13:10' },
  { id: 'EQ-A35-005', type: 'a35', model: 'Colorlight A35', serial: 'A35-OUMI-001', purchase: '2023-03-30', intro: '2023-04-05', siteId: 'oumi', siteName: '\u8fd1\u6c5f\u516b\u5e61\u7d44 / \u516b\u5e61\u5de5\u533a', status: 'ok', firmware: '1.8.1', deviceToken: 'a35_oumi_001', lastSeen: '2026-06-28 13:07' },
  { id: 'EQ-A35-006', type: 'a35', model: 'Colorlight A35', serial: 'A35-SPARE-007', purchase: '2025-02-10', intro: '\u2014', siteId: '', siteName: '\u672a\u5272\u5f53\uff08\u4e88\u5099\u5728\u5eab\uff09', status: 'spare', firmware: '1.8.2', deviceToken: '\u2014', lastSeen: '\u2014' },
  { id: 'EQ-LED-001', type: 'led', model: 'P5 \u5c4b\u5916LED\u30e2\u30b8\u30e5\u30fc\u30eb', serial: 'LED-P5-ROUMON-A', purchase: '2024-03-10', intro: '2024-03-15', siteId: 'sasaki', siteName: '\u4f50\u3005\u6728\u5efa\u8a2d / \u8001\u9580\u4f5c\u696d\u6240', status: 'ok', firmware: '\u2014', deviceToken: '\u2014', lastSeen: '2026-06-28 13:09' },
  { id: 'EQ-LED-002', type: 'led', model: 'P5 \u5c4b\u5916LED\u30e2\u30b8\u30e5\u30fc\u30eb', serial: 'LED-P5-HONMACHI-A', purchase: '2023-11-02', intro: '2023-11-08', siteId: 'sendai', siteName: '\u4ed9\u53f0_62078 / \u672c\u753a\u4f5c\u696d\u6240', status: 'repair', firmware: '\u2014', deviceToken: '\u2014', lastSeen: '2026-06-25 09:40' },
  { id: 'EQ-LED-003', type: 'led', model: 'P5 \u5c4b\u5916LED\u30e2\u30b8\u30e5\u30fc\u30eb', serial: 'LED-P5-HIMEJI-A', purchase: '2024-05-20', intro: '2024-05-25', siteId: 'himeji', siteName: '\u59eb\u8def\u5efa\u8a2d / 63383\u59eb\u8def', status: 'ok', firmware: '\u2014', deviceToken: '\u2014', lastSeen: '2026-06-28 13:08' },
  { id: 'EQ-LED-004', type: 'led', model: 'P10 \u5c4b\u5916LED\u30e2\u30b8\u30e5\u30fc\u30eb', serial: 'LED-P10-OUMI-A', purchase: '2023-03-30', intro: '2023-04-05', siteId: 'oumi', siteName: '\u8fd1\u6c5f\u516b\u5e61\u7d44 / \u516b\u5e61\u5de5\u533a', status: 'ok', firmware: '\u2014', deviceToken: '\u2014', lastSeen: '2026-06-28 13:07' },
  { id: 'EQ-LED-005', type: 'led', model: 'P5 \u5c4b\u5916LED\u30e2\u30b8\u30e5\u30fc\u30eb', serial: 'LED-P5-SPARE-02', purchase: '2025-01-18', intro: '\u2014', siteId: '', siteName: '\u672a\u5272\u5f53\uff08\u4e88\u5099\u5728\u5eab\uff09', status: 'spare', firmware: '\u2014', deviceToken: '\u2014', lastSeen: '\u2014' },
  { id: 'EQ-ETC-001', type: 'other', model: '4G \u30eb\u30fc\u30bf\u30fc (docomo)', serial: 'RTR-DOCOMO-014', purchase: '2023-11-02', intro: '2023-11-08', siteId: 'sendai', siteName: '\u4ed9\u53f0_62078 / \u672c\u753a\u4f5c\u696d\u6240', status: 'ok', firmware: '2.4.0', deviceToken: 'rtr_sendai_001', lastSeen: '2026-06-28 12:53' },
  { id: 'EQ-ETC-002', type: 'other', model: '\u30dd\u30fc\u30bf\u30d6\u30eb\u96fb\u6e90', serial: 'PLR-BS-0091', purchase: '2024-05-20', intro: '2024-05-25', siteId: 'himeji', siteName: '\u59eb\u8def\u5efa\u8a2d / 63383\u59eb\u8def', status: 'ok', firmware: '3.1.0', deviceToken: 'plr_himeji_001', lastSeen: '2026-06-28 13:08' },
];

export const INITIAL_DEPLOY_HISTORY: DeployRecord[] = [
  { dt: '2025-06-15 14:32', user: '\u4f50\u3005\u6728 \u592a\u90ce', version: 'v2.1', status: 'success', target: '\u672c\u756a' },
  { dt: '2025-06-10 09:15', user: '\u5c71\u7530 \u592a\u90ce', version: 'v2.1', status: 'success', target: '\u672c\u756a' },
  { dt: '2025-06-08 18:40', user: '\u4f50\u3005\u6728 \u592a\u90ce', version: 'v2.0', status: 'success', target: '\u672c\u756a' },
  { dt: '2025-06-08 17:55', user: '\u4f50\u3005\u6728 \u592a\u90ce', version: 'v2.2', status: 'failed', target: '\u30c6\u30b9\u30c8' },
];

export const INITIAL_EQUIP_LOG: EquipLogEntry[] = [
  { dt: '2025-06-08 17:55', user: '\u4f50\u3005\u6728 \u592a\u90ce', action: 'FW\u66f4\u65b0', detail: 'EQ-A35-003 \u3092 v1.8.2 \u306b\u66f4\u65b0' },
  { dt: '2025-05-30 10:12', user: '\u5c71\u7530 \u592a\u90ce', action: '\u6a5f\u6750\u8ffd\u52a0', detail: 'EQ-LED-005\u3092\u4e88\u5099\u767b\u9332' },
];

export const MON_DATA: MonSite[] = [
  { id: 'sendai', company: '\u4ed9\u53f0_62078', site: '\u672c\u753a\u4f5c\u696d\u6240', plan: 'standard', status: 'down', agoSec: 1080, uptimeH: null, run: '#1208', engine: 'v2.1', issueType: '\u901a\u4fe1\u9014\u7d76\uff08\u9577\u6642\u9593\u7121\u5fdc\u7b54\uff09', cause: '\u73fe\u5834\u7aef\u672b\u306e\u96fb\u6e90\u304cOFF\u306e\u307e\u307e\u5fa9\u65e7\u3057\u3066\u3044\u306a\u3044\u53ef\u80fd\u6027\u304c\u9ad8\u3044', recommend: '\u73fe\u5730\u3067\u96fb\u6e90\u3068\u56de\u7dda\u3092\u78ba\u8a8d\u3057\u3066\u304f\u3060\u3055\u3044' },
  { id: 'himeji', company: '\u59eb\u8def\u5efa\u8a2d', site: '63383\u59eb\u8def', plan: 'standard', status: 'warn', agoSec: 312, uptimeH: 1392, run: '#1284', engine: 'v2.1', issueType: '\u89b3\u6e2c\u5024\u6b20\u6e2c\uff08WBGT\uff09', cause: 'WBGT API\u306e\u5fdc\u7b54\u304c\u306a\u304f e-Dam LoID \u306e\u8a2d\u5b9a\u3092\u78ba\u8a8d', recommend: '\u5730\u70b9ID\u3092\u78ba\u8a8d\u3057JMA\u89b3\u6e2c\u3078\u5207\u308a\u66ff\u3048\u3092\u691c\u8a0e' },
  { id: 'sasaki', company: '\u4f50\u3005\u6728\u5efa\u8a2d', site: '\u8001\u9580\u4f5c\u696d\u6240', plan: 'standard', status: 'ok', agoSec: 8, uptimeH: 2160, run: '#1284', engine: 'v2.1' },
  { id: 'naratetsu', company: '\u5948\u826f\u5927\u9244', site: '\u5948\u826f\u5e02', plan: 'standard', status: 'ok', agoSec: 14, uptimeH: 5040, run: '#1284', engine: 'v2.1' },
  { id: 'oumi', company: '\u8fd1\u6c5f\u516b\u5e61\u7d44', site: '\u516b\u5e61\u5de5\u533a', plan: 'standard', status: 'ok', agoSec: 21, uptimeH: 840, run: '#1280', engine: 'v2.0' },
  { id: 'takamatsu', company: '\u9ad8\u677e\u5efa\u8a2d', site: '\u9ad8\u677eBP\u4f1a\u5834', plan: 'standard', status: 'ok', agoSec: 33, uptimeH: 1632, run: '#1284', engine: 'v2.1' },
  { id: 'tokushima', company: '\u5fb3\u5cf6\u5efa\u8a2d', site: '\u5fb3\u5cf6BP', plan: 'standard', status: 'ok', agoSec: 9, uptimeH: 312, run: '#1290', engine: 'v2.2' },
  { id: 'daitetsu', company: '\u5927\u9244\u5de5\u696d', site: '\u5948\u826f\u5de5\u533a', plan: 'basic', status: 'ok', agoSec: 45, uptimeH: 96, run: '#1284', engine: 'v2.1' },
  { id: 'hanwa', company: '\u962a\u548c\u5efa\u8a2d', site: '\u583a\u5de5\u4e8b\u73fe\u5834', plan: 'standard', status: 'ok', agoSec: 17, uptimeH: 4320, run: '#1284', engine: 'v2.1' },
  { id: 'sanyo', company: '\u5c71\u967d\u7d44', site: '\u5ca1\u5c71\u5de5\u533a', plan: 'standard', status: 'ok', agoSec: 28, uptimeH: 720, run: '#1280', engine: 'v2.0' },
  { id: 'hokusetsu', company: '\u5317\u6442\u5efa\u8a2d', site: '\u8328\u6728\u5de5\u533a', plan: 'basic', status: 'ok', agoSec: 12, uptimeH: 168, run: '#1284', engine: 'v2.1' },
  { id: 'keihan', company: '\u4eac\u962a\u5efa\u8a2d', site: '\u679a\u65b9\u5de5\u533a', plan: 'standard', status: 'ok', agoSec: 38, uptimeH: 2880, run: '#1284', engine: 'v2.1' },
  { id: 'kobe', company: '\u795e\u6238\u5efa\u8a2d', site: '\u30dd\u30fc\u30c8\u30a2\u30a4\u30e9\u30f3\u30c9', plan: 'standard', status: 'ok', agoSec: 6, uptimeH: 6000, run: '#1290', engine: 'v2.2' },
  { id: 'shiga', company: '\u6ecb\u8cc0\u5efa\u8a2d', site: '\u5927\u6d25\u5de5\u533a', plan: 'basic', status: 'ok', agoSec: 49, uptimeH: 504, run: '#1284', engine: 'v2.1' },
  { id: 'fujiken', company: '\u30d5\u30b8\u30b1\u30f3\u9577\u5d0e', site: '\u73fe\u5834A', plan: 'basic', status: 'off', agoSec: null, uptimeH: null, run: '\u2014', engine: 'v2.1' },
  { id: 'toyama', company: '\u5bcc\u5c71\u5efa\u8a2d', site: '\u5bcc\u5c71\u99c5\u524d\u5de5\u533a', plan: 'standard', status: 'off', agoSec: null, uptimeH: null, run: '\u2014', engine: 'v2.1' },
  { id: 'shinshu', company: '\u4fe1\u5dde\u5efa\u8a2d', site: '\u9577\u91ce\u5de5\u533a', plan: 'basic', status: 'off', agoSec: null, uptimeH: null, run: '\u2014', engine: 'v2.1' },
];

/** Scene labels (unicode escapes to avoid UTF-8 corruption) */
export const SCENE_CATALOG: Record<string, { label: string; color: string; basic: boolean; dur: number }> = {
  wbgt: { label: 'WBGT\u8868\u793a', color: '#FF453B', basic: false, dur: 8 },
  ecs: { label: '\u74b0\u5883\u30af\u30e9\u30a6\u30c9\u30b5\u30fc\u30d3\u30b9', color: '#32ADE6', basic: false, dur: 5 },
  wxtech: { label: '\u30a6\u30a7\u30b6\u30fc\u30cb\u30e5\u30fc\u30ba', color: '#00A0E9', basic: false, dur: 5 },
  amedas: { label: '\u30a2\u30e1\u30c0\u30b9', color: '#5AC8FA', basic: false, dur: 5 },
  forecast: { label: '\u5929\u6c17\u4e88\u5831', color: '#64D2FF', basic: false, dur: 6 },
  rain_warn: { label: '\u5927\u96e8', color: '#5E9EFF', basic: false, dur: 5 },
  flood_info: { label: '\u6c4e\u6feb', color: '#2EAAF8', basic: false, dur: 5 },
  landslide_info: { label: '\u571f\u7802\u707d\u5bb3', color: '#A67C52', basic: false, dur: 5 },
  surge_info: { label: '\u9ad8\u6f6e', color: '#00A8C8', basic: false, dur: 5 },
  weather_warn: { label: '\u6c17\u8c61\u8b66\u5831\u30fb\u6ce8\u610f\u5831\uff08\u305d\u306e\u4ed6\uff09', color: '#F2E700', basic: false, dur: 5 },
  evac_info: { label: '\u907f\u96e3\u60c5\u5831', color: '#FF453B', basic: false, dur: 5 },
  jishin: { label: '\u5730\u9707\u901f\u5831', color: '#FF6482', basic: false, dur: 5 },
  bousai: { label: '\u8b66\u6212\u30a2\u30e9\u30fc\u30c8', color: '#FF9F0A', basic: false, dur: 5 },
  clock: { label: '\u6642\u8a08', color: '#30D158', basic: false, dur: 4 },
  message: { label: '\u30e1\u30c3\u30bb\u30fc\u30b8', color: '#BF5AF2', basic: false, dur: 5 },
  multilang: { label: '\u591a\u8a00\u8a9e\u8868\u793a', color: '#5E5CE6', basic: false, dur: 6 },
  nowcast: { label: '\u30ca\u30a6\u30ad\u30e3\u30b9\u30c8', color: '#00B0F0', basic: false, dur: 5 },
  video: { label: '\u52d5\u753b\uff08MP4\uff09', color: '#FF375F', basic: false, dur: 6 },
  pdf: { label: 'PDF\u8cc7\u6599', color: '#FF9500', basic: false, dur: 6 },
};

export const PREFECTURES = [
  '\u5317\u6d77\u9053','\u9752\u68ee\u770c','\u5ca9\u624b\u770c','\u5bae\u57ce\u770c','\u79cb\u7530\u770c','\u5c71\u5f62\u770c','\u798f\u5cf6\u770c',
  '\u8328\u57ce\u770c','\u6803\u6728\u770c','\u7fa4\u99ac\u770c','\u57fc\u7389\u770c','\u5343\u8449\u770c','\u6771\u4eac\u90fd','\u795e\u5948\u5ddd\u770c',
  '\u65b0\u6f5f\u770c','\u5bcc\u5c71\u770c','\u77f3\u5ddd\u770c','\u798f\u4e95\u770c','\u5c71\u68a8\u770c','\u9577\u91ce\u770c','\u5c90\u961c\u770c',
  '\u9759\u5ca1\u770c','\u611b\u77e5\u770c','\u4e09\u91cd\u770c','\u6ecb\u8cc0\u770c','\u4eac\u90fd\u5e9c','\u5927\u962a\u5e9c','\u5175\u5eab\u770c',
  '\u5948\u826f\u770c','\u548c\u6b4c\u5c71\u770c','\u9ce5\u53d6\u770c','\u5cf6\u6839\u770c','\u5ca1\u5c71\u770c','\u5e83\u5cf6\u770c','\u5c71\u53e3\u770c',
  '\u5fb3\u5cf6\u770c','\u9999\u5ddd\u770c','\u611b\u5a9b\u770c','\u9ad8\u77e5\u770c','\u798f\u5ca1\u770c','\u4f50\u8cc0\u770c','\u9577\u5d0e\u770c',
  '\u718a\u672c\u770c','\u5927\u5206\u770c','\u5bae\u5d0e\u770c','\u9e7f\u5150\u5cf6\u770c','\u6c96\u7e04\u770c',
];

export const CURRENT_USER = '\u4f50\u3005\u6728 \u592a\u90ce';
