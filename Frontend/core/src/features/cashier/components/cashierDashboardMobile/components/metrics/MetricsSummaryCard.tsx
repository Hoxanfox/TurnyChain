import React from 'react';

interface MetricsSummaryCardProps {
  label: string;
  value: string;
  subtitle: string;
  tone?: 'amber' | 'rose' | 'slate' | 'indigo' | 'emerald';
}

const toneStyles: Record<NonNullable<MetricsSummaryCardProps['tone']>, string> = {
  amber: 'border-amber-100 text-amber-600',
  rose: 'border-rose-100 text-rose-600',
  slate: 'border-slate-200 text-slate-600',
  indigo: 'border-indigo-100 text-indigo-600',
  emerald: 'border-emerald-100 text-emerald-600',
};

export const MetricsSummaryCard: React.FC<MetricsSummaryCardProps> = ({
  label,
  value,
  subtitle,
  tone = 'slate',
}) => {
  return (
    <div className={`rounded-2xl bg-white border shadow-md p-4 ${toneStyles[tone]}`}>
      <p className="text-xs uppercase tracking-[0.25em] font-semibold">{label}</p>
      <p className="text-2xl font-bold text-slate-900 mt-2">{value}</p>
      <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
    </div>
  );
};
