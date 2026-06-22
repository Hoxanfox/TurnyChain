import React, { useMemo } from 'react';
import type { WaiterApprovedStat } from '../../types/waiterStatsTypes';
import { formatMoney } from '../../utils/invoiceHistoryFormatters';

interface WaiterApprovedStatsListProps {
  items: WaiterApprovedStat[];
}

export const WaiterApprovedStatsList: React.FC<WaiterApprovedStatsListProps> = ({ items }) => {
  const grouped = useMemo(() => {
    const map = new Map<string, WaiterApprovedStat[]>();
    items.forEach((item) => {
      const list = map.get(item.period) || [];
      list.push(item);
      map.set(item.period, list);
    });

    return Array.from(map.entries()).map(([period, stats]) => ({
      period,
      stats: stats.sort((a, b) => b.approved_count - a.approved_count || a.waiter_name.localeCompare(b.waiter_name)),
    }));
  }, [items]);

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 text-center text-sm text-slate-500">
        No hay comandas aprobadas para este filtro.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {grouped.map((group) => (
        <div key={group.period} className="bg-white rounded-xl shadow-sm">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-700">Periodo: {group.period}</p>
          </div>
          <div className="divide-y divide-slate-100">
            {group.stats.map((stat) => (
              <div key={`${stat.waiter_id}-${stat.period}`} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{stat.waiter_name || 'Mesero sin nombre'}</p>
                  <p className="text-xs text-slate-500">ID: {stat.waiter_id.substring(0, 8).toUpperCase()}...</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-indigo-600">{formatMoney(stat.total_amount || 0)}</p>
                  <p className="text-xs text-slate-500">{stat.approved_count} orden{stat.approved_count !== 1 ? 'es' : ''}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
