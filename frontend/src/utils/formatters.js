export const formatCurrency = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return '₹ 0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(amount);
};

export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

export const getStatusBadgeClass = (status) => {
  switch (status?.toUpperCase()) {
    case 'PAID':
    case 'ACCEPTED':
    case 'ACTIVE':
    case 'PRESENT':
    case 'PAID_LEAVE':
    case 'COMPLETED':
    case 'OCCUPIED':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
    case 'PARTIAL':
    case 'UNPAID_LEAVE':
    case 'IN_PROGRESS':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800';
    case 'UNPAID':
    case 'PENDING':
    case 'INACTIVE':
    case 'ABSENT':
    case 'VACANT':
      return 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800';
    case 'CONVERTED':
    case 'HOLIDAY':
    case 'ON_HOLD':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800';
    default:
      return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
  }
};
