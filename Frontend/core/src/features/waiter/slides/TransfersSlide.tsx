import React, { useState, useEffect } from 'react';
import { MdCheckCircle, MdCancel } from 'react-icons/md';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../app/store';
import ClockPickerModal from './components/ClockPickerModal';

interface BankTransfer {
  id: string;
  sender: string;
  amount: number;
  bank_name: string;
  timestamp: string;
  is_used: boolean;
}

interface TransfersSlideProps {
  isOpen: boolean;
  onClose: () => void;
  wsMessage: any; // Used to listen for real-time ws events
}

const TransfersSlide: React.FC<TransfersSlideProps> = ({ isOpen, wsMessage }) => {
  const token = useSelector((state: RootState) => state.auth.token);
  const [transfers, setTransfers] = useState<BankTransfer[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedHour, setSelectedHour] = useState<string | 'ALL'>('ALL');
  const [isClockModalOpen, setIsClockModalOpen] = useState(false);

  const fetchTransfers = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch('/api/bank-transfers/recent', {
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
      setSelectedHour('ALL'); // Reset when opened
    }
  }, [isOpen]);

  // Se eliminó hourChips ya que ahora usamos el ClockPickerModal

  const handleHourSelect = async (hourDate: Date | 'ALL') => {
    if (hourDate === 'ALL') {
      setSelectedHour('ALL');
      fetchTransfers();
      return;
    }
    
    setSelectedHour(hourDate.toISOString());
    if (!token) return;
    try {
      setLoading(true);
      const startTime = new Date(hourDate);
      const endTime = new Date(hourDate);
      endTime.setHours(endTime.getHours() + 1);
      
      // Llamada directa al search con el rango exacto
      const res = await fetch(`/api/bank-transfers/search?start_time=${startTime.toISOString()}&end_time=${endTime.toISOString()}&page=1&limit=100`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTransfers(data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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

  const groupTransfersByHour = (transfersList: BankTransfer[]) => {
    const groups: { [key: string]: BankTransfer[] } = {};
    
    transfersList.forEach(t => {
      const date = new Date(t.timestamp);
      const today = new Date();
      const isToday = today.toDateString() === date.toDateString();
      
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const isYesterday = yesterday.toDateString() === date.toDateString();
      
      let datePart = date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
      if (isToday) datePart = 'Hoy';
      else if (isYesterday) datePart = 'Ayer';
      
      const hour = date.getHours();
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      
      // Bloque de hora, ej: "Hoy • 10:00 AM - 10:59 AM"
      const key = `${datePart} • ${hour12}:00 ${ampm} - ${hour12}:59 ${ampm}`;
      
      // Guardamos un sortKey para poder ordenar los grupos (del más reciente al más antiguo)
      const sortKey = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour).getTime();
      
      const fullKey = `${sortKey}|${key}`;
      
      if (!groups[fullKey]) {
        groups[fullKey] = [];
      }
      groups[fullKey].push(t);
    });
    
    return groups;
  };

  const groupedTransfers = groupTransfersByHour(transfers);
  // Ordenar los grupos por el sortKey (descendente)
  const sortedGroupKeys = Object.keys(groupedTransfers).sort((a, b) => {
    const timeA = parseInt(a.split('|')[0]);
    const timeB = parseInt(b.split('|')[0]);
    return timeB - timeA;
  });

  return (
    <div className="w-full h-full flex flex-col bg-slate-50 relative overflow-hidden">
      {/* Header Fijo */}
      <div className="bg-indigo-900 text-white p-4 flex justify-between items-center shadow-md shrink-0">
        <h2 className="text-lg font-bold">📲 Notificaciones BREB</h2>
      </div>
      
      {/* Selector Intuitivo de Horas */}
      <div className="bg-white px-4 py-3 border-b border-gray-200 flex gap-3 shrink-0 shadow-sm">
        <button 
          onClick={() => handleHourSelect('ALL')}
          className={`flex-1 py-2 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 ${selectedHour === 'ALL' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          <span>📜</span> Todas (Recientes)
        </button>
        <button 
          onClick={() => setIsClockModalOpen(true)}
          className={`flex-1 py-2 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 ${selectedHour !== 'ALL' ? 'bg-violet-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          <span>⌚</span> Filtrar por Hora
        </button>
      </div>

      <ClockPickerModal 
        isOpen={isClockModalOpen}
        onClose={() => setIsClockModalOpen(false)}
        onSelectHour={(date) => handleHourSelect(date)}
      />

      <div className="p-4 flex-1 overflow-y-auto bg-slate-50 pb-20">
        {loading && (
          <div className="flex justify-center items-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        )}
        {!loading && transfers.length === 0 && (
          <div className="text-gray-500 text-center mt-10 p-6 bg-white rounded-xl shadow-sm border border-gray-200">
            <span className="text-4xl block mb-2">📭</span>
            No hay transferencias en esta hora.
          </div>
        )}
        
        {!loading && sortedGroupKeys.map(fullKey => {
          if (!groupedTransfers[fullKey]) return null;
          const label = fullKey.split('|')[1];
          const group = groupedTransfers[fullKey];
          
          return (
            <div key={fullKey} className="mb-6">
              <div className="sticky top-0 bg-slate-100 py-2 z-10">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                  {label}
                </h3>
              </div>
              <div className="space-y-3 mt-2">
                {group.map(t => (
                  <div key={t.id} className={`p-4 rounded-xl border transition-all ${t.is_used ? 'bg-slate-50 border-slate-200 opacity-75' : 'bg-white border-indigo-200 shadow-sm hover:shadow-md'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="font-black text-slate-800 text-lg block leading-tight">{formatMoney(t.amount)}</span>
                        <span className="text-sm font-semibold text-slate-600">{t.sender}</span>
                      </div>
                      {t.is_used ? (
                        <span className="flex items-center text-xs text-slate-500 font-bold gap-1 bg-slate-200 px-2 py-1 rounded-md"><MdCancel /> Usada</span>
                      ) : (
                        <span className="flex items-center text-xs text-emerald-600 font-bold gap-1 bg-emerald-100 border border-emerald-200 px-2 py-1 rounded-md"><MdCheckCircle /> Disponible</span>
                      )}
                    </div>
                    
                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
                      <span className="bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded">
                        {t.bank_name || 'Nequi'}
                      </span>
                      <span className="font-medium">
                        {new Date(t.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TransfersSlide;
