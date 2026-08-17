import { useMemo, useState } from 'react';
import { tokens } from '../tokens';
import { useApp } from '../context/AppContext';
import { L } from '../i18n/labels';
import { PREFECTURES } from '../data/mock';
import { SITE_TEMPLATE_LIST, type SiteTemplateId } from '../data/projectTemplates';
import { detectLocationIdKind } from '../lib/siteAutoSetup';
import { testWbgtPoint, type WbgtTestResult } from '../lib/wbgtTest';
import { buildSignageRuntimeConfig, runtimeConfigSummaryRows } from '../lib/signageRuntimeConfig';
import { buildPublicSignageUrl, enabledEngineLoopKeys } from '../lib/deploy';
import { SignagePreviewFrame } from '../components/SignagePreviewFrame';
import { Button, Segmented } from '../components/ui';
import { inputStyle, selectStyle } from '../lib/meta';
import type { Project } from '../types';

export function QuickSetupPage() {
  const {
    quickInput, setQuickField, autoPreview, quickBuildAndDeploy, backToStudio, companies,
  } = useApp();

  const [wbgtTest, setWbgtTest] = useState<WbgtTestResult | null>(null);
  const [testing, setTesting] = useState(false);

  const kind = detectLocationIdKind(quickInput.locationId);
  const isEcsTpl = quickInput.templateId === 'face4_ecs';
  const pointForTest = kind === 'amedas' ? quickInput.locationId : '';

  const previewProject = useMemo((): Project | null => {
    if (!autoPreview || !quickInput.company.trim() || !quickInput.site.trim()) return null;
    const p = autoPreview.projectFields;
    return {
      id: 'preview',
      status: 'new',
      lastDeploy: null,
      engine: 'v2.1',
      deviceToken: 'a35_preview_001',
      ...p,
    };
  }, [autoPreview, quickInput.company, quickInput.site]);

  const configRows = useMemo(() => {
    if (!previewProject) return [];
    return runtimeConfigSummaryRows(buildSignageRuntimeConfig(previewProject, previewProject.prefecture));
  }, [previewProject]);

  const publicUrlPreview = useMemo(() => {
    if (!previewProject) return '';
    const scenes = autoPreview?.sceneConfig?.scenes;
    return buildPublicSignageUrl(previewProject, [], {
      version: 'v2.1',
      loopKeys: scenes ? enabledEngineLoopKeys(scenes, previewProject) : undefined,
    });
  }, [previewProject, autoPreview]);

  const runWbgtTest = async () => {
    const pt = pointForTest.trim();
    if (!pt) return;
    setTesting(true);
    setWbgtTest(await testWbgtPoint(pt));
    setTesting(false);
  };

  return (
    <main style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '30px 40px 60px' }}>
      <div style={{ fontSize: 12.5, color: tokens.text.faint, marginBottom: 9 }}>
        <span onClick={() => backToStudio()} style={{ cursor: 'pointer' }}>{L.quick.breadcrumb}</span>
        <span> / {L.quick.title}</span>
      </div>
      <h1 style={{ margin: '0 0 20px', fontSize: 27, fontWeight: 700 }}>{L.quick.title}</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(280px,360px)', gap: 24, alignItems: 'start' }}>
        <div>
          <section style={{ background: tokens.bg.s1, borderRadius: 16, padding: 22, marginBottom: 18, border: '1px solid rgba(255,255,255,0.07)' }}>
            <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700 }}>{L.quick.secTemplate}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {SITE_TEMPLATE_LIST.map((t) => (
                <label
                  key={t.id}
                  style={{
                    display: 'flex',
                    gap: 12,
                    padding: 14,
                    borderRadius: 12,
                    cursor: 'pointer',
                    border: `1px solid ${quickInput.templateId === t.id ? tokens.accent : 'rgba(255,255,255,0.08)'}`,
                    background: quickInput.templateId === t.id ? `${tokens.accent}14` : tokens.bg.s2,
                  }}
                >
                  <input
                    type="radio"
                    name="tpl"
                    checked={quickInput.templateId === t.id}
                    onChange={() => setQuickField('templateId', t.id as SiteTemplateId)}
                    style={{ marginTop: 4 }}
                  />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{t.label}</div>
                    <div style={{ fontSize: 12, color: tokens.text.faint, marginTop: 4 }}>{t.description}</div>
                    <div style={{ fontSize: 11, color: tokens.text.faint, marginTop: 6, fontFamily: 'ui-monospace, monospace' }}>
                      {t.engineFile}
                    </div>
                    <div style={{ fontSize: 11, color: '#FFE34D', marginTop: 4 }}>{t.designNote}</div>
                  </div>
                </label>
              ))}
            </div>
          </section>

          <section style={{ background: tokens.bg.s1, borderRadius: 16, padding: 22, marginBottom: 18, border: '1px solid rgba(255,255,255,0.07)' }}>
            <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700 }}>{L.quick.secSite}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label={L.form.companyPick}>
                <select
                  value={quickInput.companyId || ''}
                  onChange={(e) => {
                    const id = e.target.value;
                    if (!id) {
                      setQuickField('companyId', '');
                      return;
                    }
                    const co = companies.find((c) => c.id === id);
                    setQuickField('companyId', id);
                    if (co) setQuickField('company', co.name);
                  }}
                  style={selectStyle}
                >
                  <option value="">{L.company.freeEntry}</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}{c.logoKey ? `（${c.logoKey}）` : ''}</option>
                  ))}
                </select>
              </Field>
              <Field label={L.form.company} required>
                <input value={quickInput.company} onChange={(e) => {
                  setQuickField('company', e.target.value);
                  setQuickField('companyId', '');
                }} style={inputStyle(false)} />
              </Field>
              <Field label={L.form.site} required>
                <input value={quickInput.site} onChange={(e) => setQuickField('site', e.target.value)} style={inputStyle(false)} />
              </Field>
              <div style={{ gridColumn: '1 / -1' }}>
                <Field label={L.form.listing}>
                  <Segmented
                    options={[{ value: 'paid', label: L.listing.paid }, { value: 'demo', label: L.listing.demo }]}
                    value={quickInput.listing === 'demo' ? 'demo' : 'paid'}
                    onChange={(v) => setQuickField('listing', v as 'paid' | 'demo')}
                  />
                </Field>
              </div>
              <Field label={L.form.prefecture}>
                <select value={quickInput.prefecture} onChange={(e) => setQuickField('prefecture', e.target.value)} style={selectStyle}>
                  <option value="">{L.form.selectPh}</option>
                  {PREFECTURES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
              <Field label={L.form.contact}>
                <input value={quickInput.contactName} onChange={(e) => setQuickField('contactName', e.target.value)} style={inputStyle(false)} />
              </Field>
              <div style={{ gridColumn: '1 / -1' }}>
                <Field label={L.form.siteAddress}>
                  <input value={quickInput.siteAddress} onChange={(e) => setQuickField('siteAddress', e.target.value)} style={inputStyle(false)} placeholder="〒…" />
                </Field>
              </div>
            </div>
          </section>

          <section style={{ background: tokens.bg.s1, borderRadius: 16, padding: 22, marginBottom: 18, border: '1px solid rgba(255,255,255,0.07)' }}>
            <h2 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700 }}>{L.quick.secPoint}</h2>
            <p style={{ margin: '0 0 16px', fontSize: 12, color: tokens.text.faint, lineHeight: 1.55 }}>{L.quick.pointHint}</p>
            <Field label={L.quick.locationId} required>
              <input
                value={quickInput.locationId}
                onChange={(e) => setQuickField('locationId', e.target.value)}
                style={inputStyle(false)}
                placeholder={isEcsTpl ? '71106（AMeDAS 5桁）' : '62078'}
              />
            </Field>
            {kind !== 'unknown' && quickInput.locationId.trim() && (
              <div style={{ marginTop: 8, fontSize: 12, color: tokens.text.muted }}>
                {L.quick.detected(kind === 'amedas' ? 'AMeDAS / WBGT 5桁' : kind === 'ecs' ? 'ECS Data ID' : 'LoID')}
              </div>
            )}
            {isEcsTpl && (
              <div style={{ marginTop: 16 }}>
                <Field label={L.form.deviceId} required>
                  <input
                    value={quickInput.ecsDataId}
                    onChange={(e) => setQuickField('ecsDataId', e.target.value)}
                    style={inputStyle(false)}
                    placeholder="1050"
                  />
                </Field>
                <Field label={L.form.ecsLoId}>
                  <input value={quickInput.ecsLoId} onChange={(e) => setQuickField('ecsLoId', e.target.value)} style={inputStyle(false)} />
                </Field>
              </div>
            )}
            <div style={{ marginTop: 16, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <Button variant="secondary" onClick={() => void runWbgtTest()} disabled={testing || !pointForTest.trim()}>
                {testing ? L.quick.testing : L.quick.wbgtTest}
              </Button>
              {wbgtTest && (
                <span style={{ fontSize: 12, color: wbgtTest.ok ? tokens.status.ok : tokens.status.down }}>
                  {wbgtTest.message}
                </span>
              )}
            </div>
          </section>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => backToStudio()}>{L.common.cancel}</Button>
            <Button onClick={() => quickBuildAndDeploy()}>{L.quick.buildDeploy}</Button>
          </div>
        </div>

        <div style={{ position: 'sticky', top: 24 }}>
          <section style={{ background: tokens.bg.s1, borderRadius: 16, padding: 20, marginBottom: 16, border: '1px solid rgba(255,255,255,0.07)' }}>
            <h2 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: tokens.text.faint, letterSpacing: '0.04em' }}>{L.quick.autoResult}</h2>
            {!autoPreview ? (
              <p style={{ margin: 0, fontSize: 13, color: tokens.text.faint }}>{L.quick.autoEmpty}</p>
            ) : (
              <>
                {autoPreview.summary.map((row) => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 8, fontSize: 12.5 }}>
                    <span style={{ color: tokens.text.faint }}>{row.label}</span>
                    <span style={{ color: tokens.text.secondary, textAlign: 'right' }}>{row.value}</span>
                  </div>
                ))}
                {autoPreview.warnings.map((w) => (
                  <div key={w} style={{ marginTop: 8, padding: 10, borderRadius: 8, background: 'rgba(255,159,10,0.12)', fontSize: 11.5, color: '#FFCC00' }}>{w}</div>
                ))}
                {configRows.length > 0 && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: tokens.text.faint, letterSpacing: '0.04em', marginBottom: 10 }}>
                      SignageConfig（本番 HTML 差替）
                    </div>
                    {configRows.map((row) => (
                      <div key={row.label} style={{ marginBottom: 6, fontSize: 11, lineHeight: 1.45 }}>
                        <span style={{ color: tokens.text.faint }}>{row.label}: </span>
                        <span style={{ color: tokens.text.secondary, wordBreak: 'break-all' }}>{row.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
          {previewProject && (
            <>
              <section style={{ background: tokens.bg.s1, borderRadius: 16, padding: 16, marginBottom: 16, border: `1px solid ${tokens.accent}33` }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: tokens.text.faint, marginBottom: 8 }}>{L.quick.publicUrl}</div>
                <code style={{ display: 'block', fontSize: 10, color: tokens.text.secondary, wordBreak: 'break-all', lineHeight: 1.5 }}>
                  {publicUrlPreview}
                </code>
                <p style={{ margin: '10px 0 0', fontSize: 11, color: tokens.text.faint, lineHeight: 1.5 }}>{L.quick.publicUrlHint}</p>
              </section>
              <SignagePreviewFrame
                project={previewProject}
                equip={[]}
                fullRotation
                scenes={autoPreview?.sceneConfig?.scenes}
                showOpenTab
              />
            </>
          )}
        </div>
      </div>
    </main>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: tokens.text.tertiary, marginBottom: 7 }}>
        {label} {required && <span style={{ color: tokens.status.down }}>*</span>}
      </label>
      {children}
    </div>
  );
}
