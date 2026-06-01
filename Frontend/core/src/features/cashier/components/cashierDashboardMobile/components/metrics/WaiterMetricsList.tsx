import React from 'react';
import type { WaiterMetric } from '../../types/metricsTypes';
import { formatMoney } from '../../utils/invoiceHistoryFormatters';

interface WaiterMetricsListProps {
  metrics: WaiterMetric[];
  totalRevenue: number;
}

export const WaiterMetricsList: React.FC<WaiterMetricsListProps> = ({ metrics, totalRevenue }) => {
  if (metrics.length === 0) {
    return <div className="py-10 text-center text-slate-500">Sin ordenes aprobadas para este mes.</div>;
  }

  return (
    <div className="space-y-3">
      {metrics.map((metric, index) => {
        const percent = totalRevenue > 0 ? (metric.total / totalRevenue) * 100 : 0;
        return (
          <div key={metric.name} className="rounded-xl border border-slate-100 p-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <div>
                <p className="text-sm text-slate-500">#{index + 1}</p>
                <p className="text-lg font-semibold text-slate-900">{metric.name}</p>
                <p className="text-xs text-slate-400">{metric.count} ordenes</p>
              </div>
              <div className="text-left md:text-right">
                <p className="text-xl font-bold text-slate-900">{formatMoney(metric.total)}</p>
                <p className="text-xs text-slate-500">Ticket prom: {formatMoney(metric.average)}</p>
              </div>
            </div>
            <div className="mt-3 h-2 rounded-full bg-amber-100">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500"
                style={{ width: `${Math.min(percent, 100)}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-2">{percent.toFixed(1)}% del total</p>
          </div>
        );
      })}
    </div>
  );
};
