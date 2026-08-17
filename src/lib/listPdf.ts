import { signageFacesLabelForProject } from '../core/layoutRegistry';
import type { Company, Project } from '../types';
import { listingOf } from './companies';
import { formatLegalCompanyName } from './companyName';
import { nowStr } from './format';

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function sourceLabel(p: Project): string {
  if (p.source === 'wxtech') return '\u30a6\u30a7\u30b6\u30fc\u30cb\u30e5\u30fc\u30ba';
  if (p.source === 'device') return '\u74b0\u5883\u30af\u30e9\u30a6\u30c9';
  if (p.source === 'jma') return 'JMA';
  if (p.source === 'edam') return 'e-Dam';
  if (p.source === 'manual') return '\u624b\u52d5';
  return '\u2014';
}

function pointOf(p: Project): string {
  return (p.moePoint || p.jmaPoint || p.sourceId || '\u2014').trim() || '\u2014';
}

function corpPosLabel(pos: Project['corpTitlePos']): string {
  if (pos === 'prefix') return '\u524d\u682a';
  if (pos === 'suffix') return '\u5f8c\u682a';
  if (pos === 'none') return '\u306a\u3057';
  return '\u2014';
}

function listingLabel(p: Project): string {
  return listingOf(p) === 'demo' ? '\u30c7\u30e2' : '\u5951\u7d04';
}

function companyDisplay(p: Project): string {
  return formatLegalCompanyName(p.company, p.corpTitlePos ?? 'none') || p.company;
}

function table(headers: string[], rows: string[][]): string {
  const head = headers.map((h) => `<th>${esc(h)}</th>`).join('');
  const body = rows
    .map((row) => `<tr>${row.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`)
    .join('');
  return `<table><thead><tr>${head}</tr></thead><tbody>${body || `<tr><td colspan="${headers.length}">\u8a72\u5f53\u306a\u3057</td></tr>`}</tbody></table>`;
}

function projectRows(list: Project[]): string[][] {
  return [...list]
    .sort((a, b) => a.company.localeCompare(b.company, 'ja') || a.site.localeCompare(b.site, 'ja'))
    .map((p) => [
      p.id,
      companyDisplay(p),
      p.site,
      p.prefecture || '\u2014',
      pointOf(p),
      signageFacesLabelForProject(p),
      listingLabel(p),
      sourceLabel(p),
      corpPosLabel(p.corpTitlePos),
    ]);
}

export function printAllListsPdf(
  projects: Project[],
  companies: Company[],
  urlOf: (p: Project) => string,
): void {
  const paid = projects.filter((p) => listingOf(p) === 'paid');
  const demo = projects.filter((p) => listingOf(p) === 'demo');
  const projectHeaders = [
    'ID',
    '\u4f1a\u793e\u540d',
    '\u73fe\u5834',
    '\u90fd\u9053\u5e9c\u770c',
    '\u5730\u70b9ID',
    '\u9762',
    '\u533a\u5206',
    '\u30c7\u30fc\u30bf',
    '\u682a\u5f0f\u4f1a\u793e',
  ];
  const urlRows = [...projects]
    .sort((a, b) => a.company.localeCompare(b.company, 'ja') || a.site.localeCompare(b.site, 'ja'))
    .map((p) => [p.id, companyDisplay(p), p.site, urlOf(p) || '\u2014']);
  const companyRows = [...companies]
    .sort((a, b) => a.name.localeCompare(b.name, 'ja'))
    .map((c) => [c.id, c.name, corpPosLabel(c.corpTitlePos), c.logoKey || '\u2014']);

  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<title>Smart Signage Platform \u4e00\u89a7</title>
<style>
  @page { size: A4 landscape; margin: 12mm; }
  body { font-family: "Yu Gothic", "YuGothic", "Hiragino Sans", "Meiryo", sans-serif; color: #111; font-size: 11px; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  .meta { color: #555; margin-bottom: 16px; }
  h2 { font-size: 13px; margin: 18px 0 8px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  th, td { border: 1px solid #ccc; padding: 4px 6px; text-align: left; vertical-align: top; word-break: break-all; }
  th { background: #f0f0f0; font-weight: 700; }
  td:last-child { font-size: 10px; }
</style>
</head>
<body>
<h1>Smart Signage Platform \u4e00\u89a7</h1>
<div class="meta">\u51fa\u529b\u65e5\u6642: ${esc(nowStr())} \u30fb\u6848\u4ef6 ${projects.length}\u4ef6 \u30fb\u4f1a\u793e ${companies.length}\u4ef6</div>
<h2>\u6848\u4ef6\u4e00\u89a7\uff08\u5951\u7d04 ${paid.length}\u4ef6\uff09</h2>
${table(projectHeaders, projectRows(paid))}
<h2>\u6848\u4ef6\u4e00\u89a7\uff08\u30c7\u30e2 ${demo.length}\u4ef6\uff09</h2>
${table(projectHeaders, projectRows(demo))}
<h2>URL\u4e00\u89a7</h2>
${table(['ID', '\u4f1a\u793e\u540d', '\u73fe\u5834', 'URL'], urlRows)}
<h2>\u4f1a\u793e\u30de\u30b9\u30bf\u30fc</h2>
${table(['ID', '\u4f1a\u793e\u540d', '\u682a\u5f0f\u4f1a\u793e', '\u30ed\u30b4'], companyRows)}
</body>
</html>`;

  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  document.body.appendChild(iframe);
  const win = iframe.contentWindow;
  const doc = iframe.contentDocument;
  if (!win || !doc) {
    document.body.removeChild(iframe);
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();
  const cleanup = () => {
    iframe.remove();
  };
  win.addEventListener('afterprint', cleanup);
  setTimeout(() => {
    win.focus();
    win.print();
  }, 80);
  setTimeout(cleanup, 120000);
}
