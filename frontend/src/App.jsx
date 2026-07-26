import React, { useState } from 'react';
import { Routes, Route, Navigate, BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { FYProvider } from './context/FYContext';

import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';

import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Clients } from './pages/Clients';
import { ClientDetail } from './pages/ClientDetail';
import { RateMaster } from './pages/RateMaster';
import { Invoices } from './pages/Invoices';
import { InvoiceForm } from './pages/InvoiceForm';
import { InvoiceView } from './pages/InvoiceView';
import { Quotations } from './pages/Quotations';
import { QuotationForm } from './pages/QuotationForm';
import { Reports } from './pages/Reports';
import { CompanySettings } from './pages/CompanySettings';
import { BackupRestore } from './pages/BackupRestore';

const ProtectedLayout = () => {
  const { user, loading } = useAuth();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white font-semibold">
        Loading Fabrication System...
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

          <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-[1700px] 2xl:max-w-[1920px] mx-auto w-full overflow-x-hidden">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/invoices" element={<Invoices />} />
              <Route path="/invoices/new" element={<InvoiceForm />} />
              <Route path="/invoices/:id" element={<InvoiceView />} />
              <Route path="/invoices/:id/edit" element={<InvoiceForm />} />
              <Route path="/quotations" element={<Quotations />} />
              <Route path="/quotations/new" element={<QuotationForm />} />
              <Route path="/clients" element={<Clients />} />
              <Route path="/clients/:id" element={<ClientDetail />} />
              <Route path="/rates" element={<RateMaster />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/company" element={<CompanySettings />} />
              <Route path="/backup" element={<BackupRestore />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </FYProvider>
  );
};

export const App = () => {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/*" element={<ProtectedLayout />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

export default App;
