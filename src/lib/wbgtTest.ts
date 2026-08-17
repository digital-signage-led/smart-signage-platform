import { lookupAmedasPoint } from '../data/amedasPoints';
import { moeCodesForPrefecture } from '../data/prefectureMoe';
import { DEFAULT_MOE_GAS_URL } from './signageRuntimeConfig';

export interface WbgtTestResult {
  ok: boolean;
  wbgt?: number;
  message: string;
}

function appendPoint(url: string, point: string): string {
  const u = new URL(url.includes('://') ? url : `https://${url}`);
  u.searchParams.set('point', point);
  const meta = lookupAmedasPoint(point);
  if (meta) {
    u.searchParams.set('pointName', meta.name);
    const moe = moeCodesForPrefecture(meta.prefecture);
    u.searchParams.set('region', moe.region);
    u.searchParams.set('prefecture', moe.prefecture);
  }
  return u.toString();
}

function asWbgt(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return normalizeWbgt(v);
  if (typeof v === 'string' && v.trim()) {
    const n = Number(v.trim().replace(/[℃度C]/g, ''));
    if (Number.isFinite(n)) return normalizeWbgt(n);
  }
  return undefined;
}

/** 環境省 CSV は 271＝27.1℃ のことがある */
function normalizeWbgt(n: number): number | undefined {
  let v = n;
  if (v > 45 && v <= 450) v = v / 10;
  if (v < 5 || v > 45) return undefined;
  return Math.round(v * 10) / 10;
}

function parsePayload(text: string): unknown {
  const trimmed = String(text || '').trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    /* JSONP: callback({...}) */
  }
  const m = trimmed.match(/^[a-zA-Z_$][\w$]*\s*\(\s*([\s\S]*)\s*\)\s*;?\s*$/);
  if (m) {
    try {
      return JSON.parse(m[1]);
    } catch {
      return null;
    }
  }
  return null;
}

export function pickWbgt(raw: unknown, depth = 0): number | undefined {
  if (raw == null || depth > 8) return undefined;
  const direct = asWbgt(raw);
  if (direct != null) return direct;

  if (Array.isArray(raw)) {
    for (const row of raw) {
      const n = pickWbgt(row, depth + 1);
      if (n != null) return n;
    }
    return undefined;
  }
  if (typeof raw !== 'object') return undefined;

  const o = raw as Record<string, unknown>;
  const fromFields =
    asWbgt(o.wbgt) ?? asWbgt(o.WBGT) ?? asWbgt(o.value) ?? asWbgt(o.wbgtValue) ?? asWbgt(o.current);
  if (fromFields != null) return fromFields;

  for (const key of ['wbgt', 'data', 'slots', 'rows', 'forecast', 'payload', 'result'] as const) {
    const child = o[key];
    if (child && typeof child === 'object') {
      const n = pickWbgt(child, depth + 1);
      if (n != null) return n;
    }
  }
  return undefined;
}

function pointNameOf(raw: unknown): string {
  if (!raw || typeof raw !== 'object') return '';
  const n = (raw as Record<string, unknown>).pointName;
  return typeof n === 'string' ? n.trim() : '';
}

function isOffSeason(raw: unknown): boolean {
  if (!raw || typeof raw !== 'object') return false;
  const o = raw as Record<string, unknown>;
  return o.source === 'off-season' || o.inService === false || o.wbgtOffSeason === true;
}

async function fetchJsonCors(url: string): Promise<unknown> {
  const res = await fetch(url, { cache: 'no-store', mode: 'cors', redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const parsed = parsePayload(await res.text());
  if (parsed == null) throw new Error('JSON parse failed');
  return parsed;
}

function fetchJsonp(url: string, timeoutMs = 14000): Promise<unknown> {
  if (typeof document === 'undefined') {
    return Promise.reject(new Error('JSONP is browser-only'));
  }
  return new Promise((resolve, reject) => {
    const cb = `wbgtCb_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    const script = document.createElement('script');
    let done = false;
    const timer = window.setTimeout(() => finish(new Error('JSONP timeout')), timeoutMs);
    const finish = (err: Error | null, data?: unknown) => {
      if (done) return;
      done = true;
      window.clearTimeout(timer);
      try {
        delete (window as unknown as Record<string, unknown>)[cb];
      } catch {
        (window as unknown as Record<string, unknown>)[cb] = undefined;
      }
      script.remove();
      if (err) reject(err);
      else resolve(data);
    };
    (window as unknown as Record<string, unknown>)[cb] = (data: unknown) => finish(null, data);
    script.onerror = () => finish(new Error('JSONP load failed'));
    const sep = url.includes('?') ? '&' : '?';
    script.src = `${url}${sep}callback=${encodeURIComponent(cb)}`;
    document.head.appendChild(script);
  });
}

/** 環境省 GAS 経由 WBGT 取得テスト（失敗しても案件作成は止めない） */
export async function testWbgtPoint(point: string, gasUrl = DEFAULT_MOE_GAS_URL): Promise<WbgtTestResult> {
  const code = point.trim();
  if (!/^\d{5}$/.test(code)) {
    return { ok: false, message: '5桁の地点コードを入力してください（未登録の地点でも作成できます）' };
  }
  if (!gasUrl.trim()) {
    return { ok: false, message: 'GAS URL が未設定です。地点IDを入れて作成はできます' };
  }

  const url = appendPoint(gasUrl, code);
  let raw: unknown = null;
  let lastErr = '';

  try {
    raw = await fetchJsonCors(url);
  } catch (e) {
    lastErr = e instanceof Error ? e.message : String(e);
    try {
      raw = await fetchJsonp(url);
      lastErr = '';
    } catch (e2) {
      const msg2 = e2 instanceof Error ? e2.message : String(e2);
      return {
        ok: false,
        message: `通信エラー: ${lastErr || msg2}（地点 ${code} でも作成してURL発行はできます）`,
      };
    }
  }

  const wbgt = pickWbgt(raw);
  if (wbgt != null) {
    const name = pointNameOf(raw) || lookupAmedasPoint(code)?.name || '';
    return { ok: true, wbgt, message: `WBGT ${wbgt}℃ — 地点 ${code}${name ? `（${name}）` : ''} で取得OK` };
  }

  if (isOffSeason(raw)) {
    return {
      ok: false,
      message: `地点 ${code} — 環境省の提供期間外です。冬期は出ませんが、案件は作成できます`,
    };
  }

  return {
    ok: false,
    message: `地点 ${code} の確認値は取れませんでした。未登録地点でも「作成してURLへ」で登録できます`,
  };
}
