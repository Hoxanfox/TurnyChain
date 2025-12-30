// =================================================================
// ARCHIVO: /src/features/cashier/components/KitchenTicketsPreviewModal.tsx
// Modal para previsualizar los tickets de cocina por estación
// =================================================================
import React, { useEffect, useState } from 'react';
import type { KitchenTicketsPreview } from '../../../types/kitchen_tickets';
import { kitchenTicketsAPI } from '../../shared/orders/api/kitchenTicketsAPI';

interface KitchenTicketsPreviewModalProps {
  isOpen: boolean;
  orderId: string | null;
  onClose: () => void;
  onPrint: (orderId: string) => void;
}

export const KitchenTicketsPreviewModal: React.FC<KitchenTicketsPreviewModalProps> = ({
  isOpen,
  orderId,
  onClose,
  onPrint,
}) => {
  const [preview, setPreview] = useState<KitchenTicketsPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPreview = async () => {
      if (!orderId) return;

      setLoading(true);
      setError(null);

      try {
        const data = await kitchenTicketsAPI.preview(orderId);
        setPreview(data);
      } catch (err) {
        console.error('Error al cargar preview de tickets:', err);
        setError('No se pudo cargar la vista previa de los tickets');
      } finally {
        setLoading(false);
      }
    };

    if (isOpen && orderId) {
      loadPreview();
    } else {
      setPreview(null);
      setError(null);
    }
  }, [isOpen, orderId]);

  const handlePrint = () => {
    if (orderId) {
      onPrint(orderId);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <span>🎫</span>
            <span>Vista Previa - Tickets de Cocina</span>
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 text-2xl font-bold"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Cargando vista previa...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
              <span className="text-red-600 font-semibold">❌ {error}</span>
            </div>
          )}

          {!loading && !error && preview && (
            <div className="space-y-6">
              {/* Info General */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h3 className="font-bold text-lg mb-2">📋 Información de la Orden</h3>
                <p className="text-sm text-gray-600">
                  Orden ID: <span className="font-mono font-semibold">{preview.order_id.slice(0, 8).toUpperCase()}</span>
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Total de tickets a imprimir: <span className="font-bold text-purple-600">{preview.tickets.length}</span>
                </p>
              </div>

              {/* Lista de Tickets por Estación */}
              {preview.tickets.length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                  <span className="text-2xl">⚠️</span>
                  <p className="text-yellow-800 font-semibold mt-2">
                    No hay tickets para imprimir
                  </p>
                  <p className="text-yellow-600 text-sm mt-1">
                    Los items de esta orden no tienen estaciones asignadas
                  </p>
                </div>
              ) : (
                preview.tickets.map((ticket, index) => (
                  <div
                    key={index}
                    className="bg-white border-2 border-gray-300 rounded-lg shadow-sm overflow-hidden"
                  >
                    {/* Header del Ticket */}
                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-3">
                      <h4 className="font-bold text-lg flex items-center gap-2">
                        <span>🍳</span>
                        <span>{ticket.station_name}</span>
                      </h4>
                      <p className="text-sm opacity-90">
                        Mesa {ticket.table_number} • {ticket.waiter_name}
                      </p>
                    </div>

                    {/* Items del Ticket */}
                    <div className="p-4 space-y-3">
                      {ticket.items.map((item, itemIndex) => (
                        <div
                          key={itemIndex}
                          className="border-l-4 border-blue-400 pl-3 py-2"
                        >
                          <div className="flex items-start gap-2">
                            <span className="font-bold text-lg text-blue-600 min-w-[30px]">
                              {item.quantity}x
                            </span>
                            <div className="flex-1">
                              <p className="font-semibold text-gray-800">
                                {item.menu_item_name}
                              </p>

                              {/* Badge de Para Llevar */}
                              {item.is_takeout && (
                                <span className="inline-block mt-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded">
                                  🥡 PARA LLEVAR
                                </span>
                              )}

                              {/* Customizaciones */}
                              {item.customizations && (
                                <div className="mt-2 space-y-1 text-sm">
                                  {item.customizations.active_ingredients &&
                                    item.customizations.active_ingredients.length > 0 && (
                                      <div className="text-gray-600">
                                        <span className="font-semibold">🥗 Ingredientes:</span>{' '}
                                        {item.customizations.active_ingredients
                                          .map((ing) => ing.name)
                                          .join(', ')}
                                      </div>
                                    )}

                                  {item.customizations.selected_accompaniments &&
                                    item.customizations.selected_accompaniments.length > 0 && (
                                      <div className="text-gray-600">
                                        <span className="font-semibold">🍟 Acompañamientos:</span>{' '}
                                        {item.customizations.selected_accompaniments
                                          .map((acc) => acc.name)
                                          .join(', ')}
                                      </div>
                                    )}
                                </div>
                              )}

                              {/* Notas */}
                              {item.notes && (
                                <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded p-2">
                                  <span className="text-xs font-semibold text-yellow-800">
                                    📝 Notas:
                                  </span>
                                  <p className="text-sm text-yellow-900 italic">{item.notes}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Notas especiales de la orden */}
                      {ticket.special_notes && (
                        <div className="mt-3 bg-red-50 border border-red-200 rounded p-3">
                          <span className="text-sm font-bold text-red-800">⚠️ NOTAS ESPECIALES:</span>
                          <p className="text-sm text-red-900 mt-1">{ticket.special_notes}</p>
                        </div>
                      )}

                      {/* Tipo de orden */}
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <span className="text-xs font-semibold text-gray-600">
                          {ticket.order_type === 'llevar' && '🥡 PARA LLEVAR'}
                          {ticket.order_type === 'domicilio' && '🏍️ DOMICILIO'}
                          {ticket.order_type === 'mesa' && '🍽️ EN MESA'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer con acciones */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handlePrint}
            disabled={loading || !!error || !preview || preview.tickets.length === 0}
            className="px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 font-semibold shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            <span>🖨️</span>
            <span>Imprimir Tickets</span>
          </button>
        </div>
      </div>
    </div>
  );
};

