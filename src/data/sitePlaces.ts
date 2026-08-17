/**
 * 現場（工事場所）の警報市町村・地図位置。
 * AMeDAS / WBGT の観測地点（例: 64036 奈良）とは別に持つ。
 */

export interface SitePlace {
  keys: string[];
  warnCity: string;
  forecastLabel: string;
  geo: { lat: number; lon: number };
}

export const SITE_PLACES: SitePlace[] = [
  {
    keys: ['田原本', 'たわらもと', '伊予戸', '磯城郡'],
    warnCity: '2936300',
    forecastLabel: '田原本町',
    geo: { lat: 34.555, lon: 135.785 },
  },
];

export function lookupSitePlace(...texts: Array<string | undefined | null>): SitePlace | null {
  const blob = texts.filter(Boolean).join(' ');
  if (!blob.trim()) return null;
  return SITE_PLACES.find((p) => p.keys.some((k) => blob.includes(k))) ?? null;
}

/** 警報市町村・緯度経度だけ現場に合わせる（WBGT地点は変えない） */
export function sitePlacePatch(site?: string, address?: string): {
  jmaWarnCity: string;
  jmaForecastLabel: string;
  geo: { lat: number; lon: number };
} | null {
  const place = lookupSitePlace(site, address);
  if (!place) return null;
  return {
    jmaWarnCity: place.warnCity,
    jmaForecastLabel: place.forecastLabel,
    geo: place.geo,
  };
}
