import type { Company, LifecycleStatus, Project, ProjectListing } from '../types';

/** 公開ホスト上のロゴパス（共通 assets） */
export function logoSrcFromKey(logoKey: string | undefined | null): string | undefined {
  const key = (logoKey ?? '').trim().replace(/^(\.\/)?assets\//, '');
  if (!key) return undefined;
  return `./assets/${key}`;
}

/** logoSrc / ファイル名からロゴキーへ */
export function normalizeLogoKey(src: string | undefined | null): string | undefined {
  if (!src) return undefined;
  const s = src.trim();
  if (!s || s.startsWith('data:')) return undefined;
  const m = s.match(/(?:^|\/)([^/?#]+\.(?:png|svg|jpe?g|webp))$/i);
  return m ? m[1] : undefined;
}

export function lifecycleOf(p: Project): LifecycleStatus {
  if (p.lifecycle) return p.lifecycle;
  if (!p.lastDeploy) return 'draft';
  return 'published';
}

export function listingOf(p: Project): ProjectListing {
  return p.listing === 'demo' ? 'demo' : 'paid';
}

export function companyNameKey(name: string): string {
  return String(name || '').replace(/株式会社/g, '').replace(/\s+/g, '').trim();
}

export function companyIdFromName(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return base || `co-${Date.now().toString(36)}`;
}

/** 既存案件から会社マスタを起こす（初回・移行用） */
export function deriveCompaniesFromProjects(projects: Project[], existing: Company[] = []): Company[] {
  const byId = new Map<string, Company>();
  existing.forEach((c) => byId.set(c.id, c));
  projects.forEach((p) => {
    const id = p.companyId || companyIdFromName(p.company);
    if (byId.has(id)) {
      const cur = byId.get(id)!;
      const logoKey = cur.logoKey || p.logoKey || normalizeLogoKey(p.logoSrc);
      byId.set(id, {
        ...cur,
        name: cur.name || p.company,
        logoKey: logoKey || cur.logoKey,
        footBannerKey: cur.footBannerKey || normalizeLogoKey(p.footBannerSrc),
      });
      return;
    }
    byId.set(id, {
      id,
      name: p.company,
      logoKey: p.logoKey || normalizeLogoKey(p.logoSrc),
      footBannerKey: normalizeLogoKey(p.footBannerSrc),
    });
  });
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, 'ja'));
}

/** 案件に会社ID・ライフサイクル・ロゴキーを補完 */
export function enrichProjectRegistry(p: Project, companies: Company[]): Project {
  const lifecycle = lifecycleOf(p);
  const nameKey = companyNameKey(p.company);
  const matched =
    (p.companyId && companies.find((c) => c.id === p.companyId)) ||
    companies.find((c) => c.name === p.company) ||
    companies.find((c) => companyNameKey(c.name) === nameKey);
  const companyId = p.companyId || matched?.id || companyIdFromName(p.company);
  const co = companies.find((c) => c.id === companyId);
  const logoKey = p.logoKey || normalizeLogoKey(p.logoSrc) || co?.logoKey;
  const logoSrc = p.logoSrc || logoSrcFromKey(logoKey) || logoSrcFromKey(co?.logoKey);
  const keepKohjiBanner = /kohji/i.test(p.footBannerSrc || '') && /鴻治/.test(p.company);
  const footBannerSrc = keepKohjiBanner
    ? p.footBannerSrc
    : logoSrcFromKey(co?.footBannerKey) || ( /kohji/i.test(p.footBannerSrc || '') ? undefined : p.footBannerSrc);
  return {
    ...p,
    lifecycle,
    companyId,
    logoKey,
    logoSrc: logoSrc ?? p.logoSrc,
    footBannerSrc: footBannerSrc ?? p.footBannerSrc,
    company: co?.name || p.company,
  };
}

export function applyCompanyToProjectFields(
  company: Company | undefined,
): Pick<Project, 'company' | 'companyId' | 'corpTitlePos' | 'logoKey' | 'logoSrc' | 'footBannerSrc'> {
  if (!company) {
    return { company: '', companyId: undefined, corpTitlePos: undefined, logoKey: undefined, logoSrc: undefined, footBannerSrc: undefined };
  }
  return {
    company: company.name,
    companyId: company.id,
    corpTitlePos: company.corpTitlePos,
    logoKey: company.logoKey,
    logoSrc: logoSrcFromKey(company.logoKey),
    footBannerSrc: logoSrcFromKey(company.footBannerKey),
  };
}
