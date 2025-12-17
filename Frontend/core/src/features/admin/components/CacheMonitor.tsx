// =================================================================
// COMPONENTE OPCIONAL: Monitor de Cache para Admin Dashboard
// Muestra estadísticas del cache de órdenes en tiempo real
// =================================================================
import React, { useState, useEffect } from 'react';
import { getCacheStats, manualCleanup, clearOrderDetailsCache } from '../../../utils/orderDetailsCache';

const CacheMonitor: React.FC = () => {
  const [stats, setStats] = useState<ReturnType<typeof getCacheStats>>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const refreshStats = () => {
    setStats(getCacheStats());
  };

  useEffect(() => {
    refreshStats();
    // Actualizar cada 5 segundos si está expandido
    if (isExpanded) {
      const interval = setInterval(refreshStats, 5000);
      return () => clearInterval(interval);
    }
  }, [isExpanded]);

  const handleManualCleanup = () => {
    if (confirm('¿Limpiar órdenes expiradas del cache?')) {
      manualCleanup();
      refreshStats();
    }
  };

  const handleClearAll = () => {
    if (confirm('⚠️ ¿Eliminar TODO el cache de órdenes? Esta acción no se puede deshacer.')) {
      clearOrderDetailsCache();
      refreshStats();
    }
  };

  if (!stats) {
    return (
      <div className="p-4 bg-gray-100 rounded-lg border border-gray-300">
        <p className="text-sm text-gray-600">💾 Cache de órdenes vacío</p>
      </div>
    );
  }

  const ageHours = Math.round((Date.now() - stats.oldestTimestamp) / (60 * 60 * 1000));
  const isLarge = stats.estimatedSizeKB > 4000; // > 4 MB
  const isMedium = stats.estimatedSizeKB > 2000; // > 2 MB

  return (
    <div className={`p-4 rounded-lg border ${isLarge ? 'bg-red-50 border-red-300' : isMedium ? 'bg-yellow-50 border-yellow-300' : 'bg-green-50 border-green-300'}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-2xl">💾</span>
          <h3 className="font-bold text-gray-800">Cache de Órdenes</h3>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          {isExpanded ? '▼ Contraer' : '▶ Ver más'}
        </button>
      </div>

      {/* Stats Compactas */}
      <div className="mt-2 grid grid-cols-3 gap-2">
        <div className="bg-white p-2 rounded shadow-sm">
          <p className="text-xs text-gray-600">Órdenes</p>
          <p className="text-lg font-bold text-blue-600">{stats.totalOrders}</p>
        </div>
        <div className="bg-white p-2 rounded shadow-sm">
          <p className="text-xs text-gray-600">Tamaño</p>
          <p className={`text-lg font-bold ${isLarge ? 'text-red-600' : isMedium ? 'text-yellow-600' : 'text-green-600'}`}>
            {stats.estimatedSizeKB} KB
          </p>
        </div>
        <div className="bg-white p-2 rounded shadow-sm">
          <p className="text-xs text-gray-600">Más antigua</p>
          <p className="text-lg font-bold text-gray-700">{ageHours}h</p>
        </div>
      </div>

      {/* Alertas */}
      {isLarge && (
        <div className="mt-3 p-2 bg-red-100 border border-red-300 rounded">
          <p className="text-sm text-red-700 font-medium">
            ⚠️ Cache grande (&gt;4 MB). Se recomienda limpieza.
          </p>
        </div>
      )}
      {isMedium && !isLarge && (
        <div className="mt-3 p-2 bg-yellow-100 border border-yellow-300 rounded">
          <p className="text-sm text-yellow-700 font-medium">
            ℹ️ Cache medio (&gt;2 MB). Monitorear crecimiento.
          </p>
        </div>
      )}

      {/* Detalles Expandidos */}
      {isExpanded && (
        <div className="mt-4 space-y-3 border-t pt-3">
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-1">Información Detallada:</p>
            <div className="bg-white p-3 rounded shadow-sm space-y-1 text-sm">
              <p><span className="font-medium">Límite máximo:</span> 50 órdenes</p>
              <p><span className="font-medium">Expiración:</span> 24 horas</p>
              <p><span className="font-medium">Orden más antigua:</span> {new Date(stats.oldestTimestamp).toLocaleString('es-ES')}</p>
              <p><span className="font-medium">Orden más reciente:</span> {new Date(stats.newestTimestamp).toLocaleString('es-ES')}</p>
            </div>
          </div>

          {/* Barra de Progreso */}
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-1">Uso de Cache:</p>
            <div className="bg-gray-200 rounded-full h-4 overflow-hidden">
              <div
                className={`h-full flex items-center justify-center text-xs font-bold text-white ${
                  isLarge ? 'bg-red-500' : isMedium ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min((stats.totalOrders / 50) * 100, 100)}%` }}
              >
                {Math.round((stats.totalOrders / 50) * 100)}%
              </div>
            </div>
            <p className="text-xs text-gray-600 mt-1">{stats.totalOrders} de 50 órdenes</p>
          </div>

          {/* Acciones */}
          <div className="flex gap-2">
            <button
              onClick={refreshStats}
              className="flex-1 bg-blue-500 text-white py-2 px-3 rounded hover:bg-blue-600 text-sm font-medium"
            >
              🔄 Actualizar
            </button>
            <button
              onClick={handleManualCleanup}
              className="flex-1 bg-yellow-500 text-white py-2 px-3 rounded hover:bg-yellow-600 text-sm font-medium"
            >
              🧹 Limpiar
            </button>
            <button
              onClick={handleClearAll}
              className="flex-1 bg-red-500 text-white py-2 px-3 rounded hover:bg-red-600 text-sm font-medium"
            >
              🗑️ Vaciar
            </button>
          </div>

          {/* Info */}
          <div className="bg-blue-50 p-3 rounded text-xs text-blue-800">
            <p className="font-semibold mb-1">ℹ️ ¿Qué hace el cache?</p>
            <p>Guarda temporalmente los detalles completos de las órdenes (ingredientes y acompañantes) para mostrarlos en el detalle, aunque el backend no los devuelva.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CacheMonitor;

