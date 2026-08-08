import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { FinancialYearSelector } from './FinancialYearSelector';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Sun, Moon, LogOut, ShieldCheck } from 'lucide-react';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 h-header shrink-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="h-full px-3 sm:px-5 lg:px-8 flex items-center justify-between gap-2 sm:gap-4 safe-area-pl safe-area-pr">
        {/* Left: sidebar toggle + page identity.
            The brand mark now lives in the sidebar header, so this side just
            carries the trigger (opens the sheet on mobile, collapses on desktop). */}
        <div className="flex items-center gap-2 min-w-0">
          <SidebarTrigger className="-ml-1 size-9" />
          <Separator orientation="vertical" className="mr-1 h-5 hidden sm:block" />

          <Link to="/" className="min-w-0 rounded-lg" aria-label="Go to dashboard">
            <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-slate-900 dark:text-white truncate">
              Khodiyar Steel
            </h1>
            <p className="hidden sm:block text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-none truncate">
              Business Management System
            </p>
          </Link>
        </div>

        {/* Right: FY selector, theme, user, logout */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <FinancialYearSelector />

          <button
            onClick={toggleTheme}
            className="btn-icon btn-icon-soft"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? <Sun className="w-[1.15rem] h-[1.15rem] text-amber-400" /> : <Moon className="w-[1.15rem] h-[1.15rem]" />}
          </button>

          {user && (
            <div className="hidden lg:flex items-center gap-2 pl-2.5 pr-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 max-w-[12rem]">
              <ShieldCheck className="w-4 h-4 text-brand-500 shrink-0" />
              <div className="text-left leading-tight min-w-0">
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                  {user.name || 'Owner'}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  Owner Admin
                </div>
              </div>
            </div>
          )}

          <button
            onClick={logout}
            className="btn-icon text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50"
            aria-label="Log out"
            title="Logout"
          >
            <LogOut className="w-[1.15rem] h-[1.15rem]" />
          </button>
        </div>
      </div>
    </header>
  );
};
