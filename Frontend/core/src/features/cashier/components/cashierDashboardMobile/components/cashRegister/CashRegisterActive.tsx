import React, { useState, useRef } from 'react';
import type { CashRegisterSessionDetails } from '../../api/cashRegisterApi';
import { addExpense } from '../../api/cashRegisterApi';

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

  const isPendingClose = details.session?.status === 'pending_close';

  return (
    <div className="space-y-5 animate-fadeIn">
      {isPendingClose && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl shadow-sm">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-xl">⚠️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-bold text-red-800">Cierre de caja pendiente</h3>
              <div className="mt-1 text-xs text-red-700">
                <p>Tienes un cierre pendiente del día anterior. Por favor, realiza el arqueo antes de continuar con las operaciones del día.</p>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Resumen en vivo */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-indigo-50 border-b border-indigo-100 px-4 py-3">
          <p className="text-xs font-bold text-indigo-800 uppercase tracking-wide">Resumen del Turno</p>
        </div>
        <div className="p-4 space-y-4 text-sm">
          {/* Bases Iniciales */}
          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 grid grid-cols-2 gap-2">
            <div className="text-center border-r border-gray-200">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">Base Efectivo</p>
              <p className="font-extrabold text-gray-800">${details.session?.initial_cash.toLocaleString('es-CO')}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">Base Transferencia</p>
              <p className="font-extrabold text-gray-800">${details.session?.initial_transfer.toLocaleString('es-CO')}</p>
            </div>
          </div>

          {/* Ventas Netas y Órdenes */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-green-50 rounded-xl p-3 border border-green-100 flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-bold text-green-700 uppercase tracking-wide">Ventas Efectivo</p>
                <p className="text-lg font-black text-green-900">+${details.total_cash_sales.toLocaleString('es-CO')}</p>
              </div>
              {details.cash_orders_count !== undefined && (
                <span className="mt-2 text-[10px] bg-green-200 text-green-800 px-1.5 py-0.5 rounded font-bold self-start">
                  {details.cash_orders_count} ord. pagadas
                </span>
              )}
            </div>

            <div className="bg-blue-50 rounded-xl p-3 border border-blue-100 flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wide">Ventas Transferencia</p>
                <p className="text-lg font-black text-blue-900">+${(details.total_transfer - (details.session?.initial_transfer || 0)).toLocaleString('es-CO')}</p>
              </div>
              {details.transfer_orders_count !== undefined && (
                <span className="mt-2 text-[10px] bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded font-bold self-start">
                  {details.transfer_orders_count} ord. pagadas
                </span>
              )}
            </div>
          </div>

          {/* Resumen de gastos y mixtos */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-red-50 rounded-xl p-3 border border-red-100">
              <p className="text-[10px] font-bold text-red-700 uppercase tracking-wide">Gastos Realizados</p>
              <p className="text-base font-extrabold text-red-900">-${details.total_expenses.toLocaleString('es-CO')}</p>
              <span className="mt-1.5 text-[10px] bg-red-200 text-red-800 px-1.5 py-0.5 rounded font-bold inline-block">
                {details.expenses?.length || 0} gastos
              </span>
            </div>

            <div className="bg-purple-50 rounded-xl p-3 border border-purple-100 flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-bold text-purple-700 uppercase tracking-wide">Órdenes Mixtas</p>
                <p className="text-base font-extrabold text-purple-900">
                  {details.mixed_orders_count || 0}
                </p>
              </div>
              <span className="text-[10px] text-purple-600 font-semibold mt-1">
                Efectivo + Transferencia
              </span>
            </div>
          </div>

          {/* Totales en Caja y Banco */}
          <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-gray-200">
            <div className="bg-emerald-100 rounded-xl p-3 text-center border border-emerald-200 shadow-sm">
              <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wide">Efectivo Esperado</p>
              <p className="text-xl font-black text-emerald-900">${details.expected_cash.toLocaleString('es-CO')}</p>
            </div>
            <div className="bg-sky-100 rounded-xl p-3 text-center border border-sky-200 shadow-sm">
              <p className="text-[10px] font-bold text-sky-800 uppercase tracking-wide">Transferencias en Banco</p>
              <p className="text-xl font-black text-sky-900">${details.total_transfer.toLocaleString('es-CO')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Agregar Gasto */}
      {!isPendingClose && (
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
      )}

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
          className={`w-full py-3 rounded-xl font-bold text-sm shadow-md transition-all ${
            isPendingClose 
              ? 'bg-red-600 text-white hover:bg-red-700 animate-pulse' 
              : 'bg-gray-800 text-white hover:bg-gray-900'
          }`}
        >
          🔒 {isPendingClose ? 'Realizar Arqueo Pendiente' : 'Iniciar Cierre de Caja'}
        </button>
      </div>
    </div>
  );
};
