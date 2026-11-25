import React from 'react';

export default function StatCard({ title, value, icon: Icon, color = 'blue', subtitle }) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-500 border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-500 border-emerald-100',
    purple: 'bg-purple-50 text-purple-500 border-purple-100',
    amber: 'bg-amber-50 text-amber-500 border-amber-100',
    violet: 'bg-violet-50 text-violet-500 border-violet-100',
    slate: 'bg-slate-50 text-slate-500 border-slate-100',
  };

  return (
    <div className="bg-white p-5 rounded-[22px] border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-200">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1 truncate">{title}</p>
          <h3 className="text-2xl sm:text-3xl font-black text-slate-900 leading-none">{value}</h3>
          {subtitle && <p className="text-[11px] text-slate-600 mt-2 font-medium truncate">{subtitle}</p>}
        </div>
        <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 ${colorMap[color] || colorMap.blue}`}>
          <Icon className="w-6 h-6 stroke-[1.8]" />
        </div>
      </div>
    </div>
  );
}

