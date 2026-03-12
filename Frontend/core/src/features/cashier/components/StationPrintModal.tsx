// =================================================================
// ARCHIVO: /src/features/cashier/components/StationPrintModal.tsx
// Modal para seleccionar estaciones e imprimir tickets de cocina
// =================================================================
import React, { useEffect, useState } from 'react';
import type { KitchenTicketStationSummary, KitchenTicketsPreview } from '../../../types/kitchen_tickets';
import { kitchenTicketsAPI } from '../../shared/orders/api/kitchenTicketsAPI';

interface StationPrintModalProps {
  isOpen: boolean;
  orderId: string | null;
  onClose: () => void;
}

type PrintStatus = 'idle' | 'loading' | 'printing' | 'done';

interface StationResult {
  station_id: string;
  station_name: string;
  success: boolean;
  message: string;
}

export const StationPrintModal: React.FC<StationPrintModalProps> = ({
  isOpen,
  orderId,
  onClose,
}) => {
  const [preview, setPreview] = useState<KitchenTicketsPreview | null>(null);
  const [status, setStatus] = useState<PrintStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [selectedStations, setSelectedStations] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<StationResult[]>([]);

  // Cargar preview al abrir
  useEffect(() => {
    if (!isOpen || !orderId) return;

    const load = async () => {
      setStatus('loading');
      setError(null);
      setResults([]);
      setSelectedStations(new Set());

      try {
        const data = await kitchenTicketsAPI.preview(orderId);
        setPreview(data);
        // Pre-seleccionar todas las estaciones
        setSelectedStations(new Set(data.summary.map((s) => s.station_id)));
      } catch {
        setError('No se pudo cargar la información de las estaciones.');
      } finally {
        setStatus('idle');
      }
    };

    load();
  }, [isOpen, orderId]);

  // Limpiar al cerrar
  useEffect(() => {
    if (!isOpen) {
      setPreview(null);
      setStatus('idle');
      setError(null);
      setResults([]);
      setSelectedStations(new Set());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const allSelected =
    preview !== null && preview.summary.length > 0 && selectedStations.size === preview.summary.length;

  const toggleStation = (stationId: string) => {
    setSelectedStations((prev) => {
      const next = new Set(prev);
      if (next.has(stationId)) {
        next.delete(stationId);
      } else {
        next.add(stationId);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (!preview) return;
    if (allSelected) {
      setSelectedStations(new Set());
    } else {
      setSelectedStations(new Set(preview.summary.map((s) => s.station_id)));
    }
  };

  const handlePrint = async () => {
    if (!orderId || !preview || selectedStations.size === 0) return;

    setStatus('printing');
    setResults([]);

    try {
      // Si se seleccionaron todas las estaciones, usar endpoint general
      if (selectedStations.size === preview.summary.length) {
        const result = await kitchenTicketsAPI.print(orderId, true);
        const stationResults: StationResult[] = preview.summary.map((s) => {
          const failed = result.failed_prints?.find((f) => f.station_name === s.station_name);
          return {
            station_id: s.station_id,
            station_name: s.station_name,
            success: !failed,
            message: failed ? failed.error : 'Enviado correctamente',
          };
        });
        setResults(stationResults);
      } else {
        // Imprimir cada estación seleccionada individualmente en paralelo
        const selectedList = preview.summary.filter((s) => selectedStations.has(s.station_id));
        const settled = await Promise.allSettled(
          selectedList.map((s) => kitchenTicketsAPI.printStation(orderId, s.station_id, true))
        );

        const stationResults: StationResult[] = selectedList.map((s, i) => {
          const outcome = settled[i];
          if (outcome.status === 'fulfilled') {
            const failed = outcome.value.failed_prints?.find((f) => f.station_name === s.station_name);
            return {
              station_id: s.station_id,
              station_name: s.station_name,
              success: !failed && outcome.value.success,
              message: failed ? failed.error : outcome.value.message || 'Enviado correctamente',
            };
          } else {
            return {
              station_id: s.station_id,
              station_name: s.station_name,
              success: false,
              message: 'Error de red al enviar a la impresora',
            };
          }
        });
        setResults(stationResults);
      }
    } catch {
      setError('Error inesperado al enviar a imprimir. Verifica la conexión con las impresoras.');
    } finally {
      setStatus('done');
    }
  };

  const isPrinting = status === 'printing';
  const isLoading = status === 'loading';
  const isDone = status === 'done';
  const canPrint = !isPrinting && !isLoading && selectedStations.size > 0 && !isDone;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col"
        style={{ colorScheme: 'light' }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🖨️</span>
            <div>
              <h2 className="text-lg font-bold leading-tight">Imprimir por Estación</h2>
              {preview && (
                <p className="text-xs text-white/80">
                  Orden {preview.order_number} · Mesa {preview.table_number}
                </p>
              )}
            </div>
          </div>
          {!isPrinting && (
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors text-xl font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Loading */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600" />
              <p className="text-gray-500 text-sm">Cargando estaciones...</p>
            </div>
          )}

          {/* Error de carga */}
          {error && !isDone && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
              <p className="text-red-600 font-semibold text-sm">❌ {error}</p>
            </div>
          )}

          {/* Resultados de impresión */}
          {isDone && results.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-bold text-gray-700 text-sm">Resultados de impresión:</h3>
              {results.map((r) => (
                <div
                  key={r.station_id}
                  className={`flex items-start gap-3 rounded-xl p-3 border ${
                    r.success
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <span className="text-xl mt-0.5">{r.success ? '✅' : '❌'}</span>
                  <div>
                    <p className={`font-semibold text-sm ${r.success ? 'text-green-800' : 'text-red-800'}`}>
                      {r.station_name}
                    </p>
                    <p className={`text-xs mt-0.5 ${r.success ? 'text-green-600' : 'text-red-600'}`}>
                      {r.message}
                    </p>
                  </div>
                </div>
              ))}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                  <p className="text-red-600 font-semibold text-sm">❌ {error}</p>
                </div>
              )}
            </div>
          )}

          {/* Selección de estaciones */}
          {!isLoading && !isDone && preview && preview.summary.length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
              <p className="text-4xl mb-2">⚠️</p>
              <p className="text-yellow-800 font-semibold text-sm">
                Esta orden no tiene estaciones asignadas
              </p>
              <p className="text-yellow-600 text-xs mt-1">
                Los items no tienen estaciones de cocina configuradas
              </p>
            </div>
          )}

          {!isLoading && !isDone && preview && preview.summary.length > 0 && (
            <div className="space-y-3">
              {/* Info de la orden */}
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <p className="text-gray-500">Estaciones</p>
                  <p className="font-bold text-purple-700 text-base">{preview.total_stations}</p>
                </div>
                <div>
                  <p className="text-gray-500">Items únicos</p>
                  <p className="font-bold text-blue-700 text-base">{preview.total_items}</p>
                </div>
                <div>
                  <p className="text-gray-500">Mesero</p>
                  <p className="font-bold text-gray-700 text-base truncate">{preview.waiter_name}</p>
                </div>
              </div>

              {/* Seleccionar todas */}
              <button
                onClick={toggleAll}
                className={`w-full py-2.5 rounded-xl font-semibold text-sm border-2 transition-all ${
                  allSelected
                    ? 'bg-purple-600 border-purple-600 text-white'
                    : 'bg-white border-purple-300 text-purple-700 hover:bg-purple-50'
                }`}
              >
                {allSelected ? '☑ Deseleccionar todas' : '☐ Seleccionar todas'}
              </button>

              {/* Cards de estaciones */}
              {preview.summary.map((station: KitchenTicketStationSummary) => {
                const isSelected = selectedStations.has(station.station_id);
                return (
                  <button
                    key={station.station_id}
                    onClick={() => toggleStation(station.station_id)}
                    className={`w-full text-left rounded-xl border-2 p-4 transition-all ${
                      isSelected
                        ? 'bg-purple-50 border-purple-500 shadow-md'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Checkbox visual */}
                      <div
                        className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                          isSelected
                            ? 'bg-purple-600 border-purple-600'
                            : 'bg-white border-gray-400'
                        }`}
                      >
                        {isSelected && (
                          <svg
                            className="w-4 h-4 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={3}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>

                      {/* Info de la estación */}
                      <div className="flex-1 min-w-0">
                        <p className={`font-bold text-sm ${isSelected ? 'text-purple-800' : 'text-gray-800'}`}>
                          🍳 {station.station_name}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {station.unique_items} item{station.unique_items !== 1 ? 's' : ''} ·{' '}
                          {station.total_quantity} unidad{station.total_quantity !== 1 ? 'es' : ''}
                        </p>
                      </div>

                      {/* Badge cantidad */}
                      <div
                        className={`px-2.5 py-1 rounded-full text-xs font-bold flex-shrink-0 ${
                          isSelected ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        ×{station.total_quantity}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 bg-gray-50 px-5 py-4 flex gap-3">
          {isDone ? (
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 shadow-md transition-all"
            >
              Cerrar
            </button>
          ) : (
            <>
              <button
                onClick={onClose}
                disabled={isPrinting}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handlePrint}
                disabled={!canPrint}
                className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {isPrinting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    <span>Imprimiendo...</span>
                  </>
                ) : (
                  <>
                    <span>🖨️</span>
                    <span>
                      Imprimir
                      {selectedStations.size > 0 && ` (${selectedStations.size})`}
                    </span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
