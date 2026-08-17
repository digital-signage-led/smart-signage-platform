import type { MonSite, Project, ProjectStatus } from '../types';

export function monSiteForProject(_projectId: string): MonSite | undefined {
  return undefined;
}

/** 遠隔監視はない。台帳は案件 status のみ */
export function liveStatusForProject(project: Project): ProjectStatus {
  return project.status;
}

export function liveEngineForProject(project: Project): string {
  return project.engine ?? '—';
}
