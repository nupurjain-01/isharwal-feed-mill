import React from 'react';

export default function Badge({ status }) {
  const normalized = (status || '').toUpperCase();

  const configs = {
    INSIDE: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      dot: 'bg-emerald-500 animate-pulse',
      label: 'Currently Inside'
    },
    CHECKED_OUT: {
      bg: 'bg-slate-100',
      text: 'text-slate-700',
      border: 'border-slate-300',
      dot: 'bg-slate-400',
      label: 'Checked Out'
    },
    PENDING: {
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200',
      dot: 'bg-amber-500',
      label: 'Pending'
    },
    ARRIVED: {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
      dot: 'bg-blue-500',
      label: 'Arrived'
    },
    CANCELLED: {
      bg: 'bg-red-50',
      text: 'text-red-700',
      border: 'border-red-200',
      dot: 'bg-red-500',
      label: 'Cancelled'
    }
  };

  const current = configs[normalized] || {
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    border: 'border-slate-200',
    dot: 'bg-slate-400',
    label: status
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${current.bg} ${current.text} ${current.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${current.dot}`} />
      <span>{current.label}</span>
    </span>
  );
}
