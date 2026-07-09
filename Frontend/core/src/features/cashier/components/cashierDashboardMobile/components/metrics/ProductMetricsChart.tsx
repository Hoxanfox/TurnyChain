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

// Generamos colores más variados para los productos apilados
const PRODUCT_COLORS = [
  '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', 
  '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#6366f1',
  '#d946ef', '#14b8a6', '#f59e0b', '#1d4ed8', '#be123c'
];

const CATEGORY_COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1'];

export const ProductMetricsChart: React.FC<ProductMetricsChartProps> = ({ metrics }) => {
  if (metrics.length === 0) {
    return null;
  }

  // Aggregate by category for pie chart
  const categoryMap: Record<string, number> = {};
  metrics.forEach(m => {
    categoryMap[m.category_name] = (categoryMap[m.category_name] || 0) + m.total_quantity;
  });

  const categoryData = Object.entries(categoryMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Transform data for Stacked Bar Chart (Category -> Products)
  const stackedDataMap: Record<string, any> = {};
  const allProductNames = new Set<string>();

  metrics.forEach(m => {
    if (!stackedDataMap[m.category_name]) {
      stackedDataMap[m.category_name] = { name: m.category_name };
    }
    stackedDataMap[m.category_name][m.product_name] = m.total_quantity;
    allProductNames.add(m.product_name);
  });

  const stackedData = Object.values(stackedDataMap).sort((a, b) => {
    // Sort by total items in category
    const totalA = Object.keys(a).filter(k => k !== 'name').reduce((sum, k) => sum + (a[k] as number), 0);
    const totalB = Object.keys(b).filter(k => k !== 'name').reduce((sum, k) => sum + (b[k] as number), 0);
    return totalB - totalA;
  });

  const uniqueProducts = Array.from(allProductNames);

  return (
    <div className="space-y-6">
      {/* Pie Chart for Categories (Mostramos este primero según solicitud) */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="text-sm font-bold text-slate-700 mb-2 text-center">Categorías más Vendidas</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
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
              <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 500, color: '#475569' }}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Stacked Bar Chart for Products within Categories */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="text-sm font-bold text-slate-700 mb-4 text-center">Venta de Productos por Categoría</h3>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stackedData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} 
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#64748b', fontSize: 12 }} 
              />
              <Tooltip 
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
              {uniqueProducts.map((productName, index) => (
                <Bar 
                  key={productName} 
                  dataKey={productName} 
                  stackId="a" 
                  fill={PRODUCT_COLORS[index % PRODUCT_COLORS.length]} 
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
