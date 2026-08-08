import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FileText, Quote, Users, Plus } from 'lucide-react';

const TABS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/invoices', label: 'Invoices', icon: FileText },
  { to: '/quotations', label: 'Quotes', icon: Quote },
  { to: '/clients', label: 'Clients', icon: Users },
];

const tabClass = ({ isActive }) =>
  `relative flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 h-full rounded-xl transition-colors ${
    isActive
      ? 'text-brand-600 dark:text-brand-400'
      : 'text-slate-500 dark:text-slate-400 active:text-slate-900 dark:active:text-slate-200'
  }`;

export const MobileBottomNav = () => {
  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 shadow-[0_-4px_16px_-8px_rgba(15,23,42,0.25)] safe-area-pb safe-area-pl safe-area-pr"
      aria-label="Primary"
    >
      <div className="flex items-stretch h-[4.25rem] px-1">
        {TABS.slice(0, 2).map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={tabClass}>
            {({ isActive }) => (
              <>
                <span
                  className={`absolute top-0 h-0.5 rounded-full bg-brand-500 transition-all ${
                    isActive ? 'w-8 opacity-100' : 'w-0 opacity-0'
                  }`}
                  aria-hidden="true"
                />
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                <span className={`text-[10px] leading-none tracking-tight truncate max-w-full px-1 ${isActive ? 'font-bold' : 'font-medium'}`}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}

        {/* Elevated primary action */}
        <NavLink
          to="/invoices/new"
          className="flex flex-col items-center justify-center flex-1 min-w-0 h-full"
          aria-label="Create new invoice"
        >
          <div className="-mt-6 w-[3.25rem] h-[3.25rem] shrink-0 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-brand-600/40 border-4 border-slate-50 dark:border-slate-900 transition-transform active:scale-95">
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </div>
          <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400 mt-1 leading-none">
            New
          </span>
        </NavLink>

        {TABS.slice(2).map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={tabClass}>
            {({ isActive }) => (
              <>
                <span
                  className={`absolute top-0 h-0.5 rounded-full bg-brand-500 transition-all ${
                    isActive ? 'w-8 opacity-100' : 'w-0 opacity-0'
                  }`}
                  aria-hidden="true"
                />
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                <span className={`text-[10px] leading-none tracking-tight truncate max-w-full px-1 ${isActive ? 'font-bold' : 'font-medium'}`}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};
