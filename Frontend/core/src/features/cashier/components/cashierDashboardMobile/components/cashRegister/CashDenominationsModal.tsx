import React, { useState, useEffect } from 'react';

interface CashDenominationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (total: number) => void;
  initialTotal?: number;
}

const DENOMINATIONS = [
  { value: 100000, label: '$100.000', type: 'bill' },
  { value: 50000, label: '$50.000', type: 'bill' },
  { value: 20000, label: '$20.000', type: 'bill' },
  { value: 10000, label: '$10.000', type: 'bill' },
  { value: 5000, label: '$5.000', type: 'bill' },
  { value: 2000, label: '$2.000', type: 'bill' },
  { value: 1000, label: '$1.000', type: 'bill' },
  { value: 1000, label: '$1.000', type: 'coin' },
  { value: 500, label: '$500', type: 'coin' },
  { value: 200, label: '$200', type: 'coin' },
  { value: 100, label: '$100', type: 'coin' },
  { value: 50, label: '$50', type: 'coin' },
];

export const CashDenominationsModal: React.FC<CashDenominationsModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (isOpen) {
      setCounts({});
    }
  }, [isOpen]);

  const handleCountChange = (index: number, qty: string) => {
    const val = parseInt(qty, 10);
    setCounts(prev => ({
      ...prev,
      [index]: isNaN(val) ? 0 : Math.max(0, val)
    }));
  };

  const total = DENOMINATIONS.reduce((sum, denom, i) => {
    return sum + (denom.value * (counts[i] || 0));
  }, 0);

  if (!isOpen) return null;

  const bills = DENOMINATIONS.map((d, i) => ({ ...d, originalIndex: i })).filter(d => d.type === 'bill');
  const coins = DENOMINATIONS.map((d, i) => ({ ...d, originalIndex: i })).filter(d => d.type === 'coin');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden animate-slideUp">
        
        {/* Header */}
        <div className="bg-emerald-600 p-4 text-white flex justify-between items-center shadow-md z-10">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <span>🧮</span> Calculadora de Billetes
            </h2>
            <p className="text-emerald-100 text-xs">Pesos Colombianos (COP)</p>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-emerald-500/50 flex items-center justify-center hover:bg-emerald-500 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50">
          
          {/* Total flotante interno */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-emerald-100 text-center sticky top-0 z-10">
            <p className="text-sm font-bold text-gray-500 mb-1">Total Calculado</p>
            <p className="text-3xl font-black text-emerald-600">${total.toLocaleString('es-CO')}</p>
          </div>

          {/* Billetes */}
          <div>
            <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2 border-b pb-2">
              <span>💵</span> Billetes
            </h3>
            <div className="space-y-2">
              {bills.map((denom) => (
                <div key={`bill-${denom.originalIndex}`} className="flex items-center justify-between bg-white p-2 rounded-lg border border-gray-100 shadow-sm">
                  <span className="font-bold text-gray-700 w-24">{denom.label}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 font-bold">x</span>
                    <input
                      type="number"
                      min="0"
                      value={counts[denom.originalIndex] || ''}
                      onChange={(e) => handleCountChange(denom.originalIndex, e.target.value)}
                      className="w-20 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-center font-bold text-gray-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
                      placeholder="0"
                    />
                    <span className="w-24 text-right font-bold text-emerald-700 text-sm">
                      ${((counts[denom.originalIndex] || 0) * denom.value).toLocaleString('es-CO')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Monedas */}
          <div>
            <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2 border-b pb-2 mt-4">
              <span>🪙</span> Monedas
            </h3>
            <div className="space-y-2">
              {coins.map((denom) => (
                <div key={`coin-${denom.originalIndex}`} className="flex items-center justify-between bg-white p-2 rounded-lg border border-gray-100 shadow-sm">
                  <span className="font-bold text-gray-700 w-24">{denom.label}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 font-bold">x</span>
                    <input
                      type="number"
                      min="0"
                      value={counts[denom.originalIndex] || ''}
                      onChange={(e) => handleCountChange(denom.originalIndex, e.target.value)}
                      className="w-20 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-center font-bold text-gray-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
                      placeholder="0"
                    />
                    <span className="w-24 text-right font-bold text-emerald-700 text-sm">
                      ${((counts[denom.originalIndex] || 0) * denom.value).toLocaleString('es-CO')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-white p-4 border-t border-gray-100 flex gap-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <button
            onClick={() => setCounts({})}
            className="px-4 py-3 bg-red-50 text-red-600 font-bold rounded-xl text-sm hover:bg-red-100 transition-colors"
          >
            Limpiar
          </button>
          <button
            onClick={() => {
              onConfirm(total);
              onClose();
            }}
            className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm shadow-md hover:bg-emerald-700 transition-all active:scale-95"
          >
            Confirmar ${total.toLocaleString('es-CO')}
          </button>
        </div>

      </div>
    </div>
  );
};
