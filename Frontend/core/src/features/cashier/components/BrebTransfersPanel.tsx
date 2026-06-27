import React, { useState, useEffect } from 'react';
import { MdClose, MdCheckCircle, MdCancel } from 'react-icons/md';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../app/store';

interface BankTransfer {
  id: string;
  sender: string;
  amount: number;
  bank_name: string;
  timestamp: string;
  is_used: boolean;
}

interface BrebTransfersPanelProps {
  isOpen: boolean;
  onClose: () => void;
  wsMessage: any; // Used to listen for real-time ws events
}

const BrebTransfersPanel: React.FC<BrebTransfersPanelProps> = ({ isOpen, onClose, wsMessage }) => {
  const token = useSelector((state: RootState) => state.auth.token);
  const [transfers, setTransfers] = useState<BankTransfer[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTransfers = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch('http://localhost:8080/api/bank-transfers/recent', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTransfers(data || []);
      }
    } catch (err) {
      console.error('Error fetching bank transfers', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTransfers();
    }
  }, [isOpen]);

  useEffect(() => {
    if (wsMessage?.type === 'BREB_TRANSFER_RECEIVED') {
      const newTransfer = wsMessage.payload;
      setTransfers(prev => [newTransfer, ...prev]);
    }
    if (wsMessage?.type === 'BREB_TRANSFER_USED') {
      const usedId = wsMessage.payload;
      setTransfers(prev => prev.map(t => t.id === usedId ? { ...t, is_used: true } : t));
    }
  }, [wsMessage]);

  const formatMoney = (amount: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-white shadow-2xl z-50 flex flex-col transform transition-transform animate-slide-in-right">
      <div className="bg-indigo-900 text-white p-4 flex justify-between items-center shadow-md">
        <h2 className="text-lg font-bold">📲 Transferencias (Nequi/BREB)</h2>
        <button onClick={onClose} className="p-1 bg-indigo-800 rounded-full hover:bg-indigo-700 transition">
          <MdClose size={24} />
        </button>
      </div>

      <div className="p-4 flex-1 overflow-y-auto bg-gray-50">
        {loading && <p className="text-gray-500 text-center mt-4 animate-pulse">Cargando...</p>}
        {!loading && transfers.length === 0 && (
          <p className="text-gray-500 text-center mt-10">No hay transferencias recientes.</p>
        )}
        {!loading && transfers.map(t => (
          <div key={t.id} className={`p-3 mb-3 rounded-xl border ${t.is_used ? 'bg-gray-100 border-gray-200 opacity-70' : 'bg-white border-indigo-200 shadow-sm'}`}>
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold text-gray-800">{formatMoney(t.amount)}</span>
              {t.is_used ? (
                <span className="flex items-center text-xs text-gray-500 font-bold gap-1"><MdCancel /> Usada</span>
              ) : (
                <span className="flex items-center text-xs text-green-600 font-bold gap-1"><MdCheckCircle /> Disponible</span>
              )}
            </div>
            <p className="text-sm text-gray-700">{t.sender}</p>
            <div className="flex justify-between mt-2 text-xs text-gray-400">
              <span>{t.bank_name || 'Nequi'}</span>
              <span>{new Date(t.timestamp).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })} - {new Date(t.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BrebTransfersPanel;
