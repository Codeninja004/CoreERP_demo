// Formatting + date helpers. All dates are stored as local 'YYYY-MM-DD' strings.

export const inr = (n: number, decimals = 0) =>
  '₹' + (Number.isFinite(n) ? n : 0).toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

export const inrCompact = (n: number) => {
  const a = Math.abs(n);
  const s = n < 0 ? '-' : '';
  if (a >= 1e7) return `${s}₹${(a / 1e7).toFixed(2)} Cr`;
  if (a >= 1e5) return `${s}₹${(a / 1e5).toFixed(2)} L`;
  if (a >= 1e3) return `${s}₹${(a / 1e3).toFixed(1)}K`;
  return `${s}₹${Math.round(a)}`;
};

export const num = (n: number, d = 0) => n.toLocaleString('en-IN', { maximumFractionDigits: d });

const pad = (n: number) => String(n).padStart(2, '0');
export const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseISO = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const todayISO = () => toISO(new Date());
export const addDays = (s: string, n: number) => { const d = parseISO(s); d.setDate(d.getDate() + n); return toISO(d); };
export const diffDays = (a: string, b: string) => Math.round((parseISO(a).getTime() - parseISO(b).getTime()) / 86400000);
export const startOfMonth = (s: string) => s.slice(0, 8) + '01';
export const endOfMonth = (s: string) => { const d = parseISO(s); return toISO(new Date(d.getFullYear(), d.getMonth() + 1, 0)); };
export const addMonths = (s: string, n: number) => { const d = parseISO(s); return toISO(new Date(d.getFullYear(), d.getMonth() + n, 1)); };
export const monthKey = (s: string) => s.slice(0, 7);
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const monthLabel = (key: string, withYear = false) => { const [y, m] = key.split('-').map(Number); return MONTHS[m - 1] + (withYear ? ` ${String(y).slice(2)}` : ''); };
export const monthLong = (key: string) => { const [y, m] = key.split('-').map(Number); return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }); };
export const fmtDate = (s?: string) => { if (!s) return '—'; const d = parseISO(s); return `${pad(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };
export const fmtShort = (s: string) => { const d = parseISO(s); return `${pad(d.getDate())} ${MONTHS[d.getMonth()]}`; };
export const weekday = (s: string) => parseISO(s).toLocaleDateString('en-IN', { weekday: 'long' });
export const isSunday = (s: string) => parseISO(s).getDay() === 0;
export const inRange = (s: string, from?: string, to?: string) => (!from || s >= from) && (!to || s <= to);

export const relTime = (iso: string) => {
  const t = new Date(iso).getTime();
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d ago`;
  return fmtDate(toISO(new Date(t)));
};

// ---------- Date range presets ----------
export type RangePreset = 'all' | 'week' | 'month' | 'lastMonth' | 'quarter' | 'last90' | 'fy' | 'custom';
export interface DateRange { preset: RangePreset; from?: string; to?: string }
export const PRESET_LABEL: Record<RangePreset, string> = {
  all: 'All time', week: 'This Week', month: 'This Month', lastMonth: 'Last Month', quarter: 'This Quarter',
  last90: 'Last 90 Days', fy: 'This FY', custom: 'Custom Range',
};
export const resolveRange = (r: DateRange): { from?: string; to?: string } => {
  const t = todayISO();
  const d = parseISO(t);
  switch (r.preset) {
    case 'all': return {};
    case 'week': { const dow = (d.getDay() + 6) % 7; return { from: addDays(t, -dow), to: t }; }
    case 'month': return { from: startOfMonth(t), to: t };
    case 'lastMonth': { const s = addMonths(t, -1); return { from: s, to: endOfMonth(s) }; }
    case 'quarter': { const q = Math.floor(d.getMonth() / 3) * 3; return { from: toISO(new Date(d.getFullYear(), q, 1)), to: t }; }
    case 'last90': return { from: addDays(t, -89), to: t };
    case 'fy': { const y = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1; return { from: `${y}-04-01`, to: t }; }
    case 'custom': return { from: r.from, to: r.to };
  }
};
export const previousRange = (from?: string, to?: string) => {
  if (!from || !to) return {};
  const len = diffDays(to, from) + 1;
  return { from: addDays(from, -len), to: addDays(from, -1) };
};
export const rangeText = (r: DateRange) => {
  const { from, to } = resolveRange(r);
  if (!from && !to) return 'All time';
  return `${fmtShort(from || to!)} – ${fmtShort(to || from!)}`;
};

// ---------- Amount in words (Indian system) ----------
const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
const two = (n: number) => (n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : ''));
const three = (n: number) => (n >= 100 ? ONES[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + two(n % 100) : '') : two(n));
export const amountInWords = (amount: number) => {
  let n = Math.round(amount);
  if (n === 0) return 'Rupees Zero Only';
  const parts: string[] = [];
  const cr = Math.floor(n / 1e7); n %= 1e7;
  const lk = Math.floor(n / 1e5); n %= 1e5;
  const th = Math.floor(n / 1e3); n %= 1e3;
  if (cr) parts.push(three(cr) + ' Crore');
  if (lk) parts.push(two(lk) + ' Lakh');
  if (th) parts.push(two(th) + ' Thousand');
  if (n) parts.push(three(n));
  return 'Rupees ' + parts.join(' ') + ' Only';
};

export const initials = (name: string) => name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

export const toCSV = (headers: string[], rows: (string | number)[][]) =>
  [headers, ...rows].map((r) => r.map((c) => { const s = String(c ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }).join(',')).join('\n');
