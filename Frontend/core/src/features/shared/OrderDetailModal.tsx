// =================================================================
// ARCHIVO 5: /src/features/shared/OrderDetailModal.tsx
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg">
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <h2 className="text-xl font-bold">Detalle de la Orden</h2>
          <button onClick={onClose} className="text-2xl font-bold">&times;</button>
        </div>
        {detailsStatus === 'loading' && <p>Cargando detalles...</p>}
        {detailsStatus === 'succeeded' && selectedOrderDetails && (
          <div>
            <p><strong>Mesa:</strong> {selectedOrderDetails.table_number}</p>
            <p><strong>Estado:</strong> {selectedOrderDetails.status}</p>
            <p><strong>Total:</strong> ${selectedOrderDetails.total.toFixed(2)}</p>
            <h3 className="font-bold mt-4 mb-2">Ítems:</h3>
            <ul className="list-disc pl-5">
              {selectedOrderDetails.items.map((item, index) => (
                <li key={index}>
                  {item.quantity}x (ID: {item.menu_item_id.substring(0,8)}) @ ${item.price_at_order.toFixed(2)}
                  {item.notes && <p className="text-sm italic text-gray-600">Nota: {item.notes}</p>}
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