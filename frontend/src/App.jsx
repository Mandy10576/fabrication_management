import React, { useState, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { FYProvider } from './context/FYContext';

import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { MobileBottomNav } from './components/MobileBottomNav';

// Lazy loaded page components for fast initial load
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Clients = lazy(() => import('./pages/Clients').then(m => ({ default: m.Clients })));
const ClientDetail = lazy(() => import('./pages/ClientDetail').then(m => ({ default: m.ClientDetail })));
const RateMaster = lazy(() => import('./pages/RateMaster').then(m => ({ default: m.RateMaster })));
const Invoices = lazy(() => import('./pages/Invoices').then(m => ({ default: m.Invoices })));
const InvoiceForm = lazy(() => import('./pages/InvoiceForm').then(m => ({ default: m.InvoiceForm })));
const InvoiceView = lazy(() => import('./pages/InvoiceView').then(m => ({ default: m.InvoiceView })));
const Quotations = lazy(() => import('./pages/Quotations').then(m => ({ default: m.Quotations })));
const QuotationForm = lazy(() => import('./pages/QuotationForm').then(m => ({ default: m.QuotationForm })));
const Reports = lazy(() => import('./pages/Reports').then(m => ({ default: m.Reports })));
const CompanySettings = lazy(() => import('./pages/CompanySettings').then(m => ({ default: m.CompanySettings })));
const BackupRestore = lazy(() => import('./pages/BackupRestore').then(m => ({ default: m.BackupRestore })));

const PageLoader = () => (
  <div className="p-8 sm:p-12 flex flex-col items-center justify-center min-h-[300px] text-slate-400 dark:text-slate-500">
    <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin mb-3"></div>
    <span className="text-xs font-semibold">Loading page module...</span>
  </div>
);

const ProtectedLayout = () => {
  const { user, loading } = useAuth();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white font-semibold gap-3">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sm">Loading Fabrication Management...</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <FYProvider>
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200">
        <Navbar onToggleMobileSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)} />

        <div className="flex flex-1">
          <Sidebar isOpen={mobileSidebarOpen} onClose={() => setMobileSidebarOpen(false)} />

          <main className="flex-1 p-3 sm:p-6 md:p-8 pb-24 md:pb-8 max-w-[1700px] 2xl:max-w-[1920px] mx-auto w-full overflow-x-hidden">
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/invoices" element={<Invoices />} />
                <Route path="/invoices/new" element={<InvoiceForm />} />
                <Route path="/invoices/:id" element={<InvoiceView />} />
                <Route path="/invoices/:id/edit" element={<InvoiceForm />} />
                <Route path="/quotations" element={<Quotations />} />
                <Route path="/quotations/new" element={<QuotationForm />} />
                <Route path="/quotations/:id/edit" element={<QuotationForm />} />
                <Route path="/clients" element={<Clients />} />
                <Route path="/clients/:id" element={<ClientDetail />} />
                <Route path="/rates" element={<RateMaster />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/company" element={<CompanySettings />} />
                <Route path="/backup" element={<BackupRestore />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </main>
        </div>

        <MobileBottomNav />
      </div>
    </FYProvider>
  );
};

export const App = () => {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Suspense fallback={
            <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white text-xs">
              Loading Application...
            </div>
          }>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/*" element={<ProtectedLayout />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

export default App;
