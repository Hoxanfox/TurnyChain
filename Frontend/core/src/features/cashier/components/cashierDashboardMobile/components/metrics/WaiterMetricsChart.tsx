import React from 'react';
import type { WaiterMetric } from '../../types/metricsTypes';
import { formatMoney } from '../../utils/invoiceHistoryFormatters';

interface WaiterMetricsChartProps {
  metrics: WaiterMetric[];
}

export const WaiterMetricsChart: React.FC<WaiterMetricsChartProps> = ({ metrics }) => {
  if (metrics.length === 0) {
    return null;
  }

  const maxTotal = Math.max(...metrics.map((metric) => metric.total));

  return (
    <div className="space-y-3">
      {metrics.slice(0, 5).map((metric) => {
        const width = maxTotal > 0 ? (metric.total / maxTotal) * 100 : 0;
        return (
          <div key={metric.name} className="rounded-xl border border-amber-100 bg-amber-50/50 p-3">
            <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
              <span>{metric.name}</span>
              <span>{formatMoney(metric.total)}</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-white">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-amber-500 to-rose-500"
                style={{ width: `${Math.min(width, 100)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
