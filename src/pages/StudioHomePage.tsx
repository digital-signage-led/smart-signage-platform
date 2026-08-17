import { useMemo } from 'react';
import { tokens } from '../tokens';
import { useApp } from '../context/AppContext';
import { L } from '../i18n/labels';
import { signageFacesLabelForProject } from '../core/layoutRegistry';
import { listingOf } from '../lib/companies';
import { Button } from '../components/ui';
import type { Project } from '../types';

function sourceLabel(p: Project): string {
  if (p.source === 'wxtech') return 'ウェザーニューズ';
  if (p.source === 'device') return '環境クラウド';
  if (p.source === 'jma') return 'JMA';
  if (p.source === 'edam') return 'e-Dam';
  if (p.source === 'manual') return '手動';
  return '—';
}

export function StudioHomePage() {
  const { projects, openQuickSetup, openScene, openDeploy, openCloneSetup, copyProjectUrl, askDeleteProject, exportListsPdf } = useApp();

  const list = useMemo(
    () => [...projects].sort(
      (a, b) => a.company.localeCompare(b.company, 'ja') || a.site.localeCompare(b.site, 'ja'),
    ),
    [projects],
  );

  const paid = useMemo(
    () => list.filter((p) => listingOf(p) === 'paid'),
    [list],
  );
  const demo = useMemo(
    () => list.filter((p) => listingOf(p) === 'demo'),
    [list],
  );

  const renderCards = (items: Project[]) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
      {items.map((p) => (
        <div
          key={p.id}
          style={{
            background: tokens.bg.s1,
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 14,
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontFamily: 'monospace', fontSize: 11, color: tokens.text.muted }}>{p.id}</span>
            <Button variant="danger" onClick={() => askDeleteProject(p)} style={{ height: 28, fontSize: 12, padding: '0 10px' }}>
              {L.list.delete}
            </Button>
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{p.company}</div>
            <div style={{ fontSize: 13, color: tokens.text.muted }}>{p.site}</div>
          </div>
          <div style={{ fontSize: 12, color: tokens.text.faint }}>
            {sourceLabel(p)} · {signageFacesLabelForProject(p)}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 'auto', flexWrap: 'wrap' }}>
            <Button onClick={() => openScene(p)} style={{ flex: 1, height: 34, fontSize: 13 }}>
              {L.studio.openScene}
            </Button>
            <Button variant="secondary" onClick={() => openDeploy(p)} style={{ height: 34, fontSize: 12, padding: '0 12px' }}>
              {L.studio.openDeploy}
            </Button>
            <Button variant="secondary" onClick={() => copyProjectUrl(p)} style={{ height: 34, fontSize: 12, padding: '0 12px' }}>
              {L.list.copyUrl}
            </Button>
            <Button variant="secondary" onClick={() => openCloneSetup(p)} style={{ height: 34, fontSize: 12, padding: '0 12px' }}>
              {L.studio.clone}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <main style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '30px 40px 60px' }}>
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        marginBottom: 22,
        flexWrap: 'wrap',
      }}>
        <h1 style={{ margin: 0, fontSize: 27, fontWeight: 700, letterSpacing: '-0.02em' }}>{L.studio.title}</h1>
        <div style={{ display: 'flex', gap: 10, flexShrink: 0, flexWrap: 'wrap' }}>
          <Button variant="secondary" onClick={exportListsPdf}>{L.list.pdfExport}</Button>
          <Button onClick={openQuickSetup}>{L.studio.ctaNew}</Button>
        </div>
      </header>

      {list.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '48px 20px',
          color: tokens.text.faint,
          background: tokens.bg.s1,
          borderRadius: 14,
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          {L.studio.empty}
        </div>
      ) : (
        <>
          {paid.length > 0 && (
            <section style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{L.studio.sectionPaid}</h2>
                <span style={{ fontSize: 12.5, color: tokens.text.faint }}>{L.studio.pickHint(paid.length)}</span>
              </div>
              {renderCards(paid)}
            </section>
          )}
          {demo.length > 0 && (
            <section>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{L.studio.sectionDemo}</h2>
                <span style={{ fontSize: 12.5, color: tokens.text.faint }}>{L.studio.pickHint(demo.length)}</span>
              </div>
              {renderCards(demo)}
            </section>
          )}
        </>
      )}
    </main>
  );
}
