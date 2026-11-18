import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, BarChart3, Bell, Boxes, ChevronsLeft, ChevronsRight, Clock, CreditCard, FileText, HelpCircle, LayoutDashboard, LogOut, Menu as MenuIcon, Package, Plus, Receipt, Search, Settings, User, Users, Wallet, X } from 'lucide-react';
import { useStore, invoiceStatus, invoiceTotal, stockStatus } from '../lib/store';
import type { ModuleKey } from '../lib/types';
import { cx, Avatar, IconButton, Menu, Button, useToast } from './ui';
import { inr, fmtDate } from '../lib/format';

export const NAV: { key: ModuleKey; label: string; icon: React.ElementType }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'billing', label: 'Billing', icon: Receipt },
  { key: 'inventory', label: 'Inventory', icon: Boxes },
  { key: 'hr', label: 'HR Management', icon: Users },
  { key: 'expenses', label: 'Expenses', icon: Wallet },
  { key: 'reports', label: 'Reports', icon: BarChart3 },
  { key: 'preferences', label: 'Settings', icon: Settings },
];

export function Logo({ collapsed }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg width="30" height="30" viewBox="0 0 32 32" className="shrink-0">
        <rect width="32" height="32" rx="8" fill="#3478D4" />
        <path d="M9 11.5 16 8l7 3.5v9L16 24l-7-3.5v-9Z" fill="none" stroke="white" strokeWidth="2" strokeLinejoin="round" />
        <path d="M9 11.5 16 15l7-3.5M16 15v9" fill="none" stroke="white" strokeWidth="2" strokeLinejoin="round" opacity=".75" />
      </svg>
      {!collapsed && <div className="leading-tight"><p className="text-[15px] font-semibold tracking-tight text-ink-900">CoreERP</p><p className="text-[11px] text-ink-400">Business Suite</p></div>}
    </div>
  );
}

function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen, badges }: { collapsed: boolean; setCollapsed: (v: boolean) => void; mobileOpen: boolean; setMobileOpen: (v: boolean) => void; badges: Partial<Record<ModuleKey, number>> }) {
  const { module, navigate, data } = useStore();
  const toast = useToast();
  const content = (isMobile: boolean) => {
    const c = collapsed && !isMobile;
    return (
      <div className="flex h-full flex-col">
        <div className={cx('flex h-16 items-center border-b border-line', c ? 'justify-center px-2' : 'justify-between px-5')}>
          <Logo collapsed={c} />
          {isMobile && <IconButton icon={X} label="Close menu" onClick={() => setMobileOpen(false)} />}
        </div>
        {!c && <p className="px-5 pb-1.5 pt-5 text-[11px] font-semibold uppercase tracking-wider text-ink-400">Workspace</p>}
        <nav className={cx('flex-1 space-y-0.5 overflow-y-auto', c ? 'px-2 pt-4' : 'px-3')}>
          {NAV.map((n, i) => {
            const active = module === n.key;
            return (
              <React.Fragment key={n.key}>
                {n.key === 'reports' && !c && <p className="px-2 pb-1.5 pt-5 text-[11px] font-semibold uppercase tracking-wider text-ink-400">Insights</p>}
                {n.key === 'reports' && c && <div className="mx-2 my-3 h-px bg-line" />}
                <button title={c ? n.label : undefined} onClick={() => { navigate(n.key); setMobileOpen(false); }}
                  className={cx('group relative flex w-full items-center gap-3 rounded-lg text-sm font-medium transition-colors', c ? 'h-10 justify-center' : 'h-9 px-2.5',
                    active ? 'bg-primary-50 text-primary-700' : 'text-ink-600 hover:bg-surface hover:text-ink-900')}>
                  {active && !c && <span className="absolute -left-3 top-1.5 bottom-1.5 w-[3px] rounded-r bg-primary-500" />}
                  <n.icon className={cx('h-[18px] w-[18px] shrink-0', active ? 'text-primary-600' : 'text-ink-400 group-hover:text-ink-600')} strokeWidth={1.9} />
                  {!c && <span className="flex-1 text-left">{n.label}</span>}
                  {!!badges[n.key] && (c
                    ? <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-white" />
                    : <span className="rounded-full bg-amber-100 px-1.5 text-[11px] font-semibold text-amber-800">{badges[n.key]}</span>)}
                </button>
              </React.Fragment>
            );
          })}
        </nav>
        {!isMobile && (
          <div className={cx('border-t border-line', c ? 'px-2 py-2' : 'px-3 py-2')}>
            <button onClick={() => setCollapsed(!collapsed)} className={cx('flex h-9 w-full items-center gap-3 rounded-lg text-[13px] text-ink-500 hover:bg-surface hover:text-ink-800', c ? 'justify-center' : 'px-2.5')}>
              {c ? <ChevronsRight className="h-4 w-4" /> : <><ChevronsLeft className="h-4 w-4" />Collapse sidebar</>}
            </button>
          </div>
        )}
        <div className={cx('border-t border-line', c ? 'p-2' : 'p-3')}>
          <Menu align="left" width={220} items={[
            { label: 'My profile', icon: User, onClick: () => toast('info', 'Profile', 'Profile management is available in the full product.') },
            { label: 'Settings', icon: Settings, onClick: () => navigate('preferences') },
            { label: 'Sign out', icon: LogOut, onClick: () => toast('info', 'Demo mode', 'Authentication is disabled in this prototype.'), divider: true },
          ]} trigger={(open) => (
            <button onClick={open} className={cx('flex w-full items-center gap-3 rounded-lg text-left hover:bg-surface', c ? 'justify-center p-1' : 'p-2')}>
              <Avatar name="Arjun Mehta" size={34} tone={0} />
              {!c && <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-ink-900">Arjun Mehta</span><span className="block truncate text-xs text-ink-500">Admin · {data.settings.companyName}</span></span>}
            </button>
          )} />
        </div>
      </div>
    );
  };
  return (
    <>
      <aside className={cx('no-print fixed inset-y-0 left-0 z-30 hidden border-r border-line bg-white transition-[width] duration-200 lg:block', collapsed ? 'w-[68px]' : 'w-[248px]')}>{content(false)}</aside>
      {mobileOpen && (
        <div className="no-print fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink-900/40 fade-in" onClick={() => setMobileOpen(false)} />
          <aside className="pop-in absolute inset-y-0 left-0 w-[264px] bg-white shadow-pop">{content(true)}</aside>
        </div>
      )}
    </>
  );
}

interface SearchHit { group: string; title: string; sub: string; icon: React.ElementType; go: () => void }

function GlobalSearch() {
  const { data, navigate } = useStore();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); ref.current?.focus(); setOpen(true); } };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, []);
  const hits = useMemo<SearchHit[]>(() => {
    const s = q.trim().toLowerCase();
    if (s.length < 2) return [];
    const re = new RegExp('(^|[^a-z0-9])' + s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const m = (...f: (string | undefined)[]) => f.some((x) => !!x && re.test(x));
    const out: SearchHit[] = [];
    data.invoices.filter((i) => m(i.number, i.customer)).slice(0, 4).forEach((i) => out.push({ group: 'Invoices', title: `${i.number} · ${i.customer}`, sub: `${inr(invoiceTotal(i))} · ${invoiceStatus(i)}`, icon: FileText, go: () => navigate('billing', { action: 'open', id: i.id }) }));
    data.items.filter((i) => m(i.id, i.name, i.category)).slice(0, 4).forEach((i) => out.push({ group: 'Inventory', title: i.name, sub: `${i.id} · ${i.qty.toLocaleString('en-IN')} ${i.uom} · ${stockStatus(i)}`, icon: Package, go: () => navigate('inventory', { action: 'open', id: i.id }) }));
    data.employees.filter((e) => m(e.id, e.name, e.designation, e.department)).slice(0, 4).forEach((e) => out.push({ group: 'Employees', title: e.name, sub: `${e.id} · ${e.designation}`, icon: User, go: () => navigate('hr', { action: 'open', id: e.id }) }));
    data.expenses.filter((e) => m(e.id, e.description, e.submittedBy)).slice(0, 4).forEach((e) => out.push({ group: 'Expenses', title: e.description, sub: `${e.id} · ${inr(e.amount)} · ${e.status}`, icon: CreditCard, go: () => navigate('expenses', { action: 'open', id: e.id }) }));
    return out;
  }, [q, data, navigate]);
  useEffect(() => setIdx(0), [q]);
  const choose = (h: SearchHit) => { h.go(); setQ(''); setOpen(false); ref.current?.blur(); };
  let lastGroup = '';
  return (
    <div className="relative w-full max-w-[440px]">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
      <input ref={ref} value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => { if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(hits.length - 1, i + 1)); } else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(0, i - 1)); } else if (e.key === 'Enter' && hits[idx]) choose(hits[idx]); else if (e.key === 'Escape') { setOpen(false); ref.current?.blur(); } }}
        placeholder="Search invoices, items, employees, expenses…" className="h-9 w-full rounded-lg border border-line bg-surface pl-9 pr-14 text-sm outline-none transition placeholder:text-ink-400 focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-100" />
      <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-line bg-white px-1.5 py-0.5 text-[10px] font-medium text-ink-400 sm:block">Ctrl K</kbd>
      {open && q.trim().length >= 2 && (
        <div className="pop-in absolute left-0 right-0 top-full z-40 mt-2 max-h-[420px] overflow-y-auto rounded-xl border border-line bg-white p-1.5 shadow-pop">
          {hits.length === 0 && <p className="px-3 py-6 text-center text-sm text-ink-500">No results for “{q}”</p>}
          {hits.map((h, i) => {
            const header = h.group !== lastGroup ? (lastGroup = h.group) : null;
            return (
              <React.Fragment key={i}>
                {header && <p className="px-2.5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-ink-400">{header}</p>}
                <button onMouseDown={(e) => e.preventDefault()} onClick={() => choose(h)} onMouseEnter={() => setIdx(i)} className={cx('flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left', i === idx ? 'bg-primary-50' : 'hover:bg-surface')}>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface text-ink-500 ring-1 ring-line"><h.icon className="h-4 w-4" /></span>
                  <span className="min-w-0"><span className="block truncate text-sm font-medium text-ink-900">{h.title}</span><span className="block truncate text-xs text-ink-500">{h.sub}</span></span>
                </button>
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Notifications() {
  const { data, navigate } = useStore();
  const [open, setOpen] = useState(false);
  const [read, setRead] = useState<Set<string>>(new Set());
  const list = useMemo(() => {
    const s = data.settings;
    const out: { id: string; title: string; sub: string; icon: React.ElementType; tone: string; go: () => void }[] = [];
    if (s.notifyOverdue) data.invoices.filter((i) => invoiceStatus(i) === 'Overdue').slice(0, 4).forEach((i) => out.push({ id: 'o' + i.id, title: `${i.number} is overdue`, sub: `${i.customer} · ${inr(invoiceTotal(i))} · due ${fmtDate(i.dueDate)}`, icon: Clock, tone: 'bg-red-50 text-red-600', go: () => navigate('billing', { action: 'open', id: i.id }) }));
    if (s.notifyLowStock) data.items.filter((i) => stockStatus(i) !== 'In Stock').slice(0, 4).forEach((i) => out.push({ id: 's' + i.id, title: `${stockStatus(i)}: ${i.name}`, sub: `${i.qty.toLocaleString('en-IN')} ${i.uom} left · reorder at ${i.reorder.toLocaleString('en-IN')}`, icon: AlertTriangle, tone: 'bg-amber-50 text-amber-600', go: () => navigate('inventory', { action: 'open', id: i.id }) }));
    if (s.notifyApprovals) {
      const pe = data.expenses.filter((e) => e.status === 'Pending').length;
      const pl = data.leaves.filter((l) => l.status === 'Pending').length;
      if (pe) out.push({ id: 'pe', title: `${pe} expenses awaiting approval`, sub: 'Review and approve submitted claims', icon: Wallet, tone: 'bg-primary-50 text-primary-600', go: () => navigate('expenses', { action: 'open', sub: 'pending' }) });
      if (pl) out.push({ id: 'pl', title: `${pl} leave requests pending`, sub: 'Approve or reject in HR → Leave', icon: Users, tone: 'bg-violet-50 text-violet-600', go: () => navigate('hr', { action: 'open', sub: 'leave' }) });
    }
    return out;
  }, [data, navigate]);
  const unread = list.filter((n) => !read.has(n.id)).length;
  return (
    <div className="relative">
      <IconButton icon={Bell} label="Notifications" badge={unread} onClick={() => setOpen(!open)} />
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="pop-in absolute right-0 top-full z-40 mt-2 w-[380px] max-w-[calc(100vw-24px)] rounded-xl border border-line bg-white shadow-pop">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <p className="text-sm font-semibold">Notifications</p>
              <button className="text-xs font-medium text-primary-600 hover:text-primary-700" onClick={() => setRead(new Set(list.map((n) => n.id)))}>Mark all as read</button>
            </div>
            <div className="max-h-[420px] overflow-y-auto p-1.5">
              {list.length === 0 && <p className="px-3 py-8 text-center text-sm text-ink-500">You’re all caught up.</p>}
              {list.map((n) => (
                <button key={n.id} onClick={() => { setRead((r) => new Set(r).add(n.id)); n.go(); setOpen(false); }} className="flex w-full items-start gap-3 rounded-lg px-2.5 py-2.5 text-left hover:bg-surface">
                  <span className={cx('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', n.tone)}><n.icon className="h-4 w-4" /></span>
                  <span className="min-w-0 flex-1"><span className="block text-sm font-medium text-ink-900">{n.title}</span><span className="block truncate text-xs text-ink-500">{n.sub}</span></span>
                  {!read.has(n.id) && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary-500" />}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Topbar({ onMenu }: { onMenu: () => void }) {
  const { navigate } = useStore();
  const toast = useToast();
  return (
    <header className="no-print sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-white/95 px-4 backdrop-blur sm:px-6">
      <IconButton icon={MenuIcon} label="Open menu" onClick={onMenu} className="lg:hidden" />
      <GlobalSearch />
      <div className="ml-auto flex items-center gap-1.5">
        <Menu width={210} items={[
          { label: 'New invoice', icon: Receipt, onClick: () => navigate('billing', { action: 'new' }) },
          { label: 'New expense', icon: Wallet, onClick: () => navigate('expenses', { action: 'new' }) },
          { label: 'Add inventory item', icon: Package, onClick: () => navigate('inventory', { action: 'new' }) },
          { label: 'Add employee', icon: User, onClick: () => navigate('hr', { action: 'new' }) },
        ]} trigger={(open) => <Button variant="primary" icon={Plus} onClick={open} className="hidden sm:inline-flex">Create</Button>} />
        <IconButton icon={HelpCircle} label="Help" onClick={() => toast('info', 'Need help?', 'Press Ctrl+K to search across every module.')} className="hidden sm:inline-flex" />
        <Notifications />
        <div className="mx-1 hidden h-6 w-px bg-line sm:block" />
        <Menu width={220} items={[
          { label: 'My profile', icon: User, onClick: () => toast('info', 'Profile', 'Profile management is available in the full product.') },
          { label: 'Company settings', icon: Settings, onClick: () => navigate('preferences') },
          { label: 'Sign out', icon: LogOut, divider: true, onClick: () => toast('info', 'Demo mode', 'Authentication is disabled in this prototype.') },
        ]} trigger={(open) => (
          <button onClick={open} className="flex items-center gap-2 rounded-lg p-1 pr-2 hover:bg-surface">
            <Avatar name="Arjun Mehta" size={30} tone={0} />
            <span className="hidden text-left leading-tight md:block"><span className="block text-[13px] font-semibold text-ink-900">Arjun Mehta</span><span className="block text-[11px] text-ink-500">Administrator</span></span>
          </button>
        )} />
      </div>
    </header>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const { data } = useStore();
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem('coreerp-collapsed') === '1'; } catch { return false; } });
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => { try { localStorage.setItem('coreerp-collapsed', collapsed ? '1' : '0'); } catch { /* ignore */ } }, [collapsed]);
  const badges = useMemo(() => ({
    billing: data.invoices.filter((i) => invoiceStatus(i) === 'Overdue').length,
    inventory: data.items.filter((i) => stockStatus(i) !== 'In Stock').length,
    hr: data.leaves.filter((l) => l.status === 'Pending').length,
    expenses: data.expenses.filter((e) => e.status === 'Pending').length,
  }), [data]);
  return (
    <div className="min-h-full">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} badges={badges} />
      <div className={cx('transition-[padding] duration-200', collapsed ? 'lg:pl-[68px]' : 'lg:pl-[248px]')}>
        <Topbar onMenu={() => setMobileOpen(true)} />
        <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
