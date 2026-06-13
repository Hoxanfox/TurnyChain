import React, { useState, useRef } from 'react';
import type { CashRegisterSessionDetails } from '../../../../api/cashRegisterAPI';
import { addExpense } from '../../../../api/cashRegisterAPI';

interface CashRegisterActiveProps {
  details: CashRegisterSessionDetails;
  onExpenseAdded: () => void;
  onGoToClosing: () => void;
}

export const CashRegisterActive: React.FC<CashRegisterActiveProps> = ({ details, onExpenseAdded, onGoToClosing }) => {
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseFile, setExpenseFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(expenseAmount);
    if (isNaN(amount) || amount <= 0 || !expenseDesc.trim()) return;

    setIsSubmitting(true);
    try {
      await addExpense(amount, expenseDesc, expenseFile || undefined);
      setExpenseAmount('');
      setExpenseDesc('');
      setExpenseFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      onExpenseAdded();
    } catch (error) {
      console.error('Error adding expense', error);
      alert('Error al registrar gasto. Inténtalo de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Resumen en vivo */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-indigo-50 border-b border-indigo-100 px-4 py-3">
          <p className="text-xs font-bold text-indigo-800 uppercase tracking-wide">Resumen del Turno</p>
        </div>
        <div className="p-4 grid grid-cols-2 gap-3 text-sm">
          <div className="bg-gray-50 rounded-lg p-2 text-center border border-gray-100">
            <p className="text-xs text-gray-500 mb-1">Base Inicial</p>
            <p className="font-bold text-gray-800">${details.session?.initial_cash.toLocaleString('es-CO')}</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-2 text-center border border-blue-100">
            <p className="text-xs text-blue-600 mb-1">Ventas Transferencia</p>
            <p className="font-bold text-blue-800">${details.total_transfer.toLocaleString('es-CO')}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-2 text-center border border-green-100">
            <p className="text-xs text-green-600 mb-1">Ventas Efectivo</p>
            <p className="font-bold text-green-800">+ ${details.total_cash_sales.toLocaleString('es-CO')}</p>
          </div>
          <div className="bg-red-50 rounded-lg p-2 text-center border border-red-100">
            <p className="text-xs text-red-600 mb-1">Gastos Realizados</p>
            <p className="font-bold text-red-800">- ${details.total_expenses.toLocaleString('es-CO')}</p>
          </div>
          <div className="col-span-2 bg-emerald-100 rounded-lg p-3 text-center border border-emerald-200 mt-1">
            <p className="text-sm font-bold text-emerald-800 mb-1">Efectivo Esperado en Caja</p>
            <p className="text-3xl font-extrabold text-emerald-900">${details.expected_cash.toLocaleString('es-CO')}</p>
          </div>
        </div>
      </div>

      {/* Agregar Gasto */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-red-50 border-b border-red-100 px-4 py-3">
          <p className="text-xs font-bold text-red-800 uppercase tracking-wide flex items-center gap-1">
            <span>💸</span> Registrar Gasto
          </p>
        </div>
        <form onSubmit={handleAddExpense} className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Monto del gasto ($)</label>
            <input 
              type="number" 
              step="0.01"
              value={expenseAmount}
              onChange={(e) => setExpenseAmount(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm font-semibold focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none"
              placeholder="0.00"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Descripción / Motivo</label>
            <input 
              type="text" 
              value={expenseDesc}
              onChange={(e) => setExpenseDesc(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm font-semibold focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none"
              placeholder="Ej: Pago a proveedores, Insumos..."
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Recibo (Opcional)</label>
            <input 
              type="file" 
              ref={fileInputRef}
              accept="image/*"
              capture="environment"
              onChange={(e) => setExpenseFile(e.target.files ? e.target.files[0] : null)}
              className="w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100 cursor-pointer"
            />
          </div>
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full mt-2 py-2 bg-red-600 text-white rounded-lg font-bold text-sm shadow-md hover:bg-red-700 transition-all disabled:opacity-50"
          >
            {isSubmitting ? 'Registrando...' : 'Agregar Gasto'}
          </button>
        </form>
      </div>

      {/* Lista de gastos */}
      {details.expenses && details.expenses.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
           <div className="bg-gray-50 border-b border-gray-200 px-4 py-2">
             <p className="text-xs font-bold text-gray-600">Historial de Gastos ({details.expenses.length})</p>
           </div>
           <div className="max-h-40 overflow-y-auto p-2 space-y-2">
             {details.expenses.map((exp) => (
               <div key={exp.id} className="p-2 border border-gray-100 rounded-lg flex justify-between items-center text-sm">
                 <div>
                   <p className="font-semibold text-gray-800">{exp.description}</p>
                   <p className="text-xs text-gray-500">{new Date(exp.created_at).toLocaleTimeString()}</p>
                 </div>
                 <div className="text-right">
                   <p className="font-bold text-red-600">-${exp.amount.toLocaleString('es-CO')}</p>
                   {exp.image_path && <span className="text-[10px] bg-gray-100 text-gray-600 px-1 py-0.5 rounded">📸 Recibo</span>}
                 </div>
               </div>
             ))}
           </div>
        </div>
      )}

      {/* Botón de Ir a Cerrar */}
      <div className="pt-2">
        <button
          onClick={onGoToClosing}
          className="w-full py-3 bg-gray-800 text-white rounded-xl font-bold text-sm shadow-md hover:bg-gray-900 transition-all"
        >
          🔒 Iniciar Cierre de Caja
        </button>
      </div>
    </div>
  );
};
