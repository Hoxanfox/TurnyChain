import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import toast, { Toaster } from 'react-hot-toast';
import { FiArrowLeft, FiCalendar, FiFolder, FiPackage, FiPlus, FiRefreshCw } from 'react-icons/fi';
import type { RootState } from '../../app/store';
import { getInventoryReceipts, type InventoryReceipt } from './api/inventoryReceiptsAPI';

const formatMoney = (value: number) => `$${value.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatQuantity = (value: number) => value.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
const formatDate = (value: string) => new Date(value).toLocaleString('es-CO', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const InventoryReceiptHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const token = useSelector((state: RootState) => state.auth.token);
  const [receipts, setReceipts] = useState<InventoryReceipt[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadReceipts = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      setReceipts(await getInventoryReceipts(token));
    } catch {
      toast.error('No se pudo cargar el historial de recepciones.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReceipts();
  }, [token]);

  return (
    <main className="min-h-screen bg-[#f4f1ea] px-4 py-5 text-slate-900 sm:px-6 lg:px-8">
      <Toaster position="top-right" />
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-col justify-between gap-4 rounded-[1.35rem] border border-[#e2dcd0] bg-[#fbfaf7] p-5 shadow-[0_8px_24px_rgba(0,0,0,0.06)] sm:flex-row sm:items-end sm:p-8">
          <div>
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[#a26c32]"><FiFolder /> Archivo de mercancía</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-[#27313a] sm:text-3xl">Historial de recepciones</h1>
            <p className="mt-2 max-w-2xl text-sm text-[#69747c]">Cada folder conserva sus productos, cantidades, proveedor y valor sin mezclarse con la existencia acumulada.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => navigate('/inventory/receipts/new')} className="inline-flex items-center gap-2 rounded-lg bg-[#2563eb] px-4 py-2.5 text-sm font-black text-white hover:bg-[#1d4ed8]"><FiPlus /> Nueva recepción</button>
            <button type="button" onClick={() => navigate('/dashboard')} aria-label="Volver al panel" className="rounded-lg border border-[#d9d0c2] p-3 text-[#59636a] hover:bg-[#f1ede6]"><FiArrowLeft /></button>
          </div>
        </header>

        {isLoading ? (
          <div className="rounded-xl border border-[#e2dcd0] bg-white px-5 py-16 text-center text-sm font-bold text-[#69747c]"><FiRefreshCw className="mx-auto mb-3 animate-spin text-2xl text-[#2563eb]" />Cargando folders...</div>
        ) : receipts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#cfc6ba] bg-[#fbfaf7] px-5 py-16 text-center"><FiPackage className="mx-auto mb-3 text-3xl text-[#aa9f92]" /><p className="font-black text-[#69747c]">Todavía no hay recepciones</p><p className="mt-1 text-sm text-[#8b918f]">Los folders enviados desde recepción aparecerán aquí.</p></div>
        ) : (
          <div className="space-y-5">
            {receipts.map((receipt) => (
              <article key={receipt.id} className="overflow-hidden rounded-xl border border-[#e2dcd0] bg-white shadow-[0_6px_18px_rgba(45,55,65,0.07)]">
                <header className="flex flex-col justify-between gap-3 border-b border-[#edf0f2] bg-[#fbfaf7] px-5 py-4 sm:flex-row sm:items-center sm:px-6">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-[#a26c32]">Folder {receipt.receipt_number}</p>
                    <h2 className="mt-1 text-lg font-black text-[#27313a]">{receipt.supplier_name || 'Proveedor sin especificar'}</h2>
                    <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-[#69747c]"><FiCalendar /> {formatDate(receipt.created_at)}</p>
                  </div>
                  <div className="text-left sm:text-right"><p className="text-xs font-bold uppercase tracking-wide text-[#8b918f]">Total recibido</p><p className="text-xl font-black tabular-nums text-[#27313a]">{formatMoney(receipt.total)}</p></div>
                </header>
                <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3 sm:p-6">
                  {receipt.lines.map((line) => (
                    <div key={line.id} className="rounded-lg border border-[#e5e8ea] border-l-4 border-l-[#2563eb] bg-[#f8fafb] p-4">
                      <p className="font-black text-[#27313a]">{line.item_name}</p>
                      <p className="mt-2 text-lg font-black tabular-nums text-[#44515a]">{formatQuantity(line.quantity)} {line.unit}</p>
                      <div className="mt-3 flex items-center justify-between border-t border-[#e5e8ea] pt-2 text-xs"><span className="font-semibold text-[#69747c]">Costo unitario</span><strong className="tabular-nums text-[#27313a]">{formatMoney(line.unit_cost)}</strong></div>
                    </div>
                  ))}
                </div>
                {receipt.notes && <p className="border-t border-[#edf0f2] px-5 py-4 text-sm text-[#59636a] sm:px-6"><span className="font-black text-[#27313a]">Notas:</span> {receipt.notes}</p>}
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
};

export default InventoryReceiptHistoryPage;
