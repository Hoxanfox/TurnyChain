import React, { useState, useEffect } from 'react';
import { MdClose, MdCheckCircle, MdCancel } from 'react-icons/md';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../app/store';
import ClockPickerModal from '../../waiter/slides/components/ClockPickerModal';

const API_URL = import.meta.env.VITE_API_URL || '/api';

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
  const [selectedHour, setSelectedHour] = useState<string | 'ALL'>('ALL');
  const [isClockModalOpen, setIsClockModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const LIMIT = 15;

  const fetchTransfers = async (pageNum = 1) => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/bank-transfers/recent?page=${pageNum}&limit=${LIMIT}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const fetchedTransfers = data.data || [];
        
        if (pageNum === 1) {
          setTransfers(fetchedTransfers);
        } else {
          setTransfers(prev => [...prev, ...fetchedTransfers]);
        }
        
        setHasMore(fetchedTransfers.length === LIMIT);
      }
    } catch (err) {
      console.error('Error fetching bank transfers', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchTransfers(nextPage);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setPage(1);
      fetchTransfers(1);
      setSelectedHour('ALL');
    }
  }, [isOpen]);

  const handleHourSelect = async (hourDate: Date | 'ALL') => {
    if (hourDate === 'ALL') {
      setSelectedHour('ALL');
      setPage(1);
      fetchTransfers(1);
      return;
    }
    
    setSelectedHour(hourDate.toISOString());
    if (!token) return;
    try {
      setLoading(true);
      const startTime = new Date(hourDate);
      const endTime = new Date(hourDate);
      endTime.setHours(endTime.getHours() + 1);
      
      const res = await fetch(`${API_URL}/bank-transfers/search?start_time=${startTime.toISOString()}&end_time=${endTime.toISOString()}&page=1&limit=100`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTransfers(data.data || []);
        setHasMore(false); // No pagination for hourly filter
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (wsMessage?.type === 'BREB_TRANSFER_RECEIVED' || wsMessage?.type === 'BREB_TRANSFER_USED') {
      if (selectedHour === 'ALL') {
        // Refetch to guarantee sync with the DB instead of manual array manipulation
        fetchTransfers(1);
      } else {
        // If they are viewing a specific hour, refresh that hour too
        handleHourSelect(new Date(selectedHour));
      }
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
      <div 
        className="bg-white shadow-2xl w-full max-w-md max-h-[90vh] rounded-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-indigo-900 text-white p-4 flex justify-between items-center shrink-0">
          <h2 className="text-lg font-bold flex items-center gap-2"><span>📲</span> Transferencias</h2>
          <button onClick={onClose} className="p-1.5 bg-indigo-800/80 rounded-full hover:bg-indigo-700 transition-colors">
            <MdClose size={24} />
          </button>
        </div>

      <div className="bg-white px-4 py-3 border-b border-gray-200 flex gap-3 shrink-0 shadow-sm">
        <button 
          onClick={() => handleHourSelect('ALL')}
          className={`flex-1 py-2 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1 ${selectedHour === 'ALL' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          <span>📜</span> Todas
        </button>
        <button 
          onClick={() => setIsClockModalOpen(true)}
          className={`flex-1 py-2 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1 ${selectedHour !== 'ALL' ? 'bg-violet-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          <span>⌚</span> Filtrar x Hora
        </button>
      </div>

      <ClockPickerModal 
        isOpen={isClockModalOpen}
        onClose={() => setIsClockModalOpen(false)}
        onSelectHour={(date) => handleHourSelect(date)}
      />

      <div className="p-4 flex-1 overflow-y-auto bg-slate-100">
        {loading && (
          <div className="flex justify-center items-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        )}
        {!loading && transfers.length === 0 && (
          <div className="text-gray-500 text-center mt-10 p-6 bg-white rounded-xl shadow-sm border border-gray-200">
            <span className="text-4xl block mb-2">📭</span>
            No hay transferencias recientes.
          </div>
        )}
        
        {!loading && sortedGroupKeys.map(fullKey => {
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
        
        {!loading && hasMore && selectedHour === 'ALL' && transfers.length > 0 && (
          <div className="flex justify-center mt-4 mb-8">
            <button
              onClick={handleLoadMore}
              className="px-6 py-2 bg-indigo-100 text-indigo-700 font-bold rounded-xl shadow-sm hover:bg-indigo-200 hover:shadow-md transition-all active:scale-95"
            >
              Cargar más
            </button>
          </div>
        )}
      </div>
    </div>
    </div>
  );
};

export default BrebTransfersPanel;
