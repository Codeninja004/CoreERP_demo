import React, { useMemo, useState } from 'react';
import { Briefcase, Calendar, CalendarCheck, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock, Download, Edit3, Eye, IndianRupee, Mail, MapPin, Phone, Plus, UserCheck, UserMinus, UserPlus, Users, Wallet, XCircle } from 'lucide-react';
import { useIntent, useStore, payrollBreakup } from '../lib/store';
import type { AttendanceMark, Employee, EmpStatus, LeaveRequest, LeaveStatus } from '../lib/types';
import { Avatar, Badge, Button, Card, CardHeader, ConfirmModal, DataTable, DetailRow, EmptyState, Field, FilterBar, Input, KpiCard, Menu, Modal, PageHeader, ProgressBar, SearchInput, Select, StatusBadge, Tabs, Textarea, cx, useExport, useToast } from '../components/ui';
import { addDays, addMonths, diffDays, fmtDate, inr, inrCompact, isSunday, monthKey, monthLong, startOfMonth, todayISO, toCSV, weekday } from '../lib/format';
import { DEPARTMENTS } from '../lib/seed';

type Tab = 'directory' | 'attendance' | 'leave' | 'payroll';

export default function HR() {
  const { data } = useStore();
  const [tab, setTab] = useState<Tab>('directory');
  const [editing, setEditing] = useState<Employee | 'new' | null>(null);
  const [profile, setProfile] = useState<string | null>(null);
  useIntent('hr', (i) => {
    if (i.action === 'new') { setTab('directory'); setEditing('new'); }
    if (i.id) setProfile(i.id);
    if (i.sub === 'leave') setTab('leave');
  });
  const today = todayISO();
  const todayMarks = data.attendance[today] || {};
  const present = Object.values(todayMarks).filter((v) => v === 'P' || v === 'HD').length;
  const onLeave = Object.values(todayMarks).filter((v) => v === 'L').length;
  const pending = data.leaves.filter((l) => l.status === 'Pending').length;
  const active = data.employees.filter((e) => e.status !== 'Inactive');
  const emp = data.employees.find((e) => e.id === profile) || null;

  return (
    <div>
      <PageHeader title="HR Management" subtitle="Employee records, daily attendance, leave approvals and payroll."
        actions={<Button variant="primary" icon={UserPlus} onClick={() => setEditing('new')}>Add employee</Button>} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total Employees" value={active.length} icon={Users} tone="blue" hint={`${new Set(active.map((e) => e.department)).size} departments`} onClick={() => setTab('directory')} />
        <KpiCard label="Present Today" value={present} icon={UserCheck} tone="green" hint={isSunday(today) ? 'Weekly off' : `${active.length ? Math.round((present / active.length) * 100) : 0}% attendance · ${active.length - present - onLeave - Object.values(todayMarks).filter((v) => v === 'A').length} unmarked`} onClick={() => setTab('attendance')} />
        <KpiCard label="On Leave Today" value={onLeave} icon={UserMinus} tone="violet" hint="Approved leave" onClick={() => setTab('leave')} />
        <KpiCard label="Pending Leave Requests" value={pending} icon={Clock} tone="amber" hint="Awaiting your approval" onClick={() => setTab('leave')} />
      </div>
      <div className="mt-5">
        <Tabs value={tab} onChange={setTab} tabs={[
          { value: 'directory', label: 'Employee directory', icon: Users, count: data.employees.length },
          { value: 'attendance', label: 'Attendance', icon: CalendarCheck },
          { value: 'leave', label: 'Leave management', icon: CalendarDays, count: pending || undefined },
          { value: 'payroll', label: 'Payroll', icon: Wallet },
        ]} />
      </div>
      {tab === 'directory' && <Directory onEdit={setEditing} onView={setProfile} />}
      {tab === 'attendance' && <AttendancePanel />}
      {tab === 'leave' && <LeavePanel />}
      {tab === 'payroll' && <PayrollPanel />}
      {editing && <EmployeeForm initial={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
      {emp && <EmployeeProfile emp={emp} onClose={() => setProfile(null)} onEdit={() => { setEditing(emp); setProfile(null); }} />}
    </div>
  );
}

function Directory({ onEdit, onView }: { onEdit: (e: Employee) => void; onView: (id: string) => void }) {
  const { data } = useStore();
  const exportCsv = useExport();
  const [q, setQ] = useState('');
  const [dept, setDept] = useState('All');
  const [status, setStatus] = useState('All');
  const rows = useMemo(() => {
    const s = q.toLowerCase();
    return data.employees.filter((e) => (dept === 'All' || e.department === dept) && (status === 'All' || e.status === status) && (!s || [e.name, e.id, e.designation, e.email, e.phone].some((x) => x.toLowerCase().includes(s))));
  }, [data.employees, q, dept, status]);
  return (
    <Card className="overflow-hidden">
      <FilterBar right={<Button size="sm" icon={Download} onClick={() => exportCsv(`employees-${todayISO()}.csv`, toCSV(['Employee ID', 'Name', 'Department', 'Designation', 'Joining Date', 'Email', 'Phone', 'Location', 'Status'], rows.map((e) => [e.id, e.name, e.department, e.designation, e.joinDate, e.email, e.phone, e.location, e.status])))}>Export</Button>}>
        <SearchInput value={q} onChange={setQ} placeholder="Search name, ID, role, email or phone" className="w-full sm:w-[300px]" />
        <Select value={dept} onChange={(e) => setDept(e.target.value)} className="w-[180px]"><option value="All">All departments</option>{DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}</Select>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-[150px]">{['All', 'Active', 'On Leave', 'Probation', 'Inactive'].map((s) => <option key={s} value={s}>{s === 'All' ? 'All statuses' : s}</option>)}</Select>
      </FilterBar>
      <DataTable rows={rows} rowKey={(r) => r.id} onRowClick={(r) => onView(r.id)} pageSize={12} defaultSort={{ key: 'id', dir: 'asc' }}
        empty={<EmptyState icon={Users} title="No employees found" message="Try a different department or search term." />}
        columns={[
          { key: 'id', header: 'Emp ID', render: (r) => <span className="text-ink-500">{r.id}</span>, sort: (r) => r.id },
          { key: 'name', header: 'Employee', render: (r) => <div className="flex items-center gap-2.5"><Avatar name={r.name} size={30} /><div><p className="font-medium text-ink-900">{r.name}</p><p className="text-xs text-ink-400">{r.location}</p></div></div>, sort: (r) => r.name },
          { key: 'dept', header: 'Department', render: (r) => r.department, sort: (r) => r.department },
          { key: 'role', header: 'Designation', render: (r) => r.designation },
          { key: 'join', header: 'Joining date', render: (r) => fmtDate(r.joinDate), sort: (r) => r.joinDate },
          { key: 'contact', header: 'Contact', render: (r) => <div className="text-xs"><p className="text-ink-700">{r.email}</p><p className="text-ink-400">{r.phone}</p></div> },
          { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} />, sort: (r) => r.status },
          { key: 'act', header: '', align: 'right', render: (r) => <Menu items={[{ label: 'View profile', icon: Eye, onClick: () => onView(r.id) }, { label: 'Edit details', icon: Edit3, onClick: () => onEdit(r) }]} /> },
        ]} />
    </Card>
  );
}

const MARKS: { v: AttendanceMark; label: string; cls: string }[] = [
  { v: 'P', label: 'Present', cls: 'bg-emerald-600 text-white' },
  { v: 'HD', label: 'Half day', cls: 'bg-amber-500 text-white' },
  { v: 'A', label: 'Absent', cls: 'bg-red-500 text-white' },
  { v: 'L', label: 'Leave', cls: 'bg-violet-500 text-white' },
];

function AttendancePanel() {
  const { data, markAttendance } = useStore();
  const toast = useToast();
  const [date, setDate] = useState(todayISO());
  const [dept, setDept] = useState('All');
  const [q, setQ] = useState('');
  const marks = data.attendance[date] || {};
  const emps = data.employees.filter((e) => e.status !== 'Inactive' && e.joinDate <= date && (dept === 'All' || e.department === dept) && (!q || e.name.toLowerCase().includes(q.toLowerCase())));
  const counts = { P: 0, HD: 0, A: 0, L: 0, none: 0 } as Record<string, number>;
  emps.forEach((e) => { counts[marks[e.id] || 'none']++; });
  const sunday = isSunday(date);
  const monthStart = startOfMonth(date);
  const monthStats = (id: string) => { let p = 0, a = 0, l = 0, wd = 0; for (let d = monthStart; d <= date; d = addDays(d, 1)) { if (isSunday(d)) continue; wd++; const m = data.attendance[d]?.[id]; if (m === 'P') p++; else if (m === 'HD') p += 0.5; else if (m === 'A') a++; else if (m === 'L') l++; } return { p, a, l, wd }; };
  const markAll = () => {
    const m: Record<string, AttendanceMark> = {};
    emps.forEach((e) => { if (!marks[e.id]) m[e.id] = 'P'; });
    if (!Object.keys(m).length) { toast('info', 'Everyone is already marked'); return; }
    markAttendance(date, m);
    toast('success', `Marked ${Object.keys(m).length} employees present`, fmtDate(date));
  };
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
      <Card className="overflow-hidden xl:col-span-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" onClick={() => setDate(addDays(date, -1))}><ChevronLeft className="h-4 w-4" /></Button>
            <Input type="date" value={date} max={todayISO()} onChange={(e) => e.target.value && setDate(e.target.value)} className="w-[160px]" />
            <Button size="sm" variant="ghost" disabled={date >= todayISO()} onClick={() => setDate(addDays(date, 1))}><ChevronRight className="h-4 w-4" /></Button>
            <span className="ml-2 text-sm text-ink-500">{weekday(date)}{date === todayISO() && <Badge tone="blue" dot={false}>Today</Badge>}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput value={q} onChange={setQ} placeholder="Find employee" className="w-[180px]" />
            <Select value={dept} onChange={(e) => setDept(e.target.value)} className="w-[170px]"><option value="All">All departments</option>{DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}</Select>
            <Button size="sm" variant="primary" icon={CheckCircle2} onClick={markAll} disabled={sunday}>Mark unmarked present</Button>
          </div>
        </div>
        {sunday ? <EmptyState icon={Calendar} title="Weekly off" message="Sunday is a weekly off. Choose a working day to mark attendance." /> : emps.length === 0 ? <EmptyState icon={Users} title="No employees" /> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-line bg-surface/70"><th className="th">Employee</th><th className="th">Department</th><th className="th">Mark attendance</th><th className="th text-right">This month</th></tr></thead>
              <tbody>
                {emps.map((e) => { const s = monthStats(e.id); const cur = marks[e.id]; return (
                  <tr key={e.id} className="border-b border-line/70 last:border-0">
                    <td className="td"><div className="flex items-center gap-2.5"><Avatar name={e.name} size={28} /><div><p className="font-medium text-ink-900">{e.name}</p><p className="text-xs text-ink-400">{e.id} · {e.designation}</p></div></div></td>
                    <td className="td text-ink-600">{e.department}</td>
                    <td className="td">
                      <div className="inline-flex rounded-lg border border-line bg-surface p-0.5">
                        {MARKS.map((m) => <button key={m.v} title={m.label} onClick={() => markAttendance(date, { [e.id]: cur === m.v ? undefined : m.v })} className={cx('h-7 min-w-[34px] rounded-md px-2 text-xs font-semibold transition', cur === m.v ? m.cls : 'text-ink-500 hover:bg-white hover:text-ink-800')}>{m.v}</button>)}
                      </div>
                      {!cur && <span className="ml-2 text-xs text-amber-600">Not marked</span>}
                    </td>
                    <td className="td text-right"><span className="text-xs text-ink-500"><b className="text-ink-800 tnum">{s.p}</b>/{s.wd} present{s.a ? ` · ${s.a} absent` : ''}{s.l ? ` · ${s.l} leave` : ''}</span></td>
                  </tr>); })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <div className="space-y-4">
        <Card>
          <CardHeader title="Day summary" subtitle={fmtDate(date)} />
          <div className="space-y-2.5 px-5 pb-5">
            {[['Present', counts.P, 'bg-emerald-500'], ['Half day', counts.HD, 'bg-amber-500'], ['Absent', counts.A, 'bg-red-500'], ['On leave', counts.L, 'bg-violet-500'], ['Not marked', counts.none, 'bg-ink-300']].map(([l, v, c]) => (
              <div key={l as string}>
                <div className="mb-1 flex justify-between text-[13px]"><span className="text-ink-600">{l}</span><span className="font-semibold tnum">{v as number}</span></div>
                <ProgressBar value={emps.length ? ((v as number) / emps.length) * 100 : 0} tone={c as string} />
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-4 text-xs text-ink-500"><p className="mb-2 font-semibold text-ink-700">Legend</p>{MARKS.map((m) => <p key={m.v} className="flex items-center gap-2 py-0.5"><span className={cx('inline-flex h-5 w-7 items-center justify-center rounded text-[10px] font-bold', m.cls)}>{m.v}</span>{m.label}</p>)}<p className="mt-2">Click a selected mark again to clear it.</p></Card>
      </div>
    </div>
  );
}

function LeavePanel() {
  const { data, setLeaveStatus } = useStore();
  const toast = useToast();
  const [status, setStatus] = useState<LeaveStatus | 'All'>('Pending');
  const [creating, setCreating] = useState(false);
  const [confirm, setConfirm] = useState<{ l: LeaveRequest; s: LeaveStatus } | null>(null);
  const emps = useMemo(() => Object.fromEntries(data.employees.map((e) => [e.id, e])), [data.employees]);
  const rows = data.leaves.filter((l) => status === 'All' || l.status === status);
  const used = (id: string, type: string) => data.leaves.filter((l) => l.empId === id && l.type === type && l.status === 'Approved').reduce((s, l) => s + l.days, 0);
  const summary = ['Casual', 'Sick', 'Earned'].map((t) => ({ t, days: data.leaves.filter((l) => l.type === t && l.status === 'Approved').reduce((s, l) => s + l.days, 0) }));
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_250px]">
      <Card className="min-w-0 overflow-hidden">
        <FilterBar right={<Button size="sm" variant="primary" icon={Plus} onClick={() => setCreating(true)}>New leave request</Button>}>
          <div className="inline-flex rounded-lg border border-line bg-surface p-0.5">
            {(['Pending', 'Approved', 'Rejected', 'All'] as const).map((s) => <button key={s} onClick={() => setStatus(s)} className={cx('rounded-md px-3 py-1.5 text-[13px] font-medium', status === s ? 'bg-white shadow-sm ring-1 ring-line' : 'text-ink-500')}>{s} <span className="text-ink-400">{s === 'All' ? data.leaves.length : data.leaves.filter((l) => l.status === s).length}</span></button>)}
          </div>
        </FilterBar>
        <DataTable rows={rows} rowKey={(r) => r.id} defaultSort={{ key: 'from', dir: 'desc' }}
          empty={<EmptyState icon={CalendarDays} title={status === 'Pending' ? 'No pending requests' : 'No leave requests'} message={status === 'Pending' ? 'All leave requests have been reviewed.' : undefined} />}
          columns={[
            { key: 'emp', header: 'Employee', render: (r) => <div className="flex items-center gap-2.5"><Avatar name={emps[r.empId]?.name || '?'} size={28} /><div><p className="font-medium text-ink-900">{emps[r.empId]?.name}</p><p className="text-xs text-ink-400">{emps[r.empId]?.department}</p></div></div>, sort: (r) => emps[r.empId]?.name || '' },
            { key: 'type', header: 'Type', render: (r) => <Badge tone={r.type === 'Sick' ? 'red' : r.type === 'Earned' ? 'blue' : r.type === 'Unpaid' ? 'gray' : 'violet'} dot={false}>{r.type}</Badge> },
            { key: 'from', header: 'Dates', render: (r) => <span>{fmtDate(r.from)}{r.to !== r.from && <> – {fmtDate(r.to)}</>}</span>, sort: (r) => r.from },
            { key: 'days', header: 'Days', align: 'right', render: (r) => <span className="tnum">{r.days}</span> },
            { key: 'reason', header: 'Reason', render: (r) => <span className="block max-w-[150px] truncate text-ink-600" title={r.reason}>{r.reason}</span> },
            { key: 'applied', header: 'Applied', render: (r) => <span className="text-ink-500">{fmtDate(r.appliedOn)}</span> },
            { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
            { key: 'act', header: '', align: 'right', render: (r) => r.status === 'Pending' ? (
              <div className="flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                <Button size="sm" variant="danger" icon={XCircle} onClick={() => setConfirm({ l: r, s: 'Rejected' })}>Reject</Button>
                <Button size="sm" variant="success" icon={CheckCircle2} onClick={() => setConfirm({ l: r, s: 'Approved' })}>Approve</Button>
              </div>) : null },
          ]} />
      </Card>
      <Card>
        <CardHeader title="Leave summary" subtitle="Approved days this year" />
        <div className="space-y-3 px-5 pb-5">
          {summary.map((s) => <div key={s.t} className="flex items-center justify-between rounded-lg border border-line px-3 py-2.5"><span className="text-sm text-ink-600">{s.t} leave</span><span className="font-semibold tnum">{s.days} days</span></div>)}
          <p className="text-xs text-ink-400">Policy: 12 casual · 8 sick · 15 earned days per employee per year.</p>
        </div>
      </Card>
      {creating && <LeaveForm onClose={() => setCreating(false)} />}
      {confirm && (
        <ConfirmModal open onClose={() => setConfirm(null)} tone={confirm.s === 'Approved' ? 'success' : 'danger'} confirmLabel={confirm.s === 'Approved' ? 'Approve leave' : 'Reject leave'}
          title={`${confirm.s === 'Approved' ? 'Approve' : 'Reject'} leave request?`}
          message={<>{emps[confirm.l.empId]?.name} · {confirm.l.type} leave · {fmtDate(confirm.l.from)}{confirm.l.to !== confirm.l.from ? ` – ${fmtDate(confirm.l.to)}` : ''} ({confirm.l.days} day{confirm.l.days > 1 ? 's' : ''})<br /><span className="text-ink-400">“{confirm.l.reason}”</span><br /><span className="mt-2 block text-xs">{confirm.l.type} leave used this year: {used(confirm.l.empId, confirm.l.type)} days</span></>}
          onConfirm={() => { setLeaveStatus(confirm.l.id, confirm.s); toast(confirm.s === 'Approved' ? 'success' : 'info', `Leave ${confirm.s.toLowerCase()}`, `${emps[confirm.l.empId]?.name} has been notified.`); setConfirm(null); }} />
      )}
    </div>
  );
}

function LeaveForm({ onClose }: { onClose: () => void }) {
  const { data, addLeave } = useStore();
  const toast = useToast();
  const [empId, setEmpId] = useState('');
  const [type, setType] = useState<LeaveRequest['type']>('Casual');
  const [from, setFrom] = useState(addDays(todayISO(), 1));
  const [to, setTo] = useState(addDays(todayISO(), 1));
  const [reason, setReason] = useState('');
  const [err, setErr] = useState<Record<string, string>>({});
  let days = 0; for (let d = from; d <= to && from && to; d = addDays(d, 1)) if (!isSunday(d)) days++;
  const submit = () => {
    const e: Record<string, string> = {};
    if (!empId) e.emp = 'Select an employee';
    if (to < from) e.to = 'End date must be on or after start date';
    else if (days === 0) e.to = 'Selected range has no working days';
    if (!reason.trim()) e.reason = 'Please provide a reason';
    setErr(e);
    if (Object.keys(e).length) return;
    addLeave({ empId, type, from, to, days, reason: reason.trim() });
    toast('success', 'Leave request submitted', `${days} working day${days > 1 ? 's' : ''} · pending approval`);
    onClose();
  };
  return (
    <Modal open onClose={onClose} title="New leave request" icon={CalendarDays} size="sm" footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={submit}>Submit request</Button></>}>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Employee" required error={err.emp} className="col-span-2"><Select value={empId} invalid={!!err.emp} onChange={(e) => setEmpId(e.target.value)}><option value="">Select employee…</option>{data.employees.map((e) => <option key={e.id} value={e.id}>{e.name} ({e.id})</option>)}</Select></Field>
        <Field label="Leave type" className="col-span-2"><Select value={type} onChange={(e) => setType(e.target.value as LeaveRequest['type'])}>{['Casual', 'Sick', 'Earned', 'Unpaid'].map((t) => <option key={t}>{t}</option>)}</Select></Field>
        <Field label="From" required><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
        <Field label="To" required error={err.to}><Input type="date" value={to} invalid={!!err.to} onChange={(e) => setTo(e.target.value)} /></Field>
        <Field label="Reason" required error={err.reason} className="col-span-2"><Textarea value={reason} invalid={!!err.reason} onChange={(e) => setReason(e.target.value)} /></Field>
      </div>
      <p className="mt-3 text-xs text-ink-500">{days} working day{days !== 1 ? 's' : ''} (Sundays excluded)</p>
    </Modal>
  );
}

function PayrollPanel() {
  const { data, processPayroll } = useStore();
  const toast = useToast();
  const exportCsv = useExport();
  const months = Array.from({ length: 6 }, (_, i) => monthKey(addMonths(todayISO(), -i - 1)));
  const [month, setMonth] = useState(months[0]);
  const [dept, setDept] = useState('All');
  const label = monthLong(month);
  const emps = data.employees.filter((e) => e.status !== 'Inactive' && e.joinDate <= month + '-28' && (dept === 'All' || e.department === dept));
  const rows = emps.map((e) => ({ e, ...payrollBreakup(e.salary) }));
  const tot = rows.reduce((s, r) => ({ gross: s.gross + r.gross, ded: s.ded + r.deductions, net: s.net + r.net, pf: s.pf + r.pf }), { gross: 0, ded: 0, net: 0, pf: 0 });
  const processed = data.expenses.some((x) => x.description === `Salary disbursement – ${label}`);
  const byDept = DEPARTMENTS.map((d) => ({ d, v: rows.filter((r) => r.e.department === d).reduce((s, r) => s + r.gross, 0) })).filter((x) => x.v > 0).sort((a, b) => b.v - a.v);
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select value={month} onChange={(e) => setMonth(e.target.value)} className="w-[180px]">{months.map((m) => <option key={m} value={m}>{monthLong(m)}</option>)}</Select>
        <Select value={dept} onChange={(e) => setDept(e.target.value)} className="w-[180px]"><option value="All">All departments</option>{DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}</Select>
        <div className="ml-auto flex gap-2">
          <Button icon={Download} onClick={() => exportCsv(`payroll-${month}.csv`, toCSV(['Emp ID', 'Name', 'Department', 'Basic', 'HRA', 'Special Allowance', 'Gross', 'PF', 'Professional Tax', 'TDS', 'Net Pay'], rows.map((r) => [r.e.id, r.e.name, r.e.department, r.basic, r.hra, r.special, r.gross, r.pf, r.pt, r.tds, r.net])))}>Export register</Button>
          {processed ? <Badge tone="green">Processed</Badge> : <Button variant="primary" icon={IndianRupee} onClick={() => { const ok = processPayroll(label, tot.gross); toast(ok ? 'success' : 'info', ok ? `Payroll for ${label} processed` : 'Already processed', ok ? `${inr(tot.gross)} sent to Expenses for approval` : undefined); }}>Process payroll</Button>}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[['Gross payroll', inrCompact(tot.gross)], ['Total deductions', inrCompact(tot.ded)], ['Net payable', inrCompact(tot.net)], ['Employees', rows.length]].map(([l, v]) => (
          <Card key={l as string} className="p-4"><p className="text-xs text-ink-500">{l}</p><p className="mt-1 text-xl font-semibold tnum">{v}</p></Card>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-4">
        <Card className="overflow-hidden xl:col-span-3">
          <DataTable rows={rows} rowKey={(r) => r.e.id} pageSize={12} defaultSort={{ key: 'gross', dir: 'desc' }}
            columns={[
              { key: 'name', header: 'Employee', render: (r) => <div><p className="font-medium text-ink-900">{r.e.name}</p><p className="text-xs text-ink-400">{r.e.id} · {r.e.department}</p></div>, sort: (r) => r.e.name },
              { key: 'basic', header: 'Basic', align: 'right', render: (r) => <span className="tnum">{inr(r.basic)}</span> },
              { key: 'hra', header: 'HRA', align: 'right', render: (r) => <span className="tnum">{inr(r.hra)}</span> },
              { key: 'sp', header: 'Allowances', align: 'right', render: (r) => <span className="tnum">{inr(r.special)}</span> },
              { key: 'gross', header: 'Gross', align: 'right', render: (r) => <span className="font-medium tnum">{inr(r.gross)}</span>, sort: (r) => r.gross },
              { key: 'ded', header: 'Deductions', align: 'right', render: (r) => <span className="text-red-600 tnum" title={`PF ${inr(r.pf)} · PT ${inr(r.pt)} · TDS ${inr(r.tds)}`}>−{inr(r.deductions)}</span>, sort: (r) => r.deductions },
              { key: 'net', header: 'Net pay', align: 'right', render: (r) => <span className="font-semibold tnum">{inr(r.net)}</span>, sort: (r) => r.net },
            ]}
            footer={<tfoot><tr className="border-t border-line bg-surface/70 text-sm font-semibold"><td className="td">Total ({rows.length})</td><td className="td" colSpan={3} /><td className="td text-right tnum">{inr(tot.gross)}</td><td className="td text-right text-red-600 tnum">−{inr(tot.ded)}</td><td className="td text-right tnum">{inr(tot.net)}</td></tr></tfoot>} />
        </Card>
        <Card>
          <CardHeader title="Cost by department" subtitle={label} />
          <div className="space-y-3 px-5 pb-5">
            {byDept.map((x) => <div key={x.d}><div className="mb-1 flex justify-between text-[13px]"><span className="text-ink-600">{x.d}</span><span className="font-medium tnum">{inrCompact(x.v)}</span></div><ProgressBar value={(x.v / (byDept[0]?.v || 1)) * 100} /></div>)}
          </div>
        </Card>
      </div>
    </div>
  );
}

function EmployeeForm({ initial, onClose }: { initial?: Employee; onClose: () => void }) {
  const { saveEmployee, data } = useStore();
  const toast = useToast();
  const [f, setF] = useState<Omit<Employee, 'id'>>({ name: initial?.name || '', department: initial?.department || DEPARTMENTS[0], designation: initial?.designation || '', joinDate: initial?.joinDate || todayISO(), email: initial?.email || '', phone: initial?.phone || '', status: initial?.status || 'Probation', salary: initial?.salary || 0, location: initial?.location || 'Head Office' });
  const [err, setErr] = useState<Record<string, string>>({});
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const submit = () => {
    const e: Record<string, string> = {};
    if (!f.name.trim()) e.name = 'Full name is required';
    if (!f.designation.trim()) e.designation = 'Designation is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = 'Enter a valid email address';
    else if (data.employees.some((x) => x.email.toLowerCase() === f.email.toLowerCase() && x.id !== initial?.id)) e.email = 'This email is already in use';
    if (f.phone.replace(/\D/g, '').length < 10) e.phone = 'Enter a 10-digit mobile number';
    if (!(f.salary > 0)) e.salary = 'Enter monthly CTC';
    setErr(e);
    if (Object.keys(e).length) return;
    const saved = saveEmployee({ ...f, name: f.name.trim(), id: initial?.id });
    toast('success', initial ? 'Employee details updated' : 'Employee added', `${saved.id} · ${saved.name}`);
    onClose();
  };
  return (
    <Modal open onClose={onClose} icon={initial ? Edit3 : UserPlus} title={initial ? `Edit ${initial.name}` : 'Add employee'} subtitle={initial ? initial.id : `Will be assigned ID EMP-${data.seq.employee}`}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={submit}>{initial ? 'Save changes' : 'Add employee'}</Button></>}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Full name" required error={err.name}><Input value={f.name} invalid={!!err.name} onChange={(e) => set('name', e.target.value)} /></Field>
        <Field label="Designation" required error={err.designation}><Input value={f.designation} invalid={!!err.designation} onChange={(e) => set('designation', e.target.value)} placeholder="e.g. Site Engineer" /></Field>
        <Field label="Department"><Select value={f.department} onChange={(e) => set('department', e.target.value)}>{DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}</Select></Field>
        <Field label="Work location"><Select value={f.location} onChange={(e) => set('location', e.target.value)}>{['Head Office', 'Main Godown', 'Whitefield Site', 'Hosur Road Site', 'Electronic City Site'].map((d) => <option key={d}>{d}</option>)}</Select></Field>
        <Field label="Email" required error={err.email}><Input type="email" value={f.email} invalid={!!err.email} onChange={(e) => set('email', e.target.value)} placeholder="name@meridianbuild.in" /></Field>
        <Field label="Mobile" required error={err.phone}><Input value={f.phone} invalid={!!err.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+91 98450 12345" /></Field>
        <Field label="Joining date"><Input type="date" value={f.joinDate} onChange={(e) => set('joinDate', e.target.value)} /></Field>
        <Field label="Employment status"><Select value={f.status} onChange={(e) => set('status', e.target.value as EmpStatus)}>{['Active', 'Probation', 'On Leave', 'Inactive'].map((d) => <option key={d}>{d}</option>)}</Select></Field>
        <Field label="Monthly CTC (₹)" required error={err.salary} hint={f.salary > 0 ? `Net pay ≈ ${inr(payrollBreakup(f.salary).net)} / month` : undefined}><Input type="number" min={0} value={f.salary || ''} invalid={!!err.salary} onChange={(e) => set('salary', parseFloat(e.target.value) || 0)} /></Field>
      </div>
    </Modal>
  );
}

function EmployeeProfile({ emp, onClose, onEdit }: { emp: Employee; onClose: () => void; onEdit: () => void }) {
  const { data } = useStore();
  const pay = payrollBreakup(emp.salary);
  const today = todayISO();
  const start = startOfMonth(today);
  let p = 0, a = 0, l = 0, wd = 0;
  for (let d = start; d <= today; d = addDays(d, 1)) { if (isSunday(d)) continue; wd++; const m = data.attendance[d]?.[emp.id]; if (m === 'P') p++; else if (m === 'HD') p += 0.5; else if (m === 'A') a++; else if (m === 'L') l++; }
  const leaves = data.leaves.filter((x) => x.empId === emp.id);
  const used = (t: string) => leaves.filter((x) => x.type === t && x.status === 'Approved').reduce((s, x) => s + x.days, 0);
  const tenure = Math.max(0, diffDays(today, emp.joinDate));
  const last14 = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13));
  return (
    <Modal open onClose={onClose} size="lg" title="Employee profile" footer={<><Button variant="ghost" onClick={onClose}>Close</Button><Button variant="primary" icon={Edit3} onClick={onEdit}>Edit details</Button></>}>
      <div className="flex flex-wrap items-center gap-4 border-b border-line pb-5">
        <Avatar name={emp.name} size={56} />
        <div className="flex-1"><p className="text-lg font-semibold">{emp.name}</p><p className="text-sm text-ink-500">{emp.designation} · {emp.department}</p></div>
        <StatusBadge status={emp.status} />
      </div>
      <div className="grid grid-cols-1 gap-6 pt-5 md:grid-cols-2">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-ink-400">Details</p>
          <DetailRow label="Employee ID">{emp.id}</DetailRow>
          <DetailRow label="Joined">{fmtDate(emp.joinDate)} <span className="font-normal text-ink-400">({tenure >= 365 ? `${(tenure / 365).toFixed(1)} yrs` : `${Math.round(tenure / 30)} mo`})</span></DetailRow>
          <DetailRow label="Email"><span className="inline-flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-ink-400" />{emp.email}</span></DetailRow>
          <DetailRow label="Mobile"><span className="inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-ink-400" />{emp.phone}</span></DetailRow>
          <DetailRow label="Location"><span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-ink-400" />{emp.location}</span></DetailRow>
          <p className="mb-1 mt-5 text-xs font-semibold uppercase tracking-wider text-ink-400">Last 14 days</p>
          <div className="flex gap-1">{last14.map((d) => { const m = data.attendance[d]?.[emp.id]; const c = isSunday(d) ? 'bg-gray-100' : m === 'P' ? 'bg-emerald-500' : m === 'HD' ? 'bg-amber-400' : m === 'A' ? 'bg-red-500' : m === 'L' ? 'bg-violet-500' : 'bg-gray-200'; return <span key={d} title={`${fmtDate(d)}: ${isSunday(d) ? 'Weekly off' : m || 'Not marked'}`} className={cx('h-6 flex-1 rounded', c)} />; })}</div>
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-400">This month</p>
          <div className="grid grid-cols-3 gap-2">
            {[['Present', `${p}/${wd}`], ['Absent', a], ['Leave', l]].map(([k, v]) => <div key={k as string} className="rounded-lg border border-line p-2.5 text-center"><p className="text-xs text-ink-500">{k}</p><p className="font-semibold tnum">{v}</p></div>)}
          </div>
          <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wider text-ink-400">Leave balance</p>
          {[['Casual', 12], ['Sick', 8], ['Earned', 15]].map(([t, q]) => <div key={t as string} className="mb-2"><div className="mb-1 flex justify-between text-[13px]"><span className="text-ink-600">{t}</span><span className="tnum">{(q as number) - used(t as string)} of {q} left</span></div><ProgressBar value={(((q as number) - used(t as string)) / (q as number)) * 100} /></div>)}
          <p className="mb-1 mt-5 text-xs font-semibold uppercase tracking-wider text-ink-400">Salary (monthly)</p>
          <DetailRow label="Gross CTC">{inr(pay.gross)}</DetailRow>
          <DetailRow label="Deductions (PF, PT, TDS)"><span className="text-red-600">−{inr(pay.deductions)}</span></DetailRow>
          <DetailRow label="Net take-home"><b>{inr(pay.net)}</b></DetailRow>
        </div>
      </div>
    </Modal>
  );
}
