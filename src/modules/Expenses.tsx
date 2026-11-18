import React, { useMemo, useRef, useState } from 'react';
import { CalendarRange, CheckCircle2, Clock, Download, Eye, FileImage, Paperclip, Plus, UploadCloud, Wallet, X, XCircle } from 'lucide-react';
import { useIntent, useStore } from '../lib/store';
import type { Expense, ExpenseStatus } from '../lib/types';
import { Button, Card, CardHeader, DataTable, DateRangeFilter, DetailRow, EmptyState, Field, FilterBar, Input, KpiCard, Menu, Modal, PageHeader, SearchInput, Select, StatusBadge, Textarea, cx, useExport, useToast } from '../components/ui';
import { PALETTE } from '../components/charts';
import { DateRange, fmtDate, inr, inrCompact, inRange, rangeText, resolveRange, startOfMonth, todayISO, toCSV } from '../lib/format';
import { EXPENSE_CATEGORIES, PAYMENT_METHODS, PROJECTS } from '../lib/seed';

export default function Expenses() {
  const { data, setExpenseStatus } = useStore();
  const toast = useToast();
  const exportCsv = useExport();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All');
  const [status, setStatus] = useState<ExpenseStatus | 'All'>('All');
  const [dept, setDept] = useState('All');
  const [range, setRange] = useState<DateRange>({ preset: 'fy' });
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useIntent('expenses', (i) => {
    if (i.action === 'new') setCreating(true);
    if (i.id) setViewing(i.id);
    if (i.sub === 'pending') { setStatus('Pending'); setRange({ preset: 'all' }); }
  });

  const { from, to } = resolveRange(range);
  const inPeriod = useMemo(() => data.expenses.filter((e) => inRange(e.date, from, to)), [data.expenses, from, to]);
  const rows = useMemo(() => {
    const s = q.toLowerCase();
    return inPeriod.filter((e) => (cat === 'All' || e.category === cat) && (status === 'All' || e.status === status) && (dept === 'All' || e.department === dept) && (!s || [e.id, e.description, e.submittedBy].some((x) => x.toLowerCase().includes(s))));
  }, [inPeriod, q, cat, status, dept]);

  const stats = useMemo(() => {
    const ap = inPeriod.filter((e) => e.status === 'Approved');
    const pend = data.expenses.filter((e) => e.status === 'Pending');
    const ms = startOfMonth(todayISO());
    return {
      total: ap.reduce((s, e) => s + e.amount, 0), totalN: ap.length,
      pending: pend.reduce((s, e) => s + e.amount, 0), pendingN: pend.length,
      approved: ap.length, approvedRate: inPeriod.length ? (ap.length / inPeriod.filter((e) => e.status !== 'Pending').length) * 100 : 0,
      month: data.expenses.filter((e) => e.date >= ms && e.status !== 'Rejected').reduce((s, e) => s + e.amount, 0),
      monthN: data.expenses.filter((e) => e.date >= ms).length,
      byCat: EXPENSE_CATEGORIES.map((c, i) => ({ c, color: PALETTE[i], v: ap.filter((e) => e.category === c).reduce((s, e) => s + e.amount, 0) })),
    };
  }, [inPeriod, data.expenses]);
  const maxCat = Math.max(...stats.byCat.map((c) => c.v), 1);
  const exp = data.expenses.find((e) => e.id === viewing) || null;
  const pendingSel = [...selected].filter((id) => data.expenses.find((e) => e.id === id)?.status === 'Pending');

  const bulk = (s: ExpenseStatus) => { pendingSel.forEach((id) => setExpenseStatus(id, s)); toast('success', `${pendingSel.length} expenses ${s.toLowerCase()}`); setSelected(new Set()); };
  const toggleSel = (id: string) => setSelected((x) => { const n = new Set(x); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <div>
      <PageHeader title="Expenses" subtitle="Capture spend with receipts, route for approval and track by category and project."
        actions={<><Button icon={Download} onClick={() => exportCsv(`expenses-${todayISO()}.csv`, toCSV(['Expense ID', 'Description', 'Category', 'Date', 'Amount', 'Payment Method', 'Submitted By', 'Project/Department', 'Status', 'Receipt'], rows.map((e) => [e.id, e.description, e.category, e.date, e.amount, e.method, e.submittedBy, e.department, e.status, e.receipt || ''])))}>Export</Button><Button variant="primary" icon={Plus} onClick={() => setCreating(true)}>Add expense</Button></>} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total Expenses" value={inrCompact(stats.total)} icon={Wallet} tone="blue" hint={`Approved · ${rangeText(range)}`} />
        <KpiCard label="Pending Approvals" value={stats.pendingN} icon={Clock} tone="amber" hint={`${inrCompact(stats.pending)} awaiting review`} onClick={() => { setStatus('Pending'); setRange({ preset: 'all' }); }} />
        <KpiCard label="Approved Expenses" value={stats.approved} icon={CheckCircle2} tone="green" hint={`${stats.approvedRate.toFixed(0)}% approval rate in period`} onClick={() => setStatus('Approved')} />
        <KpiCard label="Expenses This Month" value={inrCompact(stats.month)} icon={CalendarRange} tone="violet" hint={`${stats.monthN} claims submitted`} onClick={() => setRange({ preset: 'month' })} />
      </div>

      <Card className="mt-4">
        <CardHeader title="Spend by category" subtitle={`Approved expenses · ${rangeText(range)} · click to filter`} />
        <div className="grid grid-cols-1 gap-x-8 gap-y-3 px-5 pb-5 md:grid-cols-2 xl:grid-cols-4">
          {stats.byCat.map((c) => (
            <button key={c.c} onClick={() => setCat(cat === c.c ? 'All' : c.c)} className={cx('rounded-lg p-2 text-left transition', cat === c.c ? 'bg-primary-50 ring-1 ring-primary-200' : 'hover:bg-surface')}>
              <div className="mb-1.5 flex justify-between text-[13px]"><span className="flex items-center gap-1.5 text-ink-700"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: c.color }} />{c.c}</span><span className="font-semibold tnum">{inrCompact(c.v)}</span></div>
              <div className="h-1.5 rounded-full bg-gray-100"><div className="h-full rounded-full" style={{ width: `${(c.v / maxCat) * 100}%`, background: c.color }} /></div>
            </button>
          ))}
        </div>
      </Card>

      <Card className="mt-4 overflow-hidden">
        <FilterBar right={<DateRangeFilter compact value={range} onChange={setRange} presets={['all', 'week', 'month', 'lastMonth', 'quarter', 'fy', 'custom']} />}>
          <SearchInput value={q} onChange={setQ} placeholder="Search ID, description or submitter" className="w-full sm:w-[280px]" />
          <Select value={cat} onChange={(e) => setCat(e.target.value)} className="w-[180px]"><option value="All">All categories</option>{EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select>
          <Select value={status} onChange={(e) => setStatus(e.target.value as ExpenseStatus | 'All')} className="w-[140px]">{['All', 'Pending', 'Approved', 'Rejected'].map((s) => <option key={s} value={s}>{s === 'All' ? 'All statuses' : s}</option>)}</Select>
          <Select value={dept} onChange={(e) => setDept(e.target.value)} className="w-[200px]"><option value="All">All projects</option>{PROJECTS.map((c) => <option key={c}>{c}</option>)}</Select>
        </FilterBar>
        {pendingSel.length > 0 && (
          <div className="flex items-center gap-3 border-t border-line bg-primary-50/60 px-4 py-2.5 text-sm">
            <span className="font-medium text-primary-800">{pendingSel.length} pending selected</span>
            <Button size="sm" variant="success" icon={CheckCircle2} onClick={() => bulk('Approved')}>Approve</Button>
            <Button size="sm" variant="danger" icon={XCircle} onClick={() => bulk('Rejected')}>Reject</Button>
            <button className="ml-auto text-xs text-ink-500 hover:text-ink-800" onClick={() => setSelected(new Set())}>Clear selection</button>
          </div>
        )}
        <DataTable rows={rows} rowKey={(r) => r.id} onRowClick={(r) => setViewing(r.id)} defaultSort={{ key: 'date', dir: 'desc' }} pageSize={12}
          empty={<EmptyState icon={Wallet} title="No expenses found" message="Adjust filters or record a new expense." action={<Button variant="primary" icon={Plus} onClick={() => setCreating(true)}>Add expense</Button>} />}
          columns={[
            { key: 'sel', header: '', width: 'w-8', render: (r) => r.status === 'Pending' ? <input type="checkbox" className="h-4 w-4 cursor-pointer rounded accent-primary-500" checked={selected.has(r.id)} onClick={(e) => e.stopPropagation()} onChange={() => toggleSel(r.id)} /> : null },
            { key: 'id', header: 'Expense ID', render: (r) => <span className="text-ink-500">{r.id}</span>, sort: (r) => r.id },
            { key: 'desc', header: 'Description', render: (r) => <div className="max-w-[230px]"><p className="truncate font-medium text-ink-900" title={r.description}>{r.description}</p><p className="flex items-center gap-1 truncate text-xs text-ink-400">{r.receipt && <Paperclip className="h-3 w-3" />}{r.department}</p></div>, sort: (r) => r.description },
            { key: 'cat', header: 'Category', render: (r) => r.category, sort: (r) => r.category },
            { key: 'date', header: 'Date', render: (r) => fmtDate(r.date), sort: (r) => r.date },
            { key: 'amt', header: 'Amount', align: 'right', render: (r) => <span className="font-semibold tnum">{inr(r.amount)}</span>, sort: (r) => r.amount },
            { key: 'method', header: 'Payment', render: (r) => <span className="text-ink-600">{r.method}</span> },
            { key: 'by', header: 'Submitted by', render: (r) => r.submittedBy, sort: (r) => r.submittedBy },
            { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} />, sort: (r) => r.status },
            { key: 'act', header: '', align: 'right', render: (r) => <Menu items={[
              { label: 'View details', icon: Eye, onClick: () => setViewing(r.id) },
              { label: 'Approve', icon: CheckCircle2, disabled: r.status !== 'Pending', onClick: () => { setExpenseStatus(r.id, 'Approved'); toast('success', `${r.id} approved`, inr(r.amount)); } },
              { label: 'Reject', icon: XCircle, danger: true, disabled: r.status !== 'Pending', onClick: () => setViewing(r.id) },
            ]} /> },
          ]} />
      </Card>

      {creating && <ExpenseForm onClose={() => setCreating(false)} />}
      {exp && <ExpenseDetail exp={exp} onClose={() => setViewing(null)} />}
    </div>
  );
}

function ExpenseForm({ onClose }: { onClose: () => void }) {
  const { data, addExpense } = useStore();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [f, setF] = useState({ description: '', category: '', date: todayISO(), amount: 0, method: 'UPI', submittedBy: 'Arjun Mehta', department: 'Head Office', notes: '' });
  const [receipt, setReceipt] = useState<{ name: string; size: number; url?: string } | null>(null);
  const [drag, setDrag] = useState(false);
  const [err, setErr] = useState<Record<string, string>>({});
  const set = (k: keyof typeof f, v: string | number) => setF((x) => ({ ...x, [k]: v }));
  const onFile = (file?: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast('error', 'File too large', 'Receipts must be under 5 MB.'); return; }
    setReceipt({ name: file.name, size: file.size, url: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined });
  };
  const submit = () => {
    const e: Record<string, string> = {};
    if (!f.description.trim()) e.description = 'Description is required';
    if (!f.category) e.category = 'Select a category';
    if (!(f.amount > 0)) e.amount = 'Enter an amount greater than 0';
    if (f.date > todayISO()) e.date = 'Expense date cannot be in the future';
    if (f.amount > 50000 && !receipt) e.receipt = 'A receipt is required for expenses above ₹50,000';
    setErr(e);
    if (Object.keys(e).length) return;
    const saved = addExpense({ ...f, description: f.description.trim(), receipt: receipt?.name });
    toast('success', `Expense ${saved.id} submitted`, `${inr(saved.amount)} · sent for approval`);
    onClose();
  };
  return (
    <Modal open onClose={onClose} title="Add expense" subtitle="Submitted expenses are routed to Finance for approval" icon={Wallet}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={submit}>Submit for approval</Button></>}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Description" required error={err.description} className="sm:col-span-2"><Input value={f.description} invalid={!!err.description} onChange={(e) => set('description', e.target.value)} placeholder="e.g. Truck hire – Peenya to Whitefield site" /></Field>
        <Field label="Category" required error={err.category}><Select value={f.category} invalid={!!err.category} onChange={(e) => set('category', e.target.value)}><option value="">Select category…</option>{EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select></Field>
        <Field label="Amount (₹)" required error={err.amount}><Input type="number" min={0} step="any" value={f.amount || ''} invalid={!!err.amount} onChange={(e) => set('amount', parseFloat(e.target.value) || 0)} placeholder="0" /></Field>
        <Field label="Expense date" required error={err.date}><Input type="date" value={f.date} max={todayISO()} invalid={!!err.date} onChange={(e) => set('date', e.target.value)} /></Field>
        <Field label="Payment method"><Select value={f.method} onChange={(e) => set('method', e.target.value)}>{PAYMENT_METHODS.map((c) => <option key={c}>{c}</option>)}</Select></Field>
        <Field label="Project / department"><Select value={f.department} onChange={(e) => set('department', e.target.value)}>{PROJECTS.map((c) => <option key={c}>{c}</option>)}</Select></Field>
        <Field label="Submitted by"><Select value={f.submittedBy} onChange={(e) => set('submittedBy', e.target.value)}><option>Arjun Mehta</option>{data.employees.map((e) => <option key={e.id}>{e.name}</option>)}</Select></Field>
        <div className="sm:col-span-2">
          <span className="mb-1.5 block text-[13px] font-medium text-ink-700">Receipt</span>
          {receipt ? (
            <div className="flex items-center gap-3 rounded-lg border border-line bg-surface/60 p-3">
              {receipt.url ? <img src={receipt.url} alt="" className="h-10 w-10 rounded object-cover" /> : <span className="flex h-10 w-10 items-center justify-center rounded bg-white ring-1 ring-line"><FileImage className="h-5 w-5 text-ink-400" /></span>}
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{receipt.name}</p><p className="text-xs text-ink-400">{(receipt.size / 1024).toFixed(0)} KB · ready to upload</p></div>
              <button onClick={() => setReceipt(null)} className="rounded p-1 text-ink-400 hover:bg-white hover:text-ink-700"><X className="h-4 w-4" /></button>
            </div>
          ) : (
            <div onClick={() => fileRef.current?.click()} onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); onFile(e.dataTransfer.files[0]); }}
              className={cx('flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-6 text-center transition', drag ? 'border-primary-400 bg-primary-50' : err.receipt ? 'border-red-300 bg-red-50/40' : 'border-line hover:border-primary-300 hover:bg-surface')}>
              <UploadCloud className="h-6 w-6 text-ink-400" />
              <p className="mt-2 text-sm"><span className="font-medium text-primary-600">Click to upload</span> or drag and drop</p>
              <p className="text-xs text-ink-400">PDF, JPG or PNG up to 5 MB</p>
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
          {err.receipt && <p className="mt-1 text-xs text-red-600">{err.receipt}</p>}
        </div>
        <Field label="Notes" className="sm:col-span-2"><Textarea value={f.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Optional context for the approver" /></Field>
      </div>
    </Modal>
  );
}

function ExpenseDetail({ exp, onClose }: { exp: Expense; onClose: () => void }) {
  const { setExpenseStatus } = useStore();
  const toast = useToast();
  const [note, setNote] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const act = (s: ExpenseStatus) => {
    if (s === 'Rejected' && !note.trim()) { setRejecting(true); return; }
    setExpenseStatus(exp.id, s, note.trim());
    toast(s === 'Approved' ? 'success' : 'info', `${exp.id} ${s.toLowerCase()}`, `${inr(exp.amount)} · ${exp.submittedBy} notified`);
    onClose();
  };
  return (
    <Modal open onClose={onClose} icon={Wallet} title={<span className="flex items-center gap-2">{exp.id} <StatusBadge status={exp.status} /></span>} subtitle={exp.description}
      footer={exp.status === 'Pending' ? <><Button variant="ghost" onClick={onClose} className="mr-auto">Close</Button><Button variant="danger" icon={XCircle} onClick={() => act('Rejected')}>Reject</Button><Button variant="success" icon={CheckCircle2} onClick={() => act('Approved')}>Approve</Button></> : <Button onClick={onClose}>Close</Button>}>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <p className="text-xs text-ink-500">Amount</p>
          <p className="mb-3 text-2xl font-semibold tnum">{inr(exp.amount)}</p>
          <DetailRow label="Category">{exp.category}</DetailRow>
          <DetailRow label="Date">{fmtDate(exp.date)}</DetailRow>
          <DetailRow label="Payment method">{exp.method}</DetailRow>
          <DetailRow label="Project / dept.">{exp.department}</DetailRow>
          <DetailRow label="Submitted by">{exp.submittedBy}</DetailRow>
          {exp.notes && <DetailRow label="Notes">{exp.notes}</DetailRow>}
          {exp.reviewNote && <DetailRow label="Review note">{exp.reviewNote}</DetailRow>}
        </div>
        <div>
          <p className="mb-2 text-[13px] font-medium text-ink-700">Receipt</p>
          {exp.receipt ? (
            <div className="flex aspect-[4/5] flex-col items-center justify-center rounded-xl border border-line bg-[repeating-linear-gradient(45deg,#F6F7F9,#F6F7F9_10px,#FFFFFF_10px,#FFFFFF_20px)] p-4 text-center">
              <FileImage className="h-10 w-10 text-ink-300" />
              <p className="mt-2 text-sm font-medium text-ink-700">{exp.receipt}</p>
              <p className="text-xs text-ink-400">Receipt preview placeholder</p>
            </div>
          ) : <div className="rounded-xl border border-dashed border-line p-6 text-center"><Paperclip className="mx-auto h-5 w-5 text-ink-300" /><p className="mt-2 text-sm text-ink-500">No receipt attached</p></div>}
        </div>
      </div>
      {exp.status === 'Pending' && (
        <Field label={rejecting ? 'Reason for rejection' : 'Approver comment'} required={rejecting} error={rejecting && !note.trim() ? 'Please add a reason before rejecting' : undefined} className="mt-5">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} invalid={rejecting && !note.trim()} placeholder="Optional for approval, required for rejection" />
        </Field>
      )}
    </Modal>
  );
}
