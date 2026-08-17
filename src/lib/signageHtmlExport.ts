import { buildSignageBase, resolveSignageEngineFile } from './deploy';
import {
  buildSignageConfigScriptBlock,
  buildSignageRuntimeConfig,
  type SignageRuntimePayload,
} from './signageRuntimeConfig';
import type { Project } from '../types';

const CONFIG_BLOCK_RE =
  /  var cfg = \{[\s\S]*?  global\.SIGNAGE_CONFIG = \{[\s\S]*?\};\n/;

export function injectSignageConfigIntoHtml(html: string, configScript: string): string {
  if (!CONFIG_BLOCK_RE.test(html)) {
    throw new Error('SignageConfig ブロックが見つかりません（本番 HTML テンプレートを確認してください）');
  }
  return html.replace(CONFIG_BLOCK_RE, `${configScript}\n`);
}

export function buildSiteSignageHtml(
  project: Project,
  templateHtml: string,
  prefecture = '',
  message?: import('./deploy').SignageMessageOptions,
): string {
  const payload = buildSignageRuntimeConfig(project, prefecture, message);
  const script = buildSignageConfigScriptBlock(payload);
  return injectSignageConfigIntoHtml(templateHtml, script);
}

export async function fetchSignageTemplateHtml(project: Project): Promise<string> {
  const url = `${buildSignageBase(project).replace(/\?.*$/, '')}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`テンプレート取得失敗 (${res.status}): ${url}`);
  }
  return res.text();
}

export function downloadTextFile(filename: string, content: string, mime = 'text/plain;charset=utf-8'): void {
  const blob = new Blob([content], { type: mime });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function suggestedHtmlFilename(project: Project): string {
  return resolveSignageEngineFile(project);
}

export function buildRuntimeExportBundle(
  project: Project,
  prefecture = '',
  message?: import('./deploy').SignageMessageOptions,
): SignageRuntimePayload {
  return buildSignageRuntimeConfig(project, prefecture, message);
}
