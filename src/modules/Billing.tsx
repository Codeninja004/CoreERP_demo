import React, { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock, Copy, Download, Edit3, Eye, FileText, IndianRupee, Plus, Printer, Receipt, Trash2, Wallet } from 'lucide-react';
import { useIntent, useStore, invoiceStatus, invoiceTotal, lineTotals } from '../lib/store';
import type { Invoice, InvoiceStatus, LineItem } from '../lib/types';
import { Badge, Button, Card, DataTable, DateRangeFilter, EmptyState, Field, FilterBar, Input, KpiCard, Menu, Modal, PageHeader, SearchInput, Select, StatusBadge, Textarea, cx, useExport, usePrint, useToast } from '../components/ui';
import { addDays, amountInWords, DateRange, diffDays, fmtDate, inr, inrCompact, inRange, resolveRange, todayISO, toCSV } from '../lib/format';
import { CUSTOMERS, GST_RATES } from '../lib/seed';

const STATUSES: (InvoiceStatus | 'All')[] = ['All', 'Paid', 'Pending', 'Overdue', 'Draft'];

export default function Billing() {
  const { data, markInvoicePaid } = useStore();
  const toast = useToast();
  const exportCsv = useExport();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<InvoiceStatus | 'All'>('All');
  const [range, setRange] = useState<DateRange>({ preset: 'all' });
  const [editing, setEditing] = useState<Invoice | 'new' | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  const [paying, setPaying] = useState<Invoice | null>(null);

  useIntent('billing', (i) => {
    if (i.action === 'new') setEditing('new');
    if (i.id) setViewing(i.id);
    if (i.sub && STATUSES.includes(i.sub as InvoiceStatus)) setStatus(i.sub as InvoiceStatus);
  });

  const { from, to } = resolveRange(range);
  const rows = useMemo(() => {
    const s = q.toLowerCase();
    return data.invoices.filter((i) => (status === 'All' || invoiceStatus(i) === status) && inRange(i.date, from, to) && (!s || i.number.toLowerCase().includes(s) || i.customer.toLowerCase().includes(s)));
  }, [data.invoices, q, status, from, to]);

  const stats = useMemo(() => {
    const live = data.invoices.filter((i) => !i.draft && inRange(i.date, from, to));
    const sum = (f: (i: Invoice) => boolean) => live.filter(f).reduce((s, i) => s + invoiceTotal(i), 0);
    const cnt = (f: (i: Invoice) => boolean) => live.filter(f).length;
    return {
      total: sum(() => true), totalN: live.length, paid: sum((i) => i.paid), paidN: cnt((i) => i.paid),
      pending: sum((i) => invoiceStatus(i) === 'Pending'), pendingN: cnt((i) => invoiceStatus(i) === 'Pending'),
      overdue: sum((i) => invoiceStatus(i) === 'Overdue'), overdueN: cnt((i) => invoiceStatus(i) === 'Overdue'),
    };
  }, [data.invoices, from, to]);

  const counts = useMemo(() => Object.fromEntries(STATUSES.map((s) => [s, s === 'All' ? data.invoices.length : data.invoices.filter((i) => invoiceStatus(i) === s).length])), [data.invoices]);
  const viewInv = data.invoices.find((i) => i.id === viewing) || null;

  const doExport = () => exportCsv(`invoices-${todayISO()}.csv`, toCSV(
    ['Invoice No', 'Customer', 'GSTIN', 'Invoice Date', 'Due Date', 'Taxable Value', 'GST', 'Total', 'Status', 'Paid On'],
    rows.map((i) => { const t = lineTotals(i.items); return [i.number, i.customer, i.customerGstin || '', i.date, i.dueDate, t.subtotal.toFixed(2), t.tax.toFixed(2), t.total, invoiceStatus(i), i.paidOn || '']; }),
  ));

  return (
    <div>
      <PageHeader title="Billing" subtitle="Create GST invoices, track receivables and record payments."
        actions={<><Button icon={Download} onClick={doExport}>Export</Button><Button variant="primary" icon={Plus} onClick={() => setEditing('new')}>New invoice</Button></>} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total Invoiced" value={inrCompact(stats.total)} icon={Receipt} tone="blue" hint={`${stats.totalN} invoices`} onClick={() => setStatus('All')} />
        <KpiCard label="Paid Amount" value={inrCompact(stats.paid)} icon={CheckCircle2} tone="green" hint={`${stats.paidN} invoices · ${stats.total ? ((stats.paid / stats.total) * 100).toFixed(0) : 0}% collected`} onClick={() => setStatus('Paid')} />
        <KpiCard label="Pending Amount" value={inrCompact(stats.pending)} icon={Clock} tone="amber" hint={`${stats.pendingN} invoices not yet due`} onClick={() => setStatus('Pending')} />
        <KpiCard label="Overdue Amount" value={inrCompact(stats.overdue)} icon={AlertCircle} tone="red" hint={`${stats.overdueN} invoices past due date`} onClick={() => setStatus('Overdue')} />
      </div>

      <Card className="mt-5 overflow-hidden">
        <div className="flex gap-1 overflow-x-auto border-b border-line px-4 pt-3">
          {STATUSES.map((s) => (
            <button key={s} onClick={() => setStatus(s)} className={cx('-mb-px flex items-center gap-2 border-b-2 px-3 pb-2.5 text-sm font-medium', status === s ? 'border-primary-500 text-primary-700' : 'border-transparent text-ink-500 hover:text-ink-800')}>
              {s === 'All' ? 'All invoices' : s}<span className="rounded-full bg-gray-100 px-1.5 text-[11px] font-semibold text-ink-500">{counts[s]}</span>
            </button>
          ))}
        </div>
        <FilterBar right={<DateRangeFilter compact value={range} onChange={setRange} presets={['all', 'month', 'lastMonth', 'quarter', 'last90', 'fy', 'custom']} />}>
          <SearchInput value={q} onChange={setQ} placeholder="Search by invoice number or customer" className="w-full sm:w-[320px]" />
          <Select value={status} onChange={(e) => setStatus(e.target.value as InvoiceStatus | 'All')} className="w-[150px]">
            {STATUSES.map((s) => <option key={s} value={s}>{s === 'All' ? 'All statuses' : s}</option>)}
          </Select>
          {(q || status !== 'All' || range.preset !== 'all') && <Button variant="ghost" size="sm" onClick={() => { setQ(''); setStatus('All'); setRange({ preset: 'all' }); }}>Clear filters</Button>}
        </FilterBar>
        <DataTable rows={rows} rowKey={(r) => r.id} onRowClick={(r) => setViewing(r.id)} defaultSort={{ key: 'date', dir: 'desc' }}
          empty={<EmptyState icon={FileText} title="No invoices match" message="Try a different status, date range or search term." action={<Button variant="primary" icon={Plus} onClick={() => setEditing('new')}>Create invoice</Button>} />}
          columns={[
            { key: 'number', header: 'Invoice #', render: (r) => <span className="font-medium text-primary-700">{r.number}</span>, sort: (r) => r.number },
            { key: 'customer', header: 'Customer', render: (r) => <div><p className="font-medium text-ink-900">{r.customer}</p><p className="text-xs text-ink-400">{r.items.length} line item{r.items.length > 1 ? 's' : ''}</p></div>, sort: (r) => r.customer },
            { key: 'date', header: 'Invoice date', render: (r) => fmtDate(r.date), sort: (r) => r.date },
            { key: 'due', header: 'Due date', render: (r) => { const st = invoiceStatus(r); const d = diffDays(r.dueDate, todayISO()); return <div><p>{fmtDate(r.dueDate)}</p>{st === 'Overdue' && <p className="text-xs text-red-600">{-d} days overdue</p>}{st === 'Pending' && <p className="text-xs text-ink-400">{d === 0 ? 'Due today' : d === 1 ? 'Due tomorrow' : `in ${d} days`}</p>}</div>; }, sort: (r) => r.dueDate },
            { key: 'amount', header: 'Total amount', align: 'right', render: (r) => <span className="font-semibold tnum">{inr(invoiceTotal(r))}</span>, sort: (r) => invoiceTotal(r) },
            { key: 'status', header: 'Status', render: (r) => <StatusBadge status={invoiceStatus(r)} />, sort: (r) => invoiceStatus(r) },
            { key: 'act', header: '', align: 'right', render: (r) => (
              <Menu items={[
                { label: 'View details', icon: Eye, onClick: () => setViewing(r.id) },
                { label: 'Edit invoice', icon: Edit3, onClick: () => setEditing(r), disabled: r.paid },
                { label: 'Mark as paid', icon: CheckCircle2, onClick: () => setPaying(r), disabled: r.paid },
                { label: 'Print / Download', icon: Printer, onClick: () => setViewing(r.id), divider: true },
              ]} />) },
          ]} />
      </Card>

      {editing && <InvoiceForm initial={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} onSaved={(inv) => { setEditing(null); setViewing(inv.id); }} />}
      {viewInv && <InvoiceView inv={viewInv} onClose={() => setViewing(null)} onEdit={() => { setEditing(viewInv); setViewing(null); }} onPay={() => setPaying(viewInv)} />}
      {paying && <PaymentModal inv={paying} onClose={() => setPaying(null)} onConfirm={(mode, on) => { markInvoicePaid(paying.id, mode, on); toast('success', `${paying.number} marked as paid`, `${inr(invoiceTotal(paying))} received via ${mode}`); setPaying(null); }} />}
    </div>
  );
}

function PaymentModal({ inv, onClose, onConfirm }: { inv: Invoice; onClose: () => void; onConfirm: (mode: string, on: string) => void }) {
  const [mode, setMode] = useState('NEFT');
  const [on, setOn] = useState(todayISO());
  const [ref, setRef] = useState('');
  const err = on < inv.date ? 'Payment date cannot be before invoice date' : on > todayISO() ? 'Payment date cannot be in the future' : '';
  return (
    <Modal open onClose={onClose} title="Record payment" subtitle={`${inv.number} · ${inv.customer}`} icon={IndianRupee} size="sm"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="success" icon={CheckCircle2} disabled={!!err} onClick={() => onConfirm(mode, on)}>Mark as paid</Button></>}>
      <div className="mb-4 rounded-lg bg-surface p-3.5"><p className="text-xs text-ink-500">Amount due</p><p className="text-2xl font-semibold tnum">{inr(invoiceTotal(inv))}</p></div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Payment mode"><Select value={mode} onChange={(e) => setMode(e.target.value)}>{['NEFT', 'RTGS', 'IMPS', 'UPI', 'Cheque', 'Cash'].map((m) => <option key={m}>{m}</option>)}</Select></Field>
        <Field label="Received on" error={err}><Input type="date" value={on} invalid={!!err} onChange={(e) => setOn(e.target.value)} /></Field>
        <Field label="Transaction reference" className="col-span-2" hint="UTR / cheque number (optional)"><Input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="e.g. SBIN226171234567" /></Field>
      </div>
    </Modal>
  );
}

// ---------------- Invoice form ----------------
const blankLine = (gst: number): LineItem => ({ id: 'L' + Math.random().toString(36).slice(2, 8), description: '', hsn: '', qty: 1, unitPrice: 0, gstRate: gst });

function InvoiceForm({ initial, onClose, onSaved }: { initial?: Invoice; onClose: () => void; onSaved: (i: Invoice) => void }) {
  const { data, saveInvoice } = useStore();
  const toast = useToast();
  const s = data.settings;
  const [customer, setCustomer] = useState(initial?.customer || '');
  const [gstin, setGstin] = useState(initial?.customerGstin || '');
  const [address, setAddress] = useState(initial?.customerAddress || '');
  const [date, setDate] = useState(initial?.date || todayISO());
  const [due, setDue] = useState(initial?.dueDate || addDays(todayISO(), s.paymentTerms));
  const [items, setItems] = useState<LineItem[]>(initial?.items.map((l) => ({ ...l })) || [blankLine(s.defaultGst)]);
  const [notes, setNotes] = useState(initial?.notes || '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState(false);
  const t = lineTotals(items);
  const knownCustomers = useMemo(() => Array.from(new Set([...CUSTOMERS.map((c) => c.name), ...data.invoices.map((i) => i.customer)])).sort(), [data.invoices]);
  const catalog = useMemo(() => data.items.map((i) => ({ d: i.name, price: Math.round(i.price * 1.08), hsn: i.hsn })), [data.items]);

  const pickCustomer = (name: string) => {
    setCustomer(name);
    const c = CUSTOMERS.find((x) => x.name === name) || data.invoices.find((i) => i.customer === name);
    if (c) { setGstin('gstin' in c ? c.gstin : (c as Invoice).customerGstin || ''); setAddress('address' in c ? c.address : (c as Invoice).customerAddress || ''); }
  };
  const upd = (id: string, patch: Partial<LineItem>) => setItems((arr) => arr.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const pickDesc = (id: string, d: string) => { const c = catalog.find((x) => x.d === d); upd(id, c ? { description: d, unitPrice: c.price, hsn: c.hsn } : { description: d }); };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!customer.trim()) e.customer = 'Customer name is required';
    if (gstin && !/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/.test(gstin.toUpperCase())) e.gstin = 'Enter a valid 15-character GSTIN';
    if (!date) e.date = 'Required';
    if (!due) e.due = 'Required'; else if (due < date) e.due = 'Due date must be on or after invoice date';
    items.forEach((l) => {
      if (!l.description.trim()) e['d' + l.id] = 'Required';
      if (!(l.qty > 0)) e['q' + l.id] = '> 0';
      if (!(l.unitPrice > 0)) e['p' + l.id] = '> 0';
    });
    if (items.length === 0) e.items = 'Add at least one line item';
    return e;
  };
  const submit = (draft: boolean) => {
    setTouched(true);
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) { toast('error', 'Please fix the highlighted fields', `${Object.keys(e).length} field${Object.keys(e).length > 1 ? 's' : ''} need attention.`); return; }
    const inv = saveInvoice({ ...(initial || {}), id: initial?.id, customer: customer.trim(), customerGstin: gstin.toUpperCase(), customerAddress: address, date, dueDate: due, items, notes, paid: initial?.paid || false, draft } as Invoice);
    toast('success', initial ? `Invoice ${inv.number} updated` : draft ? `Draft ${inv.number} saved` : `Invoice ${inv.number} created`, `${customer} · ${inr(t.total)}`);
    onSaved(inv);
  };
  const live: Record<string, string> = touched ? Object.fromEntries(Object.entries(validate()).filter(([k]) => k in errors)) : {};

  return (
    <Modal open onClose={onClose} size="xl" icon={Receipt} title={initial ? `Edit invoice ${initial.number}` : 'New invoice'} subtitle="All amounts in INR. GST is split equally into CGST and SGST for intra-state supply."
      footer={<>
        <span className="mr-auto text-sm text-ink-500">Grand total <b className="ml-1 text-base text-ink-900 tnum">{inr(t.total)}</b></span>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        {(!initial || initial.draft) && <Button onClick={() => submit(true)}>Save as draft</Button>}
        <Button variant="primary" icon={CheckCircle2} onClick={() => submit(false)}>{initial && !initial.draft ? 'Save changes' : 'Save invoice'}</Button>
      </>}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="space-y-3 md:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">Bill to</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Customer" required error={live.customer}>
              <Input list="cust-list" value={customer} invalid={!!live.customer} onChange={(e) => pickCustomer(e.target.value)} placeholder="Search or enter customer" />
              <datalist id="cust-list">{knownCustomers.map((c) => <option key={c} value={c} />)}</datalist>
            </Field>
            <Field label="Customer GSTIN" error={live.gstin}><Input value={gstin} invalid={!!live.gstin} onChange={(e) => setGstin(e.target.value.toUpperCase())} placeholder="29ABCDE1234F1Z5" maxLength={15} /></Field>
            <Field label="Billing address" className="sm:col-span-2"><Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, city, PIN" /></Field>
          </div>
        </div>
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">Invoice details</p>
          <Field label="Invoice number"><Input disabled value={initial?.number || `${s.invoicePrefix}${data.seq.invoice} (auto)`} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Invoice date" required error={live.date}><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
            <Field label="Due date" required error={live.due}><Input type="date" value={due} invalid={!!live.due} onChange={(e) => setDue(e.target.value)} /></Field>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-wider text-ink-400">Line items</p><span className="text-xs text-ink-400">Pick from inventory or type a service description</span></div>
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[760px]">
            <thead><tr className="bg-surface/70 border-b border-line">
              <th className="th w-8">#</th><th className="th">Product / service description</th><th className="th w-24">HSN/SAC</th><th className="th w-24 text-right">Qty</th><th className="th w-32 text-right">Unit price (₹)</th><th className="th w-24">GST</th><th className="th w-32 text-right">Amount</th><th className="th w-10" />
            </tr></thead>
            <tbody>
              {items.map((l, idx) => (
                <tr key={l.id} className="border-b border-line/70 last:border-0 align-top">
                  <td className="px-4 py-2.5 text-sm text-ink-400">{idx + 1}</td>
                  <td className="px-2 py-2"><Input list="cat-list" value={l.description} invalid={!!live['d' + l.id]} onChange={(e) => pickDesc(l.id, e.target.value)} placeholder="e.g. OPC 53 Grade Cement (50 kg bag)" /></td>
                  <td className="px-2 py-2"><Input value={l.hsn || ''} onChange={(e) => upd(l.id, { hsn: e.target.value })} placeholder="2523" /></td>
                  <td className="px-2 py-2"><Input type="number" min={0} step="any" className="text-right" value={l.qty || ''} invalid={!!live['q' + l.id]} onChange={(e) => upd(l.id, { qty: parseFloat(e.target.value) || 0 })} /></td>
                  <td className="px-2 py-2"><Input type="number" min={0} step="any" className="text-right" value={l.unitPrice || ''} invalid={!!live['p' + l.id]} onChange={(e) => upd(l.id, { unitPrice: parseFloat(e.target.value) || 0 })} /></td>
                  <td className="px-2 py-2"><Select value={l.gstRate} onChange={(e) => upd(l.id, { gstRate: Number(e.target.value) })}>{GST_RATES.map((g) => <option key={g} value={g}>{g}%</option>)}</Select></td>
                  <td className="px-4 py-2.5 text-right text-sm font-medium tnum">{inr(l.qty * l.unitPrice, 2)}</td>
                  <td className="px-2 py-2"><button disabled={items.length === 1} onClick={() => setItems(items.filter((x) => x.id !== l.id))} className="flex h-9 w-8 items-center justify-center rounded-lg text-ink-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30" title="Remove line"><Trash2 className="h-4 w-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <datalist id="cat-list">{catalog.map((c) => <option key={c.d} value={c.d} />)}<option value="Transportation & Unloading Charges" /><option value="Site Supervision Services" /></datalist>
        </div>
        <Button size="sm" variant="subtle" icon={Plus} className="mt-3" onClick={() => setItems([...items, blankLine(s.defaultGst)])}>Add line item</Button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <Field label="Notes / terms"><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Payment terms, delivery notes, PO reference…" /></Field>
        <div className="rounded-xl border border-line bg-surface/60 p-4 text-sm">
          <div className="flex justify-between py-1"><span className="text-ink-500">Subtotal (taxable value)</span><span className="font-medium tnum">{inr(t.subtotal, 2)}</span></div>
          <div className="flex justify-between py-1"><span className="text-ink-500">CGST</span><span className="tnum">{inr(t.cgst, 2)}</span></div>
          <div className="flex justify-between py-1"><span className="text-ink-500">SGST</span><span className="tnum">{inr(t.sgst, 2)}</span></div>
          <div className="flex justify-between py-1"><span className="text-ink-500">Round off</span><span className="tnum">{inr(t.total - t.subtotal - t.tax, 2)}</span></div>
          <div className="mt-2 flex justify-between border-t border-line pt-2.5 text-base"><span className="font-semibold">Grand total</span><span className="font-semibold tnum">{inr(t.total)}</span></div>
          <p className="mt-1 text-right text-xs text-ink-400">{amountInWords(t.total)}</p>
        </div>
      </div>
    </Modal>
  );
}

// ---------------- Invoice view / print ----------------
function InvoiceView({ inv, onClose, onEdit, onPay }: { inv: Invoice; onClose: () => void; onEdit: () => void; onPay: () => void }) {
  const { data } = useStore();
  const s = data.settings;
  const print = usePrint();
  const toast = useToast();
  const t = lineTotals(inv.items);
  const st = invoiceStatus(inv);
  const taxGroups = GST_RATES.map((r) => ({ r, base: inv.items.filter((l) => l.gstRate === r).reduce((a, l) => a + l.qty * l.unitPrice, 0) })).filter((g) => g.base > 0);
  const copyLink = async () => { try { await navigator.clipboard.writeText(`Invoice ${inv.number} for ${inr(t.total)} due ${fmtDate(inv.dueDate)} — ${s.legalName}`); toast('success', 'Payment reminder copied'); } catch { toast('error', 'Clipboard unavailable'); } };
  return (
    <Modal open onClose={onClose} size="lg" title={<span className="flex items-center gap-2">{inv.number} <StatusBadge status={st} /></span>} subtitle={`${inv.customer} · issued ${fmtDate(inv.date)}`}
      footer={<>
        <Button variant="ghost" icon={Copy} onClick={copyLink} className="mr-auto">Copy reminder</Button>
        {!inv.paid && <Button icon={Edit3} onClick={onEdit}>Edit</Button>}
        <Button icon={Printer} onClick={print}>Print / PDF</Button>
        {!inv.paid && <Button variant="success" icon={CheckCircle2} onClick={onPay}>Mark as paid</Button>}
      </>}>
      {inv.paid && <div className="no-print mb-4 flex items-center gap-2 rounded-lg bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800"><CheckCircle2 className="h-4 w-4" />Paid on {fmtDate(inv.paidOn)} via {inv.paymentMode}</div>}
      {st === 'Overdue' && <div className="no-print mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-700"><AlertCircle className="h-4 w-4" />Overdue by {diffDays(todayISO(), inv.dueDate)} days — consider sending a payment reminder.</div>}
      {st === 'Draft' && <div className="no-print mb-4 flex items-center gap-2 rounded-lg bg-gray-100 px-3.5 py-2.5 text-sm text-ink-700"><FileText className="h-4 w-4" />Draft — not yet issued to the customer. Edit and save to issue.</div>}

      <div className="print-area rounded-xl border border-line bg-white p-7 text-ink-900">
        <div className="flex flex-wrap items-start justify-between gap-6 border-b border-line pb-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary-500 text-lg font-bold text-white">{s.companyName[0]}</div>
            <div><p className="text-base font-semibold">{s.legalName}</p><p className="mt-0.5 max-w-[280px] text-xs leading-5 text-ink-500">{s.address}</p><p className="text-xs text-ink-500">GSTIN: {s.gstin} · {s.phone}</p></div>
          </div>
          <div className="text-right">
            <p className="text-xl font-semibold tracking-tight text-primary-700">TAX INVOICE</p>
            <p className="mt-1 text-sm font-medium">{inv.number}</p>
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs"><span className="text-ink-500">Invoice date</span><span>{fmtDate(inv.date)}</span><span className="text-ink-500">Due date</span><span>{fmtDate(inv.dueDate)}</span></div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-6 py-5 text-sm">
          <div><p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-400">Bill to</p><p className="font-semibold">{inv.customer}</p><p className="text-xs leading-5 text-ink-500">{inv.customerAddress || '—'}</p>{inv.customerGstin && <p className="text-xs text-ink-500">GSTIN: {inv.customerGstin}</p>}</div>
          <div className="text-right"><p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-400">Amount due</p><p className="text-2xl font-semibold tnum">{inv.paid ? inr(0) : inr(t.total)}</p><p className="text-xs text-ink-500">Place of supply: Karnataka</p></div>
        </div>
        <table className="w-full text-sm">
          <thead><tr className="border-y border-line bg-surface text-left text-[11px] uppercase tracking-wide text-ink-500">
            <th className="px-3 py-2 font-semibold">#</th><th className="px-3 py-2 font-semibold">Description</th><th className="px-3 py-2 font-semibold">HSN</th><th className="px-3 py-2 text-right font-semibold">Qty</th><th className="px-3 py-2 text-right font-semibold">Rate</th><th className="px-3 py-2 text-right font-semibold">GST</th><th className="px-3 py-2 text-right font-semibold">Amount</th>
          </tr></thead>
          <tbody>
            {inv.items.map((l, i) => (
              <tr key={l.id} className="border-b border-line/70">
                <td className="px-3 py-2.5 text-ink-400">{i + 1}</td><td className="px-3 py-2.5">{l.description}</td><td className="px-3 py-2.5 text-ink-500">{l.hsn || '—'}</td>
                <td className="px-3 py-2.5 text-right tnum">{l.qty.toLocaleString('en-IN')}</td><td className="px-3 py-2.5 text-right tnum">{inr(l.unitPrice, 2)}</td><td className="px-3 py-2.5 text-right">{l.gstRate}%</td><td className="px-3 py-2.5 text-right font-medium tnum">{inr(l.qty * l.unitPrice, 2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 flex flex-wrap justify-between gap-6">
          <div className="max-w-[320px] text-xs leading-5 text-ink-500">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-400">Tax summary</p>
            {taxGroups.map((g) => <p key={g.r}>GST @ {g.r}% on {inr(g.base, 2)} = CGST {inr((g.base * g.r) / 200, 2)} + SGST {inr((g.base * g.r) / 200, 2)}</p>)}
            <p className="mt-3 mb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-400">Bank details</p>
            <p>{s.bankName}<br />A/c: {s.bankAccount} · IFSC: {s.ifsc}</p>
            {inv.notes && <><p className="mt-3 mb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-400">Notes</p><p>{inv.notes}</p></>}
          </div>
          <div className="w-full max-w-[280px] text-sm">
            <div className="flex justify-between py-1"><span className="text-ink-500">Subtotal</span><span className="tnum">{inr(t.subtotal, 2)}</span></div>
            <div className="flex justify-between py-1"><span className="text-ink-500">CGST</span><span className="tnum">{inr(t.cgst, 2)}</span></div>
            <div className="flex justify-between py-1"><span className="text-ink-500">SGST</span><span className="tnum">{inr(t.sgst, 2)}</span></div>
            <div className="mt-1 flex justify-between border-t border-ink-900 pt-2 text-base font-semibold"><span>Total</span><span className="tnum">{inr(t.total)}</span></div>
            <p className="mt-1 text-right text-[11px] text-ink-500">{amountInWords(t.total)}</p>
          </div>
        </div>
        <div className="mt-8 flex items-end justify-between border-t border-line pt-4 text-xs text-ink-400">
          <p>This is a computer-generated invoice. Thank you for your business.</p>
          <p className="text-right"><span className="block h-8" />For {s.legalName}<br />Authorised signatory</p>
        </div>
      </div>
    </Modal>
  );
}
