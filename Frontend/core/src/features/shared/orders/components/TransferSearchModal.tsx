import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../../app/store.ts';
import { searchBankTransfers, linkBankTransfer, type BankTransfer } from '../api/ordersAPI.ts';

interface TransferSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderCreatedAt: string;
  onTransferLinked: () => void;
}

const TransferSearchModal: React.FC<TransferSearchModalProps> = ({
  isOpen,
  onClose,
  orderId,
  orderCreatedAt,
  onTransferLinked
}) => {
  const token = useSelector((state: RootState) => state.auth.token);
  const [transfers, setTransfers] = useState<BankTransfer[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 5;

  useEffect(() => {
    if (isOpen && token && orderCreatedAt) {
      fetchTransfers(1);
    }
  }, [isOpen, orderCreatedAt, token]);

  const fetchTransfers = async (pageNumber: number) => {
    if (!token) return;
    try {
      setLoading(true);
      // Rango: desde 30 minutos antes de la creación de la orden hasta 1 hora después
      const orderDate = new Date(orderCreatedAt);
      const startDate = new Date(orderDate.getTime() - 30 * 60 * 1000); // -30 minutes
      const endDate = new Date(orderDate.getTime() + 60 * 60 * 1000); // +1 hour

      const res = await searchBankTransfers(
        token,
        startDate.toISOString(),
        endDate.toISOString(),
        pageNumber,
        limit
      );
      setTransfers(res.data || []);
      setTotal(res.total || 0);
      setPage(res.page || 1);
    } catch (err) {
      console.error('Error fetching bank transfers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLink = async (transferId: string) => {
    if (!token) return;
    if (confirm('¿Estás seguro de vincular esta transferencia a la orden actual?')) {
      try {
        await linkBankTransfer(token, transferId, orderId);
        alert('Transferencia vinculada exitosamente');
        onTransferLinked();
        // Recargamos las transferencias para que se actualice la vista
        fetchTransfers(page);
      } catch (err) {
        console.error('Error linking transfer', err);
        alert('Hubo un error al vincular la transferencia');
      }
    }
  };

  const formatMoney = (amount: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount);

  if (!isOpen) return null;

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[70] p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        <div className="bg-indigo-900 text-white p-4 flex justify-between items-center">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <span className="text-2xl">🔎</span> Buscar Transferencias
          </h2>
          <button onClick={onClose} className="text-white hover:text-indigo-200 font-bold text-xl">
            &times;
          </button>
        </div>

        <div className="p-4 bg-indigo-50 border-b border-indigo-100 text-sm text-indigo-800">
          Mostrando transferencias realizadas desde <strong>30 minutos antes</strong> hasta <strong>1 hora después</strong> de la creación de la orden.
        </div>

        <div className="p-4 flex-1 overflow-y-auto max-h-[60vh] bg-slate-50">
          {loading ? (
            <div className="flex justify-center items-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : transfers.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              No se encontraron transferencias en este rango de tiempo.
            </div>
          ) : (
            <div className="space-y-3">
              {transfers.map(t => (
                <div key={t.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="font-bold text-gray-800 text-lg block">{formatMoney(t.amount)}</span>
                      <span className="text-sm font-semibold text-gray-600">{t.sender}</span>
                    </div>
                    {t.is_used ? (
                      <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-bold border border-gray-200">
                        Usada
                      </span>
                    ) : (
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold border border-green-200">
                        Disponible
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-center text-xs text-gray-500 mt-2">
                    <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-medium">
                      {t.bank_name || 'Nequi'}
                    </span>
                    <span>
                      {new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  
                  {!t.is_used && (
                    <button
                      onClick={() => handleLink(t.id)}
                      className="mt-3 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg text-sm transition-colors"
                    >
                      Vincular a esta Orden
                    </button>
                  )}
                  {t.is_used && t.order_id === orderId && (
                    <div className="mt-3 text-center text-sm font-bold text-green-600 bg-green-50 p-2 rounded-lg border border-green-200">
                      Vinculada a esta orden ✅
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="p-4 bg-white border-t border-gray-200 flex justify-between items-center">
            <button
              disabled={page <= 1 || loading}
              onClick={() => fetchTransfers(page - 1)}
              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md disabled:opacity-50 hover:bg-gray-200 text-sm font-semibold transition-colors"
            >
              Anterior
            </button>
            <span className="text-sm text-gray-500 font-medium">
              Página {page} de {totalPages}
            </span>
            <button
              disabled={page >= totalPages || loading}
              onClick={() => fetchTransfers(page + 1)}
              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md disabled:opacity-50 hover:bg-gray-200 text-sm font-semibold transition-colors"
            >
              Siguiente
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransferSearchModal;
