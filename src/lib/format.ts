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

export function genToken(type: string, siteId: string) {
  if (!siteId) return '\u2014';
  const prefix = ({ a35: 'a35', led: 'led', other: 'dev' })[type] ?? 'dev';
  const n = String(Math.floor(Math.random() * 900) + 100);
  return `${prefix}_${siteId}_${n}`;
}

export function slugId(company: string, site: string) {
  const base = `${company}${site}`.replace(/[^\w\u3040-\u30ff\u4e00-\u9faf]/gi, '').slice(0, 12);
  return base.toLowerCase() || `p${Date.now()}`;
}
