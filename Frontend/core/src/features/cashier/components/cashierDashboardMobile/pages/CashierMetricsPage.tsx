import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCashierMetrics } from '../hooks/useCashierMetrics';
import { MetricsSummaryCard } from '../components/metrics/MetricsSummaryCard';
import { WaiterMetricsChart } from '../components/metrics/WaiterMetricsChart';
import { WaiterMetricsList } from '../components/metrics/WaiterMetricsList';
import { formatMoney } from '../utils/invoiceHistoryFormatters';

const CashierMetricsPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    month,
    status,
    error,
    metrics,
    summary,
    hasMore,
    loadData,
    setMonth,
  } = useCashierMetrics();

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 p-4 pb-20">
      <div className="max-w-5xl mx-auto space-y-5">
        <header className="bg-white/90 backdrop-blur rounded-2xl border border-amber-100 shadow-lg p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.3em] text-amber-700 font-semibold">Metricas del negocio</p>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Ingresos por mesero</h1>
              <p className="text-sm text-slate-600">
                Solo ordenes en estado aprobado o pagado. Modo mensual.
              </p>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition"
            >
              ← Volver
            </button>
          </div>

          <div className="mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-3">
              <label className="text-sm font-semibold text-slate-700">Mes</label>
              <input
                type="month"
                value={month}
                onChange={(event) => setMonth(event.target.value)}
                className="px-3 py-2 rounded-lg border border-amber-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => loadData(false)}
                className="px-4 py-2 rounded-lg bg-amber-600 text-white font-semibold hover:bg-amber-700 transition"
              >
                Actualizar
              </button>
              {hasMore && (
                <button
                  onClick={() => loadData(true)}
                  className="px-4 py-2 rounded-lg bg-white border border-amber-200 text-amber-700 font-semibold hover:bg-amber-50 transition"
                >
                  Cargar mas
                </button>
              )}
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <MetricsSummaryCard
            label="Total mes"
            value={formatMoney(summary.totalRevenue)}
            subtitle={`${summary.totalOrders} ordenes aprobadas/pagadas`}
            tone="amber"
          />
          <MetricsSummaryCard
            label="Mejor mesero"
            value={summary.topWaiterName}
            subtitle={
              summary.topWaiterOrders > 0
                ? `${formatMoney(summary.topWaiterTotal)} en ${summary.topWaiterOrders} ordenes`
                : 'Sin registros'
            }
            tone="rose"
          />
          <MetricsSummaryCard
            label="Ticket promedio"
            value={formatMoney(summary.averageTicket)}
            subtitle="Promedio por orden"
            tone="slate"
          />
        </section>

        <section className="rounded-2xl bg-white/95 backdrop-blur border border-amber-100 shadow-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">Ranking por mesero</h2>
            <span className="text-xs uppercase tracking-[0.3em] text-slate-400">{metrics.length} meseros</span>
          </div>

          {status === 'loading' && (
            <div className="py-10 text-center text-slate-500">Cargando metricas...</div>
          )}

          {status === 'error' && (
            <div className="py-10 text-center text-red-600 font-semibold">{error}</div>
          )}

          {status !== 'loading' && status !== 'error' && (
            <div className="space-y-4">
              <WaiterMetricsChart metrics={metrics} />
              <WaiterMetricsList metrics={metrics} totalRevenue={summary.totalRevenue} />
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-dashed border-amber-200 bg-white/80 p-5">
          <h3 className="text-sm uppercase tracking-[0.3em] text-amber-600 font-semibold">Proximas metricas</h3>
          <p className="text-sm text-slate-600 mt-2">
            Agregaremos tendencias semanales, comparativos por metodo de pago y metas por turno.
          </p>
        </section>
      </div>
    </div>
  );
};

export default CashierMetricsPage;
