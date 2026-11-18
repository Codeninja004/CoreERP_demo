export type ModuleKey = 'dashboard' | 'billing' | 'inventory' | 'hr' | 'expenses' | 'reports' | 'preferences';

export interface LineItem { id: string; description: string; hsn?: string; qty: number; unitPrice: number; gstRate: number }
export interface Invoice {
  id: string; number: string; customer: string; customerGstin?: string; customerAddress?: string;
  date: string; dueDate: string; items: LineItem[]; paid: boolean; paidOn?: string; paymentMode?: string;
  draft?: boolean; notes?: string;
}
export type InvoiceStatus = 'Paid' | 'Pending' | 'Overdue' | 'Draft';

export interface InventoryItem {
  id: string; name: string; category: string; uom: string; qty: number; reorder: number; price: number; location?: string; hsn?: string;
}
export type StockStatus = 'In Stock' | 'Low Stock' | 'Out of Stock';
export type MovementType = 'Inward' | 'Outward' | 'Adjustment';
export interface StockMovement {
  id: string; itemId: string; type: MovementType; qty: number; // signed delta
  balance: number; date: string; reference: string; note?: string; by: string;
}

export type EmpStatus = 'Active' | 'On Leave' | 'Probation' | 'Inactive';
export interface Employee {
  id: string; name: string; department: string; designation: string; joinDate: string;
  email: string; phone: string; status: EmpStatus; salary: number; location: string;
}
export type AttendanceMark = 'P' | 'A' | 'L' | 'HD';
export type Attendance = Record<string, Record<string, AttendanceMark>>; // date -> empId -> mark
export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected';
export interface LeaveRequest {
  id: string; empId: string; type: 'Casual' | 'Sick' | 'Earned' | 'Unpaid'; from: string; to: string; days: number;
  reason: string; status: LeaveStatus; appliedOn: string;
}

export type ExpenseStatus = 'Pending' | 'Approved' | 'Rejected';
export interface Expense {
  id: string; description: string; category: string; date: string; amount: number; method: string;
  submittedBy: string; department: string; status: ExpenseStatus; receipt?: string; notes?: string; reviewNote?: string;
}

export interface Activity { id: string; text: string; at: string; kind: 'invoice' | 'payment' | 'stock' | 'hr' | 'expense' | 'system' }

export interface Settings {
  companyName: string; legalName: string; gstin: string; pan: string; address: string; email: string; phone: string;
  invoicePrefix: string; paymentTerms: number; defaultGst: number; bankName: string; bankAccount: string; ifsc: string;
  notifyLowStock: boolean; notifyOverdue: boolean; notifyApprovals: boolean; fyStart: string;
}

export interface AppData {
  invoices: Invoice[]; items: InventoryItem[]; movements: StockMovement[]; employees: Employee[];
  attendance: Attendance; leaves: LeaveRequest[]; expenses: Expense[]; activities: Activity[]; settings: Settings;
  seq: { invoice: number; item: number; employee: number; expense: number; leave: number; movement: number };
}
