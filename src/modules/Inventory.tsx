import React, { useMemo, useState } from 'react';
import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, Boxes, Download, Edit3, History, IndianRupee, Package, PackageX, Plus, SlidersHorizontal } from 'lucide-react';
import { useIntent, useStore, stockStatus } from '../lib/store';
import type { InventoryItem, MovementType, StockStatus } from '../lib/types';
import { Badge, Button, Card, DataTable, DateRangeFilter, DetailRow, EmptyState, Field, FilterBar, Input, KpiCard, Menu, Modal, PageHeader, ProgressBar, SearchInput, Select, StatusBadge, Tabs, Textarea, cx, useExport, useToast } from '../components/ui';
import { DateRange, fmtDate, inr, inrCompact, inRange, num, resolveRange, todayISO, toCSV } from '../lib/format';
import { CATEGORIES, UOMS } from '../lib/seed';

type Tab = 'stock' | 'movements';

export default function Inventory() {
  const { data } = useStore();
  const exportCsv = useExport();
  const [tab, setTab] = useState<Tab>('stock');
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All');
  const [status, setStatus] = useState<StockStatus | 'All'>('All');
  const [editing, setEditing] = useState<InventoryItem | 'new' | null>(null);
  const [moving, setMoving] = useState<{ type: MovementType; itemId?: string } | null>(null);
  const [detail, setDetail] = useState<string | null>(null);

  useIntent('inventory', (i) => {
    if (i.action === 'new') setEditing('new');
    if (i.id) setDetail(i.id);
    if (i.sub === 'low') { setStatus('Low Stock'); setTab('stock'); }
  });

  const stats = useMemo(() => ({
    value: data.items.reduce((s, i) => s + i.qty * i.price, 0),
    low: data.items.filter((i) => stockStatus(i) === 'Low Stock').length,
    out: data.items.filter((i) => stockStatus(i) === 'Out of Stock').length,
  }), [data.items]);

  const rows = useMemo(() => {
    const s = q.toLowerCase();
    return data.items.filter((i) => (cat === 'All' || i.category === cat) && (status === 'All' || stockStatus(i) === status) && (!s || i.name.toLowerCase().includes(s) || i.id.toLowerCase().includes(s) || (i.location || '').toLowerCase().includes(s)));
  }, [data.items, q, cat, status]);

  const doExport = () => exportCsv(`stock-register-${todayISO()}.csv`, toCSV(['Item ID', 'Item', 'Category', 'UOM', 'Available Qty', 'Reorder Level', 'Unit Price', 'Stock Value', 'Status', 'Location'],
    rows.map((i) => [i.id, i.name, i.category, i.uom, i.qty, i.reorder, i.price, Math.round(i.qty * i.price), stockStatus(i), i.location || ''])));

  const detailItem = data.items.find((i) => i.id === detail) || null;
  const needAttention = stats.low + stats.out;

  return (
    <div>
      <PageHeader title="Inventory" subtitle="Track materials across godowns and yards, record movements and stay ahead of reorders."
        actions={<>
          <Button icon={ArrowDownToLine} onClick={() => setMoving({ type: 'Inward' })}>Stock inward</Button>
          <Button icon={ArrowUpFromLine} onClick={() => setMoving({ type: 'Outward' })}>Stock outward</Button>
          <Button variant="primary" icon={Plus} onClick={() => setEditing('new')}>Add item</Button>
        </>} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total Stock Items" value={data.items.length} icon={Package} tone="blue" hint={`${CATEGORIES.length} categories`} onClick={() => { setStatus('All'); setCat('All'); }} />
        <KpiCard label="Total Inventory Value" value={inrCompact(stats.value)} icon={IndianRupee} tone="green" hint="At current unit cost" />
        <KpiCard label="Low-stock Items" value={stats.low} icon={AlertTriangle} tone="amber" hint="At or below reorder level" onClick={() => { setStatus('Low Stock'); setTab('stock'); }} />
        <KpiCard label="Out-of-stock Items" value={stats.out} icon={PackageX} tone="red" hint="Zero quantity available" onClick={() => { setStatus('Out of Stock'); setTab('stock'); }} />
      </div>

      {needAttention > 0 && status === 'All' && tab === 'stock' && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <p className="flex-1 text-sm text-amber-900"><b>{needAttention} items</b> need replenishment — {data.items.filter((i) => stockStatus(i) !== 'In Stock').slice(0, 3).map((i) => i.name).join(', ')}{needAttention > 3 ? ' and more' : ''}.</p>
          <Button size="sm" onClick={() => setStatus('Low Stock')}>Review low stock</Button>
        </div>
      )}

      <div className="mt-5">
        <Tabs value={tab} onChange={setTab} tabs={[{ value: 'stock', label: 'Stock register', icon: Boxes, count: data.items.length }, { value: 'movements', label: 'Movement history', icon: History, count: data.movements.length }]} />
      </div>

      {tab === 'stock' ? (
        <Card className="overflow-hidden">
          <FilterBar right={<Button size="sm" icon={Download} onClick={doExport}>Export</Button>}>
            <SearchInput value={q} onChange={setQ} placeholder="Search item, ID or location" className="w-full sm:w-[280px]" />
            <Select value={cat} onChange={(e) => setCat(e.target.value)} className="w-[180px]"><option value="All">All categories</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select>
            <Select value={status} onChange={(e) => setStatus(e.target.value as StockStatus | 'All')} className="w-[150px]">{['All', 'In Stock', 'Low Stock', 'Out of Stock'].map((s) => <option key={s} value={s}>{s === 'All' ? 'All statuses' : s}</option>)}</Select>
            {(q || cat !== 'All' || status !== 'All') && <Button size="sm" variant="ghost" onClick={() => { setQ(''); setCat('All'); setStatus('All'); }}>Clear</Button>}
          </FilterBar>
          <DataTable rows={rows} rowKey={(r) => r.id} onRowClick={(r) => setDetail(r.id)} defaultSort={{ key: 'id', dir: 'asc' }} pageSize={12}
            empty={<EmptyState icon={Package} title="No items found" message="No inventory matches the current filters." action={<Button variant="primary" icon={Plus} onClick={() => setEditing('new')}>Add item</Button>} />}
            columns={[
              { key: 'id', header: 'Item ID', render: (r) => <span className="text-ink-500">{r.id}</span>, sort: (r) => r.id },
              { key: 'name', header: 'Item name', render: (r) => <div><p className="font-medium text-ink-900">{r.name}</p><p className="text-xs text-ink-400">{r.location}</p></div>, sort: (r) => r.name },
              { key: 'cat', header: 'Category', render: (r) => r.category, sort: (r) => r.category },
              { key: 'uom', header: 'UOM', render: (r) => <span className="text-ink-500">{r.uom}</span> },
              { key: 'qty', header: 'Available', align: 'right', render: (r) => <span className={cx('font-semibold tnum', r.qty <= 0 ? 'text-red-600' : r.qty <= r.reorder ? 'text-amber-700' : 'text-ink-900')}>{num(r.qty, 2)}</span>, sort: (r) => r.qty },
              { key: 'reorder', header: 'Reorder lvl', align: 'right', render: (r) => <span className="text-ink-500 tnum">{num(r.reorder)}</span>, sort: (r) => r.reorder },
              { key: 'price', header: 'Unit price', align: 'right', render: (r) => <span className="tnum">{inr(r.price, r.price < 100 ? 2 : 0)}</span>, sort: (r) => r.price },
              { key: 'value', header: 'Stock value', align: 'right', render: (r) => <span className="font-medium tnum">{inr(r.qty * r.price)}</span>, sort: (r) => r.qty * r.price },
              { key: 'status', header: 'Status', render: (r) => <StatusBadge status={stockStatus(r)} />, sort: (r) => stockStatus(r) },
              { key: 'act', header: '', align: 'right', render: (r) => <Menu items={[
                { label: 'Stock inward', icon: ArrowDownToLine, onClick: () => setMoving({ type: 'Inward', itemId: r.id }) },
                { label: 'Stock outward', icon: ArrowUpFromLine, onClick: () => setMoving({ type: 'Outward', itemId: r.id }), disabled: r.qty <= 0 },
                { label: 'Stock adjustment', icon: SlidersHorizontal, onClick: () => setMoving({ type: 'Adjustment', itemId: r.id }) },
                { label: 'Movement history', icon: History, onClick: () => setDetail(r.id) },
                { label: 'Edit item', icon: Edit3, onClick: () => setEditing(r), divider: true },
              ]} /> },
            ]} />
        </Card>
      ) : <Movements />}

      {editing && <ItemForm initial={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
      {moving && <MovementForm type={moving.type} itemId={moving.itemId} onClose={() => setMoving(null)} />}
      {detailItem && <ItemDetail item={detailItem} onClose={() => setDetail(null)} onMove={(type) => setMoving({ type, itemId: detailItem.id })} onEdit={() => { setEditing(detailItem); setDetail(null); }} />}
    </div>
  );
}

function Movements() {
  const { data } = useStore();
  const exportCsv = useExport();
  const [q, setQ] = useState('');
  const [type, setType] = useState('All');
  const [range, setRange] = useState<DateRange>({ preset: 'last90' });
  const { from, to } = resolveRange(range);
  const items = useMemo(() => Object.fromEntries(data.items.map((i) => [i.id, i])), [data.items]);
  const rows = useMemo(() => {
    const s = q.toLowerCase();
    return data.movements.filter((m) => (type === 'All' || m.type === type) && inRange(m.date, from, to) && (!s || items[m.itemId]?.name.toLowerCase().includes(s) || m.reference.toLowerCase().includes(s) || (m.note || '').toLowerCase().includes(s)));
  }, [data.movements, q, type, from, to, items]);
  return (
    <Card className="overflow-hidden">
      <FilterBar right={<><DateRangeFilter compact value={range} onChange={setRange} presets={['week', 'month', 'lastMonth', 'last90', 'all', 'custom']} /><Button size="sm" icon={Download} onClick={() => exportCsv(`stock-movements-${todayISO()}.csv`, toCSV(['Date', 'Movement ID', 'Item', 'Type', 'Qty', 'UOM', 'Balance', 'Reference', 'Note', 'By'], rows.map((m) => [m.date, m.id, items[m.itemId]?.name, m.type, m.qty, items[m.itemId]?.uom, m.balance, m.reference, m.note || '', m.by])))}>Export</Button></>}>
        <SearchInput value={q} onChange={setQ} placeholder="Search item, reference or note" className="w-full sm:w-[280px]" />
        <Select value={type} onChange={(e) => setType(e.target.value)} className="w-[160px]">{['All', 'Inward', 'Outward', 'Adjustment'].map((t) => <option key={t} value={t}>{t === 'All' ? 'All movements' : t}</option>)}</Select>
      </FilterBar>
      <DataTable rows={rows} rowKey={(r) => r.id} pageSize={12} defaultSort={{ key: 'date', dir: 'desc' }}
        empty={<EmptyState icon={History} title="No movements" message="No stock movements in this period." />}
        columns={[
          { key: 'date', header: 'Date', render: (r) => fmtDate(r.date), sort: (r) => r.date + r.id },
          { key: 'id', header: 'Movement ID', render: (r) => <span className="text-ink-500">{r.id}</span> },
          { key: 'item', header: 'Item', render: (r) => <span className="font-medium text-ink-900">{items[r.itemId]?.name || r.itemId}</span>, sort: (r) => items[r.itemId]?.name || '' },
          { key: 'type', header: 'Type', render: (r) => <StatusBadge status={r.type} /> },
          { key: 'qty', header: 'Quantity', align: 'right', render: (r) => <span className={cx('font-semibold tnum', r.qty >= 0 ? 'text-emerald-700' : 'text-ink-800')}>{r.qty > 0 ? '+' : ''}{num(r.qty, 2)} <span className="font-normal text-ink-400">{items[r.itemId]?.uom}</span></span>, sort: (r) => r.qty },
          { key: 'bal', header: 'Balance', align: 'right', render: (r) => <span className="tnum text-ink-600">{num(r.balance, 2)}</span> },
          { key: 'ref', header: 'Reference', render: (r) => r.reference },
          { key: 'note', header: 'Note', render: (r) => <span className="block max-w-[220px] truncate text-ink-500">{r.note}</span> },
          { key: 'by', header: 'By', render: (r) => <span className="text-ink-500">{r.by}</span> },
        ]} />
    </Card>
  );
}

function ItemForm({ initial, onClose }: { initial?: InventoryItem; onClose: () => void }) {
  const { saveItem } = useStore();
  const toast = useToast();
  const [f, setF] = useState({ name: initial?.name || '', category: initial?.category || CATEGORIES[0], uom: initial?.uom || 'Nos', qty: initial?.qty ?? 0, reorder: initial?.reorder ?? 0, price: initial?.price ?? 0, location: initial?.location || 'Godown A', hsn: initial?.hsn || '' });
  const [err, setErr] = useState<Record<string, string>>({});
  const set = (k: keyof typeof f, v: string | number) => setF((x) => ({ ...x, [k]: v }));
  const submit = () => {
    const e: Record<string, string> = {};
    if (!f.name.trim()) e.name = 'Item name is required';
    if (!(f.price > 0)) e.price = 'Enter a unit price greater than 0';
    if (f.reorder < 0) e.reorder = 'Cannot be negative';
    if (!initial && f.qty < 0) e.qty = 'Cannot be negative';
    setErr(e);
    if (Object.keys(e).length) return;
    const it = saveItem({ ...f, name: f.name.trim(), id: initial?.id });
    toast('success', initial ? 'Item updated' : 'Item added to inventory', `${it.id} · ${it.name}`);
    onClose();
  };
  return (
    <Modal open onClose={onClose} title={initial ? `Edit ${initial.id}` : 'Add inventory item'} subtitle={initial ? initial.name : 'Create a new SKU in the stock register'} icon={Package}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={submit}>{initial ? 'Save changes' : 'Add item'}</Button></>}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Item name" required error={err.name} className="sm:col-span-2"><Input value={f.name} invalid={!!err.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. TMT Bar Fe550D 20 mm" /></Field>
        <Field label="Category" required><Select value={f.category} onChange={(e) => set('category', e.target.value)}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select></Field>
        <Field label="Unit of measurement" required><Select value={f.uom} onChange={(e) => set('uom', e.target.value)}>{UOMS.map((c) => <option key={c}>{c}</option>)}</Select></Field>
        <Field label="Unit price (₹)" required error={err.price}><Input type="number" min={0} step="any" value={f.price || ''} invalid={!!err.price} onChange={(e) => set('price', parseFloat(e.target.value) || 0)} /></Field>
        <Field label="Reorder level" error={err.reorder} hint="Alert when stock falls to this level"><Input type="number" min={0} value={f.reorder || ''} onChange={(e) => set('reorder', parseFloat(e.target.value) || 0)} /></Field>
        {!initial && <Field label="Opening quantity" error={err.qty}><Input type="number" min={0} step="any" value={f.qty || ''} onChange={(e) => set('qty', parseFloat(e.target.value) || 0)} /></Field>}
        <Field label="Storage location"><Select value={f.location} onChange={(e) => set('location', e.target.value)}>{['Godown A', 'Godown B', 'Yard 1', 'Yard 2', 'Yard 3', 'Store Room'].map((c) => <option key={c}>{c}</option>)}</Select></Field>
        <Field label="HSN code"><Input value={f.hsn} onChange={(e) => set('hsn', e.target.value)} placeholder="e.g. 7214" /></Field>
      </div>
      {initial && <p className="mt-4 rounded-lg bg-surface px-3 py-2 text-xs text-ink-500">Quantity changes are recorded through stock inward, outward or adjustment entries to keep a full audit trail.</p>}
    </Modal>
  );
}

function MovementForm({ type: initialType, itemId, onClose }: { type: MovementType; itemId?: string; onClose: () => void }) {
  const { data, recordMovement } = useStore();
  const toast = useToast();
  const [type, setType] = useState<MovementType>(initialType);
  const [id, setId] = useState(itemId || '');
  const [qty, setQty] = useState<number>(0);
  const [counted, setCounted] = useState<number | ''>('');
  const [date, setDate] = useState(todayISO());
  const [ref, setRef] = useState('');
  const [party, setParty] = useState('');
  const [note, setNote] = useState('');
  const [err, setErr] = useState<Record<string, string>>({});
  const item = data.items.find((i) => i.id === id);
  const delta = type === 'Adjustment' ? (counted === '' || !item ? 0 : +(Number(counted) - item.qty).toFixed(3)) : type === 'Inward' ? qty : -qty;
  const after = item ? item.qty + delta : 0;
  const submit = () => {
    const e: Record<string, string> = {};
    if (!item) e.item = 'Select an item';
    if (type !== 'Adjustment' && !(qty > 0)) e.qty = 'Quantity must be greater than 0';
    if (type === 'Outward' && item && qty > item.qty) e.qty = `Only ${num(item.qty, 2)} ${item.uom} available`;
    if (type === 'Adjustment' && (counted === '' || Number(counted) < 0)) e.counted = 'Enter the physical count';
    if (type === 'Adjustment' && item && counted !== '' && delta === 0) e.counted = 'Count matches system quantity — no adjustment needed';
    if (type === 'Adjustment' && !note.trim()) e.note = 'A reason is required for adjustments';
    if (date > todayISO()) e.date = 'Date cannot be in the future';
    setErr(e);
    if (Object.keys(e).length) return;
    const autoRef = ref.trim() || (type === 'Inward' ? `GRN-${Math.floor(Math.random() * 900 + 100)}` : type === 'Outward' ? `DC-${Math.floor(Math.random() * 900 + 1500)}` : `ADJ-${Math.floor(Math.random() * 90 + 60)}`);
    recordMovement({ itemId: id, type, qty: delta, date, reference: autoRef, note: [party && (type === 'Inward' ? `Received from ${party}` : type === 'Outward' ? `Issued to ${party}` : ''), note].filter(Boolean).join(' · ') });
    toast('success', `${type === 'Adjustment' ? 'Stock adjusted' : `Stock ${type.toLowerCase()} recorded`}`, `${item!.name}: ${delta > 0 ? '+' : ''}${num(delta, 2)} ${item!.uom} · new balance ${num(after, 2)}`);
    onClose();
  };
  const meta = { Inward: { icon: ArrowDownToLine, title: 'Stock inward', sub: 'Record goods received (GRN)' }, Outward: { icon: ArrowUpFromLine, title: 'Stock outward', sub: 'Issue material to a site or customer' }, Adjustment: { icon: SlidersHorizontal, title: 'Stock adjustment', sub: 'Correct system quantity to physical count' } }[type];
  return (
    <Modal open onClose={onClose} title={meta.title} subtitle={meta.sub} icon={meta.icon}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={submit}>Record {type.toLowerCase()}</Button></>}>
      <div className="mb-4"><div className="inline-flex rounded-lg border border-line bg-surface p-0.5">{(['Inward', 'Outward', 'Adjustment'] as MovementType[]).map((t) => <button key={t} onClick={() => setType(t)} className={cx('rounded-md px-3 py-1.5 text-[13px] font-medium', type === t ? 'bg-white shadow-sm ring-1 ring-line' : 'text-ink-500')}>{t}</button>)}</div></div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Item" required error={err.item} className="sm:col-span-2">
          <Select value={id} invalid={!!err.item} onChange={(e) => setId(e.target.value)}><option value="">Select an item…</option>{CATEGORIES.map((c) => <optgroup key={c} label={c}>{data.items.filter((i) => i.category === c).map((i) => <option key={i.id} value={i.id}>{i.name} — {num(i.qty, 2)} {i.uom}</option>)}</optgroup>)}</Select>
        </Field>
        {type === 'Adjustment'
          ? <Field label={`Physical count${item ? ` (${item.uom})` : ''}`} required error={err.counted}><Input type="number" min={0} step="any" value={counted} invalid={!!err.counted} onChange={(e) => setCounted(e.target.value === '' ? '' : parseFloat(e.target.value))} /></Field>
          : <Field label={`Quantity${item ? ` (${item.uom})` : ''}`} required error={err.qty}><Input type="number" min={0} step="any" value={qty || ''} invalid={!!err.qty} onChange={(e) => setQty(parseFloat(e.target.value) || 0)} /></Field>}
        <Field label="Date" required error={err.date}><Input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} /></Field>
        {type !== 'Adjustment' && <Field label={type === 'Inward' ? 'Supplier' : 'Issued to (site / customer)'}><Input list="party-list" value={party} onChange={(e) => setParty(e.target.value)} placeholder={type === 'Inward' ? 'e.g. Southern Steel Traders' : 'e.g. Whitefield Residential Tower'} />
          <datalist id="party-list">{(type === 'Inward' ? ['UltraBuild Cement Depot', 'Southern Steel Traders', 'Arkavathy Sand Suppliers', 'Bharath Bricks', 'Metro Electricals'] : ['Whitefield Residential Tower', 'Hosur Road Warehouse', 'Electronic City Office Fit-out', 'Yelahanka Villa Project']).map((p) => <option key={p} value={p} />)}</datalist></Field>}
        <Field label={type === 'Inward' ? 'PO / GRN number' : type === 'Outward' ? 'Delivery challan no.' : 'Reference'} hint="Auto-generated if left blank"><Input value={ref} onChange={(e) => setRef(e.target.value)} /></Field>
        <Field label={type === 'Adjustment' ? 'Reason' : 'Remarks'} required={type === 'Adjustment'} error={err.note} className="sm:col-span-2"><Textarea value={note} invalid={!!err.note} onChange={(e) => setNote(e.target.value)} placeholder={type === 'Adjustment' ? 'e.g. Bags damaged due to moisture' : 'Optional'} /></Field>
      </div>
      {item && (
        <div className="mt-4 grid grid-cols-3 gap-3 rounded-xl border border-line bg-surface/60 p-3.5 text-center">
          <div><p className="text-xs text-ink-500">Current</p><p className="font-semibold tnum">{num(item.qty, 2)}</p></div>
          <div><p className="text-xs text-ink-500">Change</p><p className={cx('font-semibold tnum', delta > 0 ? 'text-emerald-700' : delta < 0 ? 'text-red-600' : '')}>{delta > 0 ? '+' : ''}{num(delta, 2)}</p></div>
          <div><p className="text-xs text-ink-500">After</p><p className={cx('font-semibold tnum', after < 0 && 'text-red-600')}>{num(Math.max(0, after), 2)} <span className="text-xs font-normal text-ink-400">{item.uom}</span></p></div>
        </div>
      )}
    </Modal>
  );
}

function ItemDetail({ item, onClose, onMove, onEdit }: { item: InventoryItem; onClose: () => void; onMove: (t: MovementType) => void; onEdit: () => void }) {
  const { data } = useStore();
  const mv = data.movements.filter((m) => m.itemId === item.id);
  const st = stockStatus(item);
  const inward = mv.filter((m) => m.qty > 0).reduce((s, m) => s + m.qty, 0);
  const outward = mv.filter((m) => m.qty < 0).reduce((s, m) => s - m.qty, 0);
  return (
    <Modal open onClose={onClose} size="lg" icon={Package} title={item.name} subtitle={`${item.id} · ${item.category} · ${item.location}`}
      footer={<><Button variant="ghost" icon={Edit3} onClick={onEdit} className="mr-auto">Edit item</Button><Button icon={SlidersHorizontal} onClick={() => onMove('Adjustment')}>Adjust</Button><Button icon={ArrowUpFromLine} onClick={() => onMove('Outward')} disabled={item.qty <= 0}>Outward</Button><Button variant="primary" icon={ArrowDownToLine} onClick={() => onMove('Inward')}>Inward</Button></>}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[['Available', `${num(item.qty, 2)} ${item.uom}`], ['Reorder level', `${num(item.reorder)} ${item.uom}`], ['Unit price', inr(item.price, item.price < 100 ? 2 : 0)], ['Stock value', inr(item.qty * item.price)]].map(([l, v]) => (
          <div key={l} className="rounded-xl border border-line p-3"><p className="text-xs text-ink-500">{l}</p><p className="mt-0.5 font-semibold tnum">{v}</p></div>
        ))}
      </div>
      <div className="mt-4 rounded-xl border border-line p-4">
        <div className="mb-2 flex items-center justify-between"><span className="text-sm font-medium">Stock level</span><StatusBadge status={st} /></div>
        <ProgressBar value={(item.qty / Math.max(item.reorder * 2, item.qty, 1)) * 100} tone={st === 'In Stock' ? 'bg-emerald-500' : st === 'Low Stock' ? 'bg-amber-500' : 'bg-red-500'} />
        <div className="mt-2 flex justify-between text-xs text-ink-500"><span>Received (90d): <b className="text-ink-800">{num(inward, 2)}</b></span><span>Issued (90d): <b className="text-ink-800">{num(outward, 2)}</b></span><span>HSN: {item.hsn || '—'}</span></div>
      </div>
      <p className="mb-2 mt-5 text-sm font-semibold">Movement history</p>
      <div className="overflow-hidden rounded-xl border border-line">
        <DataTable dense pageSize={6} rows={mv} rowKey={(r) => r.id} empty={<EmptyState icon={History} title="No movements yet" />}
          columns={[
            { key: 'date', header: 'Date', render: (r) => fmtDate(r.date) },
            { key: 'type', header: 'Type', render: (r) => <StatusBadge status={r.type} /> },
            { key: 'qty', header: 'Qty', align: 'right', render: (r) => <span className={cx('font-semibold tnum', r.qty > 0 ? 'text-emerald-700' : '')}>{r.qty > 0 ? '+' : ''}{num(r.qty, 2)}</span> },
            { key: 'bal', header: 'Balance', align: 'right', render: (r) => <span className="tnum">{num(r.balance, 2)}</span> },
            { key: 'ref', header: 'Reference', render: (r) => r.reference },
            { key: 'note', header: 'Note', render: (r) => <span className="block max-w-[200px] truncate text-ink-500">{r.note}</span> },
          ]} />
      </div>
    </Modal>
  );
}
