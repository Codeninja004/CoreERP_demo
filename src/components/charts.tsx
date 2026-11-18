import React from 'react';
import { inr, inrCompact } from '../lib/format';

export const C = {
  primary: '#3478D4', primaryLight: '#B6D2F3', expense: '#E08A3C', profit: '#2E9E6B', red: '#D9534F', grid: '#EEF0F3', axis: '#8C9199',
};
// Categorical palette (ordered for adjacent contrast)
export const PALETTE = ['#3478D4', '#2BA8A0', '#E08A3C', '#8B6FD6', '#D6587A', '#5E6B7D', '#8DB84A', '#C9A227', '#4FB0E0'];

export const axisProps = { tick: { fill: C.axis, fontSize: 11 }, tickLine: false, axisLine: false } as const;
export const gridProps = { stroke: C.grid, vertical: false } as const;

export function ChartTooltip({ active, payload, label, money = true, unit = '' }: { active?: boolean; payload?: any[]; label?: string; money?: boolean; unit?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2 text-xs shadow-pop">
      {label && <p className="mb-1.5 font-semibold text-ink-800">{label}</p>}
      {payload.map((p: any) => (
        <div key={p.dataKey ?? p.name} className="flex items-center justify-between gap-6 py-0.5">
          <span className="flex items-center gap-1.5 text-ink-500"><span className="h-2 w-2 rounded-full" style={{ background: p.color || p.payload?.fill }} />{p.name}</span>
          <span className="font-semibold text-ink-900 tnum">{money ? inr(p.value) : `${Number(p.value).toLocaleString('en-IN')}${unit}`}</span>
        </div>
      ))}
    </div>
  );
}
export const moneyTick = (v: number) => inrCompact(v).replace('.00', '');

export function Legend({ items }: { items: { label: string; color: string; value?: React.ReactNode }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5 text-xs text-ink-600"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: i.color }} />{i.label}{i.value != null && <span className="font-semibold text-ink-800">{i.value}</span>}</span>
      ))}
    </div>
  );
}
