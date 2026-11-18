import React, { useEffect } from 'react';
import { StoreProvider, useStore } from './lib/store';
import { ExportProvider, ToastProvider } from './components/ui';
import { Shell, NAV } from './components/Layout';
import Dashboard from './modules/Dashboard';
import Billing from './modules/Billing';
import Inventory from './modules/Inventory';
import HR from './modules/HR';
import Expenses from './modules/Expenses';
import Reports from './modules/Reports';
import Settings from './modules/Settings';

function Router() {
  const { module } = useStore();
  useEffect(() => {
    document.title = `${NAV.find((n) => n.key === module)?.label || 'Dashboard'} · CoreERP`;
    window.scrollTo({ top: 0 });
  }, [module]);
  const View = { dashboard: Dashboard, billing: Billing, inventory: Inventory, hr: HR, expenses: Expenses, reports: Reports, preferences: Settings }[module];
  return <Shell><View key={module} /></Shell>;
}

export default function App() {
  return (
    <ToastProvider>
      <ExportProvider>
        <StoreProvider>
          <Router />
        </StoreProvider>
      </ExportProvider>
    </ToastProvider>
  );
}
