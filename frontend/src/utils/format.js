import { format, parseISO } from 'date-fns';

export const formatCurrency = (amount, symbol = '$') => {
  const num = parseFloat(amount) || 0;
  return `${symbol}${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const formatDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
    return format(date, 'MMM d, yyyy');
  } catch {
    return dateStr;
  }
};

export const formatDateTime = (dateStr) => {
  if (!dateStr) return '';
  try {
    const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
    return format(date, 'MMM d, yyyy h:mm a');
  } catch {
    return dateStr;
  }
};

export const formatNumber = (num) => {
  return (parseFloat(num) || 0).toLocaleString('en-US');
};

export const formatPercent = (num) => {
  return `${(parseFloat(num) || 0).toFixed(1)}%`;
};
