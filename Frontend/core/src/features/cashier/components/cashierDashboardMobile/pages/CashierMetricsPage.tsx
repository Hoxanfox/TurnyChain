import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCashierMetrics } from '../hooks/useCashierMetrics';
import { useProductMetrics } from '../hooks/useProductMetrics';
import { MetricsSummaryCard } from '../components/metrics/MetricsSummaryCard';
import { WaiterMetricsChart } from '../components/metrics/WaiterMetricsChart';
import { WaiterMetricsList } from '../components/metrics/WaiterMetricsList';
import { ProductMetricsChart } from '../components/metrics/ProductMetricsChart';
import { ProductMetricsList } from '../components/metrics/ProductMetricsList';
import { formatMoney } from '../utils/invoiceHistoryFormatters';
import { useCashierWebSocket } from '../../../../../hooks/useCashierWebSocket';

type Tab = 'waiters' | 'products';

const CashierMetricsPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('waiters');

  // Waiter metrics state
  const {
    month: waiterMonth,
    status: waiterStatus,
    error: waiterError,
    metrics: waiterMetrics,
    summary: waiterSummary,
    hasMore,
    loadData: loadWaiterData,
    setMonth: setWaiterMonth,
  } = useCashierMetrics();

  // Product metrics state (We use the same month for simplicity, or we can use the URL params through the hook)
  const {
    metrics: productMetrics,
    summary: productSummary,
    daysInPeriod,
    isLoading: productLoading,
    error: productError,
    loadData: loadProductData
  } = useProductMetrics();

  useCashierWebSocket(undefined, (message: any) => {
    if (['ORDER_STATUS_UPDATED', 'ORDER_MANAGED', 'ORDER_UPDATED'].includes(message.type)) {
      if (message.payload && message.payload.status === 'pagado') {
        console.log('🔄 Actualizando métricas por venta pagada...');
        loadWaiterData();
        loadProductData();
      }
    }
  });

  // In this simple implementation, we share the "month" input, but `useProductMetrics` currently uses URL params. 
  // We'll manually sync the month filter to the URL so `useProductMetrics` can read it.
  const handleMonthChange = (newMonth: string) => {
    setWaiterMonth(newMonth);
    const searchParams = new URLSearchParams(window.location.search);
    searchParams.set('month', newMonth);
    window.history.replaceState(null, '', `?${searchParams.toString()}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-rose-50 p-4 pb-20">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header & Controls */}
        <header className="bg-white/90 backdrop-blur rounded-3xl border border-white shadow-sm p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-[0.3em] text-indigo-500 font-bold">Métricas Estratégicas</p>
              <h1 className="text-2xl md:text-3xl font-black text-slate-800">
                Panel de Estadísticas Rápidas
              </h1>
            </div>
            <button
              onClick={() => navigate('/cashier')}
              className="px-5 py-2.5 rounded-2xl bg-white border-2 border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition shadow-sm"
            >
              ← Volver
            </button>
          </div>

          <div className="mt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Tabs */}
            <div className="flex bg-slate-100/80 p-1 rounded-2xl border border-slate-200/50">
              <button
                onClick={() => setActiveTab('waiters')}
                className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
                  activeTab === 'waiters'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                }`}
              >
                👨‍🍳 Desempeño Meseros
              </button>
              <button
                onClick={() => setActiveTab('products')}
                className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
                  activeTab === 'products'
                    ? 'bg-white text-rose-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                }`}
              >
                🍔 Ventas Productos
              </button>
            </div>

            {/* Filter */}
            <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-2">Periodo</label>
              <input
                type="month"
                value={waiterMonth}
                onChange={(event) => handleMonthChange(event.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              <button
                onClick={() => loadWaiterData()}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition text-slate-600"
                title="Actualizar"
              >
                🔄
              </button>
            </div>
          </div>
        </header>

        {/* Tab Content */}
        {activeTab === 'waiters' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <section className="grid gap-4 md:grid-cols-3">
              <MetricsSummaryCard
                label="Total Mes"
                value={formatMoney(waiterSummary.totalRevenue)}
                subtitle={`${waiterSummary.totalOrders} ordenes aprobadas`}
                tone="indigo"
              />
              <MetricsSummaryCard
                label="Mejor Mesero"
                value={waiterSummary.topWaiterName}
                subtitle={waiterSummary.topWaiterOrders > 0 ? `${formatMoney(waiterSummary.topWaiterTotal)}` : 'Sin registros'}
                tone="amber"
              />
              <MetricsSummaryCard
                label="Ticket Promedio"
                value={formatMoney(waiterSummary.averageTicket)}
                subtitle="Promedio por orden"
                tone="emerald"
              />
            </section>

            <section className="rounded-3xl bg-white border border-slate-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-800">Ranking por Mesero</h2>
                <span className="text-xs font-bold bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg">{waiterMetrics.length} meseros</span>
              </div>

              {waiterStatus === 'loading' && <div className="py-10 text-center text-slate-400 font-medium">Cargando métricas de meseros...</div>}
              {waiterStatus === 'error' && <div className="py-10 text-center text-rose-500 font-bold">{waiterError}</div>}
              
              {waiterStatus !== 'loading' && waiterStatus !== 'error' && (
                <div className="space-y-6">
                  <WaiterMetricsChart metrics={waiterMetrics} />
                  <WaiterMetricsList metrics={waiterMetrics} totalRevenue={waiterSummary.totalRevenue} />
                  {hasMore && (
                    <button
                      onClick={() => loadWaiterData()}
                      className="w-full py-3 mt-4 rounded-xl border-2 border-dashed border-slate-200 text-slate-500 font-bold hover:bg-slate-50 hover:text-indigo-600 transition"
                    >
                      Cargar más
                    </button>
                  )}
                </div>
              )}
            </section>
          </div>
        )}

        {activeTab === 'products' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <section className="grid gap-4 md:grid-cols-3">
              <MetricsSummaryCard
                label="Unidades Vendidas"
                value={productSummary.totalProductsSold.toString()}
                subtitle="Total de items despachados"
                tone="rose"
              />
              <MetricsSummaryCard
                label="Producto Estrella"
                value={productSummary.topProductName}
                subtitle={`${productSummary.topProductQuantity} unidades vendidas`}
                tone="amber"
              />
              <MetricsSummaryCard
                label="Categoría Top"
                value={productSummary.topCategoryName}
                subtitle="La categoría que más se mueve"
                tone="indigo"
              />
            </section>

            {productLoading && <div className="py-10 text-center text-slate-400 font-medium bg-white rounded-3xl border border-slate-100 shadow-sm">Analizando datos de ventas...</div>}
            {productError && <div className="py-10 text-center text-rose-500 font-bold bg-white rounded-3xl border border-slate-100 shadow-sm">{productError}</div>}
            
            {!productLoading && !productError && (
              <div className="grid gap-6 md:grid-cols-12">
                <div className="md:col-span-7">
                  <ProductMetricsChart metrics={productMetrics} />
                </div>
                <div className="md:col-span-5">
                  <ProductMetricsList metrics={productMetrics} daysInPeriod={daysInPeriod} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CashierMetricsPage;
