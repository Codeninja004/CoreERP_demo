import React, { useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, ArrowRight, Boxes, CheckSquare, Clock, CreditCard, FileText, IndianRupee, Package, Receipt, Settings2, TrendingUp, Users, Wallet } from 'lucide-react';
import { useStore, invoiceStatus, invoiceTotal, stockStatus } from '../lib/store';
import { Badge, Button, Card, CardHeader, DataTable, DateRangeFilter, KpiCard, MiniStat, PageHeader, ProgressBar, StatusBadge, cx, EmptyState } from '../components/ui';
import { C, ChartTooltip, PALETTE, axisProps, gridProps, moneyTick, Legend } from '../components/charts';
import { addMonths, endOfMonth, DateRange, fmtDate, inr, inrCompact, inRange, monthKey, monthLabel, previousRange, rangeText, relTime, resolveRange, todayISO } from '../lib/format';
import { EXPENSE_CATEGORIES } from '../lib/seed';

const pct = (a: number, b: number) => (b ? ((a - b) / b) * 100 : null);

export default function Dashboard() {
  const { data, navigate } = useStore();
  const [range, setRange] = useState<DateRange>({ preset: 'month' });
  const { from, to } = resolveRange(range);
  const prev = range.preset === 'month'
    ? (() => { const pf = addMonths(todayISO(), -1); const pe = endOfMonth(pf); const same = pf.slice(0, 8) + todayISO().slice(8); return { from: pf, to: same > pe ? pe : same }; })()
    : previousRange(from, to);
  const today = todayISO();

  const m = useMemo(() => {
    const inv = data.invoices.filter((i) => !i.draft);
    const revenue = (f?: string, t?: string) => inv.filter((i) => inRange(i.date, f, t)).reduce((s, i) => s + invoiceTotal(i), 0);
    const approved = data.expenses.filter((e) => e.status === 'Approved');
    const spend = (f?: string, t?: string) => approved.filter((e) => inRange(e.date, f, t)).reduce((s, e) => s + e.amount, 0);
    const outstanding = inv.filter((i) => !i.paid);
    const overdue = outstanding.filter((i) => invoiceStatus(i) === 'Overdue');
    const invValue = data.items.reduce((s, i) => s + i.qty * i.price, 0);
    const lowStock = data.items.filter((i) => stockStatus(i) !== 'In Stock').sort((a, b) => a.qty / (a.reorder || 1) - b.qty / (b.reorder || 1));
    // 12 month series
    const months = Array.from({ length: 12 }, (_, k) => monthKey(addMonths(today, k - 11)));
    const series = months.map((mk) => {
      const r = inv.filter((i) => monthKey(i.date) === mk).reduce((s, i) => s + invoiceTotal(i), 0);
      const e = approved.filter((x) => monthKey(x.date) === mk).reduce((s, x) => s + x.amount, 0);
      const collected = inv.filter((i) => i.paid && i.paidOn && monthKey(i.paidOn) === mk).reduce((s, i) => s + invoiceTotal(i), 0);
      return { key: mk, month: monthLabel(mk, true), Revenue: r, Expenses: e, Profit: r - e, Collected: collected };
    });
    const byCat = EXPENSE_CATEGORIES.map((c, i) => ({ name: c, value: approved.filter((e) => e.category === c && inRange(e.date, from, to)).reduce((s, e) => s + e.amount, 0), color: PALETTE[i] })).filter((x) => x.value > 0);
    const txns = [
      ...inv.filter((i) => inRange(i.date, from, to)).map((i) => ({ id: i.id, date: i.date, ref: i.number, party: i.customer, type: 'Invoice' as const, amount: invoiceTotal(i), status: invoiceStatus(i) })),
      ...inv.filter((i) => i.paid && i.paidOn && inRange(i.paidOn, from, to)).map((i) => ({ id: 'p' + i.id, date: i.paidOn!, ref: i.number, party: i.customer, type: 'Payment' as const, amount: invoiceTotal(i), status: 'Received' })),
      ...data.expenses.filter((e) => inRange(e.date, from, to)).map((e) => ({ id: e.id, date: e.date, ref: e.id, party: e.description, type: 'Expense' as const, amount: e.amount, status: e.status })),
    ].sort((a, b) => (a.date < b.date ? 1 : -1));
    return {
      rev: revenue(from, to), revPrev: revenue(prev.from, prev.to), exp: spend(from, to), expPrev: spend(prev.from, prev.to),
      outstanding: outstanding.reduce((s, i) => s + invoiceTotal(i), 0), outstandingCount: outstanding.length, overdue: overdue.reduce((s, i) => s + invoiceTotal(i), 0), overdueCount: overdue.length,
      invValue, lowStock, series, byCat, txns,
      invoiceCount: inv.filter((i) => inRange(i.date, from, to)).length,
      activeEmp: data.employees.filter((e) => e.status !== 'Inactive').length,
      presentToday: Object.values(data.attendance[today] || {}).filter((v) => v === 'P' || v === 'HD').length,
      pendingExp: data.expenses.filter((e) => e.status === 'Pending').length,
      pendingLeave: data.leaves.filter((l) => l.status === 'Pending').length,
    };
  }, [data, from, to, prev.from, prev.to, today]);

  const totalCat = m.byCat.reduce((s, c) => s + c.value, 0);
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const hasPrev = range.preset !== 'all' && !!prev.from;
  const vsText = range.preset === 'month' ? 'vs same days last month' : range.preset === 'week' ? 'vs previous week' : 'vs previous period';

  return (
    <div>
      <PageHeader title={`${greet}, Arjun`} subtitle={<>Here’s how {data.settings.companyName} is performing · <span className="text-ink-700">{rangeText(range)}</span></>}
        actions={<DateRangeFilter value={range} onChange={setRange} />} />

      {/* Primary KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total Revenue" value={inrCompact(m.rev)} icon={IndianRupee} tone="blue" delta={hasPrev ? pct(m.rev, m.revPrev) : null} deltaLabel={hasPrev ? vsText : 'Invoiced, incl. GST'} onClick={() => navigate('billing')} />
        <KpiCard label="Total Expenses" value={inrCompact(m.exp)} icon={Wallet} tone="amber" invertDelta delta={hasPrev ? pct(m.exp, m.expPrev) : null} deltaLabel={hasPrev ? vsText : 'Approved spend'} onClick={() => navigate('expenses')} />
        <KpiCard label="Outstanding Payments" value={inrCompact(m.outstanding)} icon={Clock} tone="red" hint={<><span className="font-medium text-red-600">{inrCompact(m.overdue)}</span> overdue across {m.overdueCount} invoices</>} onClick={() => navigate('billing', { action: 'open', sub: 'Overdue' })} />
        <KpiCard label="Inventory Value" value={inrCompact(m.invValue)} icon={Boxes} tone="green" hint={`${data.items.length} SKUs across ${new Set(data.items.map((i) => i.category)).size} categories`} onClick={() => navigate('inventory')} />
      </div>

      {/* Secondary metrics */}
      <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MiniStat label="Total Invoices" value={m.invoiceCount} icon={FileText} sub="in selected period" onClick={() => navigate('billing')} />
        <MiniStat label="Active Employees" value={m.activeEmp} icon={Users} sub={`${m.presentToday} present today`} onClick={() => navigate('hr')} />
        <MiniStat label="Total Stock Items" value={data.items.length} icon={Package} sub={`${m.lowStock.length} need attention`} onClick={() => navigate('inventory')} />
        <MiniStat label="Pending Approvals" value={m.pendingExp + m.pendingLeave} icon={CheckSquare} sub={`${m.pendingExp} expenses · ${m.pendingLeave} leaves`} onClick={() => navigate('expenses', { action: 'open', sub: 'pending' })} />
      </div>

      {/* Charts row */}
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="flex flex-col xl:col-span-2">
          <CardHeader title="Revenue vs Expenses" subtitle="Last 12 months · invoiced revenue against approved spend"
            actions={<Legend items={[{ label: 'Revenue', color: C.primary }, { label: 'Expenses', color: C.expense }]} />} />
          <div className="min-h-[280px] flex-1 px-2 pb-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={m.series} margin={{ top: 8, right: 16, left: 4, bottom: 0 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="month" {...axisProps} dy={6} />
                <YAxis {...axisProps} tickFormatter={moneyTick} width={64} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#D6D9DD' }} />
                <Line type="monotone" dataKey="Revenue" stroke={C.primary} strokeWidth={2.25} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                <Line type="monotone" dataKey="Expenses" stroke={C.expense} strokeWidth={2.25} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <CardHeader title="Expense Distribution" subtitle={`Approved spend · ${rangeText(range)}`} />
          {m.byCat.length === 0 ? <EmptyState icon={Wallet} title="No approved expenses" message="Nothing recorded for the selected period." /> : (
            <div className="px-5 pb-5">
              <div className="relative h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={m.byCat} dataKey="value" nameKey="name" innerRadius={58} outerRadius={82} paddingAngle={1.5} stroke="none">
                      {m.byCat.map((c) => <Cell key={c.name} fill={c.color} />)}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><p className="text-[11px] text-ink-500">Total</p><p className="text-lg font-semibold tnum">{inrCompact(totalCat)}</p></div>
              </div>
              <div className="mt-3 space-y-2">
                {m.byCat.sort((a, b) => b.value - a.value).map((c) => (
                  <div key={c.name} className="flex items-center gap-2 text-[13px]">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: c.color }} />
                    <span className="flex-1 text-ink-600">{c.name}</span>
                    <span className="font-medium text-ink-900 tnum">{inrCompact(c.value)}</span>
                    <span className="w-10 text-right text-xs text-ink-400 tnum">{((c.value / totalCat) * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="flex flex-col xl:col-span-2">
          <CardHeader title="Monthly Revenue" subtitle="Invoiced vs collected, last 12 months" actions={<Legend items={[{ label: 'Invoiced', color: C.primary }, { label: 'Collected', color: C.primaryLight }]} />} />
          <div className="min-h-[260px] flex-1 px-2 pb-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={m.series} margin={{ top: 8, right: 16, left: 4, bottom: 0 }} barGap={3}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="month" {...axisProps} dy={6} />
                <YAxis {...axisProps} tickFormatter={moneyTick} width={64} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(52,120,212,0.06)' }} />
                <Bar dataKey="Revenue" name="Invoiced" fill={C.primary} radius={[4, 4, 0, 0]} maxBarSize={22} />
                <Bar dataKey="Collected" fill={C.primaryLight} radius={[4, 4, 0, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="flex flex-col">
          <CardHeader title={<span className="flex items-center gap-2">Low-stock Alerts <Badge tone="amber" dot={false}>{m.lowStock.length}</Badge></span>} subtitle="Items at or below reorder level"
            actions={<Button size="sm" variant="ghost" onClick={() => navigate('inventory', { action: 'open', sub: 'low' })}>View all</Button>} />
          <div className="flex-1 space-y-1 px-3 pb-3">
            {m.lowStock.length === 0 && <EmptyState icon={Package} title="Stock levels healthy" />}
            {m.lowStock.slice(0, 6).map((i) => (
              <button key={i.id} onClick={() => navigate('inventory', { action: 'open', id: i.id })} className="block w-full rounded-lg px-2 py-2 text-left hover:bg-surface">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[13px] font-medium text-ink-800">{i.name}</span>
                  <StatusBadge status={stockStatus(i)} />
                </div>
                <div className="mt-1.5 flex items-center gap-3">
                  <ProgressBar value={(i.qty / (i.reorder * 2 || 1)) * 100} tone={i.qty <= 0 ? 'bg-red-500' : 'bg-amber-500'} />
                  <span className="shrink-0 text-xs text-ink-500 tnum">{i.qty.toLocaleString('en-IN')} / {i.reorder.toLocaleString('en-IN')} {i.uom}</span>
                </div>
              </button>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2 overflow-hidden">
          <CardHeader title="Recent Transactions" subtitle={`Invoices, receipts and expenses · ${rangeText(range)}`} actions={<Button size="sm" variant="ghost" onClick={() => navigate('reports')}>Reports <ArrowRight className="h-3.5 w-3.5" /></Button>} />
          <DataTable dense pageSize={8} rows={m.txns} rowKey={(r) => r.id}
            onRowClick={(r) => r.type === 'Expense' ? navigate('expenses', { action: 'open', id: r.id }) : navigate('billing', { action: 'open', id: r.id.replace(/^p/, '') })}
            empty={<EmptyState icon={Receipt} title="No transactions" message="No activity in the selected date range." />}
            columns={[
              { key: 'date', header: 'Date', render: (r) => <span className="text-ink-600">{fmtDate(r.date)}</span>, sort: (r) => r.date },
              { key: 'ref', header: 'Reference', render: (r) => <span className="font-medium text-ink-900">{r.ref}</span> },
              { key: 'party', header: 'Party / Description', render: (r) => <span className="block max-w-[240px] truncate">{r.party}</span> },
              { key: 'type', header: 'Type', render: (r) => <span className={cx('inline-flex items-center gap-1.5 text-[13px]', r.type === 'Expense' ? 'text-ink-600' : r.type === 'Payment' ? 'text-emerald-700' : 'text-primary-700')}>{r.type === 'Expense' ? <CreditCard className="h-3.5 w-3.5" /> : r.type === 'Payment' ? <TrendingUp className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}{r.type}</span> },
              { key: 'amount', header: 'Amount', align: 'right', render: (r) => <span className={cx('font-medium tnum', r.type === 'Expense' ? 'text-ink-800' : 'text-ink-900')}>{r.type === 'Expense' ? '−' : ''}{inr(r.amount)}</span>, sort: (r) => r.amount },
              { key: 'status', header: 'Status', render: (r) => r.status === 'Received' ? <Badge tone="green">Received</Badge> : <StatusBadge status={r.status} /> },
            ]} defaultSort={{ key: 'date', dir: 'desc' }} />
        </Card>
        <Card>
          <CardHeader title="Recent Activity" subtitle="Across all modules" />
          <ol className="relative px-5 pb-5">
            {data.activities.slice(0, 8).map((a, i, arr) => {
              const meta = { invoice: [FileText, 'bg-primary-50 text-primary-600'], payment: [IndianRupee, 'bg-emerald-50 text-emerald-600'], stock: [Package, 'bg-amber-50 text-amber-600'], hr: [Users, 'bg-violet-50 text-violet-600'], expense: [Wallet, 'bg-rose-50 text-rose-600'], system: [Settings2, 'bg-gray-100 text-ink-600'] }[a.kind] as [React.ElementType, string];
              const I = meta[0];
              return (
                <li key={a.id} className="relative flex gap-3 pb-4 last:pb-0">
                  {i < arr.length - 1 && <span className="absolute left-[13px] top-7 bottom-0 w-px bg-line" />}
                  <span className={cx('relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full', meta[1])}><I className="h-3.5 w-3.5" /></span>
                  <div className="min-w-0 pt-0.5"><p className="text-[13px] leading-5 text-ink-800">{a.text}</p><p className="text-xs text-ink-400">{relTime(a.at)}</p></div>
                </li>
              );
            })}
          </ol>
        </Card>
      </div>
    </div>
  );
}
