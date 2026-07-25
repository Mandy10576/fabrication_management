import React from 'react';

export const StatCard = ({ title, value, subtitle, icon: Icon, color = 'brand', badgeText }) => {
  const colorStyles = {
    brand: 'from-brand-500/10 to-indigo-500/10 text-brand-600 dark:text-brand-400 border-brand-200 dark:border-brand-900/50',
    emerald: 'from-emerald-500/10 to-teal-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50',
    amber: 'from-amber-500/10 to-orange-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/50',
    purple: 'from-purple-500/10 to-pink-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-900/50',
    rose: 'from-rose-500/10 to-red-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50',
  };

  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden group">
      {/* Background Accent */}
      <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${colorStyles[color]} rounded-full blur-2xl -mr-6 -mt-6 group-hover:scale-110 transition-transform`} />

      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {title}
          </p>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1.5 tracking-tight">
            {value}
          </h3>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
              {subtitle}
            </p>
          )}
        </div>

        <div className={`p-3 rounded-xl bg-gradient-to-br ${colorStyles[color]} border shadow-sm`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>

      {badgeText && (
        <div className="mt-3 inline-block text-[11px] px-2 py-0.5 rounded-md font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
          {badgeText}
        </div>
      )}
    </div>
  );
};
