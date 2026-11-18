import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, ArrowDown, ArrowUp, ArrowUpDown, Calendar, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Copy, Download, Info, Inbox, MoreHorizontal, Search, TrendingDown, TrendingUp, X, XCircle } from 'lucide-react';
import { DateRange, PRESET_LABEL, RangePreset, todayISO, addDays } from '../lib/format';

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

// ---------------- Button ----------------
type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'subtle';
export function Button({ variant = 'secondary', size = 'md', icon: Icon, children, className, ...rest }:
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: 'sm' | 'md'; icon?: React.ElementType }) {
  const v: Record<BtnVariant, string> = {
    primary: 'bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700 shadow-sm',
    secondary: 'bg-white text-ink-800 border border-line hover:bg-surface hover:border-ink-200 shadow-[0_1px_1px_rgba(16,24,40,0.03)]',
    ghost: 'text-ink-600 hover:bg-surface hover:text-ink-900',
    subtle: 'bg-primary-50 text-primary-700 hover:bg-primary-100',
    danger: 'bg-white text-red-600 border border-red-200 hover:bg-red-50',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm',
  };
  const s = size === 'sm' ? 'h-8 px-2.5 text-[13px] gap-1.5' : 'h-9 px-3.5 text-sm gap-2';
  return (
    <button {...rest} className={cx('inline-flex items-center justify-center rounded-lg font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-200', v[variant], s, className)}>
      {Icon && <Icon className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} strokeWidth={2} />}
      {children}
    </button>
  );
}
export function IconButton({ icon: Icon, label, className, badge, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { icon: React.ElementType; label: string; badge?: number }) {
  return (
    <button aria-label={label} title={label} {...rest} className={cx('relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 hover:bg-surface hover:text-ink-900 transition-colors', className)}>
      <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
      {!!badge && <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white ring-2 ring-white">{badge > 9 ? '9+' : badge}</span>}
    </button>
  );
}

// ---------------- Card ----------------
export function Card({ children, className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...rest} className={cx('rounded-xl border border-line bg-white shadow-card', className)}>{children}</div>;
}
export function CardHeader({ title, subtitle, actions, className }: { title: React.ReactNode; subtitle?: React.ReactNode; actions?: React.ReactNode; className?: string }) {
  return (
    <div className={cx('flex items-start justify-between gap-3 px-5 pt-4 pb-3', className)}>
      <div className="min-w-0">
        <h3 className="text-[14px] font-semibold text-ink-900">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-ink-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

// ---------------- Badge ----------------
type Tone = 'green' | 'amber' | 'red' | 'blue' | 'gray' | 'violet';
const TONES: Record<Tone, string> = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15',
  amber: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  red: 'bg-red-50 text-red-700 ring-red-600/15',
  blue: 'bg-primary-50 text-primary-700 ring-primary-600/15',
  gray: 'bg-gray-100 text-ink-600 ring-gray-500/15',
  violet: 'bg-violet-50 text-violet-700 ring-violet-600/15',
};
const DOT: Record<Tone, string> = { green: 'bg-emerald-500', amber: 'bg-amber-500', red: 'bg-red-500', blue: 'bg-primary-500', gray: 'bg-ink-400', violet: 'bg-violet-500' };
export function Badge({ tone = 'gray', children, dot = true }: { tone?: Tone; children: React.ReactNode; dot?: boolean }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap', TONES[tone])}>
      {dot && <span className={cx('h-1.5 w-1.5 rounded-full', DOT[tone])} />}{children}
    </span>
  );
}
const STATUS_TONE: Record<string, Tone> = {
  Paid: 'green', Pending: 'amber', Overdue: 'red', Draft: 'gray', 'In Stock': 'green', 'Low Stock': 'amber', 'Out of Stock': 'red',
  Active: 'green', 'On Leave': 'blue', Probation: 'violet', Inactive: 'gray', Approved: 'green', Rejected: 'red',
  Inward: 'green', Outward: 'blue', Adjustment: 'violet',
};
export const StatusBadge = ({ status }: { status: string }) => <Badge tone={STATUS_TONE[status] || 'gray'}>{status}</Badge>;

// ---------------- KPI ----------------
export function KpiCard({ label, value, icon: Icon, delta, deltaLabel, hint, tone = 'blue', invertDelta, onClick }:
  { label: string; value: React.ReactNode; icon: React.ElementType; delta?: number | null; deltaLabel?: string; hint?: React.ReactNode; tone?: 'blue' | 'green' | 'amber' | 'red' | 'violet' | 'gray'; invertDelta?: boolean; onClick?: () => void }) {
  const toneBg = { blue: 'bg-primary-50 text-primary-600', green: 'bg-emerald-50 text-emerald-600', amber: 'bg-amber-50 text-amber-600', red: 'bg-red-50 text-red-600', violet: 'bg-violet-50 text-violet-600', gray: 'bg-gray-100 text-ink-600' }[tone];
  const good = delta != null && (invertDelta ? delta <= 0 : delta >= 0);
  return (
    <Card className={cx('p-5', onClick && 'cursor-pointer transition hover:border-primary-200')} onClick={onClick}>
      <div className="flex items-start justify-between">
        <p className="text-[13px] font-medium text-ink-500">{label}</p>
        <span className={cx('flex h-8 w-8 items-center justify-center rounded-lg', toneBg)}><Icon className="h-4 w-4" strokeWidth={2} /></span>
      </div>
      <p className="mt-2 text-[26px] font-semibold leading-tight tracking-tight text-ink-900 tnum">{value}</p>
      <div className="mt-2 flex items-center gap-2 text-xs">
        {delta != null && Number.isFinite(delta) && (
          <span className={cx('inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-medium', good ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700')}>
            {delta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}{Math.abs(delta).toFixed(1)}%
          </span>
        )}
        {(deltaLabel || hint) && <span className="text-ink-500 truncate">{deltaLabel || hint}</span>}
      </div>
    </Card>
  );
}
export function MiniStat({ label, value, icon: Icon, sub, onClick }: { label: string; value: React.ReactNode; icon: React.ElementType; sub?: React.ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 rounded-xl border border-line bg-white px-4 py-3 text-left shadow-card transition hover:border-primary-200">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface text-ink-600"><Icon className="h-4 w-4" strokeWidth={1.9} /></span>
      <span className="min-w-0">
        <span className="block text-xs text-ink-500">{label}</span>
        <span className="flex items-baseline gap-2"><span className="text-lg font-semibold text-ink-900 tnum">{value}</span>{sub && <span className="truncate text-xs text-ink-400">{sub}</span>}</span>
      </span>
    </button>
  );
}

// ---------------- Page header ----------------
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-ink-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

// ---------------- Form fields ----------------
export function Field({ label, error, hint, required, children, className }: { label: string; error?: string; hint?: string; required?: boolean; children: React.ReactNode; className?: string }) {
  return (
    <label className={cx('block', className)}>
      <span className="mb-1.5 block text-[13px] font-medium text-ink-700">{label}{required && <span className="text-red-500"> *</span>}</span>
      {children}
      {error ? <span className="mt-1 flex items-center gap-1 text-xs text-red-600"><AlertCircle className="h-3 w-3" />{error}</span> : hint ? <span className="mt-1 block text-xs text-ink-400">{hint}</span> : null}
    </label>
  );
}
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(({ invalid, className, ...rest }, ref) =>
  <input ref={ref} {...rest} className={cx('input', invalid && 'input-error', className)} />);
export function Select({ invalid, className, children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <div className="relative">
      <select {...rest} className={cx('input appearance-none pr-8 cursor-pointer', invalid && 'input-error', className)}>{children}</select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
    </div>
  );
}
export function Textarea({ invalid, className, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return <textarea {...rest} className={cx('input h-auto min-h-[76px] py-2', invalid && 'input-error', className)} />;
}
export function SearchInput({ value, onChange, placeholder = 'Search…', className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  return (
    <div className={cx('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="input pl-9 pr-8" />
      {value && <button onClick={() => onChange('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-ink-400 hover:text-ink-700"><X className="h-3.5 w-3.5" /></button>}
    </div>
  );
}
export function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  return (
    <div className="flex items-start justify-between gap-6 py-3">
      <div><p className="text-sm font-medium text-ink-800">{label}</p>{description && <p className="text-xs text-ink-500 mt-0.5">{description}</p>}</div>
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={cx('relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors', checked ? 'bg-primary-500' : 'bg-ink-200')}>
        <span className={cx('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-[18px]' : 'translate-x-0.5')} />
      </button>
    </div>
  );
}

// ---------------- Segmented / Tabs ----------------
export function Segmented<T extends string>({ value, onChange, options, size = 'md' }: { value: T; onChange: (v: T) => void; options: { value: T; label: React.ReactNode }[]; size?: 'sm' | 'md' }) {
  return (
    <div className="inline-flex max-w-full overflow-x-auto rounded-lg border border-line bg-surface p-0.5">
      {options.map((o) => (
        <button key={o.value} onClick={() => onChange(o.value)} className={cx('rounded-md font-medium transition-colors whitespace-nowrap', size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-[13px]', value === o.value ? 'bg-white text-ink-900 shadow-sm ring-1 ring-line' : 'text-ink-500 hover:text-ink-800')}>{o.label}</button>
      ))}
    </div>
  );
}
export function Tabs<T extends string>({ value, onChange, tabs }: { value: T; onChange: (v: T) => void; tabs: { value: T; label: string; count?: number; icon?: React.ElementType }[] }) {
  return (
    <div className="mb-4 flex gap-1 overflow-x-auto border-b border-line">
      {tabs.map((t) => (
        <button key={t.value} onClick={() => onChange(t.value)} className={cx('-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-3 pb-2.5 pt-1 text-sm font-medium transition-colors', value === t.value ? 'border-primary-500 text-primary-700' : 'border-transparent text-ink-500 hover:text-ink-800')}>
          {t.icon && <t.icon className="h-4 w-4" />}{t.label}
          {t.count != null && <span className={cx('rounded-full px-1.5 text-[11px] font-semibold', value === t.value ? 'bg-primary-50 text-primary-700' : 'bg-gray-100 text-ink-500')}>{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

// ---------------- Date range filter ----------------
export function DateRangeFilter({ value, onChange, presets = ['week', 'month', 'lastMonth', 'custom'], compact }: { value: DateRange; onChange: (r: DateRange) => void; presets?: RangePreset[]; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(value.from || addDays(todayISO(), -30));
  const [to, setTo] = useState(value.to || todayISO());
  const anchor = useRef<HTMLDivElement>(null);
  const err = from > to ? 'Start date must be before end date' : '';
  const choose = (p: RangePreset) => { if (p === 'custom') setOpen(true); else { setOpen(false); onChange({ preset: p }); } };
  return (
    <div className="relative flex items-center gap-2" ref={anchor}>
      {compact ? (
        <Select value={value.preset} onChange={(e) => choose(e.target.value as RangePreset)} className="w-[150px]">
          {presets.map((p) => <option key={p} value={p}>{PRESET_LABEL[p]}</option>)}
        </Select>
      ) : (
        <Segmented value={value.preset} onChange={choose} options={presets.map((p) => ({ value: p, label: p === 'custom' ? <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{value.preset === 'custom' && value.from ? `${value.from.slice(5).split('-').reverse().join('/')} – ${value.to?.slice(5).split('-').reverse().join('/')}` : 'Custom'}</span> : PRESET_LABEL[p] }))} />
      )}
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="pop-in absolute right-0 top-full z-40 mt-2 w-[300px] rounded-xl border border-line bg-white p-4 shadow-pop">
            <p className="mb-3 text-sm font-semibold">Custom range</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="From"><Input type="date" value={from} max={todayISO()} onChange={(e) => setFrom(e.target.value)} /></Field>
              <Field label="To"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
            </div>
            {err && <p className="mt-2 text-xs text-red-600">{err}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button size="sm" variant="primary" disabled={!!err || !from || !to} onClick={() => { onChange({ preset: 'custom', from, to }); setOpen(false); }}>Apply</Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ---------------- Modal ----------------
export function Modal({ open, onClose, title, subtitle, children, footer, size = 'md', icon: Icon }:
  { open: boolean; onClose: () => void; title: React.ReactNode; subtitle?: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl'; icon?: React.ElementType }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  const w = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' }[size];
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-900/40 p-4 sm:p-8 fade-in" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={cx('pop-in my-auto w-full rounded-2xl bg-white shadow-pop', w)}>
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
          <div className="flex items-start gap-3">
            {Icon && <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 text-primary-600"><Icon className="h-4 w-4" /></span>}
            <div><h2 className="text-base font-semibold text-ink-900">{title}</h2>{subtitle && <p className="mt-0.5 text-[13px] text-ink-500">{subtitle}</p>}</div>
          </div>
          <IconButton icon={X} label="Close" onClick={onClose} className="-mr-2 -mt-1" />
        </div>
        <div className="max-h-[calc(100vh-220px)] overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex flex-wrap items-center justify-end gap-2 rounded-b-2xl border-t border-line bg-surface/60 px-6 py-3.5">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
export function ConfirmModal({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', tone = 'primary', children }:
  { open: boolean; onClose: () => void; onConfirm: () => void; title: string; message: React.ReactNode; confirmLabel?: string; tone?: 'primary' | 'danger' | 'success'; children?: React.ReactNode }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm" footer={<>
      <Button variant="ghost" onClick={onClose}>Cancel</Button>
      <Button variant={tone === 'danger' ? 'danger' : tone === 'success' ? 'success' : 'primary'} onClick={onConfirm}>{confirmLabel}</Button>
    </>}>
      <div className="text-sm text-ink-600">{message}</div>
      {children}
    </Modal>
  );
}

// ---------------- Dropdown menu (fixed position so tables don't clip it) ----------------
export interface MenuItem { label: string; icon?: React.ElementType; onClick: () => void; danger?: boolean; disabled?: boolean; divider?: boolean }
export function Menu({ items, trigger, align = 'right', width = 200 }: { items: MenuItem[]; trigger?: (open: () => void) => React.ReactNode; align?: 'left' | 'right'; width?: number }) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const ref = useRef<HTMLSpanElement>(null);
  const open = () => {
    const r = ref.current!.getBoundingClientRect();
    const h = items.length * 36 + 12;
    const top = r.bottom + h + 8 > window.innerHeight ? r.top - h - 4 : r.bottom + 4;
    setPos({ top, left: align === 'right' ? r.right - width : r.left });
  };
  useEffect(() => {
    if (!pos) return;
    const close = () => setPos(null);
    window.addEventListener('scroll', close, true); window.addEventListener('resize', close);
    return () => { window.removeEventListener('scroll', close, true); window.removeEventListener('resize', close); };
  }, [pos]);
  return (
    <>
      <span ref={ref} className="inline-flex" onClick={(e) => e.stopPropagation()}>
        {trigger ? trigger(open) : <IconButton icon={MoreHorizontal} label="Actions" onClick={open} className="h-8 w-8" />}
      </span>
      {pos && createPortal(
        <div className="fixed inset-0 z-[60]" onMouseDown={() => setPos(null)}>
          <div className="pop-in fixed rounded-xl border border-line bg-white p-1 shadow-pop" style={{ top: pos.top, left: Math.max(8, pos.left), width }} onMouseDown={(e) => e.stopPropagation()}>
            {items.map((it, i) => (
              <React.Fragment key={i}>
                {it.divider && <div className="my-1 h-px bg-line" />}
                <button disabled={it.disabled} onClick={() => { setPos(null); it.onClick(); }} className={cx('flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors disabled:opacity-40 disabled:pointer-events-none', it.danger ? 'text-red-600 hover:bg-red-50' : 'text-ink-700 hover:bg-surface')}>
                  {it.icon && <it.icon className="h-4 w-4 opacity-70" />}{it.label}
                </button>
              </React.Fragment>
            ))}
          </div>
        </div>, document.body)}
    </>
  );
}

// ---------------- Empty state ----------------
export function EmptyState({ icon: Icon = Inbox, title, message, action }: { icon?: React.ElementType; title: string; message?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface text-ink-400 ring-1 ring-line"><Icon className="h-5 w-5" /></span>
      <p className="mt-3 text-sm font-semibold text-ink-800">{title}</p>
      {message && <p className="mt-1 max-w-sm text-[13px] text-ink-500">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ---------------- Data table ----------------
export interface Column<T> { key: string; header: React.ReactNode; render: (row: T) => React.ReactNode; sort?: (row: T) => string | number; align?: 'left' | 'right' | 'center'; className?: string; width?: string }
export function DataTable<T>({ columns, rows, rowKey, onRowClick, pageSize = 10, empty, defaultSort, footer, dense }:
  { columns: Column<T>[]; rows: T[]; rowKey: (r: T) => string; onRowClick?: (r: T) => void; pageSize?: number; empty?: React.ReactNode; defaultSort?: { key: string; dir: 'asc' | 'desc' }; footer?: React.ReactNode; dense?: boolean }) {
  const [sort, setSort] = useState(defaultSort);
  const [page, setPage] = useState(0);
  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sort) return rows;
    const f = col.sort;
    return [...rows].sort((a, b) => { const x = f(a), y = f(b); const r = x < y ? -1 : x > y ? 1 : 0; return sort.dir === 'asc' ? r : -r; });
  }, [rows, sort, columns]);
  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  useEffect(() => { if (page > pages - 1) setPage(0); }, [pages, page]);
  useEffect(() => setPage(0), [rows.length]);
  const slice = sorted.slice(page * pageSize, page * pageSize + pageSize);
  const toggle = (c: Column<T>) => { if (!c.sort) return; setSort((s) => (s?.key === c.key ? { key: c.key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key: c.key, dir: 'desc' })); };
  const al = (a?: string) => (a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left');
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-y border-line bg-surface/70">
              {columns.map((c) => (
                <th key={c.key} className={cx('th', al(c.align), c.sort && 'cursor-pointer select-none hover:text-ink-800', c.width)} onClick={() => toggle(c)}>
                  <span className={cx('inline-flex items-center gap-1', c.align === 'right' && 'flex-row-reverse')}>
                    {c.header}
                    {c.sort && (sort?.key === c.key ? (sort.dir === 'asc' ? <ArrowUp className="h-3 w-3 text-primary-600" /> : <ArrowDown className="h-3 w-3 text-primary-600" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.map((r) => (
              <tr key={rowKey(r)} onClick={() => onRowClick?.(r)} className={cx('border-b border-line/80 last:border-0 transition-colors', onRowClick && 'cursor-pointer hover:bg-primary-50/40')}>
                {columns.map((c) => <td key={c.key} className={cx('td', dense && 'py-2', al(c.align), c.className)}>{c.render(r)}</td>)}
              </tr>
            ))}
          </tbody>
          {footer}
        </table>
      </div>
      {rows.length === 0 && (empty || <EmptyState title="No records found" message="Try adjusting your search or filters." />)}
      {rows.length > pageSize && (
        <div className="flex items-center justify-between border-t border-line px-4 py-2.5 text-xs text-ink-500">
          <span>Showing <b className="text-ink-700">{page * pageSize + 1}–{Math.min(sorted.length, (page + 1) * pageSize)}</b> of <b className="text-ink-700">{sorted.length}</b></span>
          <div className="flex items-center gap-1">
            <IconButton icon={ChevronLeft} label="Previous" className="h-7 w-7" disabled={page === 0} onClick={() => setPage(page - 1)} />
            <span className="px-2">Page {page + 1} of {pages}</span>
            <IconButton icon={ChevronRight} label="Next" className="h-7 w-7" disabled={page >= pages - 1} onClick={() => setPage(page + 1)} />
          </div>
        </div>
      )}
    </div>
  );
}

export function FilterBar({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2 px-4 py-3"><div className="flex flex-1 flex-wrap items-center gap-2">{children}</div>{right && <div className="flex items-center gap-2">{right}</div>}</div>;
}

export function Avatar({ name, size = 32, tone }: { name: string; size?: number; tone?: number }) {
  const palette = ['bg-primary-100 text-primary-700', 'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-800', 'bg-violet-100 text-violet-700', 'bg-rose-100 text-rose-700', 'bg-cyan-100 text-cyan-800'];
  const idx = tone ?? [...name].reduce((s, c) => s + c.charCodeAt(0), 0) % palette.length;
  return <span className={cx('inline-flex shrink-0 items-center justify-center rounded-full font-semibold', palette[idx])} style={{ width: size, height: size, fontSize: size * 0.38 }}>{name.split(' ').slice(0, 2).map((w) => w[0]).join('')}</span>;
}

export function ProgressBar({ value, tone = 'bg-primary-500' }: { value: number; tone?: string }) {
  return <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100"><div className={cx('h-full rounded-full', tone)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>;
}

export function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex items-start justify-between gap-4 py-2 text-sm"><span className="text-ink-500">{label}</span><span className="text-right font-medium text-ink-800">{children}</span></div>;
}

// ---------------- Toasts ----------------
type ToastKind = 'success' | 'error' | 'info';
interface ToastT { id: number; kind: ToastKind; title: string; message?: string }
const ToastCtx = createContext<(kind: ToastKind, title: string, message?: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [list, setList] = useState<ToastT[]>([]);
  const push = useCallback((kind: ToastKind, title: string, message?: string) => {
    const id = Date.now() + Math.random();
    setList((l) => [...l.slice(-3), { id, kind, title, message }]);
    setTimeout(() => setList((l) => l.filter((t) => t.id !== id)), 3800);
  }, []);
  const Icon = { success: CheckCircle2, error: XCircle, info: Info };
  const col = { success: 'text-emerald-600', error: 'text-red-600', info: 'text-primary-600' };
  return (
    <ToastCtx.Provider value={push}>
      {children}
      {createPortal(
        <div className="no-print pointer-events-none fixed bottom-5 right-5 z-[70] flex w-[360px] max-w-[calc(100vw-40px)] flex-col gap-2">
          {list.map((t) => { const I = Icon[t.kind]; return (
            <div key={t.id} className="toast-in pointer-events-auto flex items-start gap-3 rounded-xl border border-line bg-white p-3.5 shadow-pop">
              <I className={cx('mt-0.5 h-5 w-5 shrink-0', col[t.kind])} />
              <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-ink-900">{t.title}</p>{t.message && <p className="mt-0.5 text-[13px] text-ink-500">{t.message}</p>}</div>
              <button onClick={() => setList((l) => l.filter((x) => x.id !== t.id))} className="text-ink-400 hover:text-ink-700"><X className="h-4 w-4" /></button>
            </div>); })}
        </div>, document.body)}
    </ToastCtx.Provider>
  );
}

// ---------------- CSV export dialog (downloads may be blocked inside sandboxed previews) ----------------
const ExportCtx = createContext<(filename: string, csv: string) => void>(() => {});
export const useExport = () => useContext(ExportCtx);
export function ExportProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ filename: string; csv: string } | null>(null);
  const toast = useToast();
  const download = async () => {
    if (!state) return;
    const w = window as unknown as { claude?: { use: (n: string) => Promise<any> } };
    try {
      const dl = w.claude ? await w.claude.use('downloads') : null;
      if (dl) {
        await dl.save({ filename: state.filename, data: '\ufeff' + state.csv });
        toast('success', 'CSV saved', state.filename);
        return;
      }
    } catch (e: any) {
      if (e?.code === 'declined') return;
      if (e?.code === 'rate_limited') { toast('info', 'A save prompt is already open'); return; }
    }
    try {
      const url = URL.createObjectURL(new Blob(['\ufeff' + state.csv], { type: 'text/csv;charset=utf-8' }));
      const a = document.createElement('a'); a.href = url; a.download = state.filename; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      toast('info', 'Download requested', 'If nothing downloads, use “Copy CSV” and paste into Excel or Google Sheets.');
    } catch { toast('error', 'Download blocked', 'Use “Copy CSV” and paste into Excel or Google Sheets.'); }
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(state!.csv); toast('success', 'CSV copied to clipboard', 'Paste directly into Excel or Google Sheets.'); }
    catch { toast('error', 'Clipboard unavailable', 'Select the preview text and copy manually.'); }
  };
  const lines = state?.csv.split('\n') || [];
  return (
    <ExportCtx.Provider value={(filename, csv) => setState({ filename, csv })}>
      {children}
      <Modal open={!!state} onClose={() => setState(null)} title="Export to CSV" subtitle={`${state?.filename} · ${Math.max(0, lines.length - 1)} rows`} icon={Download} size="lg"
        footer={<><Button variant="ghost" onClick={() => setState(null)}>Close</Button><Button icon={Copy} onClick={copy}>Copy CSV</Button><Button variant="primary" icon={Download} onClick={download}>Download .csv</Button></>}>
        <p className="mb-3 text-[13px] text-ink-500">Preview of the exported file. If your browser blocks the download in this preview, copy the CSV instead.</p>
        <pre className="max-h-[340px] overflow-auto rounded-lg border border-line bg-surface p-3 text-xs leading-5 text-ink-700">{lines.slice(0, 40).join('\n')}{lines.length > 40 ? `\n… ${lines.length - 40} more rows` : ''}</pre>
      </Modal>
    </ExportCtx.Provider>
  );
}

export function usePrint() {
  const toast = useToast();
  return () => {
    try { window.print(); } catch { /* ignore */ }
    toast('info', 'Print layout ready', 'If no dialog appears, press Ctrl/⌘ + P. Choose “Save as PDF” to download.');
  };
}

export function useLockScroll(lock: boolean) {
  useLayoutEffect(() => { if (!lock) return; const o = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = o; }; }, [lock]);
}
