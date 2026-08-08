import React from 'react';

/**
 * Simple pill/underline tab bar. Hand-rolled (no Radix Tabs primitive is
 * installed in this project) — controlled via `active`/`onChange`.
 */
export const Tabs = ({ tabs, active, onChange }) => {
  return (
    <div className="border-b border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar">
      <div className="flex items-center gap-1 min-w-max px-0.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.value === active;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => onChange(tab.value)}
              className={`relative flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors ${
                isActive
                  ? 'text-brand-600 dark:text-brand-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {Icon && <Icon className="w-4 h-4" />}
              <span>{tab.label}</span>
              <span
                className={`absolute left-0 right-0 -bottom-px h-0.5 rounded-full bg-brand-500 transition-opacity ${
                  isActive ? 'opacity-100' : 'opacity-0'
                }`}
                aria-hidden="true"
              />
            </button>
          );
        })}
      </div>
    </div>
  );
};
