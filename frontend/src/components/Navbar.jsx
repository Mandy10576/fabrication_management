import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { FinancialYearSelector } from './FinancialYearSelector';
import { Sun, Moon, LogOut, ShieldCheck, Menu, Wrench } from 'lucide-react';

export const Navbar = ({ onToggleMobileSidebar }) => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-4 max-w-7xl mx-auto">
        {/* Left Side */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={onToggleMobileSidebar}
            className="md:hidden p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
            aria-label="Open Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white shadow-md shrink-0">
              <Wrench className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xs sm:text-base font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent truncate max-w-[130px] sm:max-w-none">
                Khodiyar Steel
              </h1>
              <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-none truncate hidden sm:block">
                Business Management System
              </p>
            </div>
          </div>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <FinancialYearSelector />

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-1.5 sm:p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          {/* User Badge (Desktop) */}
          {user && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
              <ShieldCheck className="w-4 h-4 text-brand-500" />
              <div className="text-left leading-none">
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  {user.name || 'Owner'}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  Owner Admin
                </div>
              </div>
            </div>
          )}

          {/* Logout */}
          <button
            onClick={logout}
            className="p-1.5 sm:p-2 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};
