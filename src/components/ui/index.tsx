import { tokens } from '../../tokens';
import { L } from '../../i18n/labels';

interface StatusBadgeProps {
  label: string;
  color: string;
}

export function StatusBadge({ label, color }: StatusBadgeProps) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        height: 24,
        padding: '0 10px',
        borderRadius: 7,
        fontSize: 12,
        fontWeight: 600,
        background: `${color}1f`,
        color,
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
      {label}
    </span>
  );
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
}

export function Button({ variant = 'primary', style, children, disabled, ...rest }: ButtonProps) {
  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 40,
    padding: '0 17px',
    borderRadius: 10,
    fontFamily: 'inherit',
    fontSize: 14,
    fontWeight: 600,
    whiteSpace: 'nowrap',
    flexShrink: 0,
    cursor: disabled ? 'not-allowed' : 'pointer',
    border: 'none',
    transition: 'filter .14s, transform .1s',
  };
  const variants: Record<string, React.CSSProperties> = {
    primary: { background: tokens.accent, color: '#fff', boxShadow: '0 1px 0 rgba(255,255,255,0.12) inset' },
    secondary: { background: 'transparent', color: tokens.text.secondary, border: '1px solid rgba(255,255,255,0.12)' },
    danger: { background: tokens.status.down, color: '#fff' },
  };
  return (
    <button
      disabled={disabled}
      style={{ ...base, ...variants[variant], opacity: disabled ? 0.5 : 1, ...style }}
      {...rest}
    >
      {children}
    </button>
  );
}

export function FilterPill({
  active,
  label,
  count,
  onClick,
  accent = tokens.accent,
}: {
  active: boolean;
  label: string;
  count?: number;
  onClick: () => void;
  accent?: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        height: 33,
        padding: '0 12px',
        borderRadius: 9,
        fontSize: 13,
        fontFamily: 'inherit',
        whiteSpace: 'nowrap',
        flexShrink: 0,
        cursor: 'pointer',
        fontWeight: active ? 600 : 500,
        border: active ? '1px solid transparent' : '1px solid rgba(255,255,255,0.1)',
        background: active ? accent : 'rgba(255,255,255,0.04)',
        color: active ? '#fff' : tokens.text.secondary,
      }}
    >
      {label}
      {count != null && (
        <span style={{ fontSize: 11, fontWeight: 600, opacity: active ? 0.8 : 1, color: active ? undefined : tokens.text.faint }}>
          {count}
        </span>
      )}
    </button>
  );
}

export function Toggle({ on, onChange, disabled, locked }: { on: boolean; onChange: () => void; disabled?: boolean; locked?: boolean }) {
  const isOn = locked ? true : on;
  return (
    <div
      onClick={disabled || locked ? undefined : onChange}
      style={{
        position: 'relative',
        width: 46,
        height: 28,
        borderRadius: 14,
        flexShrink: 0,
        cursor: disabled || locked ? 'default' : 'pointer',
        opacity: disabled && !locked ? 0.4 : 1,
        background: isOn ? tokens.accent : 'rgba(255,255,255,0.16)',
        transition: 'background .18s',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 3,
          left: 3,
          width: 22,
          height: 22,
          borderRadius: '50%',
          background: '#fff',
          transform: `translateX(${isOn ? 18 : 0}px)`,
          transition: 'transform .18s',
          boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
        }}
      />
    </div>
  );
}

/** 周数入力 — 丸みのある横並び [−] [値] [+] */
export function LapStepper({
  value,
  min,
  max,
  unit,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (n: number) => void;
}) {
  const n = Math.max(min, Math.min(max, value));
  const h = 30;
  const radius = 8;

  const stepBtnStyle = (disabled: boolean): React.CSSProperties => ({
    width: h,
    height: h,
    borderRadius: radius,
    border: 'none',
    padding: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: disabled ? 'default' : 'pointer',
    background: disabled ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.2)',
    color: '#fff',
    opacity: disabled ? 0.38 : 1,
    flexShrink: 0,
    fontFamily: 'inherit',
    transition: 'filter .14s',
  });

  return (
    <div style={{ display: 'inline-flex', alignItems: 'stretch', gap: 4, justifyContent: 'center' }}>
      <button
        type="button"
        disabled={n <= min}
        onClick={() => onChange(n - 1)}
        aria-label="decrease"
        style={stepBtnStyle(n <= min)}
      >
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden>
          <path d="M3.5 7h7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </button>
      <div
        style={{
          minWidth: 46,
          height: h,
          padding: '0 8px',
          borderRadius: radius,
          background: '#2C2C2E',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          boxSizing: 'border-box',
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 700, color: '#fff', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{n}</span>
        <span style={{ fontSize: 10, fontWeight: 600, color: tokens.text.muted, lineHeight: 1 }}>{unit}</span>
      </div>
      <button
        type="button"
        disabled={n >= max}
        onClick={() => onChange(n + 1)}
        aria-label="increase"
        style={stepBtnStyle(n >= max)}
      >
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden>
          <path d="M7 3.5v7M3.5 7h7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

export function Segmented({
  options,
  value,
  onChange,
  accent = tokens.accent,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  accent?: string;
}) {
  return (
    <div style={{ display: 'flex', gap: 4, background: tokens.bg.s2, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 11, padding: 4 }}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          style={{
            flex: 1,
            height: 38,
            border: 'none',
            borderRadius: 8,
            fontFamily: 'inherit',
            fontSize: 13.5,
            whiteSpace: 'nowrap',
            cursor: 'pointer',
            background: value === o.value ? accent : 'transparent',
            color: value === o.value ? '#fff' : tokens.text.tertiary,
            fontWeight: value === o.value ? 600 : 500,
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Drawer({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)', zIndex: 40 }}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: 'min(420px, 92vw)',
          height: '100%',
          background: tokens.bg.s1,
          borderLeft: `1px solid ${tokens.border}`,
          zIndex: 41,
          overflowY: 'auto',
          padding: '20px 22px',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.35)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, gap: 12 }}>
          {title ? <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{title}</h2> : <span />}
          <button
            type="button"
            onClick={onClose}
            aria-label="close"
            style={{
              width: 34,
              height: 34,
              borderRadius: 9,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.06)',
              color: tokens.text.secondary,
              cursor: 'pointer',
              fontSize: 18,
              lineHeight: 1,
              flexShrink: 0,
            }}
          >
            {'\u00d7'}
          </button>
        </div>
        {children}
      </div>
    </>
  );
}

export function Modal({
  open,
  title,
  message,
  confirmLabel,
  danger,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <>
      <div onClick={onCancel} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 50 }} />
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%,-50%)',
          width: 'min(440px, 92vw)',
          background: tokens.bg.s1,
          borderRadius: 16,
          border: `1px solid ${tokens.border}`,
          padding: '24px 26px',
          zIndex: 51,
        }}
      >
        <h3 style={{ margin: '0 0 10px', fontSize: 17, fontWeight: 700 }}>{title}</h3>
        <p style={{ margin: '0 0 22px', fontSize: 14, color: tokens.text.secondary, lineHeight: 1.65 }}>{message}</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Button variant="secondary" onClick={onCancel}>{L.common.cancel}</Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </>
  );
}

export function Toast({ show, message }: { show: boolean; message: string }) {
  if (!show) return null;
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 84,
        left: '50%',
        transform: 'translateX(-50%)',
        background: '#2c2c2e',
        color: tokens.text.primary,
        fontSize: 13.5,
        fontWeight: 500,
        padding: '12px 20px',
        borderRadius: 11,
        boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
        border: '1px solid rgba(255,255,255,0.1)',
        zIndex: 60,
        animation: 'toastUp .25s ease',
      }}
    >
      {message}
    </div>
  );
}
