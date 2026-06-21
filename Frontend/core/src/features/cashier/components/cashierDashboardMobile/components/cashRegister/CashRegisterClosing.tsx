import React, { useState } from 'react';
import type { CashRegisterClosingDetails } from '../../api/cashRegisterApi';
import { closeSession } from '../../api/cashRegisterApi';
import { CashDenominationsModal } from './CashDenominationsModal';

interface CashRegisterClosingProps {
  details: CashRegisterClosingDetails;
  onClosed: () => void;
  onCancel: () => void;
}

export const CashRegisterClosing: React.FC<CashRegisterClosingProps> = ({ details, onClosed, onCancel }) => {
  const [actualCash, setActualCash] = useState<string>('');
  const [actualTransfer, setActualTransfer] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [closedData, setClosedData] = useState<any>(null);
  const [showCalculator, setShowCalculator] = useState(false);

  const handleClose = async (e: React.FormEvent) => {
    e.preventDefault();
    const cashAmount = parseFloat(actualCash);
    const transferAmount = parseFloat(actualTransfer);
    
    if (isNaN(cashAmount) || cashAmount < 0 || isNaN(transferAmount) || transferAmount < 0) return;

    setIsSubmitting(true);
    try {
      const result = await closeSession(cashAmount, transferAmount);
      setClosedData(result);
      onClosed();
    } catch (error) {
      console.error('Error closing session', error);
      alert('Error al cerrar la caja. Inténtalo de nuevo.');
      setIsSubmitting(false);
    }
  };

  if (closedData) {
    const isCashDiscrepancy = closedData.discrepancy !== 0;
    const isTransferDiscrepancy = closedData.transfer_discrepancy !== 0;
    const hasDiscrepancy = isCashDiscrepancy || isTransferDiscrepancy;

    return (
      <div className="flex flex-col h-full items-center justify-center animate-fadeIn text-center space-y-4 py-8">
        <span className="text-6xl">{hasDiscrepancy ? '⚠️' : '✅'}</span>
        <h3 className="text-2xl font-bold text-gray-800">Caja Cerrada</h3>
        
        <div className="w-full space-y-3 mt-4">
          <div className={`p-3 rounded-xl border ${isCashDiscrepancy ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'} flex justify-between items-center`}>
            <span className="text-sm font-semibold">Efectivo</span>
            <span className={`text-lg font-bold ${isCashDiscrepancy ? 'text-orange-600' : 'text-green-600'}`}>
              {closedData.discrepancy > 0 ? '+' : ''}{closedData.discrepancy.toLocaleString('es-CO')}
            </span>
          </div>

          <div className={`p-3 rounded-xl border ${isTransferDiscrepancy ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'} flex justify-between items-center`}>
            <span className="text-sm font-semibold">Transferencias</span>
            <span className={`text-lg font-bold ${isTransferDiscrepancy ? 'text-orange-600' : 'text-green-600'}`}>
              {closedData.transfer_discrepancy > 0 ? '+' : ''}{closedData.transfer_discrepancy.toLocaleString('es-CO')}
            </span>
          </div>
        </div>

        <p className="text-sm text-gray-500 mt-4">Volviendo al panel...</p>
      </div>
    );
  }

  const cashNum = parseFloat(actualCash);
  const transferNum = parseFloat(actualTransfer);
  const currentCashDiscrepancy = isNaN(cashNum) ? 0 : cashNum - details.expected_cash;
  const currentTransferDiscrepancy = isNaN(transferNum) ? 0 : transferNum - details.total_transfer;

  return (
    <div className="space-y-4 animate-fadeIn pb-6">
      <div className="text-center mb-2">
        <h3 className="text-lg font-bold text-gray-800">Cierre Operativo</h3>
        <p className="text-xs text-gray-500">Comprueba los montos físicos contra el sistema.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Resumen Esperado Efectivo */}
        <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-200">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold text-emerald-800">EFECTIVO<br/>ESPERADO</span>
            <span className="bg-emerald-200 text-emerald-800 text-[10px] px-1.5 py-0.5 rounded font-bold">
              {details.cash_orders_count} ord.
            </span>
          </div>
          <p className="text-xl font-black text-emerald-900">${details.expected_cash.toLocaleString('es-CO')}</p>
        </div>

        {/* Resumen Esperado Transferencias */}
        <div className="bg-blue-50 rounded-xl p-3 border border-blue-200">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold text-blue-800">TRANSFERENCIAS<br/>ESPERADAS</span>
            <span className="bg-blue-200 text-blue-800 text-[10px] px-1.5 py-0.5 rounded font-bold">
              {details.transfer_orders_count} ord.
            </span>
          </div>
          <p className="text-xl font-black text-blue-900">${details.total_transfer.toLocaleString('es-CO')}</p>
        </div>
      </div>

      <form onSubmit={handleClose} className="space-y-4 mt-4">
        {/* Input Efectivo */}
        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-bold text-gray-700">💰 Efectivo Físico Contado</label>
            <button 
              type="button" 
              onClick={() => setShowCalculator(true)}
              className="text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded-lg font-bold hover:bg-emerald-200 transition-colors flex items-center gap-1 shadow-sm"
            >
              <span>🧮</span> Calcular Billetes
            </button>
          </div>
          <div className="relative mb-2">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
            <input 
              type="number" 
              step="0.01"
              value={actualCash}
              onChange={(e) => setActualCash(e.target.value)}
              className="w-full pl-7 pr-3 py-3 bg-gray-50 border border-gray-300 rounded-lg text-lg font-bold text-gray-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
              placeholder="0.00"
              required
            />
          </div>
          {actualCash && !isNaN(cashNum) && (
            <div className={`text-xs font-bold px-2 py-1 rounded ${currentCashDiscrepancy === 0 ? 'text-green-700 bg-green-50' : currentCashDiscrepancy < 0 ? 'text-red-700 bg-red-50' : 'text-orange-700 bg-orange-50'}`}>
              Descuadre: {currentCashDiscrepancy > 0 ? '+' : ''}{currentCashDiscrepancy.toLocaleString('es-CO')}
            </div>
          )}
        </div>

        {/* Input Transferencias */}
        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
          <label className="block text-sm font-bold text-gray-700 mb-2">📱 Suma en Apps Bancarias</label>
          <div className="relative mb-2">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
            <input 
              type="number" 
              step="0.01"
              value={actualTransfer}
              onChange={(e) => setActualTransfer(e.target.value)}
              className="w-full pl-7 pr-3 py-3 bg-gray-50 border border-gray-300 rounded-lg text-lg font-bold text-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
              placeholder="0.00"
              required
            />
          </div>
          {actualTransfer && !isNaN(transferNum) && (
            <div className={`text-xs font-bold px-2 py-1 rounded ${currentTransferDiscrepancy === 0 ? 'text-green-700 bg-green-50' : currentTransferDiscrepancy < 0 ? 'text-red-700 bg-red-50' : 'text-orange-700 bg-orange-50'}`}>
              Descuadre: {currentTransferDiscrepancy > 0 ? '+' : ''}{currentTransferDiscrepancy.toLocaleString('es-CO')}
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <button 
            type="button" 
            onClick={onCancel}
            disabled={isSubmitting}
            className="w-1/3 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-300 transition-all disabled:opacity-50"
          >
            Volver
          </button>
          <button 
            type="submit" 
            disabled={isSubmitting || actualCash === '' || actualTransfer === ''}
            className="w-2/3 py-3 bg-gray-900 text-white rounded-xl font-bold text-sm shadow-md hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? 'Cerrando...' : '🔒 Confirmar Cierre'}
          </button>
        </div>
      </form>

      <CashDenominationsModal 
        isOpen={showCalculator} 
        onClose={() => setShowCalculator(false)} 
        onConfirm={(total) => setActualCash(total.toString())} 
      />
    </div>
  );
};
