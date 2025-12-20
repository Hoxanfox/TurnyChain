import React from 'react';

interface Statistics {
  totalOrders: number;
  totalRevenue: number;
  pendingPayments: number;
  verifiedPayments: number;
  cashPayments: number;
  transferPayments: number;
  averageOrderValue: number;
  // Analíticas diarias
  dailyRevenue: number;
  dailyCash: number;
  dailyTransfer: number;
  dailyOrdersCount: number;
  dailyAverageTicket: number;
}

interface StatisticsCardProps {
  stats: Statistics;
}

export const StatisticsCard: React.FC<StatisticsCardProps> = ({ stats }) => {
  const todayDate = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6 border-2 border-gray-100">
      {/* Header con fecha */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-gray-100">
        <div className="flex items-center gap-3">
          <span className="text-3xl">📊</span>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Estadísticas del Día</h2>
            <p className="text-sm text-gray-500 capitalize">{todayDate}</p>
          </div>
        </div>
      </div>

      {/* SECCIÓN PRINCIPAL: ANALÍTICAS DIARIAS */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">💰</span>
          <h3 className="text-lg font-bold text-gray-700">Resumen del Día (Solo Pagos Verificados)</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Ingresos Totales del Día */}
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-6 rounded-xl border-2 border-emerald-300 shadow-lg hover:shadow-xl transition-all">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-emerald-700 font-bold uppercase tracking-wide">Ingresos del Día</p>
              <span className="text-4xl">💵</span>
            </div>
            <p className="text-4xl font-extrabold text-emerald-900">${stats.dailyRevenue.toFixed(2)}</p>
            <p className="text-xs text-emerald-600 mt-2 font-semibold">{stats.dailyOrdersCount} órdenes completadas</p>
          </div>

          {/* Efectivo del Día */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border-2 border-green-300 shadow-lg hover:shadow-xl transition-all">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-green-700 font-bold uppercase tracking-wide">Efectivo</p>
              <span className="text-4xl">💵</span>
            </div>
            <p className="text-4xl font-extrabold text-green-900">${stats.dailyCash.toFixed(2)}</p>
            <p className="text-xs text-green-600 mt-2 font-semibold">
              {stats.dailyRevenue > 0
                ? `${((stats.dailyCash / stats.dailyRevenue) * 100).toFixed(1)}% del total`
                : '0% del total'}
            </p>
          </div>

          {/* Transferencias del Día */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border-2 border-blue-300 shadow-lg hover:shadow-xl transition-all">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-blue-700 font-bold uppercase tracking-wide">Transferencias</p>
              <span className="text-4xl">📱</span>
            </div>
            <p className="text-4xl font-extrabold text-blue-900">${stats.dailyTransfer.toFixed(2)}</p>
            <p className="text-xs text-blue-600 mt-2 font-semibold">
              {stats.dailyRevenue > 0
                ? `${((stats.dailyTransfer / stats.dailyRevenue) * 100).toFixed(1)}% del total`
                : '0% del total'}
            </p>
          </div>

          {/* Ticket Promedio del Día */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl border-2 border-purple-300 shadow-lg hover:shadow-xl transition-all">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-purple-700 font-bold uppercase tracking-wide">Ticket Promedio</p>
              <span className="text-4xl">📈</span>
            </div>
            <p className="text-4xl font-extrabold text-purple-900">${stats.dailyAverageTicket.toFixed(2)}</p>
            <p className="text-xs text-purple-600 mt-2 font-semibold">Por orden completada</p>
          </div>
        </div>
      </div>

      {/* SECCIÓN SECUNDARIA: ESTADO ACTUAL */}
      <div className="border-t-2 border-gray-100 pt-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">📋</span>
          <h3 className="text-lg font-bold text-gray-700">Estado Actual de Órdenes</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-4 rounded-xl border-2 border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-600 font-semibold">Total Órdenes</p>
              <span className="text-2xl">📝</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats.totalOrders}</p>
            <p className="text-xs text-slate-500 mt-1">Activas en sistema</p>
          </div>

          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-xl border-2 border-yellow-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-yellow-600 font-semibold">Por Verificar</p>
              <span className="text-2xl">⚠️</span>
            </div>
            <p className="text-2xl font-bold text-yellow-900">{stats.pendingPayments}</p>
            <p className="text-xs text-yellow-500 mt-1">Requieren atención</p>
          </div>

          <div className="bg-gradient-to-br from-teal-50 to-teal-100 p-4 rounded-xl border-2 border-teal-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-teal-600 font-semibold">Verificados</p>
              <span className="text-2xl">✅</span>
            </div>
            <p className="text-2xl font-bold text-teal-900">{stats.verifiedPayments}</p>
            <p className="text-xs text-teal-500 mt-1">Pagos completos</p>
          </div>

          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-xl border-2 border-indigo-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-indigo-600 font-semibold">Total Recaudado</p>
              <span className="text-2xl">💎</span>
            </div>
            <p className="text-2xl font-bold text-indigo-900">${stats.totalRevenue.toFixed(2)}</p>
            <p className="text-xs text-indigo-500 mt-1">Desde el inicio</p>
          </div>
        </div>

        {/* Métodos de pago (contadores de órdenes) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl border-2 border-orange-200 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-3xl">💵</span>
              <div className="flex-1">
                <p className="text-xs text-orange-600 font-semibold">Órdenes en Efectivo</p>
                <p className="text-2xl font-bold text-orange-900">{stats.cashPayments}</p>
                <p className="text-xs text-orange-500">Total de órdenes activas</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 p-4 rounded-xl border-2 border-cyan-200 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-3xl">📱</span>
              <div className="flex-1">
                <p className="text-xs text-cyan-600 font-semibold">Órdenes por Transferencia</p>
                <p className="text-2xl font-bold text-cyan-900">{stats.transferPayments}</p>
                <p className="text-xs text-cyan-500">Total de órdenes activas</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

