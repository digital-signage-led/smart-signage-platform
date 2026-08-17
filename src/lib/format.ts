export function nowStr() {
  const d = new Date();
  const z = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())} ${z(d.getHours())}:${z(d.getMinutes())}`;
}

export function fmtElapsed(sec: number | null) {
  if (sec == null) return '—';
  if (sec < 60) return `${Math.floor(sec)}秒前`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}分前`;
  const h = Math.floor(m / 60);
  return `${h}時間${m % 60}分前`;
}

/** トークン用の ASCII キー（日本語の案件IDだと a35_田原本_001 になり発行チェックで落ちる） */
export function asciiSiteKey(raw: string): string {
  const ascii = String(raw || '').replace(/[^a-z0-9_]/gi, '').toLowerCase();
  if (ascii.length >= 2) return ascii.slice(0, 16);
  let h = 2166136261;
  const s = String(raw || 'site');
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return `p${(h >>> 0).toString(36).slice(0, 8)}`;
}

export function genToken(type: string, siteId: string) {
  if (!siteId) return '\u2014';
  const prefix = ({ a35: 'a35', led: 'led', other: 'dev' })[type] ?? 'dev';
  const n = String(Math.floor(Math.random() * 900) + 100);
  return `${prefix}_${asciiSiteKey(siteId)}_${n}`;
}

export function slugId(company: string, site: string) {
  const base = `${company}${site}`.replace(/[^\w\u3040-\u30ff\u4e00-\u9faf]/gi, '').slice(0, 12);
  return base.toLowerCase() || `p${Date.now()}`;
}
