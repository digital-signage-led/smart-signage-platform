import { useState } from 'react';
import { tokens } from '../tokens';
import { useApp } from '../context/AppContext';
import { L } from '../i18n/labels';
import { generateSampleReadings, parseDeviceReadings, referenceFromEdam } from '../modules/measurement/reproducibility';
import { generateJudgmentReport, downloadReport, type JudgmentReport } from '../modules/reports/judgmentReport';
import { signageFacesLabelForProject } from '../core/layoutRegistry';
import { Button } from '../components/ui';

export function ReportPage() {
  const { projects } = useApp();
  const [selectedId, setSelectedId] = useState(projects[0]?.id ?? '');
  const [baseWbgt, setBaseWbgt] = useState(28.5);
  const [importText, setImportText] = useState('');
  const [report, setReport] = useState<JudgmentReport | null>(null);

  const project = projects.find((p) => p.id === selectedId);

  const runAutoGenerate = () => {
    if (!project) return;
    const readings = generateSampleReadings(baseWbgt, 5);
    const refs = referenceFromEdam(baseWbgt, readings.length);
    setReport(generateJudgmentReport(project, readings, refs, L.report.sourceAuto));
  };

  const runFromImport = () => {
    if (!project) return;
    const readings = parseDeviceReadings(importText);
    if (!readings.length) return;
    setReport(generateJudgmentReport(project, readings, referenceFromEdam(baseWbgt, readings.length), L.report.sourceImport));
  };

  return (
    <main style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '30px 40px 60px' }}>
      <h1 style={{ margin: 0, fontSize: 27, fontWeight: 700 }}>{L.report.title}</h1>
      <p style={{ margin: '6px 0 28px', color: tokens.text.muted }}>{L.report.desc}</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 24 }}>
        <section style={{ background: tokens.bg.s1, borderRadius: 16, padding: 22, border: '1px solid rgba(255,255,255,0.07)' }}>
          <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700 }}>{L.report.selectCase}</h2>
          <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} style={{ width: '100%', height: 42, padding: '0 13px', borderRadius: 10, background: tokens.bg.s2, border: '1px solid rgba(255,255,255,0.09)', color: tokens.text.primary, fontFamily: 'inherit' }}>
            {projects.map((p) => <option key={p.id} value={p.id}>{L.report.caseOption(p.company, p.site, signageFacesLabelForProject(p))}</option>)}
          </select>
        </section>
        <section style={{ background: tokens.bg.s1, borderRadius: 16, padding: 22, border: '1px solid rgba(255,255,255,0.07)' }}>
          <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700 }}>{L.report.refWbgt}</h2>
          <input type="number" step="0.1" value={baseWbgt} onChange={(e) => setBaseWbgt(parseFloat(e.target.value) || 0)} style={{ width: '100%', height: 42, padding: '0 13px', borderRadius: 10, background: tokens.bg.s2, border: '1px solid rgba(255,255,255,0.09)', color: tokens.text.primary, fontFamily: 'inherit' }} />
          <Button style={{ width: '100%', marginTop: 16 }} onClick={runAutoGenerate}>{L.report.sampleGen}</Button>
        </section>
      </div>

      <section style={{ background: tokens.bg.s1, borderRadius: 16, padding: 22, marginBottom: 24, border: '1px solid rgba(255,255,255,0.07)' }}>
        <h2 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700 }}>{L.report.import}</h2>
        <textarea value={importText} onChange={(e) => setImportText(e.target.value)} rows={5} placeholder="timestamp,deviceId,wbgt" style={{ width: '100%', padding: 12, borderRadius: 10, background: tokens.bg.s2, border: '1px solid rgba(255,255,255,0.09)', color: tokens.text.primary, fontFamily: 'monospace', fontSize: 13 }} />
        <Button variant="secondary" style={{ marginTop: 12 }} onClick={runFromImport}>{L.report.importGen}</Button>
      </section>

      {report && (
        <section style={{ background: tokens.bg.s1, borderRadius: 16, padding: 22, border: `1px solid ${report.reproducibility?.passed ? 'rgba(48,209,88,0.3)' : 'rgba(255,69,58,0.3)'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ margin: 0 }}>{L.report.preview}</h2>
            {report.reproducibility && (
              <div style={{ fontSize: 32, fontWeight: 800, color: report.reproducibility.passed ? tokens.status.ok : tokens.status.down }}>
                {report.reproducibility.rate}%
              </div>
            )}
          </div>
          {report.sections.map((s) => (
            <div key={s.title} style={{ marginBottom: 14 }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>{s.title}</div>
              <div style={{ color: tokens.text.secondary, lineHeight: 1.7 }}>{s.body}</div>
            </div>
          ))}
          <Button onClick={() => downloadReport(report)}>{L.report.download}</Button>
        </section>
      )}
    </main>
  );
}
