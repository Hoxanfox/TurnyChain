// =================================================================
// ARCHIVO 1: /src/features/shared/OrderDetailModal.tsx (REFACTORIZADO)
// =================================================================
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchOrderDetails } from '../orders/ordersSlice';
import type { AppDispatch, RootState } from '../../app/store';

interface OrderDetailModalProps {
  orderId: string;
  onClose: () => void;
}

const OrderDetailModal: React.FC<OrderDetailModalProps> = ({ orderId, onClose }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { selectedOrderDetails, detailsStatus } = useSelector((state: RootState) => state.orders);

  useEffect(() => {
    if (orderId) {
      dispatch(fetchOrderDetails(orderId));
    }
  }, [orderId, dispatch]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg">
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <h2 className="text-xl font-bold">Detalle de la Orden</h2>
          <button onClick={onClose} className="text-2xl font-bold text-gray-600 hover:text-gray-900">&times;</button>
        </div>
        {detailsStatus === 'loading' && <p>Cargando detalles...</p>}
        {detailsStatus === 'succeeded' && selectedOrderDetails && (
          <div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <p><strong>Mesa:</strong> {selectedOrderDetails.table_number}</p>
              <p><strong>Estado:</strong> <span className="font-semibold text-blue-600">{selectedOrderDetails.status}</span></p>
              <p><strong>Total:</strong> <span className="font-bold">${selectedOrderDetails.total.toFixed(2)}</span></p>
              <p><strong>Mesero ID:</strong> {selectedOrderDetails.waiter_id.substring(0,8)}...</p>
            </div>
            <h3 className="font-bold mt-4 mb-2 border-t pt-2">Ítems:</h3>
            <ul className="space-y-3 max-h-64 overflow-y-auto">
              {selectedOrderDetails.items.map((item, index) => (
                <li key={index} className="p-2 bg-gray-50 rounded">
                  <p className="font-semibold">{item.quantity}x {item.menu_item_name} (@ ${item.price_at_order.toFixed(2)})</p>
                  {item.notes && <p className="text-sm italic text-gray-600 mt-1">Nota: {item.notes}</p>}
                  {item.customizations?.removed_ingredients?.length > 0 && 
                    <p className="text-xs text-red-500 mt-1">Sin: {item.customizations.removed_ingredients.map(i => i.name).join(', ')}</p>
                  }
                  {item.customizations?.selected_accompaniments?.length > 0 &&
                    <p className="text-xs text-green-600 mt-1">Con: {item.customizations.selected_accompaniments.map(a => a.name).join(', ')}</p>
                  }
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderDetailModal;