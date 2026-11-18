import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Activity, AppData, AttendanceMark, Employee, Expense, ExpenseStatus, Invoice, InvoiceStatus, InventoryItem, LeaveRequest, LeaveStatus, LineItem, ModuleKey, MovementType, Settings, StockStatus } from './types';
import { createSeed } from './seed';
import { addDays, isSunday, todayISO } from './format';

const KEY = 'coreerp-demo-v3';

// ---------- Derived helpers ----------
export const lineTotals = (items: LineItem[]) => {
  let subtotal = 0, tax = 0;
  for (const l of items) { const base = (l.qty || 0) * (l.unitPrice || 0); subtotal += base; tax += (base * (l.gstRate || 0)) / 100; }
  return { subtotal, tax, cgst: tax / 2, sgst: tax / 2, total: Math.round(subtotal + tax) };
};
export const invoiceTotal = (inv: Invoice) => lineTotals(inv.items).total;
export const invoiceStatus = (inv: Invoice, today = todayISO()): InvoiceStatus =>
  inv.draft ? 'Draft' : inv.paid ? 'Paid' : inv.dueDate < today ? 'Overdue' : 'Pending';
export const stockStatus = (it: InventoryItem): StockStatus => (it.qty <= 0 ? 'Out of Stock' : it.qty <= it.reorder ? 'Low Stock' : 'In Stock');
export const payrollBreakup = (monthly: number) => {
  const basic = Math.round(monthly * 0.5), hra = Math.round(monthly * 0.2), special = monthly - basic - hra;
  const pf = Math.round(Math.min(basic, 15000) * 0.12), pt = monthly > 15000 ? 200 : 0;
  const annual = monthly * 12;
  const tds = annual > 1200000 ? Math.round(((annual - 1200000) * 0.1) / 12) : 0;
  const deductions = pf + pt + tds;
  return { basic, hra, special, gross: monthly, pf, pt, tds, deductions, net: monthly - deductions };
};

// ---------- Navigation intent (open a record / start a create flow from anywhere) ----------
export interface Intent { module: ModuleKey; action: 'open' | 'new'; id?: string; sub?: string; nonce: number }

interface Store {
  data: AppData;
  intent: Intent | null;
  module: ModuleKey;
  navigate: (m: ModuleKey, intent?: Omit<Intent, 'module' | 'nonce'>) => void;
  consumeIntent: () => void;
  // billing
  saveInvoice: (inv: Omit<Invoice, 'id' | 'number'> & { id?: string }) => Invoice;
  markInvoicePaid: (id: string, mode: string, on: string) => void;
  // inventory
  saveItem: (it: Omit<InventoryItem, 'id'> & { id?: string }) => InventoryItem;
  recordMovement: (p: { itemId: string; type: MovementType; qty: number; date: string; reference: string; note?: string }) => void;
  // hr
  saveEmployee: (e: Omit<Employee, 'id'> & { id?: string }) => Employee;
  markAttendance: (date: string, marks: Record<string, AttendanceMark | undefined>) => void;
  addLeave: (l: Omit<LeaveRequest, 'id' | 'status' | 'appliedOn'>) => void;
  setLeaveStatus: (id: string, s: LeaveStatus) => void;
  processPayroll: (monthLabel: string, amount: number) => boolean;
  // expenses
  addExpense: (e: Omit<Expense, 'id' | 'status'>) => Expense;
  setExpenseStatus: (id: string, s: ExpenseStatus, note?: string) => void;
  // settings
  saveSettings: (s: Settings) => void;
  resetDemo: () => void;
}

const Ctx = createContext<Store | null>(null);
export const useStore = () => { const c = useContext(Ctx); if (!c) throw new Error('no store'); return c; };

const load = (): AppData => {
  try { const raw = localStorage.getItem(KEY); if (raw) return JSON.parse(raw) as AppData; } catch { /* storage unavailable */ }
  return createSeed();
};

const HASHES: ModuleKey[] = ['dashboard', 'billing', 'inventory', 'hr', 'expenses', 'reports', 'preferences'];
const fromHash = (): ModuleKey => { const h = (typeof location !== 'undefined' ? location.hash.slice(1) : '') as ModuleKey; return HASHES.includes(h) ? h : 'dashboard'; };

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(load);
  const [intent, setIntent] = useState<Intent | null>(null);
  const [module, setModule] = useState<ModuleKey>(fromHash);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* ignore */ }
  }, [data]);

  useEffect(() => {
    const on = () => setModule(fromHash());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  const navigate = useCallback((m: ModuleKey, i?: Omit<Intent, 'module' | 'nonce'>) => {
    setModule(m);
    try { if (location.hash.slice(1) !== m) history.replaceState(null, '', '#' + m); } catch { /* ignore */ }
    setIntent(i ? { ...i, module: m, nonce: Date.now() } : null);
  }, []);

  const log = (d: AppData, text: string, kind: Activity['kind']): Activity[] =>
    [{ id: 'a' + Date.now() + Math.random().toString(36).slice(2, 6), text, kind, at: new Date().toISOString() }, ...d.activities].slice(0, 60);

  const store = useMemo<Store>(() => ({
    data, intent, module, navigate,
    consumeIntent: () => setIntent(null),

    saveInvoice: (inv) => {
      const existing = inv.id ? data.invoices.find((x) => x.id === inv.id) : undefined;
      const n = data.seq.invoice;
      const saved: Invoice = existing
        ? ({ ...existing, ...inv } as Invoice)
        : ({ ...inv, id: `inv-${n}-${Date.now()}`, number: `${data.settings.invoicePrefix}${n}` } as Invoice);
      setData((d) => existing
        ? { ...d, invoices: d.invoices.map((x) => (x.id === saved.id ? saved : x)), activities: log(d, `Invoice ${saved.number} updated`, 'invoice') }
        : { ...d, invoices: [...d.invoices, saved], seq: { ...d.seq, invoice: d.seq.invoice + 1 }, activities: log(d, `Invoice ${saved.number} ${saved.draft ? 'saved as draft' : 'created'} for ${saved.customer}`, 'invoice') });
      return saved;
    },
    markInvoicePaid: (id, mode, on) => setData((d) => {
      const inv = d.invoices.find((x) => x.id === id)!;
      return { ...d, invoices: d.invoices.map((x) => (x.id === id ? { ...x, paid: true, draft: false, paidOn: on, paymentMode: mode } : x)), activities: log(d, `Payment received for ${inv.number} from ${inv.customer}`, 'payment') };
    }),

    saveItem: (it) => {
      const id = it.id || `ITM-${data.seq.item}`;
      const saved = { ...it, id } as InventoryItem;
      setData((d) => {
        if (it.id) return { ...d, items: d.items.map((x) => (x.id === it.id ? { ...x, ...saved, qty: x.qty } : x)), activities: log(d, `Item ${saved.name} updated`, 'stock') };
        const movements = saved.qty > 0 ? [{ id: `MOV-${d.seq.movement}`, itemId: id, type: 'Inward' as MovementType, qty: saved.qty, balance: saved.qty, date: todayISO(), reference: 'OPENING', note: 'Opening stock', by: 'Arjun Mehta' }, ...d.movements] : d.movements;
        return { ...d, items: [...d.items, saved], movements, seq: { ...d.seq, item: d.seq.item + 1, movement: d.seq.movement + 1 }, activities: log(d, `New item added: ${saved.name}`, 'stock') };
      });
      return saved;
    },
    recordMovement: ({ itemId, type, qty, date, reference, note }) => setData((d) => {
      const it = d.items.find((x) => x.id === itemId)!;
      const newQty = Math.max(0, +(it.qty + qty).toFixed(3));
      const mv = { id: `MOV-${d.seq.movement}`, itemId, type, qty, balance: newQty, date, reference, note, by: 'Arjun Mehta' };
      const verb = type === 'Inward' ? 'Stock inward' : type === 'Outward' ? 'Stock outward' : 'Stock adjusted';
      return { ...d, items: d.items.map((x) => (x.id === itemId ? { ...x, qty: newQty } : x)), movements: [mv, ...d.movements], seq: { ...d.seq, movement: d.seq.movement + 1 }, activities: log(d, `${verb}: ${Math.abs(qty)} ${it.uom} ${it.name}${reference ? ` (${reference})` : ''}`, 'stock') };
    }),

    saveEmployee: (e) => {
      const id = e.id || `EMP-${data.seq.employee}`;
      const saved = { ...e, id } as Employee;
      setData((d) => e.id
        ? { ...d, employees: d.employees.map((x) => (x.id === e.id ? saved : x)), activities: log(d, `Employee record updated: ${saved.name}`, 'hr') }
        : { ...d, employees: [...d.employees, saved], seq: { ...d.seq, employee: d.seq.employee + 1 }, activities: log(d, `New employee onboarded: ${saved.name} (${saved.designation})`, 'hr') });
      return saved;
    },
    markAttendance: (date, marks) => setData((d) => {
      const day = { ...(d.attendance[date] || {}) };
      for (const [k, v] of Object.entries(marks)) { if (v) day[k] = v; else delete day[k]; }
      return { ...d, attendance: { ...d.attendance, [date]: day } };
    }),
    addLeave: (l) => setData((d) => {
      const emp = d.employees.find((x) => x.id === l.empId);
      return { ...d, leaves: [{ ...l, id: `LV-${d.seq.leave}`, status: 'Pending', appliedOn: todayISO() }, ...d.leaves], seq: { ...d.seq, leave: d.seq.leave + 1 }, activities: log(d, `Leave request submitted by ${emp?.name}`, 'hr') };
    }),
    setLeaveStatus: (id, s) => setData((d) => {
      const lv = d.leaves.find((x) => x.id === id)!;
      const emp = d.employees.find((x) => x.id === lv.empId);
      let attendance = d.attendance;
      let employees = d.employees;
      if (s === 'Approved') {
        attendance = { ...attendance };
        const t = todayISO();
        for (let dt = lv.from; dt <= lv.to; dt = addDays(dt, 1)) {
          if (isSunday(dt) || dt > t) continue;
          attendance[dt] = { ...(attendance[dt] || {}), [lv.empId]: 'L' };
        }
        if (lv.from <= t && lv.to >= t) employees = employees.map((x) => (x.id === lv.empId ? { ...x, status: 'On Leave' } : x));
      }
      return { ...d, attendance, employees, leaves: d.leaves.map((x) => (x.id === id ? { ...x, status: s } : x)), activities: log(d, `Leave ${s.toLowerCase()} for ${emp?.name} (${lv.days} day${lv.days > 1 ? 's' : ''})`, 'hr') };
    }),
    processPayroll: (label, amount) => {
      const desc = `Salary disbursement – ${label}`;
      if (data.expenses.some((e) => e.description === desc)) return false;
      setData((d) => ({ ...d, expenses: [{ id: `EXP-${d.seq.expense}`, description: desc, category: 'Salaries', date: todayISO(), amount, method: 'Bank Transfer', submittedBy: 'Priya Nair', department: 'Head Office', status: 'Pending', receipt: `payroll-${label}.pdf` }, ...d.expenses], seq: { ...d.seq, expense: d.seq.expense + 1 }, activities: log(d, `Payroll processed for ${label} — sent for approval`, 'hr') }));
      return true;
    },

    addExpense: (e) => {
      const saved = { ...e, id: `EXP-${data.seq.expense}`, status: 'Pending' } as Expense;
      setData((d) => ({ ...d, expenses: [saved, ...d.expenses], seq: { ...d.seq, expense: d.seq.expense + 1 }, activities: log(d, `Expense ${saved.id} submitted: ${saved.description}`, 'expense') }));
      return saved;
    },
    setExpenseStatus: (id, s, note) => setData((d) => ({ ...d, expenses: d.expenses.map((x) => (x.id === id ? { ...x, status: s, reviewNote: note || x.reviewNote } : x)), activities: log(d, `Expense ${id} ${s.toLowerCase()}`, 'expense') })),

    saveSettings: (s) => setData((d) => ({ ...d, settings: s, activities: log(d, 'Company settings updated', 'system') })),
    resetDemo: () => { try { localStorage.removeItem(KEY); } catch { /* ignore */ } setData(createSeed()); },
  }), [data, intent, module, navigate]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

/** Run a callback when an intent for this module arrives. */
export function useIntent(module: ModuleKey, fn: (i: Intent) => void) {
  const { intent, consumeIntent } = useStore();
  useEffect(() => {
    if (intent && intent.module === module) { fn(intent); consumeIntent(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intent?.nonce]);
}
