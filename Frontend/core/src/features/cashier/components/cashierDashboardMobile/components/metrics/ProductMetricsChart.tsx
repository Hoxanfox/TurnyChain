import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import type { ProductSalesStat } from '../../types/metricsTypes';

interface ProductMetricsChartProps {
  metrics: ProductSalesStat[];
}

// Generamos colores más variados
const CATEGORY_COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1'];

export const ProductMetricsChart: React.FC<ProductMetricsChartProps> = ({ metrics }) => {
  if (metrics.length === 0) {
    return null;
  }

  // 1. Datos para Pie Chart de Categorías
  const categoryMap: Record<string, number> = {};
  metrics.forEach(m => {
    categoryMap[m.category_name] = (categoryMap[m.category_name] || 0) + m.total_quantity;
  });

  const categoryData = Object.entries(categoryMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // 2. Datos para Top 10 Vendidos (Cantidad)
  const topSold = [...metrics]
    .sort((a, b) => b.total_quantity - a.total_quantity)
    .slice(0, 10)
    // Invertimos el orden para que en el gráfico de barras horizontales el #1 quede arriba
    .reverse();

  // 3. Datos para Top 10 Rentables (Ingresos)
  const topRevenue = [...metrics]
    .sort((a, b) => b.total_revenue - a.total_revenue)
    .slice(0, 10)
    .reverse();

  // Custom formatter for money
  const formatMoneyAxis = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`;
    return `$${value}`;
  };

  return (
    <div className="space-y-6">
      {/* Top 10 Productos Más Vendidos */}
      <div className="bg-white p-4 sm:p-6 rounded-3xl shadow-sm border border-slate-100">
        <div className="mb-4 text-center sm:text-left">
          <p className="text-[10px] uppercase tracking-[0.2em] text-rose-500 font-bold">Unidades Despachadas</p>
          <h3 className="text-lg font-bold text-slate-800">Top 10 Productos Más Vendidos</h3>
        </div>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topSold} layout="vertical" margin={{ top: 10, right: 30, left: 100, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
              <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
              <YAxis 
                type="category" 
                dataKey="product_name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }}
                width={90}
              />
              <Tooltip 
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(value: any) => [`${value} unidades`, 'Vendido']}
              />
              <Bar dataKey="total_quantity" fill="#f43f5e" radius={[0, 6, 6, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top 10 Productos Más Rentables */}
      <div className="bg-white p-4 sm:p-6 rounded-3xl shadow-sm border border-slate-100">
        <div className="mb-4 text-center sm:text-left">
          <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-500 font-bold">Dinero Generado</p>
          <h3 className="text-lg font-bold text-slate-800">Top 10 Productos Más Rentables</h3>
        </div>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topRevenue} layout="vertical" margin={{ top: 10, right: 30, left: 100, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
              <XAxis type="number" axisLine={false} tickLine={false} tickFormatter={formatMoneyAxis} tick={{ fill: '#64748b', fontSize: 12 }} />
              <YAxis 
                type="category" 
                dataKey="product_name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }}
                width={90}
              />
              <Tooltip 
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(value: any) => [`$${value.toLocaleString()}`, 'Total Ingresos']}
              />
              <Bar dataKey="total_revenue" fill="#10b981" radius={[0, 6, 6, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pie Chart for Categories */}
      <div className="bg-white p-4 sm:p-6 rounded-3xl shadow-sm border border-slate-100">
        <div className="mb-4 text-center sm:text-left">
          <p className="text-[10px] uppercase tracking-[0.2em] text-indigo-500 font-bold">Distribución</p>
          <h3 className="text-lg font-bold text-slate-800">Categorías más Vendidas</h3>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                {categoryData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: any) => [`${value} unidades`, 'Vendido']}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '13px', fontWeight: 600, color: '#475569', paddingTop: '20px' }}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
