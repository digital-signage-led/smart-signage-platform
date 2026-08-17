import type { Project, ReproducibilityResult, MeasurementReading } from '../../types';
import { signageFacesLabelForProject } from '../../core/layoutRegistry';
import { calculateReproducibility } from '../measurement/reproducibility';

export interface JudgmentReport {
  id: string;
  generatedAt: string;
  project: Pick<Project, 'company' | 'site' | 'faces' | 'id'>;
  faceCount: number;
  displayType: string;
  dataSource: string;
  reproducibility: ReproducibilityResult | null;
  readings: MeasurementReading[];
  conclusion: string;
  sections: { title: string; body: string }[];
}

export function generateJudgmentReport(
  project: Project,
  readings: MeasurementReading[],
  referenceValues: number[],
  dataSourceLabel: string,
): JudgmentReport {
  const measured = readings.map((r) => r.wbgt);
  const reproducibility = referenceValues.length
    ? calculateReproducibility(referenceValues, measured)
    : null;

  const faceLabel = signageFacesLabelForProject(project);
  const displayType =
    project.signageKind === 'strip' || project.faces === 3 ? 'ストリップサイネージ' :
    project.faces === 4 ? 'Cube4面ダブルWBGTサイネージ' :
    project.faces === 5 ? 'Cube5面ダブルWBGTサイネージ' :
    `${faceLabel} WBGTサイネージ`;

  const passed = reproducibility?.passed ?? false;
  const conclusion = reproducibility
    ? passed
      ? `再現率 ${reproducibility.rate}%（基準 ${reproducibility.threshold}% 以上）を満たし、判定書を発行可能です。`
      : `再現率 ${reproducibility.rate}% が基準 ${reproducibility.threshold}% 未満のため、計測器の再校正またはデータソースの確認が必要です。`
    : '計測データが不足しているため、判定を保留します。';

  return {
    id: `RPT-${project.id}-${Date.now()}`,
    generatedAt: new Date().toLocaleString('ja-JP'),
    project: { id: project.id, company: project.company, site: project.site, faces: project.faces },
    faceCount: project.faces,
    displayType,
    dataSource: dataSourceLabel,
    reproducibility,
    readings,
    conclusion,
    sections: [
      {
        title: '1. 概要',
        body: `${project.company} ${project.site} に設置する ${displayType}（${faceLabel}）の設置・稼働判定書です。`,
      },
      {
        title: '2. 計測条件',
        body: `データソース: ${dataSourceLabel}。サンプル数: ${readings.length}件。`,
      },
      {
        title: '3. 再現率評価',
        body: reproducibility
          ? `参照平均 ${reproducibility.referenceMean}℃ / 計測平均 ${reproducibility.measuredMean}℃ / 最大偏差 ${reproducibility.maxDeviation}℃ / 再現率 ${reproducibility.rate}%`
          : '再現率評価に必要な参照データがありません。',
      },
      {
        title: '4. 判定',
        body: conclusion,
      },
    ],
  };
}

export function reportToText(report: JudgmentReport): string {
  const lines = [
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '  WBGTサイネージ 設置・稼働判定書',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '',
    `発行日時: ${report.generatedAt}`,
    `案件ID: ${report.project.id}`,
    `会社名: ${report.project.company}`,
    `現場名: ${report.project.site}`,
    `表示形式: ${report.displayType}`,
    '',
    ...report.sections.flatMap((s) => [`【${s.title}】`, s.body, '']),
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
  ];
  return lines.join('\n');
}

export function downloadReport(report: JudgmentReport) {
  const blob = new Blob([reportToText(report)], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${report.id}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}
