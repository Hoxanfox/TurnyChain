import React, { useState, useMemo } from 'react';
import { MdClose, MdChevronLeft, MdChevronRight } from 'react-icons/md';
import type { Order } from '../../../../../types/orders';
import { CashierMobileTableGrid } from './CashierMobileTableGrid';

interface TablePaginationModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableNumbers: number[];
  ordersByTable: Record<number, Order[]>;
  onViewOrders: (tableNumber: number) => void;
}

export const TablePaginationModal: React.FC<TablePaginationModalProps> = ({
  isOpen,
  onClose,
  tableNumbers,
  ordersByTable,
  onViewOrders,
}) => {
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 10;

  const pages = useMemo(() => {
    const chunks: number[][] = [];
    for (let i = 0; i < tableNumbers.length; i += itemsPerPage) {
      chunks.push(tableNumbers.slice(i, i + itemsPerPage));
    }
    return chunks;
  }, [tableNumbers]);

  if (!isOpen) return null;

  const currentTables = pages[currentPage] || [];
  const totalPages = pages.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
      <div 
        className="bg-white shadow-2xl w-full max-w-md max-h-[90vh] rounded-3xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-slate-800 text-white p-4 flex justify-between items-center shrink-0">
          <h2 className="text-lg font-bold">Navegación de Mesas</h2>
          <button onClick={onClose} className="p-1.5 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
            <MdClose size={24} />
          </button>
        </div>

        {/* Paginador visual */}
        {totalPages > 1 && (
          <div className="bg-white border-b border-slate-100 p-3 flex items-center justify-between shadow-sm z-10 shrink-0">
            <button 
              onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
              disabled={currentPage === 0}
              className="p-2 text-slate-600 disabled:opacity-30 disabled:bg-transparent bg-slate-100 rounded-lg"
            >
              <MdChevronLeft size={24} />
            </button>
            
            <div className="flex-1 overflow-x-auto hide-scrollbar flex items-center gap-2 px-3 snap-x">
              {pages.map((_, index) => {
                const isSelected = currentPage === index;
                return (
                  <button
                    key={index}
                    onClick={() => setCurrentPage(index)}
                    className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-bold snap-center transition-all ${
                      isSelected 
                        ? 'bg-indigo-600 text-white shadow-md scale-105' 
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {index * itemsPerPage + 1} - {Math.min((index + 1) * itemsPerPage, tableNumbers.length)}
                  </button>
                );
              })}
            </div>

            <button 
              onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
              disabled={currentPage === totalPages - 1}
              className="p-2 text-slate-600 disabled:opacity-30 disabled:bg-transparent bg-slate-100 rounded-lg"
            >
              <MdChevronRight size={24} />
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
          {currentTables.length > 0 ? (
            <CashierMobileTableGrid
              tableNumbers={currentTables}
              ordersByTable={ordersByTable}
              onViewOrders={(tableNum) => {
                onViewOrders(tableNum);
                onClose();
              }}
              hasMore={false}
              onLoadMore={() => {}}
            />
          ) : (
            <div className="text-center p-8 text-slate-400 font-semibold">
              No hay mesas activas
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
