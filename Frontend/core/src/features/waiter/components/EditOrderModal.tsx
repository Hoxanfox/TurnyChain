// =================================================================
// ARCHIVO: /src/features/waiter/components/EditOrderModal.tsx
// Componente para editar órdenes de forma granular
// =================================================================
import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../../app/store';
import { updateOrder } from '../../shared/orders/api/ordersSlice';
import type { Order, OrderItem, EditOrderRequest, UpdateItemOp, OrderItemPayload } from '../../../types/orders';
import AddItemModal from './AddItemModal';

interface EditOrderModalProps {
  order: Order;
  onClose: () => void;
  onSuccess?: () => void;
}

const EditOrderModal: React.FC<EditOrderModalProps> = ({ order, onClose, onSuccess }) => {
  const dispatch = useDispatch<AppDispatch>();

  // Estado local de items (copia de los items de la orden)
  const [localItems, setLocalItems] = useState<(OrderItem & { _localId: string })[]>([]);
  const [removedIndices, setRemovedIndices] = useState<number[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showAddItemModal, setShowAddItemModal] = useState(false);

  // Inicializar items locales con IDs únicos para tracking
  useEffect(() => {
    const itemsWithIds = order.items.map((item, index) => ({
      ...item,
      _localId: `${item.menu_item_id}_${index}_${Date.now()}`
    }));
    setLocalItems(itemsWithIds);
  }, [order.items]);

  // Calcular el total actual
  const calculateTotal = () => {
    return localItems
      .filter((_, index) => !removedIndices.includes(index))
      .reduce((sum, item) => sum + (item.quantity * item.price_at_order), 0);
  };

  // Manejar cambio de cantidad
  const handleQuantityChange = (index: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    const newItems = [...localItems];
    newItems[index] = { ...newItems[index], quantity: newQuantity };
    setLocalItems(newItems);
  };

  // Manejar cambio de notas
  const handleNotesChange = (index: number, newNotes: string) => {
    const newItems = [...localItems];
    newItems[index] = { ...newItems[index], notes: newNotes || undefined };
    setLocalItems(newItems);
  };

  // Agregar item marcado para eliminación
  const handleMarkForRemoval = (index: number) => {
    if (!removedIndices.includes(index)) {
      setRemovedIndices([...removedIndices, index]);
    }
  };

  // Desmarcar item para eliminación
  const handleUnmarkForRemoval = (index: number) => {
    setRemovedIndices(removedIndices.filter(i => i !== index));
  };

  // Agregar nuevo item desde AddItemModal con customizaciones completas
  const handleAddItemFromModal = (newItem: OrderItemPayload & { menu_item_name: string }) => {
    const itemWithLocalId = {
      ...newItem,
      _localId: `${newItem.menu_item_id}_new_${Date.now()}`
    };
    setLocalItems([...localItems, itemWithLocalId]);
  };

  // Construir el payload de edición
  const buildEditRequest = (): EditOrderRequest => {
    const editRequest: EditOrderRequest = {};

    // Items a eliminar (ordenar de mayor a menor)
    if (removedIndices.length > 0) {
      editRequest.remove_items = [...removedIndices].sort((a, b) => b - a);
    }

    // Items a actualizar
    const updateItems: UpdateItemOp[] = [];
    localItems.forEach((item, index) => {
      // Skip items marcados para eliminación
      if (removedIndices.includes(index)) return;

      // Skip items nuevos (se agregan con add_items)
      if (index >= order.items.length) return;

      const originalItem = order.items[index];
      const hasChanges = 
        item.quantity !== originalItem.quantity ||
        item.notes !== originalItem.notes;

      if (hasChanges) {
        const updateOp: UpdateItemOp = { index };
        if (item.quantity !== originalItem.quantity) {
          updateOp.quantity = item.quantity;
        }
        if (item.notes !== originalItem.notes) {
          updateOp.notes = item.notes || '';
        }
        updateItems.push(updateOp);
      }
    });

    if (updateItems.length > 0) {
      editRequest.update_items = updateItems;
    }

    // Items nuevos a agregar
    const newItems: OrderItemPayload[] = [];
    localItems.forEach((item, index) => {
      if (index >= order.items.length && !removedIndices.includes(index)) {
        newItems.push({
          menu_item_id: item.menu_item_id,
          quantity: item.quantity,
          price_at_order: item.price_at_order,
          notes: item.notes,
          is_takeout: item.is_takeout || false
        });
      }
    });

    if (newItems.length > 0) {
      editRequest.add_items = newItems;
    }

    return editRequest;
  };

  // Guardar cambios
  const handleSave = async () => {
    const editRequest = buildEditRequest();

    // Validar que hay al menos un item
    const remainingItems = localItems.filter((_, index) => !removedIndices.includes(index));
    if (remainingItems.length === 0) {
      setSaveMessage({ type: 'error', text: 'La orden debe tener al menos un item' });
      setTimeout(() => setSaveMessage(null), 3000);
      return;
    }

    // Validar que hay cambios
    const hasChanges = 
      editRequest.add_items?.length ||
      editRequest.update_items?.length ||
      editRequest.remove_items?.length;

    if (!hasChanges) {
      setSaveMessage({ type: 'error', text: 'No hay cambios para guardar' });
      setTimeout(() => setSaveMessage(null), 3000);
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    try {
      await dispatch(updateOrder({ orderId: order.id, editRequest })).unwrap();
      setSaveMessage({ type: 'success', text: '✓ Cambios guardados' });
      setTimeout(() => {
        setSaveMessage(null);
      }, 2000);
    } catch (error: any) {
      setSaveMessage({ type: 'error', text: error || 'Error al guardar' });
      setTimeout(() => setSaveMessage(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  // Cerrar y reenviar
  const handleCloseAndResubmit = async () => {
    // Si hay cambios sin guardar, guardar primero
    const editRequest = buildEditRequest();
    const hasChanges = 
      editRequest.add_items?.length ||
      editRequest.update_items?.length ||
      editRequest.remove_items?.length;

    if (hasChanges) {
      try {
        setIsSaving(true);
        await dispatch(updateOrder({ orderId: order.id, editRequest })).unwrap();
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        setSaveMessage({ type: 'error', text: 'Error al guardar cambios' });
        setIsSaving(false);
        return;
      }
    }

    setIsSaving(false);
    onSuccess?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white p-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold">✏️ Editar Orden</h2>
              <p className="text-sm opacity-90">Mesa {order.table_number} • ID: {order.id.substring(0, 8)}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
            >
              <span className="text-2xl">×</span>
            </button>
          </div>
        </div>

        {/* Mensaje de guardado */}
        {saveMessage && (
          <div className={`p-3 text-center font-semibold ${
            saveMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {saveMessage.text}
          </div>
        )}

        {/* Total actual */}
        <div className="bg-gray-50 p-3 border-b">
          <div className="flex justify-between items-center">
            <span className="text-gray-700 font-medium">Total actual:</span>
            <span className="text-2xl font-bold text-indigo-600">${calculateTotal().toFixed(2)}</span>
          </div>
        </div>

        {/* Lista de items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {localItems.map((item, index) => {
            const isMarkedForRemoval = removedIndices.includes(index);
            const isNew = index >= order.items.length;

            return (
              <div
                key={item._localId}
                className={`border rounded-lg p-3 transition-all ${
                  isMarkedForRemoval
                    ? 'bg-red-50 border-red-300 opacity-50'
                    : isNew
                    ? 'bg-green-50 border-green-300'
                    : 'bg-white border-gray-300'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-800 flex items-center gap-2">
                      {item.menu_item_name}
                      {isNew && <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded-full">NUEVO</span>}
                      {isMarkedForRemoval && <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full">ELIMINAR</span>}
                    </h4>
                    <p className="text-sm text-gray-600">${item.price_at_order.toFixed(2)} c/u</p>
                  </div>

                  {/* Botón eliminar/restaurar */}
                  {!isMarkedForRemoval ? (
                    <button
                      onClick={() => handleMarkForRemoval(index)}
                      className="text-red-600 hover:bg-red-100 px-3 py-1 rounded font-semibold text-sm"
                    >
                      🗑️
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUnmarkForRemoval(index)}
                      className="text-green-600 hover:bg-green-100 px-3 py-1 rounded font-semibold text-sm"
                    >
                      ↩️ Restaurar
                    </button>
                  )}
                </div>

                {!isMarkedForRemoval && (
                  <>
                    {/* Cantidad */}
                    <div className="flex items-center gap-2 mb-2">
                      <label className="text-sm font-medium text-gray-700">Cantidad:</label>
                      <button
                        onClick={() => handleQuantityChange(index, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        className="bg-gray-200 hover:bg-gray-300 disabled:opacity-50 rounded px-3 py-1 font-bold"
                      >
                        −
                      </button>
                      <span className="text-lg font-bold w-12 text-center">{item.quantity}</span>
                      <button
                        onClick={() => handleQuantityChange(index, item.quantity + 1)}
                        className="bg-gray-200 hover:bg-gray-300 rounded px-3 py-1 font-bold"
                      >
                        +
                      </button>
                      <span className="ml-auto text-sm font-semibold text-gray-700">
                        = ${(item.quantity * item.price_at_order).toFixed(2)}
                      </span>
                    </div>

                    {/* Notas */}
                    <div>
                      <label className="text-sm font-medium text-gray-700">Notas:</label>
                      <input
                        type="text"
                        value={item.notes || ''}
                        onChange={(e) => handleNotesChange(index, e.target.value)}
                        placeholder="Sin cebolla, extra picante..."
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Agregar items del menú */}
        <div className="border-t p-4 bg-gradient-to-r from-green-50 to-teal-50">
          <button
            onClick={() => setShowAddItemModal(true)}
            className="w-full bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white py-3 px-4 rounded-lg font-bold transition-all flex items-center justify-center gap-2"
          >
            <span className="text-xl">➕</span>
            <span>Agregar Plato con Customizaciones</span>
          </button>
        </div>

        {/* Footer con acciones */}
        <div className="border-t p-4 flex gap-3">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-3 rounded-lg font-bold transition-colors"
          >
            {isSaving ? '💾 Guardando...' : '💾 Guardar Cambios'}
          </button>
          <button
            onClick={handleCloseAndResubmit}
            disabled={isSaving}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-3 rounded-lg font-bold transition-colors"
          >
            {isSaving ? '⏳ Procesando...' : '✅ Guardar y Cerrar'}
          </button>
        </div>
      </div>

      {/* Modal secundario para agregar items con customizaciones */}
      {showAddItemModal && (
        <AddItemModal
          onClose={() => setShowAddItemModal(false)}
          onConfirm={handleAddItemFromModal}
          orderType={order.order_type}
        />
      )}
    </div>
  );
};

export default EditOrderModal;
