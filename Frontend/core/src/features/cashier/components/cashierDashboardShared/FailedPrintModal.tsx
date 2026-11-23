import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../../../app/store';
import type { Order } from '../../../../types/orders';
import type { KitchenTicketsPreview, PrintKitchenTicketsResponse } from '../../../../types/kitchen_tickets';
import { kitchenTicketsAPI } from '../../../shared/orders/api/kitchenTicketsAPI';
import { fetchActiveOrders } from '../../../shared/orders/api/ordersSlice';

interface FailedPrintModalProps {
  order: Order | null;
  onClose: () => void;
}

type ModalStatus = 'loading' | 'ready' | 'printing' | 'done';

export const FailedPrintModal: React.FC<FailedPrintModalProps> = ({ order, onClose }) => {
  const dispatch = useDispatch<AppDispatch>();
  const [preview, setPreview] = useState<KitchenTicketsPreview | null>(null);
  const [status, setStatus] = useState<ModalStatus>('loading');
  const [selectedStations, setSelectedStations] = useState<Set<string>>(new Set());
  const [includeCashier, setIncludeCashier] = useState(true);
  const [result, setResult] = useState<PrintKitchenTicketsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const orderId = order?.id ?? null;

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;

    setStatus('loading');
    setError(null);
    setResult(null);
    setIncludeCashier(true);

    kitchenTicketsAPI
      .preview(orderId)
      .then((data) => {
        if (cancelled) return;
        setPreview(data);
        setSelectedStations(new Set(data.summary.map((s) => s.station_id)));
        setStatus('ready');
      })
      .catch(() => {
        if (cancelled) return;
        setError('No se pudieron cargar las estaciones de esta comanda.');
        setStatus('ready');
      });

    return () => {
      cancelled = true;
    };
  }, [orderId]);

  if (!order) return null;

  const allStationIds = preview ? preview.summary.map((s) => s.station_id) : [];
  const allSelected = allStationIds.length > 0 && selectedStations.size === allStationIds.length;
  const isPrinting = status === 'printing';
  const isLoading = status === 'loading';
  const isDone = status === 'done';
  const canPrint =
    status === 'ready' && preview !== null && (selectedStations.size > 0 || includeCashier);

  const applyPreset = (preset: 'cashier' | 'kitchen' | 'both') => {
    setSelectedStations(new Set(preset === 'cashier' ? [] : allStationIds));
    setIncludeCashier(preset !== 'kitchen');
  };

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

  const toggleAllStations = () => {
    setSelectedStations(allSelected ? new Set() : new Set(allStationIds));
  };

  const handlePrint = async () => {
    if (!orderId || !canPrint) return;
    setStatus('printing');
    setError(null);
    try {
      const response = await kitchenTicketsAPI.printSelected(orderId, {
        station_ids: Array.from(selectedStations),
        include_cashier: includeCashier,
      });
      setResult(response);
      dispatch(fetchActiveOrders());
    } catch (err: any) {
      setError(err?.response?.data?.error || 'No se pudo enviar a imprimir. Verifica las impresoras.');
    } finally {
      setStatus('done');
    }
  };

  const handleMarkResolved = async () => {
    if (!orderId) return;
    const confirmed = window.confirm(
      '¿Marcar esta comanda como resuelta? Úsalo solo si ya la imprimiste manualmente.'
    );
    if (!confirmed) return;
    setStatus('printing');
    setError(null);
    try {
      await kitchenTicketsAPI.printSelected(orderId, {
        station_ids: [],
        include_cashier: false,
        mark_resolved: true,
      });
      dispatch(fetchActiveOrders());
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'No se pudo marcar la comanda como resuelta.');
      setStatus('ready');
    }
  };

  const failedDestinations = result?.failed_prints ?? [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col"
        style={{ colorScheme: 'light' }}
      >
        <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🖨️</span>
            <div>
              <h2 className="text-lg font-bold leading-tight">Reimprimir comanda</h2>
              <p className="text-xs text-white/80">
                Mesa {order.table_number} · {order.waiter_name || 'Sin mesero'}
              </p>
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

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {order.last_print_error && !isDone && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-xs font-semibold text-red-700">Motivo del último fallo</p>
              <p className="text-xs text-red-600 mt-1 break-words">{order.last_print_error}</p>
            </div>
          )}

          {isLoading && (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600" />
              <p className="text-gray-500 text-sm">Cargando destinos...</p>
            </div>
          )}

          {error && !isDone && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
              <p className="text-red-600 font-semibold text-sm">❌ {error}</p>
            </div>
          )}

          {isDone && result && (
            <div className="space-y-3">
              <div
                className={`rounded-xl p-3 border ${
                  result.success ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'
                }`}
              >
                <p className={`font-semibold text-sm ${result.success ? 'text-green-800' : 'text-amber-800'}`}>
                  {result.success ? '✅ Impresión completa' : '⚠️ Impresión con pendientes'}
                </p>
                <p className="text-xs text-gray-600 mt-1">{result.message}</p>
              </div>
              {failedDestinations.map((f, i) => (
                <div key={`${f.station_name}-${i}`} className="flex items-start gap-3 rounded-xl p-3 border bg-red-50 border-red-200">
                  <span className="text-xl mt-0.5">❌</span>
                  <div>
                    <p className="font-semibold text-sm text-red-800">{f.station_name}</p>
                    <p className="text-xs mt-0.5 text-red-600">{f.error}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && isDone && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
              <p className="text-red-600 font-semibold text-sm">❌ {error}</p>
            </div>
          )}

          {!isLoading && !isDone && preview && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => applyPreset('cashier')}
                  className="py-2 rounded-xl text-xs font-semibold border-2 border-amber-300 text-amber-800 hover:bg-amber-50"
                >
                  🧾 Solo caja
                </button>
                <button
                  onClick={() => applyPreset('kitchen')}
                  className="py-2 rounded-xl text-xs font-semibold border-2 border-purple-300 text-purple-800 hover:bg-purple-50"
                  disabled={allStationIds.length === 0}
                >
                  🍳 Solo categorías
                </button>
                <button
                  onClick={() => applyPreset('both')}
                  className="col-span-2 py-2 rounded-xl text-xs font-semibold border-2 border-red-300 text-red-700 hover:bg-red-50"
                >
                  🖨️ Ambas (caja + categorías)
                </button>
              </div>

              <button
                onClick={() => setIncludeCashier((v) => !v)}
                className={`w-full text-left rounded-xl border-2 p-4 transition-all ${
                  includeCashier ? 'bg-amber-50 border-amber-500 shadow-md' : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${
                      includeCashier ? 'bg-amber-600 border-amber-600' : 'bg-white border-gray-400'
                    }`}
                  >
                    {includeCashier && (
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`font-bold text-sm ${includeCashier ? 'text-amber-800' : 'text-gray-800'}`}>
                      🧾 Comanda de caja
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">Todos los items en un solo ticket</p>
                  </div>
                </div>
              </button>

              {allStationIds.length > 0 && (
                <>
                  <button
                    onClick={toggleAllStations}
                    className={`w-full py-2.5 rounded-xl font-semibold text-sm border-2 transition-all ${
                      allSelected
                        ? 'bg-purple-600 border-purple-600 text-white'
                        : 'bg-white border-purple-300 text-purple-700 hover:bg-purple-50'
                    }`}
                  >
                    {allSelected ? '☑ Deseleccionar categorías' : '☐ Seleccionar todas las categorías'}
                  </button>

                  {preview.summary.map((station) => {
                    const isSelected = selectedStations.has(station.station_id);
                    return (
                      <button
                        key={station.station_id}
                        onClick={() => toggleStation(station.station_id)}
                        className={`w-full text-left rounded-xl border-2 p-4 transition-all ${
                          isSelected ? 'bg-purple-50 border-purple-500 shadow-md' : 'bg-white border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${
                              isSelected ? 'bg-purple-600 border-purple-600' : 'bg-white border-gray-400'
                            }`}
                          >
                            {isSelected && (
                              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`font-bold text-sm ${isSelected ? 'text-purple-800' : 'text-gray-800'}`}>
                              🍳 {station.station_name}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {station.unique_items} item{station.unique_items !== 1 ? 's' : ''} ·{' '}
                              {station.total_quantity} unidad{station.total_quantity !== 1 ? 'es' : ''}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 bg-gray-50 px-5 py-4 space-y-2">
          {isDone ? (
            <div className="flex gap-3">
              {!result?.success && (
                <button
                  onClick={() => setStatus('ready')}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200"
                >
                  Volver a seleccionar
                </button>
              )}
              <button
                onClick={onClose}
                className="flex-1 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-xl font-semibold shadow-md"
              >
                Cerrar
              </button>
            </div>
          ) : (
            <>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  disabled={isPrinting}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handlePrint}
                  disabled={!canPrint}
                  className="flex-1 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-xl font-semibold shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isPrinting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      <span>Imprimiendo...</span>
                    </>
                  ) : (
                    <>
                      <span>🖨️</span>
                      <span>Imprimir</span>
                    </>
                  )}
                </button>
              </div>
              <button
                onClick={handleMarkResolved}
                disabled={isPrinting || isLoading}
                className="w-full py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 underline disabled:opacity-50"
              >
                Ya la reimprimí manualmente: marcar como resuelta
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
