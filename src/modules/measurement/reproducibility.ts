import type { MeasurementReading, ReproducibilityResult } from '../../types';

/** 外部計測器CSV/JSONからの読み取り値を正規化 */
export function parseDeviceReadings(raw: string): MeasurementReading[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  try {
    const json = JSON.parse(trimmed);
    if (Array.isArray(json)) {
      return json.map(normalizeReading).filter(Boolean) as MeasurementReading[];
    }
  } catch {
    /* CSV fallback */
  }

  const lines = trimmed.split(/\r?\n/).filter(Boolean);
  const readings: MeasurementReading[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (i === 0 && /wbgt|timestamp|device/i.test(line)) continue;
    const parts = line.split(/[,\t;]/).map((s) => s.trim());
    if (parts.length < 2) continue;
    const wbgt = parseFloat(parts[parts.length - 1]);
    if (Number.isNaN(wbgt)) continue;
    readings.push({
      timestamp: parts[0] || new Date().toISOString(),
      wbgt,
      deviceId: parts[1] || 'external',
      source: 'external',
    });
  }
  return readings;
}

function normalizeReading(row: Record<string, unknown>): MeasurementReading | null {
  const wbgt = Number(row.wbgt ?? row.WBGT ?? row.value);
  if (Number.isNaN(wbgt)) return null;
  return {
    timestamp: String(row.timestamp ?? row.time ?? new Date().toISOString()),
    wbgt,
    deviceId: String(row.deviceId ?? row.device_id ?? 'external'),
    source: 'external',
  };
}

/**
 * 再現率 = 100 - (平均絶対偏差 / 参照平均 × 100)
 * 閾値95%以上で合格（WBGT計測器校正の一般的基準として設定）
 */
export function calculateReproducibility(
  reference: number[],
  measured: number[],
  threshold = 95,
): ReproducibilityResult {
  const n = Math.min(reference.length, measured.length);
  if (n === 0) {
    return { rate: 0, sampleCount: 0, referenceMean: 0, measuredMean: 0, maxDeviation: 0, passed: false, threshold };
  }

  const ref = reference.slice(0, n);
  const meas = measured.slice(0, n);
  const referenceMean = ref.reduce((a, b) => a + b, 0) / n;
  const measuredMean = meas.reduce((a, b) => a + b, 0) / n;
  const deviations = ref.map((r, i) => Math.abs(meas[i] - r));
  const maxDeviation = Math.max(...deviations);
  const mad = deviations.reduce((a, b) => a + b, 0) / n;
  const rate = referenceMean === 0 ? 0 : Math.max(0, 100 - (mad / referenceMean) * 100);

  return {
    rate: Math.round(rate * 10) / 10,
    sampleCount: n,
    referenceMean: Math.round(referenceMean * 10) / 10,
    measuredMean: Math.round(measuredMean * 10) / 10,
    maxDeviation: Math.round(maxDeviation * 10) / 10,
    passed: rate >= threshold,
    threshold,
  };
}

/** デモ用：外部計測器からのサンプルデータ生成 */
export function generateSampleReadings(baseWbgt: number, count = 5): MeasurementReading[] {
  return Array.from({ length: count }, (_, i) => ({
    timestamp: new Date(Date.now() - (count - i) * 60000).toISOString(),
    wbgt: Math.round((baseWbgt + (Math.random() - 0.5) * 0.8) * 10) / 10,
    deviceId: 'WBGT-METER-001',
    source: 'external' as const,
  }));
}

export function referenceFromEdam(baseWbgt: number, count: number): number[] {
  return Array.from({ length: count }, () => baseWbgt);
}
