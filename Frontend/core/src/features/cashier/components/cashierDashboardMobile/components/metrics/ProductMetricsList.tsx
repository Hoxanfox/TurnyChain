import React from 'react';
import type { ProductSalesStat } from '../../types/metricsTypes';
import { formatMoney } from '../../utils/invoiceHistoryFormatters';

interface ProductMetricsListProps {
  metrics: ProductSalesStat[];
}

export const ProductMetricsList: React.FC<ProductMetricsListProps> = ({ metrics }) => {
  if (metrics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center bg-white rounded-3xl border border-slate-100 shadow-sm">
        <span className="text-4xl mb-3">📦</span>
        <p className="text-slate-500 font-medium">No hay ventas registradas en este día.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
        <div>
          <h3 className="font-bold text-slate-800">Ventas por producto</h3>
          <p className="text-xs text-slate-500 mt-1">Cantidad vendida e ingreso generado</p>
        </div>
        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">
          {metrics.length} productos
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-5 py-3 font-bold">Producto</th>
              <th className="px-5 py-3 text-right font-bold">Cantidad</th>
              <th className="px-5 py-3 text-right font-bold">Ingreso</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {metrics.map((metric, index) => (
              <tr key={metric.product_id} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3 min-w-[220px]">
                    <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-bold text-slate-800">{metric.product_name}</p>
                      <p className="text-xs font-medium text-slate-400">{metric.category_name}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 text-right">
                  <span className="font-black text-slate-800">{metric.total_quantity}</span>
                  <span className="text-xs text-slate-400 ml-1">uds.</span>
                </td>
                <td className="px-5 py-4 text-right font-black text-emerald-600 whitespace-nowrap">
                  {formatMoney(metric.total_revenue)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
