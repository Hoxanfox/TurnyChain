import React, { useState, useMemo } from 'react';
import type { ProductSalesStat } from '../../types/metricsTypes';
import { formatMoney } from '../../utils/invoiceHistoryFormatters';

interface ProductMetricsListProps {
  metrics: ProductSalesStat[];
  daysInPeriod: number;
}

export const ProductMetricsList: React.FC<ProductMetricsListProps> = ({ metrics, daysInPeriod }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');

  const categories = useMemo(() => {
    const cats = new Set(metrics.map(m => m.category_name));
    return ['Todas', ...Array.from(cats)].sort();
  }, [metrics]);

  const filteredMetrics = useMemo(() => {
    if (selectedCategory === 'Todas') return metrics;
    return metrics.filter(m => m.category_name === selectedCategory);
  }, [metrics, selectedCategory]);

  if (metrics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center bg-white rounded-3xl border border-slate-100 shadow-sm">
        <span className="text-4xl mb-3">📦</span>
        <p className="text-slate-500 font-medium">No hay ventas registradas en este periodo.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden mt-6">
      <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-slate-800">Detalle de Productos</h3>
          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">
            {filteredMetrics.length} ítems
          </span>
        </div>
        
        {/* Category Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                selectedCategory === category
                  ? 'bg-slate-800 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>
      
      <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
        {filteredMetrics.length === 0 ? (
          <div className="py-10 text-center text-slate-400 font-medium">No hay productos en esta categoría.</div>
        ) : (
          filteredMetrics.map((metric, index) => {
            const avgPerDay = (metric.total_quantity / Math.max(1, daysInPeriod)).toFixed(1);
          
            return (
              <div key={metric.product_id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 leading-tight">{metric.product_name}</h4>
                      <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full mt-1 inline-block">
                        {metric.category_name}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-emerald-600">{formatMoney(metric.total_revenue)}</p>
                    <p className="text-xs font-bold text-slate-400 mt-1">{metric.total_quantity} uds. vendidas</p>
                  </div>
                </div>
                
                <div className="mt-3 flex items-center gap-4 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div className="flex-1">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Promedio Diario</p>
                    <p className="text-sm font-bold text-slate-700">~{avgPerDay} uds/día</p>
                  </div>
                  <div className="w-px h-8 bg-slate-200"></div>
                  <div className="flex-1 text-right">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Precio Prom.</p>
                    <p className="text-sm font-bold text-slate-700">{formatMoney(metric.total_revenue / Math.max(1, metric.total_quantity))}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
