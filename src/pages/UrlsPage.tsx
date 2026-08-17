import { useMemo, useState } from 'react';
import { tokens } from '../tokens';
import { useApp } from '../context/AppContext';
import { L } from '../i18n/labels';
import { Button } from '../components/ui';

export function UrlsPage() {
  const { projects, copyProjectUrl, openDeploy, openScene, showToast, projectPublicUrl, exportListsPdf } = useApp();
  const [q, setQ] = useState('');

  const rows = useMemo(() => {
    const list = projects
      .map((p) => ({
        project: p,
        url: projectPublicUrl(p),
      }))
      .sort((a, b) => a.project.company.localeCompare(b.project.company, 'ja')
        || a.project.site.localeCompare(b.project.site, 'ja'));
    const needle = q.trim().toLowerCase();
    if (!needle) return list;
    return list.filter(({ project, url }) => {
      const hay = [project.id, project.company, project.site, url, project.publishedUrl]
        .map((x) => (x || '').toLowerCase())
        .join(' ');
      return hay.includes(needle);
    });
  }, [projects, projectPublicUrl, q]);

  const copyAll = () => {
    const text = rows
      .map(({ project, url }) => `${project.company} / ${project.site}\n${url}`)
      .join('\n\n');
    if (!text) return;
    void navigator.clipboard.writeText(text).then(
      () => showToast(L.urls.copiedAll),
      () => showToast(text),
    );
  };

  return (
    <main style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '30px 40px 60px' }}>
      <header style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 16,
        flexWrap: 'wrap',
        marginBottom: 18,
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 27, fontWeight: 700, letterSpacing: '-0.02em' }}>{L.urls.title}</h1>
          <p style={{ margin: '6px 0 0', fontSize: 13.5, color: tokens.text.muted }}>
            {L.urls.subtitle(rows.length)}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Button variant="secondary" disabled={rows.length === 0} onClick={copyAll}>
            {L.urls.copyAll}
          </Button>
          <Button variant="secondary" onClick={exportListsPdf}>{L.list.pdfExport}</Button>
        </div>
      </header>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={L.urls.searchPh}
        style={{
          width: '100%',
          maxWidth: 480,
          height: 40,
          marginBottom: 16,
          padding: '0 14px',
          borderRadius: 10,
          border: '1px solid rgba(255,255,255,0.09)',
          background: tokens.bg.s1,
          color: tokens.text.primary,
          fontFamily: 'inherit',
          fontSize: 14,
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />

      {rows.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '48px 20px',
          color: tokens.text.faint,
          background: tokens.bg.s1,
          borderRadius: 14,
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          {L.urls.empty}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rows.map(({ project: p, url }) => {
            const issued = Boolean(p.publishedUrl);
            return (
              <div
                key={p.id}
                style={{
                  background: tokens.bg.s1,
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 14,
                  padding: '14px 16px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>
                      {p.company}
                      <span style={{ fontWeight: 500, color: tokens.text.muted }}> / {p.site}</span>
                    </div>
                    <div style={{ fontSize: 11.5, color: tokens.text.faint, marginTop: 3, fontFamily: 'ui-monospace, monospace' }}>
                      {p.id}
                      {!issued && (
                        <span style={{ marginLeft: 8, color: tokens.text.faint, fontFamily: 'inherit' }}>{L.urls.previewUrl}</span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <Button variant="secondary" style={{ height: 32, fontSize: 12, padding: '0 12px' }} onClick={() => openScene(p)}>
                      {L.studio.openScene}
                    </Button>
                    <Button variant="secondary" style={{ height: 32, fontSize: 12, padding: '0 12px' }} onClick={() => openDeploy(p)}>
                      {L.studio.openDeploy}
                    </Button>
                    <Button style={{ height: 32, fontSize: 12, padding: '0 12px' }} onClick={() => copyProjectUrl(p)}>
                      {L.urls.copy}
                    </Button>
                  </div>
                </div>
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'block',
                    fontSize: 13,
                    lineHeight: 1.45,
                    color: tokens.accent,
                    wordBreak: 'break-all',
                    textDecoration: 'none',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  }}
                >
                  {url}
                </a>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
