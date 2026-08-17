import { DEFAULT_MOE_GAS_URL } from './signageRuntimeConfig';

export interface WbgtTestResult {
  ok: boolean;
  wbgt?: number;
  message: string;
}

function appendPoint(url: string, point: string): string {
  const u = new URL(url.includes('://') ? url : `https://${url}`);
  u.searchParams.set('point', point);
  u.searchParams.set('moePoint', point);
  return u.toString();
}

/** 環境省 GAS 経由 WBGT 取得テスト（失敗時はダミー値を返さない） */
export async function testWbgtPoint(point: string, gasUrl = DEFAULT_MOE_GAS_URL): Promise<WbgtTestResult> {
  const code = point.trim();
  if (!/^\d{5}$/.test(code)) {
    return { ok: false, message: '5桁の地点コードを入力してください' };
  }
  if (!gasUrl.trim()) {
    return { ok: false, message: 'GAS URL が未設定です' };
  }

  try {
    const url = appendPoint(gasUrl, code);
    const res = await fetch(url, { cache: 'no-store', mode: 'cors' });
    if (!res.ok) {
      return { ok: false, message: `取得失敗（HTTP ${res.status}）— 地点 ${code} を確認してください` };
    }
    const raw = await res.json() as Record<string, unknown>;
    const wbgt =
      typeof raw.wbgt === 'number' ? raw.wbgt :
      typeof raw.WBGT === 'number' ? raw.WBGT :
      typeof (raw.data as Record<string, unknown> | undefined)?.wbgt === 'number'
        ? (raw.data as Record<string, number>).wbgt
        : undefined;

    if (wbgt == null || Number.isNaN(wbgt)) {
      return { ok: false, message: `地点 ${code} — 提供期間外またはデータなし（取得不可）` };
    }
    return { ok: true, wbgt, message: `WBGT ${wbgt}℃ — 地点 ${code} で取得OK` };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: `通信エラー: ${msg}` };
  }
}
