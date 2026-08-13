import React, { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, BrowserRouter, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { FYProvider } from './context/FYContext';
import { ToastProvider } from './context/ToastContext';
import { Wrench } from 'lucide-react';

import { Navbar } from './components/Navbar';
import { AppSidebar } from './components/Sidebar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

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
const Employees = lazy(() => import('./pages/Employees').then(m => ({ default: m.Employees })));
const EmployeeDetail = lazy(() => import('./pages/EmployeeDetail').then(m => ({ default: m.EmployeeDetail })));
const EmployeeAttendance = lazy(() => import('./pages/EmployeeAttendance').then(m => ({ default: m.EmployeeAttendance })));
const EmployeeSalary = lazy(() => import('./pages/EmployeeSalary').then(m => ({ default: m.EmployeeSalary })));
const EmployeeAdvances = lazy(() => import('./pages/EmployeeAdvances').then(m => ({ default: m.EmployeeAdvances })));
const Projects = lazy(() => import('./pages/Projects').then(m => ({ default: m.Projects })));
const ProjectDetail = lazy(() => import('./pages/ProjectDetail').then(m => ({ default: m.ProjectDetail })));
const WorkHistory = lazy(() => import('./pages/WorkHistory').then(m => ({ default: m.WorkHistory })));
const Rent = lazy(() => import('./pages/Rent').then(m => ({ default: m.Rent })));
const RentAreas = lazy(() => import('./pages/RentAreas').then(m => ({ default: m.RentAreas })));
const RentAreaDetail = lazy(() => import('./pages/RentAreaDetail').then(m => ({ default: m.RentAreaDetail })));
const RentBuildingDetail = lazy(() => import('./pages/RentBuildingDetail').then(m => ({ default: m.RentBuildingDetail })));
const RentRoomDetail = lazy(() => import('./pages/RentRoomDetail').then(m => ({ default: m.RentRoomDetail })));
const RentCollection = lazy(() => import('./pages/RentCollection').then(m => ({ default: m.RentCollection })));
const RentElectricity = lazy(() => import('./pages/RentElectricity').then(m => ({ default: m.RentElectricity })));
const RentReports = lazy(() => import('./pages/RentReports').then(m => ({ default: m.RentReports })));

/**
 * Skeleton rather than a spinner: it reserves the same shape the page is about
 * to take, so the layout doesn't jump when the chunk finishes loading.
 */
const PageLoader = () => (
  <div className="space-y-4 sm:space-y-6" role="status" aria-label="Loading page">
    <div className="skeleton h-24 sm:h-28 rounded-2xl" />
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="skeleton h-28 rounded-2xl" />
      ))}
    </div>
    <div className="skeleton h-64 rounded-2xl" />
    <span className="sr-only">Loading page…</span>
  </div>
);

const FullScreenLoader = ({ label = 'Loading…' }) => (
  <div className="min-h-[100dvh] bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center gap-4 px-6 text-center">
    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-brand-600/25">
      <Wrench className="w-7 h-7" />
    </div>
    <div className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400">
      <span className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      <span className="text-sm font-semibold">{label}</span>
    </div>
  </div>
);

/** Scrolls back to the top whenever the route changes. */
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [pathname]);
  return null;
};

const ProtectedLayout = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <FullScreenLoader label="Loading Fabrication Management…" />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <FYProvider>
      {/* shadcn sidebar layout: the rail lives outside the inset, and
          SidebarInset owns the header + scrollable content column.
          Desktop collapse state persists in a cookie; Ctrl/Cmd+B toggles it. */}
      <SidebarProvider className="font-sans">
        {/* Sidebar hardcodes its own className on the desktop branch, so the
            print-hiding class has to go on a wrapper. `contents` keeps it out
            of the flex layout. */}
        <div className="no-print contents">
          <AppSidebar />
        </div>

        {/* SidebarInset already renders the page's single <main> element — the
            content column below is a plain div so we don't nest <main>. */}
        <SidebarInset className="min-w-0 bg-slate-50 dark:bg-slate-950">
          <div className="no-print">
            <Navbar />
          </div>

          {/* min-w-0 is what actually lets wide tables scroll inside their own
              container instead of stretching this flex child and the page. */}
          <div className="flex-1 min-w-0 w-full max-w-[1700px] 2xl:max-w-[1920px] mx-auto px-3 sm:px-5 lg:px-8 py-4 sm:py-6 pb-nav md:pb-8">
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
                <Route path="/employees" element={<Employees />} />
                <Route path="/employees/:id" element={<EmployeeDetail />} />
                <Route path="/attendance" element={<EmployeeAttendance />} />
                <Route path="/salary" element={<EmployeeSalary />} />
                <Route path="/advances" element={<EmployeeAdvances />} />
                <Route path="/projects/active" element={<Projects fixedStatus="ACTIVE" />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/projects/:id" element={<ProjectDetail />} />
                <Route path="/work-history" element={<WorkHistory />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/rent" element={<Rent />} />
                <Route path="/rent/areas" element={<RentAreas />} />
                <Route path="/rent/areas/:id" element={<RentAreaDetail />} />
                <Route path="/rent/buildings/:id" element={<RentBuildingDetail />} />
                <Route path="/rent/rooms/:id" element={<RentRoomDetail />} />
                <Route path="/rent/collection" element={<RentCollection />} />
                <Route path="/rent/electricity" element={<RentElectricity />} />
                <Route path="/rent/reports" element={<RentReports />} />
                <Route path="/company" element={<CompanySettings />} />
                <Route path="/backup" element={<BackupRestore />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </div>

          <div className="no-print">
            <MobileBottomNav />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </FYProvider>
  );
};

export const App = () => {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <ScrollToTop />
            <Suspense fallback={<FullScreenLoader label="Loading Application…" />}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/*" element={<ProtectedLayout />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

export default App;
