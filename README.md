# CoreERP — Business Management Suite (Prototype)

A frontend ERP prototype: Dashboard, Billing (GST invoicing), Inventory, HR (attendance, leave, payroll), Expenses, Reports and Settings. Built with React, TypeScript, Tailwind CSS, Lucide icons and Recharts. All data is generated sample data stored in the browser (localStorage) — no backend.

## Run locally

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # outputs a single self-contained dist/index.html
```

## Structure

```
src/
  App.tsx                 # providers + hash router
  main.tsx, index.css     # entry, Tailwind layers, print styles
  lib/
    types.ts              # domain types (Invoice, InventoryItem, Employee, Expense…)
    seed.ts               # deterministic sample data (Indian business, INR)
    store.tsx             # app state, actions, derived helpers, localStorage persistence
    format.ts             # INR/date formatting, date-range presets, amount-in-words, CSV
  components/
    ui.tsx                # design-system components: Button, Card, Badge, Modal, DataTable,
                          # Menu, DateRangeFilter, Toasts, CSV export dialog…
    charts.tsx            # chart colours, tooltip, legend, axis presets
    Layout.tsx            # sidebar (collapsible), top bar, global search, notifications
  modules/
    Dashboard.tsx  Billing.tsx  Inventory.tsx  HR.tsx  Expenses.tsx  Reports.tsx  Settings.tsx
```

## Notes
- Navigation uses the URL hash (`#billing`, `#inventory`, …). Settings lives at `#preferences`.
- Design tokens (primary #3478D4, ink greys, radii, shadows) are in `tailwind.config.cjs`.
- To connect a real backend, replace the actions in `lib/store.tsx` with API calls; module components only use the store's actions and data.
- CSV export uses the Claude artifact `downloads` capability when available and falls back to a normal browser download.
