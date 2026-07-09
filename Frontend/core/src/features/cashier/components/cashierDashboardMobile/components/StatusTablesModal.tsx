import React from 'react';
import { MdClose } from 'react-icons/md';
import type { Order } from '../../../../../types/orders';
import { CashierMobileTableGrid } from './CashierMobileTableGrid';

interface StatusTablesModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  tableNumbers: number[];
  ordersByTable: Record<number, Order[]>;
  onViewOrders: (tableNumber: number) => void;
  headerColorClass: string;
}

export const StatusTablesModal: React.FC<StatusTablesModalProps> = ({
  isOpen,
  onClose,
  title,
  tableNumbers,
  ordersByTable,
  onViewOrders,
  headerColorClass,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
      <div 
        className="bg-white shadow-2xl w-full max-w-md max-h-[90vh] rounded-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className={`text-white p-4 flex justify-between items-center shrink-0 ${headerColorClass}`}>
          <h2 className="text-lg font-bold flex items-center gap-2">{title}</h2>
          <button onClick={onClose} className="p-1.5 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
            <MdClose size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
          <CashierMobileTableGrid
            tableNumbers={tableNumbers}
            ordersByTable={ordersByTable}
            onViewOrders={(tableNum) => {
              onViewOrders(tableNum);
              onClose(); // Cerrar el modal al seleccionar la mesa
            }}
            hasMore={false} // No paginamos en este modal, mostramos todas
            onLoadMore={() => {}}
          />
        </div>
      </div>
    </div>
  );
};
