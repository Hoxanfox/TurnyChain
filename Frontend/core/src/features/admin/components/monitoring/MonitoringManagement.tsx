import React from 'react';
import { FaChartLine, FaExclamationTriangle } from 'react-icons/fa';

const MonitoringManagement: React.FC = () => {
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="p-6 bg-gradient-to-r from-slate-800 to-slate-900 border-b border-gray-100">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <FaChartLine className="text-blue-400" />
          Rendimiento y Monitoreo del Backend
        </h2>
        <p className="text-slate-300 text-sm mt-2 flex items-center gap-2">
          Panel de Grafana incrustado mostrando métricas RED (Rate, Errors, Duration) y uso de recursos de Golang en tiempo real.
        </p>
      </div>

      <div className="p-4 bg-gray-50 flex items-start gap-3 border-b border-gray-200">
        <FaExclamationTriangle className="text-amber-500 mt-1 flex-shrink-0" />
        <p className="text-sm text-gray-700">
          <strong>Nota de rendimiento:</strong> Este dashboard está directamente conectado al clúster de Docker local. Si el contenedor de Grafana no se está ejecutando en el puerto 3000, el panel inferior no cargará.
        </p>
      </div>

      {/* iframe container */}
      <div className="w-full h-[800px] bg-slate-950">
        <iframe
          src="/grafana/d/system-health?orgId=1&kiosk&refresh=5s"
          width="100%"
          height="100%"
          frameBorder="0"
          title="Grafana Backend Metrics Dashboard"
          className="w-full h-full"
        ></iframe>
      </div>
    </div>
  );
};

export default MonitoringManagement;
