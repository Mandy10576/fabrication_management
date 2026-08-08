import React from 'react';

const COLOR_STYLES = {
  brand: {
    glow: 'from-brand-500/10 to-indigo-500/10',
    chip: 'bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 border-brand-200 dark:border-brand-900/60',
  },
  emerald: {
    glow: 'from-emerald-500/10 to-teal-500/10',
    chip: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/60',
  },
  amber: {
    glow: 'from-amber-500/10 to-orange-500/10',
    chip: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/60',
  },
  purple: {
    glow: 'from-purple-500/10 to-pink-500/10',
    chip: 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-900/60',
  },
  rose: {
    glow: 'from-rose-500/10 to-red-500/10',
    chip: 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/60',
  },
};

export const StatCard = ({ title, value, subtitle, icon: Icon, color = 'brand', badgeText }) => {
  const styles = COLOR_STYLES[color] || COLOR_STYLES.brand;

  return (
    <div className="card card-interactive relative overflow-hidden group p-4 sm:p-5 h-full flex flex-col">
      <div
        className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${styles.glow} rounded-full blur-2xl -mr-6 -mt-6 group-hover:scale-110 transition-transform pointer-events-none`}
        aria-hidden="true"
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 line-clamp-2">
            {title}
          </p>
          {/* Currency values can get long — clamp the size on small screens and
              let the value wrap rather than pushing the card wider. */}
          <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1.5 tracking-tight break-words leading-tight">
            {value}
          </h3>
          {subtitle && (
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium line-clamp-2">
              {subtitle}
            </p>
          )}
        </div>

        <div className={`p-2.5 sm:p-3 rounded-xl border shadow-sm shrink-0 ${styles.chip}`}>
          <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
      </div>

      {badgeText && (
        <div className="relative mt-auto pt-3">
          <span className="badge badge-neutral">{badgeText}</span>
        </div>
      )}
    </div>
  );
};
