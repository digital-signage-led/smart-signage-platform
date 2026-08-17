import { useCallback, useRef, useState } from 'react';
import { tokens, brand } from '../../tokens';
import { useApp } from '../../context/AppContext';
import { isNavActive, getNavTarget } from '../../core/moduleRegistry';
import { L } from '../../i18n/labels';
import type { NavGroup } from '../../core/moduleRegistry';

function NavIcon({ children }: { children: React.ReactNode }) {
  return <span style={{ display: 'flex', flexShrink: 0 }}>{children}</span>;
}

function LogoIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 18 18" fill="none" aria-hidden>
      <rect x="1" y="1" width="6.6" height="6.6" rx="1.6" fill={brand.grid.red.hex} />
      <rect x="10.4" y="1" width="6.6" height="6.6" rx="1.6" fill={brand.grid.green.hex} />
      <rect x="1" y="10.4" width="6.6" height="6.6" rx="1.6" fill={brand.grid.blueTile.hex} />
      <rect x="10.4" y="10.4" width="6.6" height="6.6" rx="1.6" fill={brand.white.hex} />
    </svg>
  );
}

/** いまのナビ: コンテンツ制作 / プロジェクト管理 / URL一覧 */
const NAV_ITEMS: { group: NavGroup; label: string; icon: React.ReactNode }[] = [
  {
    group: 'studio',
    label: 'コンテンツ制作',
    icon: (
      <svg width="17" height="17" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="2" y="2" width="14" height="14" rx="3.5" />
        <line x1="9" y1="6" x2="9" y2="12" strokeLinecap="round" />
        <line x1="6" y1="9" x2="12" y2="9" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    group: 'cases',
    label: 'プロジェクト管理',
    icon: (
      <svg width="17" height="17" viewBox="0 0 18 18" fill="currentColor">
        <rect x="1" y="1" width="6.6" height="6.6" rx="1.6" />
        <rect x="10.4" y="1" width="6.6" height="6.6" rx="1.6" />
        <rect x="1" y="10.4" width="6.6" height="6.6" rx="1.6" />
        <rect x="10.4" y="10.4" width="6.6" height="6.6" rx="1.6" />
      </svg>
    ),
  },
  {
    group: 'urls',
    label: 'URL一覧',
    icon: (
      <svg width="17" height="17" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <path d="M7.5 10.5a3.5 3.5 0 0 0 5 0l2-2a3.5 3.5 0 0 0-5-5l-1 1" />
        <path d="M10.5 7.5a3.5 3.5 0 0 0-5 0l-2 2a3.5 3.5 0 0 0 5 5l1-1" />
      </svg>
    ),
  },
];

export function Sidebar() {
  const { page, setPage } = useApp();
  const accent = tokens.accent;
  const [collapsed, setCollapsed] = useState(false);
  const [logoPulse, setLogoPulse] = useState<'absorb' | 'release' | null>(null);
  const pulseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toggleSidebar = useCallback(() => {
    if (pulseTimer.current) clearTimeout(pulseTimer.current);
    setCollapsed((prev) => {
      const next = !prev;
      setLogoPulse(next ? 'absorb' : 'release');
      pulseTimer.current = setTimeout(() => setLogoPulse(null), 520);
      return next;
    });
  }, []);

  const navStyle = (active: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 11,
    padding: '10px 11px',
    borderRadius: 9,
    fontSize: 13.5,
    cursor: 'pointer',
    fontWeight: active ? 600 : 500,
    color: active ? accent : tokens.text.muted,
    background: active ? `${accent}1f` : 'transparent',
    whiteSpace: 'nowrap',
  });

  const logoBtnClass = [
    'sidebar-logo-btn',
    logoPulse === 'absorb' ? 'sidebar-logo-btn--absorb' : '',
    logoPulse === 'release' ? 'sidebar-logo-btn--release' : '',
  ].filter(Boolean).join(' ');

  return (
    <aside
      className={`sidebar-shell ${collapsed ? 'sidebar-shell--collapsed' : 'sidebar-shell--expanded'}`}
      aria-expanded={!collapsed}
    >
      <div className={`sidebar-header ${collapsed ? 'sidebar-header--collapsed' : ''}`}>
        <button
          type="button"
          className={logoBtnClass}
          onClick={toggleSidebar}
          aria-label={collapsed ? 'サイドバーを開く' : 'サイドバーを閉じる'}
          title={collapsed ? 'サイドバーを開く' : 'サイドバーを閉じる'}
        >
          <LogoIcon />
        </button>
        <div
          className={`sidebar-suckable sidebar-header-brand ${collapsed ? 'sidebar-suckable--out' : 'sidebar-suckable--in'}`}
          style={{ lineHeight: 1.15, minWidth: 0, flex: collapsed ? undefined : 1 }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, color: tokens.text.primary }}>{L.app.name}</div>
          <div style={{ fontSize: 11, color: tokens.text.muted, fontWeight: 500 }}>{L.app.sub}</div>
        </div>
      </div>

      <div
        className={`sidebar-suckable sidebar-suckable--body ${collapsed ? 'sidebar-suckable--out' : 'sidebar-suckable--in'}`}
        style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: '0 14px 22px' }}
      >
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {NAV_ITEMS.map(({ group, label, icon }) => {
            const active = isNavActive(page, group);
            return (
              <div
                key={group}
                style={navStyle(active)}
                onClick={() => setPage(getNavTarget(group))}
              >
                <NavIcon>{icon}</NavIcon>
                {label}
              </div>
            );
          })}
        </nav>

        <div
          style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 9px', borderTop: '1px solid rgba(255,255,255,0.06)' }}
          title="デジタルサイネージ"
        >
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#1c1c1e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#d8d8dc', letterSpacing: '-0.04em' }}>DS</div>
          {!collapsed && (
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600 }}>デジタルサイネージ</div>
              <div style={{ fontSize: 11, color: tokens.text.faint }}>Smart Signage</div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
