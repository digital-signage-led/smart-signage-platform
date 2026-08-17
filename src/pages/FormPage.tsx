import { useRef } from 'react';
import { tokens } from '../tokens';
import { useApp } from '../context/AppContext';
import { inputStyle, selectStyle } from '../lib/meta';
import { L } from '../i18n/labels';
import { PREFECTURES } from '../data/mock';
import { Button, Segmented, Toggle } from '../components/ui';
import { displaySpecForSignage, signageKindMeta, SIGNAGE_KINDS, signageFacesLabel } from '../core/layoutRegistry';
import { CONTROLLERS } from '../core/controllerRegistry';
import type { ProjectForm } from '../types';

const OPT_DEFS = [
  ['rain_warn', L.opt.rain_warn, 3000, L.optDesc.rain_warn],
  ['landslide_info', L.opt.landslide_info, 2500, L.optDesc.landslide_info],
  ['flood_info', L.opt.flood_info, 2500, L.optDesc.flood_info],
  ['surge_info', L.opt.surge_info, 2500, L.optDesc.surge_info],
  ['weather_warn', L.opt.weather_warn, 2500, L.optDesc.weather_warn],
  ['evac_info', L.opt.evac_info, 2500, L.optDesc.evac_info],
  ['jishin', L.opt.jishin, 3000, L.optDesc.jishin],
  ['bousai', L.opt.bousai, 5000, L.optDesc.bousai],
  ['multilang', L.opt.multilang, 4000, L.optDesc.multilang],
  ['nowcast', L.opt.nowcast, 3500, L.optDesc.nowcast],
  ['video', L.opt.video, 3500, L.optDesc.video],
  ['pdf', L.opt.pdf, 2500, L.optDesc.pdf],
] as const;

export function FormPage() {
  const {
    formMode, form, errors, logo, setLogo, setFormField, toggleFormOpt, validateAndSave,
    backToList, backToStudio, openScene, formProject, companies, applyCompanyToForm,
  } = useApp();
  const accent = tokens.accent;
  const fileRef = useRef<HTMLInputElement>(null);
  const planBase = form.plan === 'standard' ? 15000 : 10000;
  const optTotal = OPT_DEFS.reduce((sum, [k, , fee]) => sum + (form.options[k as keyof typeof form.options] ? fee : 0), 0);

  const readLogo = (file: File | undefined) => {
    if (!file) return;
    const r = new FileReader();
    r.onload = () => setLogo({ name: file.name, url: r.result as string });
    r.readAsDataURL(file);
  };

  const field = (k: keyof ProjectForm, label: string, required?: boolean) => (
    <div>
      <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: tokens.text.tertiary, marginBottom: 7 }}>
        {label} {required && <span style={{ color: tokens.status.down }}>*</span>}
      </label>
      <input value={String(form[k] ?? '')} onChange={(e) => setFormField(k, e.target.value)} style={inputStyle(!!errors[k])} />
      {errors[k] && <div style={{ fontSize: 11.5, color: tokens.status.down, marginTop: 6 }}>{errors[k]}</div>}
    </div>
  );

  const kindMeta = signageKindMeta(form.signageKind);
  const faceNum = parseInt(form.faces, 10);
  const displaySpec = displaySpecForSignage(form.signageKind, faceNum);
  const faceOptions = kindMeta.faceOptions.map((n) => ({
    value: String(n),
    label: signageFacesLabel(form.signageKind, n),
  }));

  const onSignageKindChange = (kind: typeof form.signageKind) => {
    const meta = signageKindMeta(kind);
    const faces = String(meta.faceOptions[0]);
    setFormField('signageKind', kind);
    setFormField('faces', faces);
    setFormField('pixel', displaySpecForSignage(kind, meta.faceOptions[0]).pixelLabel);
  };

  const onFacesChange = (v: string) => {
    setFormField('faces', v);
    setFormField('pixel', displaySpecForSignage(form.signageKind, parseInt(v, 10)).pixelLabel);
  };

  const sourceIdLabel =
    form.source === 'edam' ? L.form.loid :
    form.source === 'device' ? L.form.deviceId :
    L.form.stationId;

  return (
    <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ flexShrink: 0, padding: '24px 40px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ fontSize: 12.5, color: tokens.text.faint, marginBottom: 9 }}>
          <span
            onClick={() => (formMode === 'edit' ? backToList() : backToStudio())}
            style={{ cursor: 'pointer' }}
          >
            {formMode === 'edit' ? L.form.breadcrumbList : L.form.breadcrumb}
          </span>
          {' / '}
          {formMode === 'edit' ? L.form.editTitle : L.form.newTitle}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0, fontSize: 25, fontWeight: 700 }}>{formMode === 'edit' ? L.form.editTitle : L.form.newTitle}</h1>
          {formMode === 'edit' && formProject && <Button variant="secondary" style={{ height: 38 }} onClick={() => openScene(formProject)}>{L.form.sceneBtn}</Button>}
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '26px 40px 40px' }}>
        <div style={{ maxWidth: 840, margin: '0 auto' }}>
          <Section title={L.form.sec1}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: tokens.text.tertiary, marginBottom: 7 }}>{L.form.companyPick}</label>
                <select
                  value={form.companyId}
                  onChange={(e) => applyCompanyToForm(e.target.value)}
                  style={selectStyle}
                >
                  <option value="">{L.company.freeEntry}</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}{c.logoKey ? `（${c.logoKey}）` : ''}</option>
                  ))}
                </select>
              </div>
              {field('company', L.form.company, true)}
              {field('site', L.form.site, true)}
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: tokens.text.tertiary, marginBottom: 7 }}>{L.form.prefecture}</label>
                <select value={form.prefecture} onChange={(e) => setFormField('prefecture', e.target.value)} style={selectStyle}>
                  <option value="">{L.form.selectPh}</option>
                  {PREFECTURES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              {field('contactName', L.form.contact, true)}
              {field('tel', L.form.tel)}
              {field('email', L.form.email)}
              <div style={{ gridColumn: '1 / -1' }}>
                {field('siteAddress', L.form.siteAddress)}
              </div>
              {formProject && (
                <div style={{ gridColumn: '1 / -1', fontSize: 12.5, color: tokens.text.muted }}>
                  案件ID: <span style={{ fontFamily: 'monospace', color: accent }}>{formProject.id}</span>
                  {formProject.publishedUrl ? (
                    <> · URL発行済</>
                  ) : null}
                </div>
              )}
            </div>
          </Section>
          <Section title={L.form.sec2}>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: tokens.text.tertiary, marginBottom: 9 }}>{L.form.listing}</label>
            <Segmented
              options={[{ value: 'paid', label: L.listing.paid }, { value: 'demo', label: L.listing.demo }]}
              value={form.listing}
              onChange={(v) => setFormField('listing', v)}
            />
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: tokens.text.tertiary, margin: '20px 0 9px' }}>{L.form.plan}</label>
            <Segmented options={[{ value: 'basic', label: L.plan.basic }, { value: 'standard', label: L.plan.standard }]} value={form.plan} onChange={(v) => setFormField('plan', v)} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginTop: 20 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: tokens.text.tertiary, marginBottom: 9 }}>{L.form.signageKind}</label>
                <Segmented
                  options={SIGNAGE_KINDS.map((k) => ({ value: k.id, label: k.label }))}
                  value={form.signageKind}
                  onChange={(v) => onSignageKindChange(v as typeof form.signageKind)}
                />
                <div style={{ fontSize: 12, color: tokens.text.faint, marginTop: 8 }}>{kindMeta.description}</div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: tokens.text.tertiary, marginBottom: 9 }}>{L.form.facesLabel}</label>
                <Segmented options={faceOptions} value={form.faces} onChange={onFacesChange} />
                {errors.faces && <div style={{ fontSize: 11.5, color: tokens.status.down, marginTop: 6 }}>{errors.faces}</div>}
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: tokens.text.tertiary, marginBottom: 7 }}>{L.form.pixel}</label>
                <input value={displaySpec.pixelLabel} readOnly style={{ ...inputStyle(false), opacity: 0.85, cursor: 'default' }} />
                <div style={{ fontSize: 11.5, color: tokens.text.faint, marginTop: 6 }}>{L.form.pixelAuto}</div>
              </div>
            </div>
            <div style={{ marginTop: 22, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' }}>
              {OPT_DEFS.map(([k, label, fee, desc], i) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 16px', borderTop: i ? '1px solid rgba(255,255,255,0.06)' : undefined }}>
                  <div><div style={{ fontSize: 14, fontWeight: 600 }}>{label}</div><div style={{ fontSize: 12, color: tokens.text.faint }}>{desc}</div></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <span>{L.common.yen}{fee.toLocaleString()}{L.common.perMonth}</span>
                    <Toggle on={form.options[k as keyof typeof form.options]} onChange={() => toggleFormOpt(k as keyof typeof form.options)} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 18, display: 'flex', justifyContent: 'space-between', background: tokens.bg.s2, borderRadius: 12, padding: '13px 16px' }}>
              <span style={{ color: tokens.text.tertiary }}>{L.form.monthly}</span>
              <span style={{ fontSize: 19, fontWeight: 700, color: accent }}>{L.common.yen}{(planBase + optTotal).toLocaleString()}</span>
            </div>
          </Section>
          <Section title={L.form.sec3}>
            <Segmented options={[
              { value: 'edam', label: L.form.sourceEdam },
              { value: 'jma', label: L.form.sourceJma },
              { value: 'manual', label: L.form.sourceManual },
              { value: 'device', label: L.form.sourceDevice },
              { value: 'wxtech', label: L.form.sourceWxtech },
            ]} value={form.source} onChange={(v) => setFormField('source', v)} />
            {form.source === 'manual' && (
              <div style={{ marginTop: 14, padding: 12, borderRadius: 10, background: 'rgba(255,159,10,0.12)', border: '1px solid rgba(255,159,10,0.35)', color: '#FFCC00', fontSize: 13, lineHeight: 1.6 }}>
                {L.form.manualWarn}
              </div>
            )}
            {form.source === 'device' && (
              <div style={{ marginTop: 14, padding: 12, borderRadius: 10, background: 'rgba(50,173,230,0.12)', border: '1px solid rgba(50,173,230,0.35)', color: '#8AD4F8', fontSize: 13, lineHeight: 1.6 }}>
                {L.form.deviceSourceHint}
              </div>
            )}
            {form.source === 'wxtech' && (
              <div style={{ marginTop: 14, padding: 12, borderRadius: 10, background: 'rgba(50,173,230,0.12)', border: '1px solid rgba(50,173,230,0.35)', color: '#8AD4F8', fontSize: 13, lineHeight: 1.6 }}>
                {L.form.wxtechSourceHint}
              </div>
            )}
            {form.source !== 'manual' && (
              <div style={{ marginTop: 18 }}>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: tokens.text.tertiary, marginBottom: 7 }}>
                  {form.source === 'wxtech' ? L.form.wxtechSite : sourceIdLabel}
                </label>
                <input
                  value={form.sourceId}
                  onChange={(e) => setFormField('sourceId', e.target.value)}
                  style={inputStyle(false)}
                  placeholder={
                    form.source === 'device' ? '1050' :
                    form.source === 'jma' ? '67437' :
                    form.source === 'wxtech' ? 'suminoe' :
                    undefined
                  }
                />
                {form.source === 'device' && (
                  <div style={{ fontSize: 12, color: tokens.text.faint, marginTop: 6, lineHeight: 1.5 }}>{L.form.deviceIdHint}</div>
                )}
                {form.source === 'jma' && (
                  <div style={{ fontSize: 12, color: tokens.text.faint, marginTop: 6, lineHeight: 1.5 }}>{L.form.pointAutoHint}</div>
                )}
                {form.source === 'wxtech' && (
                  <div style={{ fontSize: 12, color: tokens.text.faint, marginTop: 6, lineHeight: 1.5 }}>{L.form.wxtechSiteHint}</div>
                )}
              </div>
            )}
            {form.source === 'wxtech' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginTop: 18 }}>
                {field('jmaForecastLabel', L.form.jmaForecastLabel)}
                {field('geoLat', L.form.geoLat)}
                {field('geoLon', L.form.geoLon)}
                <div style={{ gridColumn: '1 / -1' }}>{field('siteAddress', L.form.siteAddress)}</div>
              </div>
            )}
            {(form.source === 'device' || form.source === 'jma') && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginTop: 18 }}>
                {form.source === 'device' && (
                  <>
                    {field('moePoint', L.form.moePoint, true)}
                    {field('jmaPoint', L.form.jmaPoint)}
                    {field('ecsLoId', L.form.ecsLoId)}
                    {field('moePointName', L.form.moePointName)}
                    {field('jmaForecastLabel', L.form.jmaForecastLabel)}
                    <div style={{ gridColumn: '1 / -1' }}>{field('jmaArea', L.form.jmaArea)}</div>
                    {field('jmaWarnCity', L.form.jmaWarnCity)}
                    {field('geoLat', L.form.geoLat)}
                    {field('geoLon', L.form.geoLon)}
                    <div style={{ gridColumn: '1 / -1', fontSize: 12, color: tokens.text.faint, lineHeight: 1.5 }}>{L.form.locationHint}</div>
                    <div style={{ gridColumn: '1 / -1' }}>{field('moeGasUrl', L.form.moeGasUrl)}</div>
                  </>
                )}
                {form.source === 'jma' && (
                  <>
                    {field('moePoint', L.form.moePoint, true)}
                    {field('jmaPoint', L.form.jmaPoint)}
                    {field('moePointName', L.form.moePointName)}
                    {field('jmaForecastLabel', L.form.jmaForecastLabel)}
                    <div style={{ gridColumn: '1 / -1' }}>{field('jmaArea', L.form.jmaArea)}</div>
                    {field('jmaWarnCity', L.form.jmaWarnCity)}
                    {field('geoLat', L.form.geoLat)}
                    {field('geoLon', L.form.geoLon)}
                    <div style={{ gridColumn: '1 / -1', fontSize: 12, color: tokens.text.faint, lineHeight: 1.5 }}>{L.form.locationHint}</div>
                  </>
                )}
              </div>
            )}
            {(form.source === 'edam' || form.source === 'manual') && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginTop: 18 }}>
                {field('jmaWarnCity', L.form.jmaWarnCity)}
                <div />
                {field('geoLat', L.form.geoLat)}
                {field('geoLon', L.form.geoLon)}
                <div style={{ gridColumn: '1 / -1', fontSize: 12, color: tokens.text.faint, lineHeight: 1.5 }}>{L.form.locationHint}</div>
              </div>
            )}
          </Section>
          <Section title={L.form.sec4}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: tokens.text.tertiary, marginBottom: 7 }}>{L.form.controller}</label>
                <select value={form.controller} onChange={(e) => setFormField('controller', e.target.value)} style={selectStyle}>
                  {CONTROLLERS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
              {field('serial', L.form.serial)}
            </div>
            <div onClick={() => fileRef.current?.click()} style={{ marginTop: 16, minHeight: 80, border: `1.5px dashed ${errors.logo ? 'rgba(255,69,59,0.6)' : 'rgba(255,255,255,0.16)'}`, borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: tokens.bg.s2, flexDirection: 'column', gap: 6 }}>
              {logo ? logo.name : L.form.logoPick}
              {displaySpec.logoRequired && <span style={{ fontSize: 11.5, color: tokens.status.down }}>{L.form.logoRequired5}</span>}
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => readLogo(e.target.files?.[0])} />
            </div>
            {errors.logo && <div style={{ fontSize: 11.5, color: tokens.status.down, marginTop: 8 }}>{errors.logo}</div>}
          </Section>
        </div>
      </div>
      <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'flex-end', gap: 12, padding: '16px 40px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <Button variant="secondary" onClick={() => (formMode === 'edit' ? backToList() : backToStudio())}>{L.common.cancel}</Button>
        <Button onClick={validateAndSave}>{formMode === 'edit' ? L.form.saveEdit : L.form.saveNew}</Button>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ background: tokens.bg.s1, border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '24px 26px', marginBottom: 18 }}>
      <h2 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700 }}>{title}</h2>
      {children}
    </section>
  );
}
