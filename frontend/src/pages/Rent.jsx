import React from 'react';
import { KeyRound } from 'lucide-react';

/**
 * Placeholder landing page for the Rent module. It has no sub-features yet —
 * the sidebar entry exists so the module is ready to expand into a
 * collapsible group (matching Invoice/Employees/Projects) once its features
 * are defined.
 */
export const Rent = () => {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="page-title flex items-center gap-2">
          <KeyRound className="w-5 h-5 sm:w-6 sm:h-6 text-brand-500" />
          <span>Rent</span>
        </h2>
        <p className="page-subtitle">Rental management module</p>
      </div>

      <div className="card p-10 sm:p-16 text-center">
        <KeyRound className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
        <div className="font-semibold text-slate-700 dark:text-slate-300">Coming soon</div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
          This module is reserved for upcoming rent management features.
        </p>
      </div>
    </div>
  );
};
