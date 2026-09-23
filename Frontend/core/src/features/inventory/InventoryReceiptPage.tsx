import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import toast, { Toaster } from 'react-hot-toast';
import type { RootState } from '../../app/store';
import {
  createInventoryReceipt,
  clearInventoryDraft,
  deleteInventoryReceipt,
  getInventoryDraft,
  getInventoryReceipts,
  getInventoryStock,
  updateInventoryReceipt,
  saveInventoryDraft,
  type InventoryReceipt,
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

const weightedUnits: InventoryUnit[] = ['kg', 'g', 'lb'];

const InventoryReceiptPage: React.FC = () => {
  const navigate = useNavigate();
  const { token, user } = useSelector((state: RootState) => state.auth);
  const [supplierName, setSupplierName] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<InventoryReceiptLinePayload[]>([emptyLine()]);
  const [isSaving, setIsSaving] = useState(false);
  const [stock, setStock] = useState<InventoryStock[]>([]);
  const [history, setHistory] = useState<InventoryReceipt[]>([]);
  const [activeView, setActiveView] = useState<'capture' | 'history'>('capture');
  const [editingReceiptId, setEditingReceiptId] = useState<string | null>(null);
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);
  const [draftStatus, setDraftStatus] = useState<'loading' | 'saved' | 'saving' | 'error'>('loading');

  const canManageReceipts = user?.role === 'cajero' || user?.role === 'admin';

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

  const loadHistory = async () => {
    if (!token) return;
    try {
      setHistory(await getInventoryReceipts(token));
    } catch {
      toast.error('No se pudo cargar el historial de entradas.');
    }
  };

  useEffect(() => {
    loadStock();
    loadHistory();

    if (!token) return;
    setIsDraftLoaded(false);
    setDraftStatus('loading');
    getInventoryDraft(token)
      .then((draft) => {
        if (draft) {
          setSupplierName(draft.supplier_name || '');
          setNotes(draft.notes || '');
          setLines(draft.lines?.length ? draft.lines : [emptyLine()]);
        }
        setIsDraftLoaded(true);
        setDraftStatus(draft ? 'saved' : 'saved');
      })
      .catch(() => {
        setIsDraftLoaded(true);
        setDraftStatus('error');
        toast.error('No se pudo recuperar el borrador guardado.');
      });
  }, [token]);

  useEffect(() => {
    if (!token || !isDraftLoaded || editingReceiptId) return;
    const timer = window.setTimeout(async () => {
      setDraftStatus('saving');
      try {
        await saveInventoryDraft({ supplier_name: supplierName, notes, lines }, token);
        setDraftStatus('saved');
      } catch {
        setDraftStatus('error');
      }
    }, 700);
    return () => window.clearTimeout(timer);
  }, [token, isDraftLoaded, editingReceiptId, supplierName, notes, lines]);

  const updateLine = (index: number, field: keyof InventoryReceiptLinePayload, value: string) => {
    setLines((current) => current.map((line, lineIndex) => {
      if (lineIndex !== index) return line;
      if (field === 'item_name') return { ...line, item_name: value };
      if (field === 'unit') return { ...line, unit: value as InventoryUnit, portions: undefined };
      return { ...line, [field]: Number(value) || 0 };
    }));
  };

  const updatePortion = (lineIndex: number, portionIndex: number, value: string) => {
    setLines((current) => current.map((line, index) => {
      if (index !== lineIndex) return line;
      const portions = [...(line.portions || [])];
      portions[portionIndex] = Number(value) || 0;
      return { ...line, portions, quantity: portions.reduce((sum, portion) => sum + portion, 0) };
    }));
  };

  const addPortion = (lineIndex: number) => {
    setLines((current) => current.map((line, index) => index === lineIndex
      ? { ...line, portions: [...(line.portions || []), 0] }
      : line));
  };

  const removePortion = (lineIndex: number, portionIndex: number) => {
    setLines((current) => current.map((line, index) => {
      if (index !== lineIndex) return line;
      const portions = (line.portions || []).filter((_, indexToRemove) => indexToRemove !== portionIndex);
      return { ...line, portions: portions.length ? portions : undefined, quantity: portions.reduce((sum, portion) => sum + portion, 0) };
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
      const payload = {
        supplier_name: supplierName.trim(),
        notes: notes.trim(),
        lines: lines.map((line) => ({ ...line, item_name: line.item_name.trim() })),
      };
      const receipt = editingReceiptId
        ? await updateInventoryReceipt(editingReceiptId, payload, token)
        : await createInventoryReceipt(payload, token);
      toast.success(editingReceiptId ? 'Entrada actualizada.' : `Recepción ${receipt.receipt_number} registrada.`);
      setSupplierName('');
      setNotes('');
      setLines([emptyLine()]);
      setEditingReceiptId(null);
      await clearInventoryDraft(token).catch(() => undefined);
      await loadStock();
      await loadHistory();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'No se pudo registrar la recepción.');
    } finally {
      setIsSaving(false);
    }
  };

  const startEditing = (receipt: InventoryReceipt) => {
    setEditingReceiptId(receipt.id);
    setSupplierName(receipt.supplier_name);
    setNotes(receipt.notes || '');
    setLines(receipt.lines.map((line) => ({
      item_name: line.item_name,
      quantity: line.quantity,
      portions: line.portions,
      unit: line.unit,
      unit_cost: line.unit_cost,
    })));
    setActiveView('capture');
  };

  const removeReceipt = async (receipt: InventoryReceipt) => {
    if (!token || !window.confirm(`¿Eliminar la entrada ${receipt.receipt_number}? Esta acción ajustará las existencias.`)) return;
    try {
      await deleteInventoryReceipt(receipt.id, token);
      toast.success('Entrada eliminada.');
      await loadStock();
      await loadHistory();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'No se pudo eliminar la entrada.');
    }
  };

  const cancelEditing = () => {
    setEditingReceiptId(null);
    setSupplierName('');
    setNotes('');
    setLines([emptyLine()]);
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
        <nav className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
          <button type="button" onClick={() => setActiveView('capture')} className={`rounded-lg px-4 py-2 text-sm font-semibold ${activeView === 'capture' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
            {editingReceiptId ? 'Editar entrada' : 'Nueva entrada'}
          </button>
          <button type="button" onClick={() => setActiveView('history')} className={`rounded-lg px-4 py-2 text-sm font-semibold ${activeView === 'history' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
            Historial <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{history.length}</span>
          </button>
          <span className="ml-auto px-2 text-xs font-medium uppercase tracking-wide text-slate-400">{canManageReceipts ? 'Vista completa' : 'Mis entradas'}</span>
          {activeView === 'capture' && <span className={`text-xs font-medium ${draftStatus === 'error' ? 'text-red-500' : 'text-slate-400'}`}>
            {draftStatus === 'loading' ? 'Cargando borrador...' : draftStatus === 'saving' ? 'Guardando borrador...' : draftStatus === 'error' ? 'Borrador sin guardar' : 'Borrador guardado'}
          </span>}
        </nav>

        {activeView === 'capture' && <>
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
                <label><span className="text-xs font-semibold text-slate-600">{line.portions?.length ? 'Total calculado' : 'Cantidad'}</span><input type="number" min="0" step="0.001" value={line.quantity || ''} onChange={(event) => updateLine(index, 'quantity', event.target.value)} readOnly={Boolean(line.portions?.length)} className="mt-1 w-full rounded-lg border-slate-300 read-only:bg-slate-100" /></label>
                <label><span className="text-xs font-semibold text-slate-600">Unidad</span><select value={line.unit} onChange={(event) => updateLine(index, 'unit', event.target.value)} className="mt-1 w-full rounded-lg border-slate-300">{units.map((unit) => <option key={unit.value} value={unit.value}>{unit.label}</option>)}</select></label>
                <label><span className="text-xs font-semibold text-slate-600">Costo unitario</span><input type="number" min="0" step="0.01" value={line.unit_cost || ''} onChange={(event) => updateLine(index, 'unit_cost', event.target.value)} className="mt-1 w-full rounded-lg border-slate-300" /></label>
                <button type="button" disabled={lines.length === 1} onClick={() => removeLine(index)} className="h-10 px-3 rounded-lg border border-red-200 text-red-600 disabled:opacity-30">Quitar</button>
                {weightedUnits.includes(line.unit) && <div className="md:col-span-5 rounded-lg border border-amber-200 bg-amber-50 p-3"><div className="flex items-center justify-between gap-3"><span className="text-xs font-semibold text-amber-900">Pesos parciales (opcional)</span><button type="button" onClick={() => addPortion(index)} className="text-xs font-bold text-amber-700">+ Añadir peso</button></div>{(line.portions || []).length === 0 ? <p className="mt-1 text-xs text-amber-800">Puedes capturar la cantidad total o dividirla en varios pesos.</p> : <div className="mt-2 flex flex-wrap gap-2">{line.portions?.map((portion, portionIndex) => <div key={portionIndex} className="flex items-center gap-1"><input type="number" min="0" step="0.001" value={portion || ''} onChange={(event) => updatePortion(index, portionIndex, event.target.value)} className="w-24 rounded-lg border-amber-300 bg-white" aria-label={`Peso parcial ${portionIndex + 1}`} /><button type="button" onClick={() => removePortion(index, portionIndex)} className="text-xs text-red-600" aria-label={`Quitar peso parcial ${portionIndex + 1}`}>Quitar</button></div>)}</div>}</div>}
                <p className="md:col-span-5 text-right text-sm font-semibold text-slate-600">Importe: ${(line.quantity * line.unit_cost).toFixed(2)}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-900 text-white rounded-xl p-5">
          <div><p className="text-sm text-slate-300">Total de la recepción</p><p className="text-3xl font-bold">${total.toFixed(2)}</p></div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            {editingReceiptId && <button type="button" onClick={cancelEditing} className="px-4 py-3 rounded-lg border border-slate-600 font-semibold">Cancelar</button>}
            <button type="submit" disabled={isSaving} className="px-6 py-3 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-60 font-bold">{isSaving ? 'Guardando...' : editingReceiptId ? 'Guardar cambios' : 'Registrar recepción'}</button>
          </div>
        </section>
        </>}

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

        {activeView === 'history' && <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-bold text-lg">Historial de entradas</h2>
            <p className="text-sm text-slate-500">Consulta cada recepción y revisa sus artículos y pesos parciales.</p>
          </div>
          {history.length === 0 ? <p className="p-5 text-sm text-slate-500">No hay entradas para mostrar.</p> : <div className="divide-y divide-slate-100">
            {history.map((receipt) => <article key={receipt.id} className="p-5 hover:bg-slate-50">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div><p className="font-bold text-slate-900">{receipt.receipt_number}</p><p className="text-sm text-slate-500">{new Date(receipt.created_at).toLocaleString()} {receipt.supplier_name && `· ${receipt.supplier_name}`}</p></div>
                <div className="flex items-center gap-3"><strong className="text-lg">${receipt.total.toFixed(2)}</strong>{canManageReceipts && <><button type="button" onClick={() => startEditing(receipt)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-white">Modificar</button><button type="button" onClick={() => removeReceipt(receipt)} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50">Eliminar</button></>}</div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">{receipt.lines.map((line) => <span key={line.id} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{line.item_name}: {line.quantity.toFixed(3)} {line.unit}{line.portions?.length ? ` (${line.portions.length} pesos)` : ''}</span>)}</div>
            </article>)}
          </div>}
        </section>}
      </form>
    </main>
  );
};

export default InventoryReceiptPage;