import { tokens } from '../tokens';
import { useApp } from '../context/AppContext';
import { L } from '../i18n/labels';
import { listingOf } from '../lib/companies';
import { signageFacesLabelForProject } from '../core/layoutRegistry';
import { Button, FilterPill } from '../components/ui';
import { PREFECTURES } from '../data/mock';
import type { Project } from '../types';
import { selectStyle } from '../lib/meta';

function pointOf(p: Project): string {
  return (p.moePoint || p.jmaPoint || p.sourceId || '—').trim() || '—';
}

function ListingMark({ p }: { p: Project }) {
  if (listingOf(p) !== 'demo') return null;
  return (
    <span style={{
      display: 'inline-block',
      marginLeft: 8,
      padding: '1px 7px',
      borderRadius: 6,
      fontSize: 11,
      fontWeight: 700,
      color: '#FF9F0A',
      background: 'rgba(255,159,10,0.14)',
      verticalAlign: 'middle',
    }}>
      {L.listing.demo}
    </span>
  );
}

export function ListPage() {
  const {
    projects, companies, listSearch, setListSearch,
    listCompanyId, setListCompanyId,
    listPrefecture, setListPrefecture,
    listListing, setListListing,
    listView, setListView, openEdit, setPage,
    copyProjectUrl, openScene, openDeploy, openCloneSetup,
  } = useApp();
  const accent = tokens.accent;

  const paidCount = projects.filter((p) => listingOf(p) === 'paid').length;
  const demoCount = projects.filter((p) => listingOf(p) === 'demo').length;

  const filtered = projects.filter((p) => {
    if (listListing === 'paid' && listingOf(p) !== 'paid') return false;
    if (listListing === 'demo' && listingOf(p) !== 'demo') return false;
    if (listCompanyId !== 'all' && (p.companyId || '') !== listCompanyId && p.company !== companies.find((c) => c.id === listCompanyId)?.name) return false;
    if (listPrefecture !== 'all' && (p.prefecture || '') !== listPrefecture) return false;
    const q = listSearch.trim().toLowerCase();
    if (!q) return true;
    const hay = [
      p.id, p.company, p.site, p.prefecture, p.siteAddress,
      p.moePoint, p.jmaPoint, p.sourceId, p.logoKey, p.publishedUrl,
    ].map((x) => (x || '').toLowerCase()).join(' ');
    return hay.includes(q);
  });

  const sorted = [...filtered].sort(
    (a, b) => a.company.localeCompare(b.company, 'ja') || a.site.localeCompare(b.site, 'ja'),
  );

  return (
    <main style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '30px 40px 60px' }}>
      <header style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px 20px', marginBottom: 18 }}>
        <div style={{ flex: '1 1 220px', minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: 27, fontWeight: 700, letterSpacing: '-0.02em' }}>{L.list.title}</h1>
          <p style={{ margin: '6px 0 0', fontSize: 13.5, color: tokens.text.muted }}>
            {L.list.subtitle(projects.length)}
          </p>
          <p style={{ margin: '8px 0 0', fontSize: 12.5, color: tokens.text.faint, maxWidth: 560 }}>{L.list.registryHint}</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Button onClick={() => setPage('studio')}>{L.list.goStudio}</Button>
        </div>
      </header>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
        {[
          { key: 'all', label: L.list.total, value: projects.length, color: tokens.text.primary },
          { key: 'paid', label: L.list.listingPaid, value: paidCount, color: tokens.status.ok },
          { key: 'demo', label: L.list.listingDemo, value: demoCount, color: '#FF9F0A' },
        ].map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setListListing(s.key)}
            style={{
              flex: '1 1 120px',
              minWidth: 120,
              textAlign: 'left',
              background: tokens.bg.s1,
              border: listListing === s.key ? `1px solid ${s.color}` : '1px solid rgba(255,255,255,0.06)',
              borderRadius: 13,
              padding: '14px 16px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              color: 'inherit',
            }}
          >
            <div style={{ fontSize: 12, color: tokens.text.muted, marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
        <input
          value={listSearch}
          onChange={(e) => setListSearch(e.target.value)}
          placeholder={L.list.searchPh}
          style={{ flex: 1, minWidth: 240, maxWidth: 420, height: 40, padding: '0 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.09)', background: tokens.bg.s1, color: tokens.text.primary, fontFamily: 'inherit', fontSize: 14, outline: 'none' }}
        />
        <FilterPill active={listListing === 'all'} label={L.common.all} count={projects.length} onClick={() => setListListing('all')} />
        <FilterPill active={listListing === 'paid'} label={L.listing.paid} count={paidCount} onClick={() => setListListing('paid')} />
        <FilterPill active={listListing === 'demo'} label={L.listing.demo} count={demoCount} onClick={() => setListListing('demo')} />
        <select value={listCompanyId} onChange={(e) => setListCompanyId(e.target.value)} style={{ ...selectStyle, width: 'auto', minWidth: 140 }}>
          <option value="all">{L.list.filterCompany}: {L.common.all}</option>
          {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={listPrefecture} onChange={(e) => setListPrefecture(e.target.value)} style={{ ...selectStyle, width: 'auto', minWidth: 140 }}>
          <option value="all">{L.list.filterPref}: {L.common.all}</option>
          {PREFECTURES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, background: tokens.bg.s1, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 3 }}>
          {(['list', 'card'] as const).map((v) => (
            <button key={v} type="button" onClick={() => setListView(v)} title={v === 'card' ? L.list.viewCard : L.list.viewList} style={{ width: 32, height: 30, border: 'none', borderRadius: 7, cursor: 'pointer', background: listView === v ? 'rgba(255,255,255,0.1)' : 'transparent', color: listView === v ? accent : tokens.text.faint }}>
              {v === 'card' ? '\u25a6' : '\u2630'}
            </button>
          ))}
        </div>
      </div>

      {sorted.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '70px 20px', color: tokens.text.faint }}>{L.list.empty}</div>
      ) : listView === 'list' ? (
        <div style={{ background: tokens.bg.s1, border: '1px solid rgba(255,255,255,0.07)', borderRadius: 15, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '0.7fr 1.4fr 0.5fr 0.7fr 0.85fr', gap: 10, padding: '10px 18px', fontSize: 11.5, color: tokens.text.faint, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div>ID</div>
            <div>会社 / 現場</div>
            <div>{L.list.point}</div>
            <div>面</div>
            <div>公開URL</div>
          </div>
          {sorted.map((p) => (
            <div
              key={p.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '0.7fr 1.4fr 0.5fr 0.7fr 0.85fr',
                gap: 10,
                padding: '12px 18px',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                alignItems: 'center',
              }}
            >
              <button type="button" onClick={() => openEdit(p)} style={{ all: 'unset', cursor: 'pointer', fontFamily: 'monospace', fontSize: 12, color: accent }}>
                {p.id}
              </button>
              <div style={{ minWidth: 0, cursor: 'pointer' }} onClick={() => openEdit(p)}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{p.company}<ListingMark p={p} /></div>
                <div style={{ fontSize: 12, color: tokens.text.muted }}>{p.site}{p.prefecture ? ` · ${p.prefecture}` : ''}</div>
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: 12.5 }}>{pointOf(p)}</div>
              <div style={{ fontSize: 12.5 }}>{signageFacesLabelForProject(p)}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <Button variant="secondary" style={{ height: 30, fontSize: 12, padding: '0 10px' }} onClick={() => copyProjectUrl(p)}>
                  {L.list.copyUrl}
                </Button>
                <Button variant="secondary" style={{ height: 30, fontSize: 12, padding: '0 10px' }} onClick={() => openScene(p)}>{L.list.openStudio}</Button>
                <Button variant="secondary" style={{ height: 30, fontSize: 12, padding: '0 10px' }} onClick={() => openDeploy(p)}>{L.studio.openDeploy}</Button>
                <Button variant="secondary" style={{ height: 30, fontSize: 12, padding: '0 10px' }} onClick={() => openCloneSetup(p)}>{L.list.clone}</Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          {sorted.map((p) => {
            return (
              <div key={p.id} style={{ background: tokens.bg.s1, border: '1px solid rgba(255,255,255,0.07)', borderRadius: 15, padding: '16px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 11, color: tokens.text.muted }}>{p.id}</span>
                  {listingOf(p) === 'demo' ? (
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#FF9F0A' }}>{L.listing.demo}</span>
                  ) : (
                    <span style={{ fontSize: 11, fontWeight: 600, color: tokens.status.ok }}>{L.listing.paid}</span>
                  )}
                </div>
                <div style={{ fontSize: 17, fontWeight: 700, cursor: 'pointer' }} onClick={() => openEdit(p)}>{p.company}</div>
                <div style={{ fontSize: 13, color: tokens.text.muted, marginBottom: 10 }}>{p.site}</div>
                <div style={{ fontSize: 12.5, color: tokens.text.secondary, marginBottom: 12 }}>
                  {L.list.point}: <span style={{ fontFamily: 'monospace' }}>{pointOf(p)}</span>
                  {p.logoKey ? ` · ${p.logoKey}` : ''}
                  {p.publishedUrl ? ` · ${L.list.issued}` : ''}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <Button variant="secondary" style={{ height: 30, fontSize: 12 }} onClick={() => copyProjectUrl(p)}>{L.list.copyUrl}</Button>
                  <Button variant="secondary" style={{ height: 30, fontSize: 12 }} onClick={() => openScene(p)}>{L.list.openStudio}</Button>
                  <Button variant="secondary" style={{ height: 30, fontSize: 12 }} onClick={() => openEdit(p)}>台帳編集</Button>
                  <Button variant="secondary" style={{ height: 30, fontSize: 12 }} onClick={() => openDeploy(p)}>{L.studio.openDeploy}</Button>
                  <Button variant="secondary" style={{ height: 30, fontSize: 12 }} onClick={() => openCloneSetup(p)}>{L.list.clone}</Button>
                </div>
                <div style={{ marginTop: 10, fontSize: 11.5, color: tokens.text.faint }}>{signageFacesLabelForProject(p)}</div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
