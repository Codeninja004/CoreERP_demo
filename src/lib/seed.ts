import type { AppData, Attendance, Employee, Expense, Invoice, InventoryItem, LeaveRequest, LineItem, StockMovement, Activity } from './types';
import { addDays, addMonths, endOfMonth, isSunday, monthKey, monthLong, todayISO, toISO, parseISO } from './format';

// Deterministic RNG so the demo looks the same every load
function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export const CATEGORIES = ['Cement', 'Steel & TMT', 'Aggregates', 'Bricks & Blocks', 'Paints & Chemicals', 'Electrical', 'Plumbing', 'Tools & Hardware', 'Safety Gear'];
export const UOMS = ['Bag', 'MT', 'Cu.m', 'Nos', 'Litre', 'Kg', 'Metre', 'Coil', 'Box', 'Pair'];
export const DEPARTMENTS = ['Operations', 'Site Engineering', 'Sales', 'Accounts', 'Procurement', 'Warehouse', 'HR & Admin'];
export const EXPENSE_CATEGORIES = ['Salaries', 'Material Purchases', 'Transportation', 'Equipment', 'Rent & Utilities', 'Maintenance', 'Miscellaneous'];
export const PAYMENT_METHODS = ['Bank Transfer', 'UPI', 'Cheque', 'Corporate Card', 'Cash'];
export const PROJECTS = ['Head Office', 'Whitefield Residential Tower', 'Hosur Road Warehouse', 'Electronic City Office Fit-out', 'Yelahanka Villa Project'];
export const GST_RATES = [0, 5, 18, 40];
export const CUSTOMERS = [
  { name: 'Sharma Constructions', gstin: '29AAKFS4821M1Z3', address: 'No. 14, 2nd Cross, Indiranagar, Bengaluru 560038' },
  { name: 'Kaveri Infra Developers', gstin: '29AACCK7712R1ZQ', address: '88, Hosur Main Road, Bommanahalli, Bengaluru 560068' },
  { name: 'Deccan Builders & Co.', gstin: '36AAHFD3390K1Z9', address: 'Plot 22, Madhapur, Hyderabad 500081' },
  { name: 'Sai Krishna Enterprises', gstin: '29ABMPK5561D1Z2', address: '7/3, KR Puram, Bengaluru 560036' },
  { name: 'Nandi Hills Realty', gstin: '29AAJCN2210P1ZK', address: '201, Bellary Road, Hebbal, Bengaluru 560024' },
  { name: 'Patel Infrastructure Projects', gstin: '24AADCP9081E1Z6', address: 'SG Highway, Ahmedabad 380054' },
  { name: 'Greenfield Homes LLP', gstin: '29AAPFG1145H1ZT', address: 'Sarjapur Road, Bengaluru 560035' },
  { name: 'Rao & Sons Contractors', gstin: '29AEEPR7734L1ZB', address: 'Basavanagudi, Bengaluru 560004' },
  { name: 'Malabar Estates', gstin: '32AAFCM6620Q1Z1', address: 'MG Road, Kochi 682016' },
  { name: 'Vishwa Engineering Works', gstin: '33AAGFV4407N1Z8', address: 'Guindy Industrial Estate, Chennai 600032' },
  { name: 'Konark Developers', gstin: '29AAHCK8852B1ZD', address: 'Yelahanka New Town, Bengaluru 560064' },
  { name: 'Tungabhadra Projects', gstin: '29AACFT3318G1ZM', address: 'Vidyanagar, Hubballi 580021' },
];

const ITEMS: Omit<InventoryItem, 'id'>[] = [
  { name: 'OPC 53 Grade Cement (50 kg)', category: 'Cement', uom: 'Bag', qty: 1840, reorder: 600, price: 385, location: 'Godown A', hsn: '2523' },
  { name: 'PPC Cement (50 kg)', category: 'Cement', uom: 'Bag', qty: 420, reorder: 500, price: 360, location: 'Godown A', hsn: '2523' },
  { name: 'White Cement (40 kg)', category: 'Cement', uom: 'Bag', qty: 96, reorder: 40, price: 980, location: 'Godown A', hsn: '2523' },
  { name: 'TMT Bar Fe500D 8 mm', category: 'Steel & TMT', uom: 'MT', qty: 14.5, reorder: 6, price: 61500, location: 'Yard 1', hsn: '7214' },
  { name: 'TMT Bar Fe500D 12 mm', category: 'Steel & TMT', uom: 'MT', qty: 22, reorder: 8, price: 60200, location: 'Yard 1', hsn: '7214' },
  { name: 'TMT Bar Fe500D 16 mm', category: 'Steel & TMT', uom: 'MT', qty: 4.2, reorder: 6, price: 59800, location: 'Yard 1', hsn: '7214' },
  { name: 'MS Angle 50x50x5 mm', category: 'Steel & TMT', uom: 'MT', qty: 3.1, reorder: 2, price: 64000, location: 'Yard 1', hsn: '7216' },
  { name: 'GI Binding Wire 18 G', category: 'Steel & TMT', uom: 'Kg', qty: 0, reorder: 150, price: 86, location: 'Godown B', hsn: '7217' },
  { name: 'River Sand (Washed)', category: 'Aggregates', uom: 'Cu.m', qty: 64, reorder: 40, price: 2350, location: 'Yard 2', hsn: '2505' },
  { name: 'M-Sand (Plastering)', category: 'Aggregates', uom: 'Cu.m', qty: 118, reorder: 50, price: 1580, location: 'Yard 2', hsn: '2517' },
  { name: '20 mm Blue Metal Aggregate', category: 'Aggregates', uom: 'Cu.m', qty: 32, reorder: 45, price: 1420, location: 'Yard 2', hsn: '2517' },
  { name: '40 mm Aggregate', category: 'Aggregates', uom: 'Cu.m', qty: 58, reorder: 25, price: 1290, location: 'Yard 2', hsn: '2517' },
  { name: 'Red Clay Bricks (Wire-cut)', category: 'Bricks & Blocks', uom: 'Nos', qty: 26500, reorder: 10000, price: 9.5, location: 'Yard 3', hsn: '6901' },
  { name: 'AAC Block 600x200x150', category: 'Bricks & Blocks', uom: 'Nos', qty: 2150, reorder: 1500, price: 68, location: 'Yard 3', hsn: '6810' },
  { name: 'Fly Ash Bricks', category: 'Bricks & Blocks', uom: 'Nos', qty: 7800, reorder: 8000, price: 7.2, location: 'Yard 3', hsn: '6815' },
  { name: 'Waterproofing Compound', category: 'Paints & Chemicals', uom: 'Litre', qty: 240, reorder: 100, price: 285, location: 'Godown B', hsn: '3824' },
  { name: 'Exterior Emulsion (20 L)', category: 'Paints & Chemicals', uom: 'Nos', qty: 38, reorder: 20, price: 5650, location: 'Godown B', hsn: '3209' },
  { name: 'Wall Putty (40 kg)', category: 'Paints & Chemicals', uom: 'Bag', qty: 12, reorder: 30, price: 840, location: 'Godown B', hsn: '3214' },
  { name: 'Tile Adhesive (20 kg)', category: 'Paints & Chemicals', uom: 'Bag', qty: 145, reorder: 60, price: 515, location: 'Godown B', hsn: '3214' },
  { name: 'FR Copper Wire 2.5 sq mm', category: 'Electrical', uom: 'Coil', qty: 46, reorder: 20, price: 2480, location: 'Store Room', hsn: '8544' },
  { name: 'PVC Conduit Pipe 25 mm', category: 'Electrical', uom: 'Nos', qty: 310, reorder: 150, price: 96, location: 'Store Room', hsn: '3917' },
  { name: 'MCB 32A Double Pole', category: 'Electrical', uom: 'Nos', qty: 0, reorder: 25, price: 640, location: 'Store Room', hsn: '8536' },
  { name: 'CPVC Pipe 1 inch', category: 'Plumbing', uom: 'Metre', qty: 520, reorder: 200, price: 182, location: 'Godown B', hsn: '3917' },
  { name: 'Ball Valve 1 inch (Brass)', category: 'Plumbing', uom: 'Nos', qty: 34, reorder: 40, price: 420, location: 'Store Room', hsn: '8481' },
  { name: 'Shuttering Plywood 12 mm', category: 'Tools & Hardware', uom: 'Nos', qty: 180, reorder: 80, price: 1650, location: 'Yard 3', hsn: '4412' },
  { name: 'Wire Nails 3 inch', category: 'Tools & Hardware', uom: 'Kg', qty: 210, reorder: 100, price: 94, location: 'Store Room', hsn: '7317' },
  { name: 'Safety Helmet (ISI)', category: 'Safety Gear', uom: 'Nos', qty: 64, reorder: 50, price: 225, location: 'Store Room', hsn: '6506' },
  { name: 'Safety Shoes (Steel Toe)', category: 'Safety Gear', uom: 'Pair', qty: 18, reorder: 25, price: 1250, location: 'Store Room', hsn: '6403' },
  { name: 'Cotton Hand Gloves', category: 'Safety Gear', uom: 'Pair', qty: 420, reorder: 200, price: 42, location: 'Store Room', hsn: '6116' },
];

const EMPLOYEES: [string, string, string, number, string][] = [
  ['Rajesh Kumar', 'Operations', 'Operations Manager', 95000, 'Head Office'],
  ['Priya Nair', 'Accounts', 'Finance Manager', 88000, 'Head Office'],
  ['Vikram Reddy', 'Site Engineering', 'Senior Site Engineer', 72000, 'Whitefield Site'],
  ['Ananya Iyer', 'Sales', 'Sales Manager', 78000, 'Head Office'],
  ['Mohammed Irfan', 'Procurement', 'Procurement Lead', 65000, 'Head Office'],
  ['Sneha Kulkarni', 'HR & Admin', 'HR Executive', 48000, 'Head Office'],
  ['Arun Prakash', 'Site Engineering', 'Site Engineer', 52000, 'Hosur Road Site'],
  ['Deepa Menon', 'Accounts', 'Accounts Executive', 42000, 'Head Office'],
  ['Suresh Gowda', 'Warehouse', 'Warehouse Supervisor', 45000, 'Main Godown'],
  ['Kavya Shetty', 'Sales', 'Sales Executive', 38000, 'Head Office'],
  ['Ravi Shankar', 'Operations', 'Logistics Coordinator', 40000, 'Main Godown'],
  ['Lakshmi Narayan', 'Site Engineering', 'Quantity Surveyor', 56000, 'Whitefield Site'],
  ['Farhan Sheikh', 'Warehouse', 'Store Keeper', 28000, 'Main Godown'],
  ['Meera Joshi', 'Procurement', 'Purchase Executive', 36000, 'Head Office'],
  ['Karthik Subramanian', 'Site Engineering', 'Junior Engineer', 34000, 'Electronic City Site'],
  ['Pooja Hegde', 'Sales', 'Business Development Executive', 40000, 'Head Office'],
  ['Naveen Raj', 'Warehouse', 'Forklift Operator', 24000, 'Main Godown'],
  ['Divya Rao', 'HR & Admin', 'Admin Assistant', 26000, 'Head Office'],
  ['Santosh Patil', 'Operations', 'Site Supervisor', 38000, 'Hosur Road Site'],
  ['Harish Babu', 'Warehouse', 'Loader', 19000, 'Main Godown'],
  ['Nikhil Verma', 'Accounts', 'Junior Accountant', 30000, 'Head Office'],
  ['Shreya Pillai', 'Site Engineering', 'Safety Officer', 46000, 'Whitefield Site'],
  ['Ganesh Murthy', 'Operations', 'Driver', 22000, 'Main Godown'],
  ['Aisha Khan', 'Sales', 'Sales Coordinator', 32000, 'Head Office'],
];

const PRODUCT_LINES: { d: string; hsn: string; price: number; min: number; max: number; gst: number; step?: number }[] = [
  { d: 'OPC 53 Grade Cement (50 kg bag)', hsn: '2523', price: 410, min: 300, max: 800, gst: 18, step: 50 },
  { d: 'PPC Cement (50 kg bag)', hsn: '2523', price: 385, min: 250, max: 600, gst: 18, step: 50 },
  { d: 'TMT Bar Fe500D 12 mm', hsn: '7214', price: 64500, min: 3, max: 7, gst: 18 },
  { d: 'TMT Bar Fe500D 8 mm', hsn: '7214', price: 65800, min: 2, max: 5, gst: 18 },
  { d: 'River Sand (Washed) – per Cu.m', hsn: '2505', price: 2650, min: 20, max: 50, gst: 5 },
  { d: 'M-Sand (Plastering) – per Cu.m', hsn: '2517', price: 1780, min: 30, max: 70, gst: 5 },
  { d: '20 mm Blue Metal Aggregate – per Cu.m', hsn: '2517', price: 1590, min: 25, max: 60, gst: 5 },
  { d: 'AAC Block 600x200x150', hsn: '6810', price: 76, min: 1200, max: 3000, gst: 18, step: 100 },
  { d: 'Red Clay Bricks (Wire-cut)', hsn: '6901', price: 10.5, min: 8000, max: 20000, gst: 5, step: 1000 },
  { d: 'Transportation & Unloading Charges', hsn: '9965', price: 4500, min: 2, max: 5, gst: 18 },
  { d: 'Waterproofing Compound – per Litre', hsn: '3824', price: 320, min: 60, max: 150, gst: 18, step: 10 },
];

export function createSeed(): AppData {
  const r = mulberry32(20261117);
  const rint = (a: number, b: number) => Math.floor(r() * (b - a + 1)) + a;
  const pick = <T,>(arr: T[]) => arr[Math.floor(r() * arr.length)];
  const today = todayISO();
  const nowMs = Date.now();

  // ---------------- Inventory ----------------
  const items: InventoryItem[] = ITEMS.map((it, i) => ({ ...it, id: `ITM-${String(1001 + i)}` }));
  const movements: StockMovement[] = [];
  let mseq = 5001;
  const suppliers = ['UltraBuild Cement Depot', 'Southern Steel Traders', 'Arkavathy Sand Suppliers', 'Bharath Bricks', 'Metro Electricals', 'Pioneer Hardware'];
  const sites = PROJECTS.slice(1);
  for (let k = 0; k < 90; k++) {
    const it = pick(items);
    const inward = r() < 0.42;
    const base = it.uom === 'MT' ? rint(2, 8) : it.uom === 'Nos' && it.price < 20 ? rint(10, 60) * 100 : it.uom === 'Bag' ? rint(4, 30) * 10 : rint(5, 60);
    const date = addDays(today, -rint(0, 88));
    movements.push({
      id: `MOV-${mseq++}`, itemId: it.id, type: inward ? 'Inward' : 'Outward', qty: inward ? base : -base, balance: 0, date,
      reference: inward ? `PO-26-${rint(300, 480)}` : `DC-${rint(1100, 1500)}`,
      note: inward ? `Received from ${pick(suppliers)}` : `Issued to ${pick(sites)}`,
      by: pick(['Suresh Gowda', 'Farhan Sheikh', 'Mohammed Irfan']),
    });
  }
  for (let k = 0; k < 5; k++) {
    const it = pick(items);
    movements.push({ id: `MOV-${mseq++}`, itemId: it.id, type: 'Adjustment', qty: -rint(1, 6), balance: 0, date: addDays(today, -rint(2, 60)), reference: `ADJ-${rint(20, 60)}`, note: pick(['Damaged in handling', 'Physical count variance', 'Moisture damage']), by: 'Suresh Gowda' });
  }
  movements.sort((a, b) => (a.date < b.date ? 1 : -1));
  // compute balances backwards from current qty
  const running: Record<string, number> = Object.fromEntries(items.map((i) => [i.id, i.qty]));
  for (const m of movements) { m.balance = Math.max(0, +running[m.itemId].toFixed(2)); running[m.itemId] = running[m.itemId] - m.qty; }

  // ---------------- Employees ----------------
  const employees: Employee[] = EMPLOYEES.map(([name, department, designation, salary, location], i) => {
    const join = addDays(today, -rint(120, 2400));
    const slug = name.toLowerCase().split(' ')[0] + '.' + name.toLowerCase().split(' ').slice(-1)[0];
    return {
      id: `EMP-${1001 + i}`, name, department, designation, salary, location, joinDate: join,
      email: `${slug}@meridianbuild.in`, phone: `+91 9${rint(100000000, 899999999)}`.replace(/(\+91 \d{5})(\d{5})/, '$1 $2'),
      status: i === 14 || i === 20 ? 'Probation' : 'Active',
    };
  });
  employees[14].joinDate = addDays(today, -70);
  employees[20].joinDate = addDays(today, -45);

  // ---------------- Leaves ----------------
  const leaves: LeaveRequest[] = [];
  let lseq = 301;
  const reasons = ['Family function', 'Fever and cold', 'Personal work', 'Travelling to hometown', 'Medical appointment', 'Child’s school event', 'Festival travel'];
  const pastLeaves: [number, number, number, LeaveRequest['type'], LeaveRequest['status']][] = [
    [3, -40, 2, 'Casual', 'Approved'], [7, -33, 1, 'Sick', 'Approved'], [10, -28, 3, 'Earned', 'Approved'], [12, -21, 1, 'Casual', 'Rejected'],
    [5, -18, 2, 'Sick', 'Approved'], [16, -12, 1, 'Casual', 'Approved'], [18, -9, 4, 'Earned', 'Approved'], [1, -6, 1, 'Sick', 'Approved'],
    [8, -1, 2, 'Sick', 'Approved'], [22, 0, 3, 'Earned', 'Approved'],
    [9, 3, 2, 'Casual', 'Pending'], [13, 6, 5, 'Earned', 'Pending'], [19, 10, 1, 'Casual', 'Pending'], [4, 14, 3, 'Earned', 'Pending'],
  ];
  for (const [ei, off, days, type, status] of pastLeaves) {
    const from = addDays(today, off);
    leaves.push({ id: `LV-${lseq++}`, empId: employees[ei].id, type, from, to: addDays(from, days - 1), days, reason: pick(reasons), status, appliedOn: addDays(from, -rint(2, 9)) });
  }
  const onLeaveToday = new Set(leaves.filter((l) => l.status === 'Approved' && l.from <= today && l.to >= today).map((l) => l.empId));
  employees.forEach((e) => { if (onLeaveToday.has(e.id)) e.status = 'On Leave'; });

  // ---------------- Attendance (last 45 days, Mon–Sat) ----------------
  const attendance: Attendance = {};
  for (let d = 45; d >= 0; d--) {
    const date = addDays(today, -d);
    if (isSunday(date)) continue;
    const day: Record<string, 'P' | 'A' | 'L' | 'HD'> = {};
    for (const e of employees) {
      if (e.joinDate > date) continue;
      const onLeave = leaves.some((l) => l.empId === e.id && l.status === 'Approved' && l.from <= date && l.to >= date);
      if (onLeave) { day[e.id] = 'L'; continue; }
      if (d === 0 && r() < 0.12) continue; // a few not yet marked today
      const x = r();
      day[e.id] = x < 0.93 ? 'P' : x < 0.97 ? 'A' : 'HD';
    }
    attendance[date] = day;
  }

  // ---------------- Invoices (last 12 months) ----------------
  const invoices: Invoice[] = [];
  let iseq = 1101;
  const startMonth = addMonths(today, -11);
  for (let m = 0; m < 12; m++) {
    const ms = addMonths(startMonth, m);
    const me = endOfMonth(ms) > today ? today : endOfMonth(ms);
    const lastDay = parseISO(me).getDate();
    const count = m === 11 ? Math.max(5, Math.round(10 * lastDay / 30)) : rint(8, 11);
    const dates = Array.from({ length: count }, (_, k) => toISO(new Date(parseISO(ms).getFullYear(), parseISO(ms).getMonth(), Math.min(lastDay, Math.floor(((k + r()) * lastDay) / count) + 1))));
    for (const date of dates) {
      const cust = pick(CUSTOMERS);
      const nLines = rint(2, 3);
      const used = new Set<number>();
      const lines: LineItem[] = [];
      for (let k = 0; k < nLines; k++) {
        let idx = rint(0, PRODUCT_LINES.length - 1); while (used.has(idx)) idx = (idx + 1) % PRODUCT_LINES.length; used.add(idx);
        const p = PRODUCT_LINES[idx];
        const step = p.step ?? 1;
        const qty = Math.round(rint(p.min, p.max) / step) * step || step;
        lines.push({ id: `L${k}`, description: p.d, hsn: p.hsn, qty, unitPrice: p.price, gstRate: p.gst });
      }
      const terms = pick([15, 30, 30, 30, 45]);
      const due = addDays(date, terms);
      const age = Math.round((nowMs - parseISO(date).getTime()) / 86400000);
      const paid = age > 75 ? r() < 0.95 : age > 35 ? r() < 0.7 : age > 10 ? r() < 0.4 : r() < 0.15;
      invoices.push({
        id: `inv-${iseq}`, number: `INV-${iseq}`, customer: cust.name, customerGstin: cust.gstin, customerAddress: cust.address,
        date, dueDate: due, items: lines, paid, paidOn: paid ? (addDays(date, rint(5, terms + 10)) > today ? today : addDays(date, rint(5, terms + 10))) : undefined,
        paymentMode: paid ? pick(['NEFT', 'RTGS', 'UPI', 'Cheque']) : undefined, notes: '',
      });
      iseq++;
    }
  }
  // two drafts
  invoices.push({ id: `inv-${iseq}`, number: `INV-${iseq}`, customer: 'Konark Developers', customerGstin: CUSTOMERS[10].gstin, customerAddress: CUSTOMERS[10].address, date: today, dueDate: addDays(today, 30), items: [{ id: 'L0', description: 'OPC 53 Grade Cement (50 kg bag)', hsn: '2523', qty: 600, unitPrice: 410, gstRate: 18 }], paid: false, draft: true, notes: 'Awaiting PO confirmation' });
  iseq++;

  // ---------------- Expenses ----------------
  const expenses: Expense[] = [];
  let eseq = 2401;
  const payroll = employees.reduce((s, e) => s + e.salary, 0);
  const submitters = ['Priya Nair', 'Mohammed Irfan', 'Rajesh Kumar', 'Sneha Kulkarni', 'Deepa Menon', 'Ravi Shankar', 'Vikram Reddy'];
  const add = (e: Omit<Expense, 'id'>) => expenses.push({ ...e, id: `EXP-${eseq++}` });
  for (let m = 0; m < 12; m++) {
    const ms = addMonths(startMonth, m);
    const isCurrent = m === 11;
    const me = endOfMonth(ms) > today ? today : endOfMonth(ms);
    const lastDay = parseISO(me).getDate();
    const d = (day: number) => toISO(new Date(parseISO(ms).getFullYear(), parseISO(ms).getMonth(), day > lastDay ? rint(1, lastDay) : day));
    const status = (): Expense['status'] => (isCurrent ? (r() < 0.45 ? 'Pending' : 'Approved') : r() < 0.06 ? 'Rejected' : 'Approved');
    // Salary for previous month paid on 1st
    const prevLabel = monthLong(monthKey(addMonths(ms, -1)));
    add({ description: `Salary disbursement – ${prevLabel}`, category: 'Salaries', date: d(1), amount: Math.round(payroll * (0.96 + r() * 0.05)), method: 'Bank Transfer', submittedBy: 'Priya Nair', department: 'Head Office', status: 'Approved', receipt: `payroll-${monthKey(addMonths(ms, -1))}.pdf` });
    add({ description: 'Warehouse & yard rent – Peenya', category: 'Rent & Utilities', date: d(5), amount: 185000, method: 'Bank Transfer', submittedBy: 'Deepa Menon', department: 'Head Office', status: 'Approved', receipt: 'rent-receipt.pdf' });
    if (!isCurrent || lastDay >= 10) add({ description: 'BESCOM electricity bill', category: 'Rent & Utilities', date: d(10), amount: rint(26000, 46000), method: 'UPI', submittedBy: 'Deepa Menon', department: 'Head Office', status: isCurrent ? 'Approved' : 'Approved', receipt: 'bescom-bill.pdf' });
    const nMat = isCurrent ? 2 : rint(3, 4);
    for (let k = 0; k < nMat; k++) add({ description: pick(['Cement procurement – OPC 53 (1,000 bags)', 'TMT bars purchase – 12 mm', 'River sand – 4 truckloads', 'AAC blocks purchase', 'Electrical consumables restock', 'Plumbing fittings – CPVC lot', 'Aggregates – 20 mm blue metal']), category: 'Material Purchases', date: d(rint(2, 28)), amount: rint(8, 40) * 10000, method: pick(['Bank Transfer', 'Cheque']), submittedBy: 'Mohammed Irfan', department: pick(PROJECTS), status: status(), receipt: r() < 0.85 ? 'supplier-invoice.pdf' : undefined });
    const nTr = rint(3, 5);
    for (let k = 0; k < nTr; k++) add({ description: pick(['Truck hire – Peenya to Whitefield', 'Diesel for delivery vehicles', 'Tipper rental – sand delivery', 'Toll & permit charges', 'Tempo hire – site delivery']), category: 'Transportation', date: d(rint(1, 28)), amount: rint(6, 58) * 1000, method: pick(['UPI', 'Corporate Card', 'Cash']), submittedBy: pick(['Ravi Shankar', 'Rajesh Kumar']), department: pick(PROJECTS), status: status(), receipt: r() < 0.7 ? 'trip-sheet.jpg' : undefined });
    if (r() < 0.55) add({ description: pick(['Concrete mixer machine', 'Bar bending machine', 'Laptop for site office', 'Laser level instrument', 'Scaffolding set (rental deposit)']), category: 'Equipment', date: d(rint(3, 26)), amount: rint(4, 32) * 10000, method: 'Bank Transfer', submittedBy: 'Rajesh Kumar', department: pick(PROJECTS), status: status(), receipt: 'equipment-invoice.pdf' });
    const nMt = rint(1, 2);
    for (let k = 0; k < nMt; k++) add({ description: pick(['Forklift servicing', 'Delivery truck tyre replacement', 'Godown roof repair', 'Generator AMC', 'Weighbridge calibration']), category: 'Maintenance', date: d(rint(2, 27)), amount: rint(5, 42) * 1000, method: pick(['UPI', 'Bank Transfer', 'Cash']), submittedBy: pick(['Suresh Gowda', 'Ravi Shankar']), department: pick(['Head Office', 'Hosur Road Warehouse']), status: status(), receipt: r() < 0.6 ? 'service-bill.jpg' : undefined });
    const nMs = rint(1, 3);
    for (let k = 0; k < nMs; k++) add({ description: pick(['Office stationery', 'Client meeting – lunch', 'Courier charges', 'Pantry supplies', 'Site team refreshments', 'Printer toner']), category: 'Miscellaneous', date: d(rint(1, 28)), amount: rint(12, 150) * 100, method: pick(['Cash', 'UPI', 'Corporate Card']), submittedBy: pick(submitters), department: pick(PROJECTS), status: status(), receipt: r() < 0.5 ? 'receipt.jpg' : undefined });
  }
  expenses.sort((a, b) => (a.date < b.date ? 1 : -1));
  // Most recent operational claims sit in the approval queue
  let queued = 0;
  for (const e of expenses) {
    if (queued >= 6) break;
    if (e.category === 'Salaries' || e.category === 'Rent & Utilities') continue;
    if (e.date < addDays(today, -14)) break;
    if (r() < 0.75) { e.status = 'Pending'; queued++; } else e.status = 'Approved';
  }

  // ---------------- Activities ----------------
  const ago = (min: number) => new Date(nowMs - min * 60000).toISOString();
  const latestPaid = invoices.filter((i) => i.paid).sort((a, b) => ((a.paidOn || '') < (b.paidOn || '') ? 1 : -1))[0];
  const latestInv = invoices.filter((i) => !i.draft).slice(-1)[0];
  const pendingExp = expenses.find((e) => e.status === 'Pending');
  const activities: Activity[] = [
    { id: 'a1', kind: 'payment', text: `Payment received for ${latestPaid?.number} from ${latestPaid?.customer}`, at: ago(18) },
    { id: 'a2', kind: 'stock', text: 'Stock inward: 400 bags OPC 53 Grade Cement (PO-26-472)', at: ago(52) },
    { id: 'a3', kind: 'invoice', text: `Invoice ${latestInv?.number} created for ${latestInv?.customer}`, at: ago(95) },
    { id: 'a4', kind: 'expense', text: `Expense ${pendingExp?.id} submitted for approval`, at: ago(140) },
    { id: 'a5', kind: 'hr', text: `Leave request from ${employees[9].name} awaiting approval`, at: ago(210) },
    { id: 'a6', kind: 'stock', text: 'Low stock alert: TMT Bar Fe500D 16 mm below reorder level', at: ago(320) },
    { id: 'a7', kind: 'hr', text: 'Attendance marked for Main Godown team', at: ago(560) },
    { id: 'a8', kind: 'system', text: 'Monthly GST summary generated for October', at: ago(1500) },
    { id: 'a9', kind: 'expense', text: 'Warehouse rent expense approved by Priya Nair', at: ago(2900) },
  ];

  return {
    invoices, items, movements, employees, attendance, leaves, expenses, activities,
    settings: {
      companyName: 'Meridian Build Supplies', legalName: 'Meridian Build Supplies Pvt. Ltd.', gstin: '29AAHCM4410F1ZX', pan: 'AAHCM4410F',
      address: 'Plot 47, 3rd Phase, Peenya Industrial Area, Bengaluru, Karnataka 560058', email: 'accounts@meridianbuild.in', phone: '+91 80 4123 7788',
      invoicePrefix: 'INV-', paymentTerms: 30, defaultGst: 18, bankName: 'State Bank of India, Peenya Branch', bankAccount: 'XXXX XXXX 4471', ifsc: 'SBIN0004321',
      notifyLowStock: true, notifyOverdue: true, notifyApprovals: true, fyStart: 'April',
    },
    seq: { invoice: iseq, item: 1001 + items.length, employee: 1001 + employees.length, expense: eseq, leave: lseq, movement: mseq },
  };
}
