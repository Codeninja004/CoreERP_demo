import React, { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3, Boxes, Download, FileSpreadsheet, Printer, Users } from 'lucide-react';
import { useStore, invoiceStatus, invoiceTotal, lineTotals, payrollBreakup, stockStatus } from '../lib/store';
import type { AppData } from '../lib/types';
import { Button, Card, DataTable, DateRangeFilter, EmptyState, PageHeader, Select, StatusBadge, cx, useExport, usePrint, Column } from '../components/ui';
import { C, ChartTooltip, Legend, PALETTE, axisProps, gridProps, moneyTick } from '../components/charts';
import { addDays, DateRange, diffDays, fmtDate, inr, inrCompact, inRange, isSunday, monthKey, monthLabel, num, rangeText, resolveRange, todayISO, toCSV } from '../lib/format';
import { CATEGORIES, DEPARTMENTS, EXPENSE_CATEGORIES } from '../lib/seed';

type Row = Record<string, string | number>;
interface Out { kpis: [string, string][]; chart: React.ReactNode; cols: { key: string; label: string; money?: boolean; num?: boolean; status?: boolean }[]; rows: Row[]; totals?: Row }
interface Report { id: string; group: 'Financial' | 'Inventory' | 'HR'; title: string; desc: string; filter?: { label: string; options: string[] }; date?: boolean; run: (d: AppData, from?: string, to?: string, f?: string) => Out }

const months = (from?: string, to?: string) => {
  const t = to || todayISO(); const f = from || addDays(t, -365);
  const out: string[] = []; let k = monthKey(f);
  while (k <= monthKey(t)) { out.push(k); const [y, m] = k.split('-').map(Number); k = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`; }
  return out;
};
const H = 280;
const Bars = ({ data, keys, money = true, horizontal }: { data: any[]; keys: { k: string; c: string; n?: string }[]; money?: boolean; horizontal?: boolean }) => (
  <ResponsiveContainer width="100%" height={horizontal ? Math.max(H, data.length * 30) : H}>
    <BarChart data={data} layout={horizontal ? 'vertical' : 'horizontal'} margin={{ top: 8, right: 16, left: 4, bottom: 0 }}>
      <CartesianGrid {...gridProps} horizontal={!horizontal} vertical={!!horizontal} />
      {horizontal ? <><XAxis type="number" {...axisProps} tickFormatter={money ? moneyTick : undefined} /><YAxis type="category" dataKey="name" {...axisProps} width={170} /></> : <><XAxis dataKey="name" {...axisProps} dy={6} /><YAxis {...axisProps} tickFormatter={money ? moneyTick : (v) => num(v)} width={64} /></>}
      <Tooltip content={<ChartTooltip money={money} />} cursor={{ fill: 'rgba(52,120,212,0.06)' }} />
      {keys.map((k) => <Bar key={k.k} dataKey={k.k} name={k.n || k.k} fill={k.c} radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]} maxBarSize={horizontal ? 18 : 28} />)}
    </BarChart>
  </ResponsiveContainer>
);
const Donut = ({ data }: { data: { name: string; value: number }[] }) => (
  <div className="flex flex-wrap items-center gap-6">
    <div className="h-[240px] w-[240px]"><ResponsiveContainer><PieChart><Pie data={data} dataKey="value" nameKey="name" innerRadius={62} outerRadius={100} paddingAngle={1.5} stroke="none">{data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}</Pie><Tooltip content={<ChartTooltip />} /></PieChart></ResponsiveContainer></div>
    <div className="space-y-2">{data.map((d, i) => <div key={d.name} className="flex items-center gap-2 text-[13px]"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: PALETTE[i % PALETTE.length] }} /><span className="w-40 text-ink-600">{d.name}</span><span className="font-semibold tnum">{inrCompact(d.value)}</span></div>)}</div>
  </div>
);

const REPORTS: Report[] = [
  { id: 'revenue', group: 'Financial', title: 'Revenue report', desc: 'Invoiced revenue and collections by month', date: true, filter: { label: 'Customer', options: [] },
    run: (d, from, to, cust) => {
      const inv = d.invoices.filter((i) => !i.draft && inRange(i.date, from, to) && (!cust || cust === 'All' || i.customer === cust));
      const rows = months(from, to).map((m) => { const x = inv.filter((i) => monthKey(i.date) === m); const t = x.reduce((s, i) => s + invoiceTotal(i), 0); const tax = x.reduce((s, i) => s + lineTotals(i.items).tax, 0); return { month: monthLabel(m, true), invoices: x.length, taxable: Math.round(t - tax), gst: Math.round(tax), total: t, collected: x.filter((i) => i.paid).reduce((s, i) => s + invoiceTotal(i), 0) }; });
      const tot = rows.reduce((s, r) => ({ invoices: s.invoices + r.invoices, taxable: s.taxable + r.taxable, gst: s.gst + r.gst, total: s.total + r.total, collected: s.collected + r.collected }), { invoices: 0, taxable: 0, gst: 0, total: 0, collected: 0 });
      return { kpis: [['Total revenue', inrCompact(tot.total)], ['Taxable value', inrCompact(tot.taxable)], ['GST collected', inrCompact(tot.gst)], ['Collection rate', `${tot.total ? ((tot.collected / tot.total) * 100).toFixed(1) : 0}%`]],
        chart: <><Legend items={[{ label: 'Invoiced', color: C.primary }, { label: 'Collected', color: C.primaryLight }]} /><Bars data={rows.map((r) => ({ name: r.month, Invoiced: r.total, Collected: r.collected }))} keys={[{ k: 'Invoiced', c: C.primary }, { k: 'Collected', c: C.primaryLight }]} /></>,
        cols: [{ key: 'month', label: 'Month' }, { key: 'invoices', label: 'Invoices', num: true }, { key: 'taxable', label: 'Taxable value', money: true }, { key: 'gst', label: 'GST', money: true }, { key: 'total', label: 'Total invoiced', money: true }, { key: 'collected', label: 'Collected', money: true }],
        rows, totals: { month: 'Total', ...tot } };
    } },
  { id: 'expense', group: 'Financial', title: 'Expense report', desc: 'Approved spend by category', date: true, filter: { label: 'Category', options: ['All', ...EXPENSE_CATEGORIES] },
    run: (d, from, to, cat) => {
      const ex = d.expenses.filter((e) => e.status === 'Approved' && inRange(e.date, from, to) && (!cat || cat === 'All' || e.category === cat));
      const total = ex.reduce((s, e) => s + e.amount, 0);
      const rows = EXPENSE_CATEGORIES.map((c) => { const x = ex.filter((e) => e.category === c); const v = x.reduce((s, e) => s + e.amount, 0); return { category: c, count: x.length, amount: v, avg: x.length ? Math.round(v / x.length) : 0, share: total ? `${((v / total) * 100).toFixed(1)}%` : '0%' }; }).filter((r) => r.count > 0);
      return { kpis: [['Total spend', inrCompact(total)], ['Transactions', String(ex.length)], ['Largest category', rows.sort((a, b) => b.amount - a.amount)[0]?.category || '—'], ['Avg. per month', inrCompact(total / Math.max(1, months(from, to).length))]],
        chart: <Donut data={rows.map((r) => ({ name: r.category, value: r.amount }))} />,
        cols: [{ key: 'category', label: 'Category' }, { key: 'count', label: 'Entries', num: true }, { key: 'amount', label: 'Amount', money: true }, { key: 'avg', label: 'Average', money: true }, { key: 'share', label: 'Share' }],
        rows, totals: { category: 'Total', count: ex.length, amount: total, avg: '', share: '100%' } };
    } },
  { id: 'pnl', group: 'Financial', title: 'Profit & loss overview', desc: 'Revenue (excl. GST) less approved expenses', date: true,
    run: (d, from, to) => {
      const rows = months(from, to).map((m) => {
        const rev = d.invoices.filter((i) => !i.draft && monthKey(i.date) === m && inRange(i.date, from, to)).reduce((s, i) => s + lineTotals(i.items).subtotal, 0);
        const ex = d.expenses.filter((e) => e.status === 'Approved' && monthKey(e.date) === m && inRange(e.date, from, to));
        const cogs = ex.filter((e) => e.category === 'Material Purchases' || e.category === 'Transportation').reduce((s, e) => s + e.amount, 0);
        const opex = ex.reduce((s, e) => s + e.amount, 0) - cogs;
        const profit = rev - cogs - opex;
        return { month: monthLabel(m, true), revenue: Math.round(rev), cogs, gross: Math.round(rev - cogs), opex, profit: Math.round(profit), margin: rev ? `${((profit / rev) * 100).toFixed(1)}%` : '—' };
      });
      const t = rows.reduce((s, r) => ({ revenue: s.revenue + r.revenue, cogs: s.cogs + r.cogs, gross: s.gross + r.gross, opex: s.opex + r.opex, profit: s.profit + r.profit }), { revenue: 0, cogs: 0, gross: 0, opex: 0, profit: 0 });
      return { kpis: [['Net revenue', inrCompact(t.revenue)], ['Gross profit', inrCompact(t.gross)], ['Operating expenses', inrCompact(t.opex)], ['Net profit', `${inrCompact(t.profit)} · ${t.revenue ? ((t.profit / t.revenue) * 100).toFixed(1) : 0}%`]],
        chart: <><Legend items={[{ label: 'Revenue', color: C.primary }, { label: 'Total cost', color: C.expense }, { label: 'Net profit', color: C.profit }]} />
          <ResponsiveContainer width="100%" height={H}><ComposedChart data={rows.map((r) => ({ name: r.month, Revenue: r.revenue, 'Total cost': r.cogs + r.opex, 'Net profit': r.profit }))} margin={{ top: 8, right: 16, left: 4, bottom: 0 }}>
            <CartesianGrid {...gridProps} /><XAxis dataKey="name" {...axisProps} dy={6} /><YAxis {...axisProps} tickFormatter={moneyTick} width={64} /><Tooltip content={<ChartTooltip />} />
            <Bar dataKey="Revenue" fill={C.primary} radius={[4, 4, 0, 0]} maxBarSize={22} /><Bar dataKey="Total cost" fill={C.expense} radius={[4, 4, 0, 0]} maxBarSize={22} /><Line dataKey="Net profit" stroke={C.profit} strokeWidth={2.25} dot={{ r: 3 }} />
          </ComposedChart></ResponsiveContainer></>,
        cols: [{ key: 'month', label: 'Month' }, { key: 'revenue', label: 'Revenue', money: true }, { key: 'cogs', label: 'Materials & freight', money: true }, { key: 'gross', label: 'Gross profit', money: true }, { key: 'opex', label: 'Operating exp.', money: true }, { key: 'profit', label: 'Net profit', money: true }, { key: 'margin', label: 'Margin' }],
        rows, totals: { month: 'Total', ...t, margin: t.revenue ? `${((t.profit / t.revenue) * 100).toFixed(1)}%` : '—' } };
    } },
  { id: 'outstanding', group: 'Financial', title: 'Outstanding payments', desc: 'Receivables ageing by days past due',
    run: (d) => {
      const today = todayISO();
      const un = d.invoices.filter((i) => !i.paid && !i.draft);
      const bucket = (i: (typeof un)[0]) => { const dd = diffDays(today, i.dueDate); return dd <= 0 ? 'Not due' : dd <= 30 ? '1–30 days' : dd <= 60 ? '31–60 days' : dd <= 90 ? '61–90 days' : '90+ days'; };
      const B = ['Not due', '1–30 days', '31–60 days', '61–90 days', '90+ days'];
      const rows = un.map((i) => ({ invoice: i.number, customer: i.customer, date: fmtDate(i.date), due: fmtDate(i.dueDate), days: Math.max(0, diffDays(today, i.dueDate)), bucket: bucket(i), amount: invoiceTotal(i) })).sort((a, b) => b.days - a.days);
      const total = rows.reduce((s, r) => s + r.amount, 0);
      const chart = B.map((b, i) => ({ name: b, Amount: rows.filter((r) => r.bucket === b).reduce((s, r) => s + r.amount, 0), fill: ['#86B4EA', '#E0B23C', '#E08A3C', '#D96A4F', '#C2413A'][i] }));
      return { kpis: [['Total outstanding', inrCompact(total)], ['Invoices', String(rows.length)], ['Overdue', inrCompact(rows.filter((r) => r.days > 0).reduce((s, r) => s + r.amount, 0))], ['Avg. days overdue', String(Math.round(rows.filter((r) => r.days > 0).reduce((s, r) => s + r.days, 0) / Math.max(1, rows.filter((r) => r.days > 0).length)))]],
        chart: <ResponsiveContainer width="100%" height={H}><BarChart data={chart} margin={{ top: 8, right: 16, left: 4, bottom: 0 }}><CartesianGrid {...gridProps} /><XAxis dataKey="name" {...axisProps} dy={6} /><YAxis {...axisProps} tickFormatter={moneyTick} width={64} /><Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(52,120,212,0.06)' }} /><Bar dataKey="Amount" radius={[4, 4, 0, 0]} maxBarSize={56}>{chart.map((c) => <Cell key={c.name} fill={c.fill} />)}</Bar></BarChart></ResponsiveContainer>,
        cols: [{ key: 'invoice', label: 'Invoice' }, { key: 'customer', label: 'Customer' }, { key: 'date', label: 'Invoice date' }, { key: 'due', label: 'Due date' }, { key: 'days', label: 'Days overdue', num: true }, { key: 'bucket', label: 'Ageing' }, { key: 'amount', label: 'Amount', money: true }],
        rows, totals: { invoice: 'Total', customer: '', date: '', due: '', days: '', bucket: '', amount: total } };
    } },
  { id: 'invoices', group: 'Financial', title: 'Invoice summary', desc: 'Invoices by customer and status', date: true, filter: { label: 'Status', options: ['All', 'Paid', 'Pending', 'Overdue'] },
    run: (d, from, to, st) => {
      const inv = d.invoices.filter((i) => !i.draft && inRange(i.date, from, to) && (!st || st === 'All' || invoiceStatus(i) === st));
      const custs = Array.from(new Set(inv.map((i) => i.customer)));
      const rows = custs.map((c) => { const x = inv.filter((i) => i.customer === c); const s = (f: (i: (typeof x)[0]) => boolean) => x.filter(f).reduce((a, i) => a + invoiceTotal(i), 0); return { customer: c, count: x.length, total: s(() => true), paid: s((i) => i.paid), pending: s((i) => invoiceStatus(i) === 'Pending'), overdue: s((i) => invoiceStatus(i) === 'Overdue') }; }).sort((a, b) => b.total - a.total);
      const t = rows.reduce((s, r) => ({ count: s.count + r.count, total: s.total + r.total, paid: s.paid + r.paid, pending: s.pending + r.pending, overdue: s.overdue + r.overdue }), { count: 0, total: 0, paid: 0, pending: 0, overdue: 0 });
      return { kpis: [['Invoices', String(t.count)], ['Customers billed', String(rows.length)], ['Avg. invoice value', inrCompact(t.total / Math.max(1, t.count))], ['Top customer', rows[0]?.customer || '—']],
        chart: <><Legend items={[{ label: 'Paid', color: C.profit }, { label: 'Pending', color: '#E0B23C' }, { label: 'Overdue', color: C.red }]} /><ResponsiveContainer width="100%" height={Math.max(H, rows.length * 30)}><BarChart data={rows.map((r) => ({ name: r.customer, Paid: r.paid, Pending: r.pending, Overdue: r.overdue }))} layout="vertical" margin={{ top: 8, right: 16, left: 4, bottom: 0 }}><CartesianGrid {...gridProps} horizontal={false} vertical /><XAxis type="number" {...axisProps} tickFormatter={moneyTick} /><YAxis type="category" dataKey="name" {...axisProps} width={190} /><Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(52,120,212,0.06)' }} /><Bar dataKey="Paid" stackId="a" fill={C.profit} maxBarSize={18} /><Bar dataKey="Pending" stackId="a" fill="#E0B23C" maxBarSize={18} /><Bar dataKey="Overdue" stackId="a" fill={C.red} radius={[0, 4, 4, 0]} maxBarSize={18} /></BarChart></ResponsiveContainer></>,
        cols: [{ key: 'customer', label: 'Customer' }, { key: 'count', label: 'Invoices', num: true }, { key: 'total', label: 'Total', money: true }, { key: 'paid', label: 'Paid', money: true }, { key: 'pending', label: 'Pending', money: true }, { key: 'overdue', label: 'Overdue', money: true }],
        rows, totals: { customer: 'Total', ...t } };
    } },
  { id: 'valuation', group: 'Inventory', title: 'Stock valuation', desc: 'Current inventory value by category', filter: { label: 'Category', options: ['All', ...CATEGORIES] },
    run: (d, _f, _t, cat) => {
      const items = d.items.filter((i) => !cat || cat === 'All' || i.category === cat);
      const rows = items.map((i) => ({ id: i.id, item: i.name, category: i.category, qty: `${num(i.qty, 2)} ${i.uom}`, price: i.price, value: Math.round(i.qty * i.price), status: stockStatus(i) })).sort((a, b) => b.value - a.value);
      const total = rows.reduce((s, r) => s + r.value, 0);
      const byCat = CATEGORIES.map((c) => ({ name: c, Value: items.filter((i) => i.category === c).reduce((s, i) => s + i.qty * i.price, 0) })).filter((x) => x.Value > 0).sort((a, b) => b.Value - a.Value);
      return { kpis: [['Total value', inrCompact(total)], ['SKUs', String(rows.length)], ['Top category', byCat[0]?.name || '—'], ['Top item share', total ? `${((rows[0]?.value / total) * 100).toFixed(1)}%` : '—']],
        chart: <Bars horizontal data={byCat} keys={[{ k: 'Value', c: C.primary }]} />,
        cols: [{ key: 'id', label: 'Item ID' }, { key: 'item', label: 'Item' }, { key: 'category', label: 'Category' }, { key: 'qty', label: 'Quantity' }, { key: 'price', label: 'Unit price', money: true }, { key: 'value', label: 'Stock value', money: true }, { key: 'status', label: 'Status', status: true }],
        rows, totals: { id: 'Total', item: '', category: '', qty: '', price: '', value: total, status: '' } };
    } },
  { id: 'movement', group: 'Inventory', title: 'Stock movement', desc: 'Inward vs outward value by category', date: true, filter: { label: 'Category', options: ['All', ...CATEGORIES] },
    run: (d, from, to, cat) => {
      const items = Object.fromEntries(d.items.map((i) => [i.id, i]));
      const mv = d.movements.filter((m) => inRange(m.date, from, to) && items[m.itemId] && (!cat || cat === 'All' || items[m.itemId].category === cat));
      const rows = CATEGORIES.map((c) => { const x = mv.filter((m) => items[m.itemId].category === c); const v = (f: (m: (typeof x)[0]) => boolean) => Math.round(x.filter(f).reduce((s, m) => s + Math.abs(m.qty) * items[m.itemId].price, 0)); return { category: c, entries: x.length, inward: v((m) => m.type === 'Inward'), outward: v((m) => m.type === 'Outward'), adjust: v((m) => m.type === 'Adjustment') }; }).filter((r) => r.entries > 0);
      const t = rows.reduce((s, r) => ({ entries: s.entries + r.entries, inward: s.inward + r.inward, outward: s.outward + r.outward, adjust: s.adjust + r.adjust }), { entries: 0, inward: 0, outward: 0, adjust: 0 });
      return { kpis: [['Movements', String(t.entries)], ['Inward value', inrCompact(t.inward)], ['Outward value', inrCompact(t.outward)], ['Write-offs', inrCompact(t.adjust)]],
        chart: <><Legend items={[{ label: 'Inward', color: C.profit }, { label: 'Outward', color: C.primary }]} /><Bars data={rows.map((r) => ({ name: r.category.replace(' & ', ' & '), Inward: r.inward, Outward: r.outward }))} keys={[{ k: 'Inward', c: C.profit }, { k: 'Outward', c: C.primary }]} /></>,
        cols: [{ key: 'category', label: 'Category' }, { key: 'entries', label: 'Entries', num: true }, { key: 'inward', label: 'Inward value', money: true }, { key: 'outward', label: 'Outward value', money: true }, { key: 'adjust', label: 'Adjustments', money: true }],
        rows, totals: { category: 'Total', ...t } };
    } },
  { id: 'lowstock', group: 'Inventory', title: 'Low-stock report', desc: 'Items at or below reorder level with suggested order qty', filter: { label: 'Category', options: ['All', ...CATEGORIES] },
    run: (d, _f, _t, cat) => {
      const rows = d.items.filter((i) => stockStatus(i) !== 'In Stock' && (!cat || cat === 'All' || i.category === cat)).map((i) => { const sug = Math.max(0, i.reorder * 2 - i.qty); return { id: i.id, item: i.name, category: i.category, available: `${num(i.qty, 2)} ${i.uom}`, reorder: `${num(i.reorder)} ${i.uom}`, suggested: `${num(sug, 2)} ${i.uom}`, cost: Math.round(sug * i.price), status: stockStatus(i) }; });
      const cost = rows.reduce((s, r) => s + r.cost, 0);
      return { kpis: [['Items below reorder', String(rows.length)], ['Out of stock', String(rows.filter((r) => r.status === 'Out of Stock').length)], ['Est. replenishment cost', inrCompact(cost)], ['Categories affected', String(new Set(rows.map((r) => r.category)).size)]],
        chart: <Bars horizontal money data={rows.map((r) => ({ name: r.item, 'Replenishment cost': r.cost }))} keys={[{ k: 'Replenishment cost', c: C.expense }]} />,
        cols: [{ key: 'id', label: 'Item ID' }, { key: 'item', label: 'Item' }, { key: 'category', label: 'Category' }, { key: 'available', label: 'Available' }, { key: 'reorder', label: 'Reorder level' }, { key: 'suggested', label: 'Suggested order' }, { key: 'cost', label: 'Est. cost', money: true }, { key: 'status', label: 'Status', status: true }],
        rows, totals: { id: 'Total', item: '', category: '', available: '', reorder: '', suggested: '', cost, status: '' } };
    } },
  { id: 'consumption', group: 'Inventory', title: 'Item-wise consumption', desc: 'Quantity issued per item', date: true, filter: { label: 'Category', options: ['All', ...CATEGORIES] },
    run: (d, from, to, cat) => {
      const rows = d.items.filter((i) => !cat || cat === 'All' || i.category === cat).map((i) => { const x = d.movements.filter((m) => m.itemId === i.id && m.type === 'Outward' && inRange(m.date, from, to)); const q = x.reduce((s, m) => s - m.qty, 0); return { id: i.id, item: i.name, category: i.category, issues: x.length, qty: `${num(q, 2)} ${i.uom}`, value: Math.round(q * i.price), _q: q }; }).filter((r) => r._q > 0).sort((a, b) => b.value - a.value).map(({ _q, ...r }) => r);
      const total = rows.reduce((s, r) => s + r.value, 0);
      return { kpis: [['Items consumed', String(rows.length)], ['Consumption value', inrCompact(total)], ['Issue entries', String(rows.reduce((s, r) => s + r.issues, 0))], ['Top item', rows[0]?.item || '—']],
        chart: <Bars horizontal data={rows.slice(0, 10).map((r) => ({ name: r.item, Value: r.value }))} keys={[{ k: 'Value', c: C.primary }]} />,
        cols: [{ key: 'id', label: 'Item ID' }, { key: 'item', label: 'Item' }, { key: 'category', label: 'Category' }, { key: 'issues', label: 'Issues', num: true }, { key: 'qty', label: 'Qty consumed' }, { key: 'value', label: 'Value', money: true }],
        rows, totals: { id: 'Total', item: '', category: '', issues: rows.reduce((s, r) => s + r.issues, 0), qty: '', value: total } };
    } },
  { id: 'attendance', group: 'HR', title: 'Employee attendance', desc: 'Present, absent and leave days per employee', date: true, filter: { label: 'Department', options: ['All', ...DEPARTMENTS] },
    run: (d, from, to, dept) => {
      const t = to || todayISO(); const f = from || addDays(t, -30);
      const days: string[] = []; for (let x = f; x <= t; x = addDays(x, 1)) if (!isSunday(x) && d.attendance[x]) days.push(x);
      const rows = d.employees.filter((e) => !dept || dept === 'All' || e.department === dept).map((e) => { let p = 0, h = 0, a = 0, l = 0; days.forEach((x) => { const m = d.attendance[x]?.[e.id]; if (m === 'P') p++; else if (m === 'HD') h++; else if (m === 'A') a++; else if (m === 'L') l++; }); const tot = p + h + a + l; return { id: e.id, name: e.name, department: e.department, present: p, half: h, absent: a, leave: l, rate: tot ? `${(((p + h / 2) / tot) * 100).toFixed(1)}%` : '—' }; });
      const sum = rows.reduce((s, r) => ({ present: s.present + r.present, half: s.half + r.half, absent: s.absent + r.absent, leave: s.leave + r.leave }), { present: 0, half: 0, absent: 0, leave: 0 });
      const all = sum.present + sum.half + sum.absent + sum.leave;
      const byDept = DEPARTMENTS.map((dp) => { const x = rows.filter((r) => r.department === dp); return { name: dp, Present: x.reduce((s, r) => s + r.present + r.half / 2, 0), Absent: x.reduce((s, r) => s + r.absent, 0), Leave: x.reduce((s, r) => s + r.leave, 0) }; }).filter((x) => x.Present + x.Absent + x.Leave > 0);
      return { kpis: [['Working days', String(days.length)], ['Attendance rate', all ? `${(((sum.present + sum.half / 2) / all) * 100).toFixed(1)}%` : '—'], ['Absent days', String(sum.absent)], ['Leave days', String(sum.leave)]],
        chart: <><Legend items={[{ label: 'Present', color: C.profit }, { label: 'Absent', color: C.red }, { label: 'Leave', color: '#8B6FD6' }]} /><ResponsiveContainer width="100%" height={H}><BarChart data={byDept} margin={{ top: 8, right: 16, left: 4, bottom: 0 }}><CartesianGrid {...gridProps} /><XAxis dataKey="name" {...axisProps} dy={6} /><YAxis {...axisProps} width={48} /><Tooltip content={<ChartTooltip money={false} unit=" days" />} cursor={{ fill: 'rgba(52,120,212,0.06)' }} /><Bar dataKey="Present" stackId="a" fill={C.profit} maxBarSize={36} /><Bar dataKey="Absent" stackId="a" fill={C.red} maxBarSize={36} /><Bar dataKey="Leave" stackId="a" fill="#8B6FD6" radius={[4, 4, 0, 0]} maxBarSize={36} /></BarChart></ResponsiveContainer></>,
        cols: [{ key: 'id', label: 'Emp ID' }, { key: 'name', label: 'Employee' }, { key: 'department', label: 'Department' }, { key: 'present', label: 'Present', num: true }, { key: 'half', label: 'Half day', num: true }, { key: 'absent', label: 'Absent', num: true }, { key: 'leave', label: 'Leave', num: true }, { key: 'rate', label: 'Attendance %' }],
        rows, totals: { id: 'Total', name: '', department: '', ...sum, rate: '' } };
    } },
  { id: 'leave', group: 'HR', title: 'Leave summary', desc: 'Leave requests by type and status', date: true, filter: { label: 'Status', options: ['All', 'Approved', 'Pending', 'Rejected'] },
    run: (d, from, to, st) => {
      const emps = Object.fromEntries(d.employees.map((e) => [e.id, e]));
      const lv = d.leaves.filter((l) => (inRange(l.from, from, to) || inRange(l.to, from, to)) && (!st || st === 'All' || l.status === st));
      const rows = lv.map((l) => ({ id: l.id, employee: emps[l.empId]?.name || l.empId, department: emps[l.empId]?.department || '', type: l.type, from: fmtDate(l.from), to: fmtDate(l.to), days: l.days, status: l.status }));
      const types = ['Casual', 'Sick', 'Earned', 'Unpaid'];
      const chart = types.map((t) => ({ name: t, Approved: lv.filter((l) => l.type === t && l.status === 'Approved').reduce((s, l) => s + l.days, 0), Pending: lv.filter((l) => l.type === t && l.status === 'Pending').reduce((s, l) => s + l.days, 0), Rejected: lv.filter((l) => l.type === t && l.status === 'Rejected').reduce((s, l) => s + l.days, 0) }));
      return { kpis: [['Requests', String(lv.length)], ['Days approved', String(lv.filter((l) => l.status === 'Approved').reduce((s, l) => s + l.days, 0))], ['Pending', String(lv.filter((l) => l.status === 'Pending').length)], ['Rejected', String(lv.filter((l) => l.status === 'Rejected').length)]],
        chart: <><Legend items={[{ label: 'Approved', color: C.profit }, { label: 'Pending', color: '#E0B23C' }, { label: 'Rejected', color: C.red }]} /><ResponsiveContainer width="100%" height={H}><BarChart data={chart} margin={{ top: 8, right: 16, left: 4, bottom: 0 }}><CartesianGrid {...gridProps} /><XAxis dataKey="name" {...axisProps} dy={6} /><YAxis {...axisProps} width={40} allowDecimals={false} /><Tooltip content={<ChartTooltip money={false} unit=" days" />} cursor={{ fill: 'rgba(52,120,212,0.06)' }} /><Bar dataKey="Approved" stackId="a" fill={C.profit} maxBarSize={48} /><Bar dataKey="Pending" stackId="a" fill="#E0B23C" maxBarSize={48} /><Bar dataKey="Rejected" stackId="a" fill={C.red} radius={[4, 4, 0, 0]} maxBarSize={48} /></BarChart></ResponsiveContainer></>,
        cols: [{ key: 'id', label: 'Request' }, { key: 'employee', label: 'Employee' }, { key: 'department', label: 'Department' }, { key: 'type', label: 'Type' }, { key: 'from', label: 'From' }, { key: 'to', label: 'To' }, { key: 'days', label: 'Days', num: true }, { key: 'status', label: 'Status', status: true }],
        rows, totals: { id: 'Total', employee: '', department: '', type: '', from: '', to: '', days: rows.reduce((s, r) => s + r.days, 0), status: '' } };
    } },
  { id: 'payroll', group: 'HR', title: 'Payroll summary', desc: 'Monthly payroll cost by department', filter: { label: 'Department', options: ['All', ...DEPARTMENTS] },
    run: (d, _f, _t, dept) => {
      const emps = d.employees.filter((e) => e.status !== 'Inactive' && (!dept || dept === 'All' || e.department === dept));
      const rows = DEPARTMENTS.map((dp) => { const x = emps.filter((e) => e.department === dp).map((e) => payrollBreakup(e.salary)); return { department: dp, headcount: x.length, gross: x.reduce((s, p) => s + p.gross, 0), pf: x.reduce((s, p) => s + p.pf, 0), tds: x.reduce((s, p) => s + p.tds + p.pt, 0), net: x.reduce((s, p) => s + p.net, 0) }; }).filter((r) => r.headcount > 0).sort((a, b) => b.gross - a.gross);
      const t = rows.reduce((s, r) => ({ headcount: s.headcount + r.headcount, gross: s.gross + r.gross, pf: s.pf + r.pf, tds: s.tds + r.tds, net: s.net + r.net }), { headcount: 0, gross: 0, pf: 0, tds: 0, net: 0 });
      return { kpis: [['Monthly gross', inrCompact(t.gross)], ['Annualised cost', inrCompact(t.gross * 12)], ['Headcount', String(t.headcount)], ['Avg. CTC', inrCompact(t.gross / Math.max(1, t.headcount))]],
        chart: <><Legend items={[{ label: 'Net pay', color: C.primary }, { label: 'Statutory deductions', color: C.primaryLight }]} /><ResponsiveContainer width="100%" height={H}><BarChart data={rows.map((r) => ({ name: r.department, 'Net pay': r.net, Deductions: r.pf + r.tds }))} margin={{ top: 8, right: 16, left: 4, bottom: 0 }}><CartesianGrid {...gridProps} /><XAxis dataKey="name" {...axisProps} dy={6} /><YAxis {...axisProps} tickFormatter={moneyTick} width={64} /><Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(52,120,212,0.06)' }} /><Bar dataKey="Net pay" stackId="a" fill={C.primary} maxBarSize={40} /><Bar dataKey="Deductions" stackId="a" fill={C.primaryLight} radius={[4, 4, 0, 0]} maxBarSize={40} /></BarChart></ResponsiveContainer></>,
        cols: [{ key: 'department', label: 'Department' }, { key: 'headcount', label: 'Headcount', num: true }, { key: 'gross', label: 'Gross', money: true }, { key: 'pf', label: 'PF', money: true }, { key: 'tds', label: 'TDS + PT', money: true }, { key: 'net', label: 'Net pay', money: true }],
        rows, totals: { department: 'Total', ...t } };
    } },
];

const GROUPS = [{ g: 'Financial', icon: BarChart3 }, { g: 'Inventory', icon: Boxes }, { g: 'HR', icon: Users }] as const;

export default function Reports() {
  const { data } = useStore();
  const exportCsv = useExport();
  const print = usePrint();
  const [id, setId] = useState('revenue');
  const [range, setRange] = useState<DateRange>({ preset: 'fy' });
  const [filter, setFilter] = useState('All');
  const rep = REPORTS.find((r) => r.id === id)!;
  const { from, to } = resolveRange(range);
  const options = rep.id === 'revenue' ? ['All', ...Array.from(new Set(data.invoices.map((i) => i.customer))).sort()] : rep.filter?.options || [];
  const out = useMemo(() => rep.run(data, rep.date ? from : undefined, rep.date ? to : undefined, filter), [rep, data, from, to, filter]);
  const pick = (rid: string) => { setId(rid); setFilter('All'); };
  const fmt = (c: Out['cols'][0], v: string | number) => (v === '' || v == null ? '' : c.money ? inr(Number(v)) : c.num ? num(Number(v)) : String(v));
  const columns: Column<Row>[] = out.cols.map((c) => ({ key: c.key, header: c.label, align: c.money || c.num ? 'right' : 'left', sort: (r: Row) => r[c.key], render: (r: Row) => c.status ? <StatusBadge status={String(r[c.key])} /> : <span className={cx((c.money || c.num) && 'tnum', c.key === out.cols[0].key && 'font-medium text-ink-900')}>{fmt(c, r[c.key])}</span> }));
  const doExport = () => exportCsv(`${rep.id}-report-${todayISO()}.csv`, toCSV(out.cols.map((c) => c.label), [...out.rows, ...(out.totals ? [out.totals] : [])].map((r) => out.cols.map((c) => r[c.key] ?? ''))));

  return (
    <div>
      <PageHeader title="Reports & Analytics" subtitle="Financial, inventory and HR reports with filters, charts and exports." />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[240px_1fr]">
        <Card className="no-print h-fit p-2 lg:sticky lg:top-20">
          {GROUPS.map(({ g, icon: I }) => (
            <div key={g} className="mb-2 last:mb-0">
              <p className="flex items-center gap-2 px-2.5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-ink-400"><I className="h-3.5 w-3.5" />{g} reports</p>
              {REPORTS.filter((r) => r.group === g).map((r) => (
                <button key={r.id} onClick={() => pick(r.id)} className={cx('block w-full rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors', id === r.id ? 'bg-primary-50 font-medium text-primary-700' : 'text-ink-600 hover:bg-surface hover:text-ink-900')}>{r.title}</button>
              ))}
            </div>
          ))}
        </Card>

        <div className="print-area min-w-0 space-y-4">
          <Card className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><p className="text-xs font-medium uppercase tracking-wider text-primary-600">{rep.group} report</p><h2 className="mt-0.5 text-lg font-semibold">{rep.title}</h2><p className="text-[13px] text-ink-500">{rep.desc} · {rep.date ? rangeText(range) : `As of ${fmtDate(todayISO())}`} · {data.settings.legalName}</p></div>
              <div className="no-print flex flex-wrap items-center gap-2">
                {rep.date && <DateRangeFilter compact value={range} onChange={setRange} presets={['month', 'lastMonth', 'quarter', 'last90', 'fy', 'all', 'custom']} />}
                {options.length > 0 && <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="w-[190px]">{options.map((o) => <option key={o} value={o}>{rep.id === 'revenue' ? 'Customer' : rep.filter!.label}: {o}</option>)}</Select>}
                <Button icon={Printer} onClick={print}>Print</Button>
                <Button variant="primary" icon={Download} onClick={doExport}>Export CSV</Button>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
              {out.kpis.map(([l, v]) => <div key={l} className="rounded-xl border border-line bg-surface/50 p-3.5"><p className="text-xs text-ink-500">{l}</p><p className="mt-1 truncate text-lg font-semibold tnum" title={v}>{v}</p></div>)}
            </div>
          </Card>
          <Card className="p-5">
            {out.rows.length === 0 ? <EmptyState icon={FileSpreadsheet} title="No data for this selection" message="Try widening the date range or clearing the filter." /> : <div className="space-y-3">{out.chart}</div>}
          </Card>
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3"><p className="text-sm font-semibold">Report data</p><p className="text-xs text-ink-500">{out.rows.length} rows</p></div>
            <DataTable rows={out.rows} rowKey={(r) => String(Object.values(r).join('|'))} columns={columns} pageSize={15} dense
              empty={<EmptyState icon={FileSpreadsheet} title="No rows" />}
              footer={out.totals && out.rows.length > 0 ? <tfoot><tr className="border-t-2 border-line bg-surface/70 font-semibold">{out.cols.map((c) => <td key={c.key} className={cx('td py-2.5', (c.money || c.num) && 'text-right tnum')}>{c.status ? '' : fmt(c, out.totals![c.key] ?? '')}</td>)}</tr></tfoot> : undefined} />
          </Card>
        </div>
      </div>
    </div>
  );
}
