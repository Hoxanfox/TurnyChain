import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import toast, { Toaster } from 'react-hot-toast';
import type { RootState } from '../../app/store';
import {
  createInventoryReceipt,
  getInventoryStock,
  type InventoryStock,
  type InventoryReceiptLinePayload,
  type InventoryUnit,
} from './api/inventoryReceiptsAPI';

const units: { value: InventoryUnit; label: string }[] = [
  { value: 'kg', label: 'Kilogramos (kg)' },
  { value: 'g', label: 'Gramos (g)' },
  { value: 'lb', label: 'Libras (lb)' },
  { value: 'unidad', label: 'Unidades' },
  { value: 'caja', label: 'Cajas' },
];

const emptyLine = (): InventoryReceiptLinePayload => ({
  item_name: '',
  quantity: 0,
  unit: 'kg',
  unit_cost: 0,
});

const InventoryReceiptPage: React.FC = () => {
  const navigate = useNavigate();
  const { token, user } = useSelector((state: RootState) => state.auth);
  const [supplierName, setSupplierName] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<InventoryReceiptLinePayload[]>([emptyLine()]);
  const [isSaving, setIsSaving] = useState(false);
  const [stock, setStock] = useState<InventoryStock[]>([]);

  const total = useMemo(
    () => lines.reduce((sum, line) => sum + line.quantity * line.unit_cost, 0),
    [lines]
  );

  const loadStock = async () => {
    if (!token) return;
    try {
      setStock(await getInventoryStock(token));
    } catch {
      toast.error('No se pudieron cargar las existencias.');
    }
  };

  useEffect(() => {
    loadStock();
  }, [token]);

  const updateLine = (index: number, field: keyof InventoryReceiptLinePayload, value: string) => {
    setLines((current) => current.map((line, lineIndex) => {
      if (lineIndex !== index) return line;
      if (field === 'item_name' || field === 'unit') return { ...line, [field]: value } as InventoryReceiptLinePayload;
      return { ...line, [field]: Number(value) || 0 };
    }));
  };

  const removeLine = (index: number) => {
    setLines((current) => current.length === 1 ? current : current.filter((_, lineIndex) => lineIndex !== index));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;
    if (lines.some((line) => !line.item_name.trim() || line.quantity <= 0 || line.unit_cost < 0)) {
      toast.error('Completa cada artículo con una cantidad válida.');
      return;
    }

    setIsSaving(true);
    try {
      const receipt = await createInventoryReceipt({
        supplier_name: supplierName.trim(),
        notes: notes.trim(),
        lines: lines.map((line) => ({ ...line, item_name: line.item_name.trim() })),
      }, token);
      toast.success(`Recepción ${receipt.receipt_number} registrada.`);
      setSupplierName('');
      setNotes('');
      setLines([emptyLine()]);
      await loadStock();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'No se pudo registrar la recepción.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <Toaster position="top-right" />
      <header className="bg-slate-900 text-white px-5 py-4 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-amber-300">Recepción interna</p>
            <h1 className="text-2xl font-bold">Registrar mercancía</h1>
            <p className="text-sm text-slate-300 mt-1">Captura cortes completos, pesos parciales o artículos por unidad.</p>
          </div>
          <button type="button" onClick={() => navigate('/dashboard')} className="px-4 py-2 rounded-lg border border-slate-600 hover:bg-slate-800 text-sm font-semibold">
            Volver al panel
          </button>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="max-w-6xl mx-auto p-5 space-y-5">
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 grid md:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Proveedor</span>
            <input value={supplierName} onChange={(event) => setSupplierName(event.target.value)} placeholder="Nombre del proveedor" className="mt-1 w-full rounded-lg border-slate-300 focus:border-amber-500 focus:ring-amber-500" />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Registrado por</span>
            <input value={`${user?.username || 'Usuario'} (${user?.role || ''})`} readOnly className="mt-1 w-full rounded-lg border-slate-200 bg-slate-50 text-slate-500" />
          </label>
          <label className="block md:col-span-2">
            <span className="text-sm font-semibold text-slate-700">Notas</span>
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} placeholder="Observaciones de la entrega" className="mt-1 w-full rounded-lg border-slate-300 focus:border-amber-500 focus:ring-amber-500" />
          </label>
        </section>

        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-lg">Artículos recibidos</h2>
              <p className="text-sm text-slate-500">Agrega otra línea para cada peso parcial del mismo corte.</p>
            </div>
            <button type="button" onClick={() => setLines((current) => [...current, emptyLine()])} className="px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm">+ Agregar línea</button>
          </div>
          <div className="p-5 space-y-3">
            {lines.map((line, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-[minmax(0,2fr)_1fr_1.2fr_1.2fr_auto] gap-3 items-end p-3 rounded-lg bg-slate-50 border border-slate-200">
                <label><span className="text-xs font-semibold text-slate-600">Artículo o corte</span><input value={line.item_name} onChange={(event) => updateLine(index, 'item_name', event.target.value)} placeholder="Ej. Arrachera" className="mt-1 w-full rounded-lg border-slate-300" /></label>
                <label><span className="text-xs font-semibold text-slate-600">Cantidad</span><input type="number" min="0" step="0.001" value={line.quantity || ''} onChange={(event) => updateLine(index, 'quantity', event.target.value)} className="mt-1 w-full rounded-lg border-slate-300" /></label>
                <label><span className="text-xs font-semibold text-slate-600">Unidad</span><select value={line.unit} onChange={(event) => updateLine(index, 'unit', event.target.value)} className="mt-1 w-full rounded-lg border-slate-300">{units.map((unit) => <option key={unit.value} value={unit.value}>{unit.label}</option>)}</select></label>
                <label><span className="text-xs font-semibold text-slate-600">Costo unitario</span><input type="number" min="0" step="0.01" value={line.unit_cost || ''} onChange={(event) => updateLine(index, 'unit_cost', event.target.value)} className="mt-1 w-full rounded-lg border-slate-300" /></label>
                <button type="button" disabled={lines.length === 1} onClick={() => removeLine(index)} className="h-10 px-3 rounded-lg border border-red-200 text-red-600 disabled:opacity-30">Quitar</button>
                <p className="md:col-span-5 text-right text-sm font-semibold text-slate-600">Importe: ${(line.quantity * line.unit_cost).toFixed(2)}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-900 text-white rounded-xl p-5">
          <div><p className="text-sm text-slate-300">Total de la recepción</p><p className="text-3xl font-bold">${total.toFixed(2)}</p></div>
          <button type="submit" disabled={isSaving} className="px-6 py-3 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-60 font-bold">{isSaving ? 'Registrando...' : 'Registrar recepción'}</button>
        </section>

        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h2 className="font-bold text-lg">Existencias registradas</h2>
            <p className="text-sm text-slate-500">El acumulado se separa por unidad para conservar la medida capturada.</p>
          </div>
          {stock.length === 0 ? (
            <p className="p-5 text-sm text-slate-500">Todavía no hay mercancía registrada.</p>
          ) : (
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 text-left text-slate-500"><tr><th className="px-5 py-3">Artículo</th><th className="px-5 py-3">Cantidad</th><th className="px-5 py-3">Unidad</th><th className="px-5 py-3 text-right">Costo acumulado</th></tr></thead><tbody className="divide-y divide-slate-100">{stock.map((item) => <tr key={`${item.item_name}-${item.unit}`}><td className="px-5 py-3 font-semibold">{item.item_name}</td><td className="px-5 py-3">{item.quantity.toFixed(3)}</td><td className="px-5 py-3 uppercase">{item.unit}</td><td className="px-5 py-3 text-right">${item.total_cost.toFixed(2)}</td></tr>)}</tbody></table></div>
          )}
        </section>
      </form>
    </main>
  );
};

export default InventoryReceiptPage;