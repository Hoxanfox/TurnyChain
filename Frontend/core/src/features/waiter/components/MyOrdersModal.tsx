// =================================================================
// ARCHIVO 4: /src/features/waiter/components/MyOrdersModal.tsx (NUEVO ARCHIVO)
// =================================================================
import React from 'react';
import MyOrdersList from './MyOrdersList';
//import type { Order } from '../../../types/orders';

interface MyOrdersModalProps {
  onClose: () => void;
  onSelectOrder: (orderId: string) => void;
}

const MyOrdersModal: React.FC<MyOrdersModalProps> = ({ onClose, onSelectOrder }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg h-3/4 flex flex-col">
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <h2 className="text-xl font-bold">Mis Órdenes Activas</h2>
          <button onClick={onClose} className="text-2xl font-bold text-gray-600 hover:text-gray-900">&times;</button>
        </div>
        <div className="flex-grow overflow-y-auto">
          <MyOrdersList onSelectOrder={onSelectOrder} />
        </div>
      </div>
    </div>
  );
};

export default MyOrdersModal;