/** よく使う AMeDAS / 環境省 WBGT 地点（5桁） */
export interface AmedasPointEntry {
  code: string;
  name: string;
  prefecture: string;
  jmaArea: string;
  forecastLabel: string;
  /** 気象庁警報・注意報の市町村コード（任意） */
  warnCity?: string;
  geo: { lat: number; lon: number };
}

export const AMEDAS_POINTS: Record<string, AmedasPointEntry> = {
  '71106': { code: '71106', name: '徳島', prefecture: '徳島県', jmaArea: '360000', forecastLabel: '北島町', warnCity: '3640200', geo: { lat: 34.1256, lon: 134.547 } },
  '67437': { code: '67437', name: '広島', prefecture: '広島県', jmaArea: '340000', forecastLabel: '広島市', geo: { lat: 34.3963, lon: 132.4596 } },
  '82182': { code: '82182', name: '福岡', prefecture: '福岡県', jmaArea: '400000', forecastLabel: '福岡市', geo: { lat: 33.5833, lon: 130.3833 } },
  '63383': { code: '63383', name: '姫路', prefecture: '兵庫県', jmaArea: '280000', forecastLabel: '姫路市', geo: { lat: 34.8154, lon: 134.6854 } },
  '62078': { code: '62078', name: '大阪', prefecture: '大阪府', jmaArea: '270000', forecastLabel: '大阪市', warnCity: '2710000', geo: { lat: 34.605184, lon: 135.470949 } },
  '44132': { code: '44132', name: '東京', prefecture: '東京都', jmaArea: '130000', forecastLabel: '東京', geo: { lat: 35.6528, lon: 139.8395 } },
  '56227': { code: '56227', name: '名古屋', prefecture: '愛知県', jmaArea: '230000', forecastLabel: '名古屋市', geo: { lat: 35.1667, lon: 136.9667 } },
  '59263': { code: '59263', name: '堺', prefecture: '大阪府', jmaArea: '270000', forecastLabel: '堺市', warnCity: '2714000', geo: { lat: 34.5733, lon: 135.4831 } },
  '91166': { code: '91166', name: '久米島', prefecture: '沖縄県', jmaArea: '471000', forecastLabel: '久米島', warnCity: '4736100', geo: { lat: 26.3406, lon: 126.805 } },
  '67116': { code: '67116', name: '庄原', prefecture: '広島県', jmaArea: '340000', forecastLabel: '庄原市', warnCity: '3421000', geo: { lat: 35.0375, lon: 133.1601 } },
};

export function lookupAmedasPoint(code: string): AmedasPointEntry | null {
  const c = code.trim();
  return AMEDAS_POINTS[c] ?? null;
}
