import React, { useState } from 'react';
import { openSession } from '../../../../api/cashRegisterAPI';
import { CashDenominationsModal } from './CashDenominationsModal';

interface CashRegisterOpeningProps {
  onOpened: () => void;
}

export const CashRegisterOpening: React.FC<CashRegisterOpeningProps> = ({ onOpened }) => {
  const [initialCash, setInitialCash] = useState<string>('');
  const [initialTransfer, setInitialTransfer] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCalculator, setShowCalculator] = useState(false);

  const handleOpen = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(initialCash);
    const transferAmount = parseFloat(initialTransfer);
    
    if (isNaN(amount) || amount < 0 || isNaN(transferAmount) || transferAmount < 0) {
      setError('Por favor ingresa montos válidos para abrir la caja.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await openSession(amount, transferAmount);
      onOpened();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al abrir la caja.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full animate-fadeIn">
      <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-6 text-center mb-6 shadow-sm">
        <span className="text-6xl mb-4 block">👋</span>
        <h3 className="text-xl font-bold text-emerald-900 mb-2">¡Hola! Es hora de abrir la caja</h3>
        <p className="text-sm text-emerald-700">Para comenzar a cobrar y registrar comandas, ingresa el efectivo base con el que inicias el turno.</p>
      </div>

      <form onSubmit={handleOpen} className="flex flex-col gap-4">
        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-xl border border-red-200 text-sm font-semibold">
            ❌ {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-bold text-gray-700">💰 Base Inicial en Efectivo</label>
              <button 
                type="button" 
                onClick={() => setShowCalculator(true)}
                className="text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded-lg font-bold hover:bg-emerald-200 transition-colors flex items-center gap-1 shadow-sm"
              >
                <span>🧮</span> Calcular Billetes
              </button>
            </div>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-lg">$</span>
              <input 
                type="number" 
                step="0.01"
                value={initialCash}
                onChange={(e) => setInitialCash(e.target.value)}
                className="w-full pl-8 pr-4 py-4 bg-white border-2 border-gray-300 rounded-xl text-xl font-bold text-gray-800 focus:border-teal-500 focus:ring-4 focus:ring-teal-100 outline-none transition-all shadow-sm"
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">📱 Base Inicial en Transferencias (Bancos)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-lg">$</span>
              <input 
                type="number" 
                step="0.01"
                value={initialTransfer}
                onChange={(e) => setInitialTransfer(e.target.value)}
                className="w-full pl-8 pr-4 py-4 bg-white border-2 border-gray-300 rounded-xl text-xl font-bold text-gray-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all shadow-sm"
                placeholder="0.00"
                required
              />
            </div>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={isSubmitting || initialCash === '' || initialTransfer === ''}
          className="w-full mt-4 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl hover:from-emerald-700 hover:to-teal-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSubmitting ? 'Abriendo...' : '🔓 Abrir Caja Ahora'}
        </button>
      </form>

      <CashDenominationsModal 
        isOpen={showCalculator} 
        onClose={() => setShowCalculator(false)} 
        onConfirm={(total) => setInitialCash(total.toString())} 
      />
    </div>
  );
};
