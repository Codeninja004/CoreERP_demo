import React, { useState } from 'react';
import { Bell, Building2, Database, FileText, RotateCcw, Save, ShieldCheck } from 'lucide-react';
import { useStore } from '../lib/store';
import type { Settings as S } from '../lib/types';
import { Badge, Button, Card, CardHeader, ConfirmModal, Field, Input, PageHeader, Select, Textarea, Toggle, cx, useToast, Avatar } from '../components/ui';
import { GST_RATES } from '../lib/seed';

type Section = 'company' | 'invoice' | 'notifications' | 'users' | 'data';

export default function Settings() {
  const { data, saveSettings, resetDemo } = useStore();
  const toast = useToast();
  const [f, setF] = useState<S>(data.settings);
  const [section, setSection] = useState<Section>('company');
  const [err, setErr] = useState<Record<string, string>>({});
  const [confirmReset, setConfirmReset] = useState(false);
  const dirty = JSON.stringify(f) !== JSON.stringify(data.settings);
  const set = <K extends keyof S>(k: K, v: S[K]) => setF((x) => ({ ...x, [k]: v }));
  const save = () => {
    const e: Record<string, string> = {};
    if (!f.companyName.trim()) e.companyName = 'Required';
    if (!/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/.test(f.gstin)) e.gstin = 'Enter a valid 15-character GSTIN';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = 'Enter a valid email';
    if (!f.invoicePrefix.trim()) e.invoicePrefix = 'Required';
    if (!(f.paymentTerms >= 0 && f.paymentTerms <= 180)) e.paymentTerms = '0–180 days';
    setErr(e);
    if (Object.keys(e).length) { toast('error', 'Please fix the highlighted fields'); return; }
    saveSettings(f);
    toast('success', 'Settings saved', 'Changes apply across all modules.');
  };
  const nav: { k: Section; label: string; icon: React.ElementType }[] = [
    { k: 'company', label: 'Company profile', icon: Building2 }, { k: 'invoice', label: 'Invoicing & tax', icon: FileText },
    { k: 'notifications', label: 'Notifications', icon: Bell }, { k: 'users', label: 'Users & roles', icon: ShieldCheck }, { k: 'data', label: 'Data & demo', icon: Database },
  ];
  return (
    <div>
      <PageHeader title="Settings" subtitle="Configure your organisation, billing defaults and alerts."
        actions={<><Button variant="ghost" disabled={!dirty} onClick={() => { setF(data.settings); setErr({}); }}>Discard</Button><Button variant="primary" icon={Save} disabled={!dirty} onClick={save}>Save changes</Button></>} />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[220px_1fr]">
        <Card className="h-fit p-2">
          {nav.map((n) => <button key={n.k} onClick={() => setSection(n.k)} className={cx('flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium', section === n.k ? 'bg-primary-50 text-primary-700' : 'text-ink-600 hover:bg-surface')}><n.icon className="h-4 w-4" />{n.label}</button>)}
        </Card>
        <div className="max-w-3xl space-y-4">
          {section === 'company' && (
            <Card>
              <CardHeader title="Company profile" subtitle="Shown on invoices, reports and exports" />
              <div className="grid grid-cols-1 gap-4 px-5 pb-5 sm:grid-cols-2">
                <Field label="Display name" required error={err.companyName}><Input value={f.companyName} invalid={!!err.companyName} onChange={(e) => set('companyName', e.target.value)} /></Field>
                <Field label="Legal name"><Input value={f.legalName} onChange={(e) => set('legalName', e.target.value)} /></Field>
                <Field label="GSTIN" required error={err.gstin}><Input value={f.gstin} invalid={!!err.gstin} maxLength={15} onChange={(e) => set('gstin', e.target.value.toUpperCase())} /></Field>
                <Field label="PAN"><Input value={f.pan} maxLength={10} onChange={(e) => set('pan', e.target.value.toUpperCase())} /></Field>
                <Field label="Registered address" className="sm:col-span-2"><Textarea value={f.address} onChange={(e) => set('address', e.target.value)} /></Field>
                <Field label="Accounts email" required error={err.email}><Input value={f.email} invalid={!!err.email} onChange={(e) => set('email', e.target.value)} /></Field>
                <Field label="Phone"><Input value={f.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
                <Field label="Financial year starts"><Select value={f.fyStart} onChange={(e) => set('fyStart', e.target.value)}><option>April</option><option>January</option></Select></Field>
              </div>
            </Card>
          )}
          {section === 'invoice' && (
            <Card>
              <CardHeader title="Invoicing & tax" subtitle="Defaults for new invoices" />
              <div className="grid grid-cols-1 gap-4 px-5 pb-5 sm:grid-cols-2">
                <Field label="Invoice number prefix" required error={err.invoicePrefix} hint={`Next invoice: ${f.invoicePrefix}${data.seq.invoice}`}><Input value={f.invoicePrefix} invalid={!!err.invoicePrefix} onChange={(e) => set('invoicePrefix', e.target.value)} /></Field>
                <Field label="Default payment terms (days)" error={err.paymentTerms}><Input type="number" value={f.paymentTerms} onChange={(e) => set('paymentTerms', parseInt(e.target.value) || 0)} /></Field>
                <Field label="Default GST rate"><Select value={f.defaultGst} onChange={(e) => set('defaultGst', Number(e.target.value))}>{GST_RATES.map((g) => <option key={g} value={g}>{g}%</option>)}</Select></Field>
                <div />
                <Field label="Bank name & branch" className="sm:col-span-2"><Input value={f.bankName} onChange={(e) => set('bankName', e.target.value)} /></Field>
                <Field label="Account number"><Input value={f.bankAccount} onChange={(e) => set('bankAccount', e.target.value)} /></Field>
                <Field label="IFSC"><Input value={f.ifsc} onChange={(e) => set('ifsc', e.target.value.toUpperCase())} /></Field>
              </div>
            </Card>
          )}
          {section === 'notifications' && (
            <Card>
              <CardHeader title="Notifications" subtitle="Choose which alerts appear in the notification centre" />
              <div className="divide-y divide-line px-5 pb-3">
                <Toggle label="Low-stock alerts" description="Notify when an item falls to or below its reorder level" checked={f.notifyLowStock} onChange={(v) => set('notifyLowStock', v)} />
                <Toggle label="Overdue invoices" description="Notify when a customer invoice passes its due date" checked={f.notifyOverdue} onChange={(v) => set('notifyOverdue', v)} />
                <Toggle label="Pending approvals" description="Expense claims and leave requests awaiting review" checked={f.notifyApprovals} onChange={(v) => set('notifyApprovals', v)} />
              </div>
            </Card>
          )}
          {section === 'users' && (
            <Card>
              <CardHeader title="Users & roles" subtitle="Role-based access is illustrated for this demo" actions={<Button size="sm" onClick={() => toast('info', 'Invites disabled in demo')}>Invite user</Button>} />
              <div className="divide-y divide-line px-5 pb-2">
                {[['Arjun Mehta', 'arjun@meridianbuild.in', 'Administrator'], ['Priya Nair', 'priya.nair@meridianbuild.in', 'Finance Approver'], ['Mohammed Irfan', 'mohammed.irfan@meridianbuild.in', 'Procurement'], ['Sneha Kulkarni', 'sneha.kulkarni@meridianbuild.in', 'HR Manager'], ['Suresh Gowda', 'suresh.gowda@meridianbuild.in', 'Warehouse']].map(([n, e, r]) => (
                  <div key={n} className="flex items-center gap-3 py-3"><Avatar name={n} size={32} /><div className="flex-1"><p className="text-sm font-medium">{n}</p><p className="text-xs text-ink-500">{e}</p></div><Badge tone={r === 'Administrator' ? 'blue' : 'gray'} dot={false}>{r}</Badge></div>
                ))}
              </div>
            </Card>
          )}
          {section === 'data' && (
            <Card>
              <CardHeader title="Data & demo" subtitle="This prototype keeps data in your browser only" />
              <div className="space-y-3 px-5 pb-5 text-sm">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[['Invoices', data.invoices.length], ['Stock items', data.items.length], ['Employees', data.employees.length], ['Expenses', data.expenses.length]].map(([l, v]) => <div key={l as string} className="rounded-lg border border-line p-3"><p className="text-xs text-ink-500">{l}</p><p className="font-semibold">{v}</p></div>)}
                </div>
                <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50/50 p-4">
                  <div><p className="font-medium text-ink-900">Reset demo data</p><p className="text-xs text-ink-500">Restore the original sample dataset. Your changes will be lost.</p></div>
                  <Button variant="danger" icon={RotateCcw} onClick={() => setConfirmReset(true)}>Reset</Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
      <ConfirmModal open={confirmReset} onClose={() => setConfirmReset(false)} tone="danger" title="Reset all demo data?" message="All invoices, stock movements, attendance and expenses you created will be replaced with the original sample data." confirmLabel="Reset data"
        onConfirm={() => { resetDemo(); setConfirmReset(false); toast('success', 'Demo data restored'); setTimeout(() => location.reload(), 300); }} />
    </div>
  );
}
