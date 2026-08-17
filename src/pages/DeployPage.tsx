import { useEffect, useState } from 'react';
import { tokens } from '../tokens';
import { useApp } from '../context/AppContext';
import { L } from '../i18n/labels';
import { locationReadyForPublish } from '../lib/deploy';
import { Button } from '../components/ui';
import { inputStyle } from '../lib/meta';
import { sitePlacePatch } from '../data/sitePlaces';
import { compressLogoDataUrl } from '../lib/signageLogo';
import type { DeployRecord } from '../types';

export function DeployPage() {
  const {
    sceneProject, scenes, dpStatus,
    dpHistory, publicSignageUrl,
    downloadSiteHtml, deployChecks, askDeploy, openPreview, showToast,
    patchSceneProject, openCloneSetup,
  } = useApp();
  const accent = tokens.accent;
  const blocked = !sceneProject || !locationReadyForPublish(sceneProject);
  const url = publicSignageUrl || sceneProject?.publishedUrl || '';
  const canExportHtml = sceneProject?.faces === 4 && sceneProject.source !== 'manual';
  const issued = Boolean(sceneProject?.publishedUrl);

  const [latDraft, setLatDraft] = useState('');
  const [lonDraft, setLonDraft] = useState('');

  useEffect(() => {
    setLatDraft(sceneProject?.geo != null ? String(sceneProject.geo.lat) : '');
    setLonDraft(sceneProject?.geo != null ? String(sceneProject.geo.lon) : '');
  }, [sceneProject?.id, sceneProject?.geo?.lat, sceneProject?.geo?.lon]);

  useEffect(() => {
    const src = sceneProject?.logoSrc || '';
    const id = sceneProject?.id;
    if (!id || !src.startsWith('data:image/') || src.length <= 24000) return;
    let cancelled = false;
    void compressLogoDataUrl(src).then((next) => {
      if (cancelled || !next || next === src || next.length >= src.length) return;
      patchSceneProject({ logoSrc: next });
    });
    return () => { cancelled = true; };
  }, [sceneProject?.id, sceneProject?.logoSrc, patchSceneProject]);

  const copyText = async (text: string, okMsg: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      showToast(okMsg);
    } catch {
      showToast(L.deploy.copyFailed);
    }
  };

  const setPoint = (key: 'moePoint' | 'jmaPoint' | 'jmaArea' | 'jmaWarnCity' | 'sourceId' | 'ecsLoId', value: string) => {
    patchSceneProject({ [key]: value });
  };

  const commitGeo = (which: 'lat' | 'lon', raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) {
      if (which === 'lat') setLatDraft(sceneProject?.geo != null ? String(sceneProject.geo.lat) : '');
      else setLonDraft(sceneProject?.geo != null ? String(sceneProject.geo.lon) : '');
      return;
    }
    const n = Number(trimmed);
    if (!Number.isFinite(n)) {
      showToast(which === 'lat' ? '緯度は数値で入力してください' : '経度は数値で入力してください');
      return;
    }
    const geo = sceneProject?.geo ?? { lat: 0, lon: 0 };
    patchSceneProject({
      geo: which === 'lat' ? { lat: n, lon: geo.lon } : { lat: geo.lat, lon: n },
    });
  };

  if (!sceneProject) {
    return (
      <main style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '30px 40px 60px' }}>
        <h1 style={{ margin: '0 0 6px', fontSize: 27, fontWeight: 700 }}>{L.deploy.title}</h1>
        <p style={{ color: tokens.text.muted }}>{L.scene.pickCase}</p>
      </main>
    );
  }

  const locField = (label: string, value: string, onChange: (v: string) => void) => (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: tokens.text.tertiary, marginBottom: 6 }}>{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle(false)} />
    </div>
  );

  return (
    <main style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '30px 40px 60px' }}>
      <h1 style={{ margin: '0 0 6px', fontSize: 27, fontWeight: 700 }}>{L.deploy.title}</h1>
      <p style={{ margin: '0 0 8px', color: tokens.text.muted }}>
        {sceneProject.company} / {sceneProject.site}
        {issued ? ` · ${L.list.issued}` : ''}
      </p>
      <p style={{ margin: '0 0 24px', fontSize: 13, color: tokens.text.faint }}>{L.deploy.autoFlow}</p>

      <section style={{
        background: tokens.bg.s1,
        borderRadius: 16,
        padding: 22,
        marginBottom: 20,
        border: '1px solid rgba(255,255,255,0.07)',
      }}>
        <h2 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 700 }}>{L.deploy.locationTitle}</h2>
        <p style={{ margin: '0 0 14px', fontSize: 12.5, color: tokens.text.muted, lineHeight: 1.6 }}>{L.deploy.locationHint}</p>
        <div style={{ fontSize: 12, fontWeight: 700, color: tokens.text.faint, marginBottom: 10 }}>{L.deploy.stationGroup}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {sceneProject.source === 'device' && locField(L.form.deviceId, sceneProject.sourceId || '', (v) => setPoint('sourceId', v))}
          {sceneProject.source === 'device' && locField(L.form.ecsLoId, sceneProject.ecsLoId || '', (v) => setPoint('ecsLoId', v))}
          {locField(L.form.moePoint, sceneProject.moePoint || '', (v) => setPoint('moePoint', v))}
          {locField(L.form.jmaPoint, sceneProject.jmaPoint || '', (v) => setPoint('jmaPoint', v))}
          {locField(L.form.jmaArea, sceneProject.jmaArea || '', (v) => setPoint('jmaArea', v))}
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, color: tokens.text.faint, margin: '18px 0 10px' }}>{L.deploy.siteGroup}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {locField(L.form.jmaWarnCity, sceneProject.jmaWarnCity || '', (v) => setPoint('jmaWarnCity', v))}
          <div />
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: tokens.text.tertiary, marginBottom: 6 }}>{L.form.geoLat}</label>
            <input
              value={latDraft}
              inputMode="decimal"
              onChange={(e) => setLatDraft(e.target.value)}
              onBlur={() => commitGeo('lat', latDraft)}
              style={inputStyle(false)}
              placeholder="34.555"
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: tokens.text.tertiary, marginBottom: 6 }}>{L.form.geoLon}</label>
            <input
              value={lonDraft}
              inputMode="decimal"
              onChange={(e) => setLonDraft(e.target.value)}
              onBlur={() => commitGeo('lon', lonDraft)}
              style={inputStyle(false)}
              placeholder="135.785"
            />
          </div>
        </div>
        <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button
            variant="secondary"
            onClick={() => {
              const patch = sitePlacePatch(sceneProject.site, sceneProject.siteAddress);
              if (!patch) {
                showToast(L.deploy.applySiteGeoMiss);
                return;
              }
              patchSceneProject(patch);
              showToast(L.deploy.applySiteGeoOk);
            }}
          >
            {L.deploy.applySiteGeo}
          </Button>
          <Button variant="secondary" onClick={() => openCloneSetup(sceneProject)}>{L.studio.clone}</Button>
          <span style={{ fontSize: 12, color: tokens.text.faint }}>{L.deploy.cloneHint}</span>
        </div>
      </section>

      <section style={{
        background: `linear-gradient(135deg, ${accent}18, ${tokens.bg.s1})`,
        borderRadius: 16,
        padding: 22,
        marginBottom: 20,
        border: `1px solid ${accent}44`,
      }}>
        <h2 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 700 }}>{L.deploy.publicUrl}</h2>
        <p style={{ margin: '0 0 14px', fontSize: 12.5, color: tokens.text.muted, lineHeight: 1.6 }}>{L.deploy.publicUrlHint}</p>
        <code style={{
          display: 'block', padding: 12, borderRadius: 10, background: tokens.bg.s2,
          fontSize: 12, wordBreak: 'break-all', color: tokens.text.secondary,
        }}>
          {url || '\u2014'}
        </code>
        <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
          <Button onClick={() => void copyText(url, L.deploy.copyUrl)} disabled={!url}>
            {L.deploy.copyPublicUrl}
          </Button>
          {url && (
            <a href={url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
              <Button variant="secondary">{L.deploy.openPublic}</Button>
            </a>
          )}
          {canExportHtml && (
            <Button variant="secondary" onClick={() => void downloadSiteHtml()}>
              {L.deploy.downloadHtml}
            </Button>
          )}
        </div>
        <div style={{ marginTop: 16, padding: 14, borderRadius: 10, background: 'rgba(0,0,0,0.2)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: tokens.text.faint, marginBottom: 8 }}>{L.deploy.publishSteps}</div>
          <ol style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: tokens.text.muted, lineHeight: 1.8 }}>
            <li>{L.deploy.step1}</li>
            <li>{L.deploy.step2}</li>
            <li>{L.deploy.step3}</li>
          </ol>
        </div>
        <Button style={{ width: '100%', height: 48, marginTop: 16 }} disabled={blocked} onClick={askDeploy}>
          {L.deploy.run}
        </Button>
        {dpStatus === 'done' && !blocked && (
          <p style={{ color: tokens.status.ok, marginTop: 12 }}>{L.deploy.done}</p>
        )}
        {blocked && (
          <p style={{ color: tokens.status.down, marginTop: 12, fontSize: 13 }}>
            WBGT／AMeDAS の地点IDを入れると発行できます
          </p>
        )}
      </section>

      <section style={{ background: tokens.bg.s1, borderRadius: 16, padding: 22, marginBottom: 20, border: '1px solid rgba(255,255,255,0.07)' }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700 }}>{L.deploy.checks}</h2>
        {deployChecks.map((c) => (
          <div key={c.id} style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', alignItems: 'flex-start' }}>
            <span style={{ color: c.ok ? tokens.status.ok : tokens.status.down, fontWeight: 700, width: 18 }}>{c.ok ? '\u2713' : '\u2717'}</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13.5 }}>{c.label}</div>
              <div style={{ fontSize: 12, color: tokens.text.muted, marginTop: 2 }}>{c.detail}</div>
            </div>
          </div>
        ))}
        <p style={{ fontSize: 13, color: tokens.text.secondary, marginTop: 14 }}>
          {L.deploy.checkDetail(0, scenes.filter((s) => s.enabled).length)}
        </p>
      </section>

      {dpHistory.length > 0 && (
        <section style={{ background: tokens.bg.s1, borderRadius: 16, padding: 22 }}>
          <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700 }}>{L.deploy.history}</h2>
          {dpHistory.map((h: DeployRecord, i: number) => (
            <div key={i} style={{ display: 'flex', gap: 16, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 13 }}>
              <span>{h.dt}</span><span>{h.version}</span>
              <span style={{ color: h.status === 'success' ? tokens.status.ok : tokens.status.down }}>{h.status}</span>
              <span>{h.target}</span>
            </div>
          ))}
        </section>
      )}
      <Button variant="secondary" style={{ marginTop: 20 }} onClick={() => openPreview()}>{L.deploy.toPreview}</Button>
    </main>
  );
}
