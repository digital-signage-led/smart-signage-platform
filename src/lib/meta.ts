import type { CSSProperties } from 'react';
import { tokens } from '../tokens';
import { L } from '../i18n/labels';
import type { Plan, ProjectStatus, EquipStatus, MonStatus } from '../types';

export function statusMeta(s: ProjectStatus | MonStatus | EquipStatus | string) {
  const map: Record<string, { label: string; color: string }> = {
    ok: { label: L.status.ok, color: tokens.status.ok },
    warn: { label: L.status.warn, color: tokens.status.warn },
    down: { label: s === 'down' ? L.status.down : L.status.abnormal, color: tokens.status.down },
    new: { label: L.status.new, color: '#64D2FF' },
    off: { label: L.status.off, color: tokens.status.spare },
    fault: { label: L.status.fault, color: tokens.status.down },
    repair: { label: L.status.repair, color: tokens.status.repair },
    spare: { label: L.status.spare, color: tokens.status.spare },
  };
  return map[s] ?? { label: String(s), color: tokens.status.spare };
}

export function planMeta(p: Plan) {
  return ({ basic: L.plan.basic, standard: L.plan.standard })[p] ?? p;
}

export function optMeta(o: string) {
  const map: Record<string, { label: string; c: string }> = {
    bousai: { label: L.opt.bousai, c: '#FF9F0A' },
    jishin: { label: L.opt.jishin, c: '#FF6482' },
    message: { label: L.opt.message, c: '#64D2FF' },
    logo: { label: L.opt.logo, c: '#BF5AF2' },
    multilang: { label: L.opt.multilang, c: '#5E5CE6' },
    rain_warn: { label: L.opt.rain_warn, c: '#64D2FF' },
    flood_info: { label: L.opt.flood_info, c: '#2EAAF8' },
    landslide_info: { label: L.opt.landslide_info, c: '#A67C52' },
    surge_info: { label: L.opt.surge_info, c: '#00A8C8' },
    weather_warn: { label: L.opt.weather_warn, c: '#F2E700' },
    evac_info: { label: L.opt.evac_info, c: '#FF453B' },
    slogan: { label: L.opt.slogan, c: '#AC8E68' },
    wind_meter: { label: L.opt.wind_meter, c: '#5AC8FA' },
    nowcast: { label: L.opt.nowcast, c: '#00B0F0' },
  };
  return map[o] ?? { label: o, c: tokens.text.muted };
}

export function badgeStyle(c: string): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    height: 23,
    padding: '0 9px',
    borderRadius: 7,
    fontSize: 11.5,
    fontWeight: 600,
    letterSpacing: '0.01em',
    background: `${c}24`,
    color: c,
  };
}

export function inputStyle(hasErr: boolean): CSSProperties {
  return {
    width: '100%',
    height: 42,
    padding: '0 13px',
    borderRadius: 10,
    background: tokens.bg.s2,
    color: tokens.text.primary,
    fontFamily: 'inherit',
    fontSize: 14,
    outline: 'none',
    transition: 'border-color .14s, background .14s',
    border: `1px solid ${hasErr ? tokens.status.down : 'rgba(255,255,255,0.09)'}`,
  };
}

export const selectStyle: CSSProperties = {
  width: '100%',
  height: 42,
  padding: '0 36px 0 13px',
  borderRadius: 10,
  background: tokens.bg.s2,
  color: tokens.text.primary,
  fontFamily: 'inherit',
  fontSize: 14,
  outline: 'none',
  border: '1px solid rgba(255,255,255,0.09)',
  appearance: 'none',
  colorScheme: 'dark',
  cursor: 'pointer',
};
