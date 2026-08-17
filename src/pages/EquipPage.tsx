import { tokens } from '../tokens';
import { useApp } from '../context/AppContext';
import { L } from '../i18n/labels';
import { FilterPill, Drawer, Segmented, Button } from '../components/ui';
import { CONTROLLERS } from '../core/controllerRegistry';
import type { Equipment, EquipStatus } from '../types';

const EQ_META: Record<EquipStatus, { label: string; color: string }> = {
  ok: { label: L.status.ok, color: tokens.status.ok },
  fault: { label: L.status.fault, color: tokens.status.down },
  repair: { label: L.status.repair, color: tokens.status.repair },
  spare: { label: L.status.spare, color: tokens.status.spare },
};

export function EquipPage() {
  const {
    equip, equipLog, eqType, setEqType, eqStatus, setEqStatus, eqSearch, setEqSearch,
    eqDetailId, openEqDetail, closeEqDetail, eqReplaceOpen, eqNewSerial, setEqNewSerial,
    openReplace, closeReplace, confirmReplace, eqAddOpen, eqAddForm, setAddField,
    openAddEquip, closeAddEquip, confirmAddEquip, gotoEqSite, projects,
  } = useApp();
  const accent = tokens.accent;

  const counts: Record<EquipStatus, number> = { ok: 0, fault: 0, repair: 0, spare: 0 };
  equip.forEach((e) => counts[e.status]++);

  const filtered = equip.filter((e) => {
    if (eqType !== 'all' && e.type !== eqType) return false;
    if (eqStatus !== 'all' && e.status !== eqStatus) return false;
    const q = eqSearch.trim().toLowerCase();
    if (q && !(e.serial.toLowerCase().includes(q) || e.id.toLowerCase().includes(q))) return false;
    return true;
  });

  const order: Record<EquipStatus, number> = { fault: 0, repair: 1, ok: 2, spare: 3 };
  const sorted = [...filtered].sort((a, b) => order[a.status] - order[b.status]);
  const det = equip.find((e) => e.id === eqDetailId);

  return (
    <main style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '30px 40px 60px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 22 }}>
        <div><h1 style={{ margin: 0, fontSize: 27, fontWeight: 700 }}>{L.equip.title}</h1><p style={{ color: tokens.text.muted }}>{L.equip.subtitle(equip.length)}</p></div>
        <Button onClick={openAddEquip}>+ {L.equip.add}</Button>
      </header>

      <div style={{ display: 'flex', gap: 14, marginBottom: 18, flexWrap: 'wrap' }}>
        <input value={eqSearch} onChange={(e) => setEqSearch(e.target.value)} placeholder={L.equip.searchPh} style={{ flex: 1, minWidth: 200, height: 40, padding: '0 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.09)', background: tokens.bg.s1, color: tokens.text.primary, fontFamily: 'inherit' }} />
        {([['all', L.common.all], ...CONTROLLERS.map((c) => [c.equipType, c.label] as const), ['led', 'LED']] as const).map(([k, l]) => (
          <FilterPill key={k} active={eqType === k} label={l} onClick={() => setEqType(k)} accent={accent} />
        ))}
        {([['all', L.common.all, equip.length], ['ok', L.status.ok, counts.ok], ['fault', L.status.fault, counts.fault], ['repair', L.status.repair, counts.repair], ['spare', L.status.spare, counts.spare]] as const).map(([k, l, c]) => (
          <FilterPill key={k} active={eqStatus === k} label={l} count={c} onClick={() => setEqStatus(k)} accent={accent} />
        ))}
      </div>

      <div style={{ background: tokens.bg.s1, borderRadius: 15, overflow: 'hidden', marginBottom: 24 }}>
        {sorted.map((e: Equipment) => {
          const m = EQ_META[e.status];
          return (
            <div key={e.id} onClick={() => openEqDetail(e.id)} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 0.8fr', gap: 14, padding: '13px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', background: e.status === 'fault' ? 'rgba(255,69,58,0.06)' : 'transparent' }}>
              <span style={{ fontWeight: 600 }}>{e.model}</span>
              <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{e.serial}</span>
              <span style={{ fontSize: 12 }}>{e.siteName}</span>
              <span style={{ color: m.color, fontWeight: 600 }}>{m.label}</span>
            </div>
          );
        })}
      </div>

      <h2 style={{ fontSize: 16, fontWeight: 700 }}>{L.equip.log}</h2>
      {equipLog.map((l, i) => (
        <div key={i} style={{ fontSize: 13, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{l.dt}{'\u00b7'}{l.action}{'\u00b7'}{l.detail}</div>
      ))}

      <Drawer open={!!det} onClose={closeEqDetail} title={L.common.detail}>
        {det && (
          <>
            <h3 style={{ margin: '0 0 8px', fontSize: 18 }}>{det.model}</h3>
            <p style={{ fontFamily: 'monospace', margin: '0 0 12px' }}>{det.serial}</p>
            <p style={{ fontSize: 13, color: tokens.text.muted }}>device_id: {det.deviceToken}</p>
            {det.siteId && <button onClick={() => gotoEqSite(det.siteId)} style={{ background: 'none', border: 'none', color: accent, cursor: 'pointer', padding: 0, marginTop: 8 }}>{det.siteName}</button>}
            <Button variant="danger" style={{ width: '100%', marginTop: 20 }} onClick={() => openReplace(det.id)}>{L.equip.replace}</Button>
          </>
        )}
      </Drawer>

      {eqReplaceOpen && (
        <>
          <div onClick={closeReplace} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 50 }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: tokens.bg.s1, padding: 24, borderRadius: 16, zIndex: 51, width: 360 }}>
            <h3 style={{ margin: 0 }}>{L.equip.replaceTitle}</h3>
            <input value={eqNewSerial} onChange={(e) => setEqNewSerial(e.target.value)} placeholder={L.equip.newSerialPh} style={{ width: '100%', height: 42, marginTop: 12, padding: '0 13px', borderRadius: 10, background: tokens.bg.s2, border: '1px solid rgba(255,255,255,0.09)', color: tokens.text.primary, fontFamily: 'inherit' }} />
            <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={closeReplace}>{L.common.cancel}</Button>
              <Button onClick={confirmReplace}>{L.common.confirm}</Button>
            </div>
          </div>
        </>
      )}

      {eqAddOpen && (
        <>
          <div onClick={closeAddEquip} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 50 }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: tokens.bg.s1, padding: 24, borderRadius: 16, zIndex: 51, width: 400 }}>
            <Segmented options={[...CONTROLLERS.map((c) => ({ value: c.equipType, label: c.label })), { value: 'led', label: 'LED' }]} value={eqAddForm.type} onChange={(v) => setAddField('type', v)} />
            <input value={eqAddForm.serial} onChange={(e) => setAddField('serial', e.target.value)} placeholder={L.equip.serialPh} style={{ width: '100%', height: 42, marginTop: 12, padding: '0 13px', borderRadius: 10, background: tokens.bg.s2, border: '1px solid rgba(255,255,255,0.09)', color: tokens.text.primary, fontFamily: 'inherit' }} />
            <select value={eqAddForm.siteId} onChange={(e) => setAddField('siteId', e.target.value)} style={{ width: '100%', height: 42, marginTop: 12, padding: '0 13px', borderRadius: 10, background: tokens.bg.s2, color: tokens.text.primary, fontFamily: 'inherit' }}>
              <option value="">{L.equip.selectSite}</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.company} / {p.site}</option>)}
            </select>
            <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={closeAddEquip}>{L.common.cancel}</Button>
              <Button onClick={confirmAddEquip}>{L.common.add}</Button>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
