import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import toast, { Toaster } from 'react-hot-toast';
import { FiArrowLeft, FiCheck, FiChevronDown, FiEdit3, FiFolder, FiInfo, FiPackage, FiPaperclip, FiPlus, FiSend, FiTrash2 } from 'react-icons/fi';
import type { RootState } from '../../app/store';
import {
  createInventoryReceipt,
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

type ReceiptDraftLine = InventoryReceiptLinePayload & { portion_details: string; weighings: number[] };

const emptyDraftLine = (): ReceiptDraftLine => ({ ...emptyLine(), portion_details: '', weighings: [] });

const formatMoney = (value: number) => `$${value.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatQuantity = (value: number) => value.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
const parseDecimalInput = (value: string) => Number(value.replace(',', '.')) || 0;

const categoryTone = (itemName: string) => {
  const name = itemName.toLowerCase();
  if (/carne|panceta|pollo|res|cerdo|pescado/.test(name)) return 'border-l-rose-500';
  if (/tomate|cebolla|lechuga|verdura|fruta/.test(name)) return 'border-l-emerald-500';
  return 'border-l-sky-500';
};

const InventoryReceiptPage: React.FC = () => {
  const navigate = useNavigate();
  const { token, user } = useSelector((state: RootState) => state.auth);
  const [supplierName, setSupplierName] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<ReceiptDraftLine[]>([emptyDraftLine()]);
  const [isSaving, setIsSaving] = useState(false);
  const [activeLineIndex, setActiveLineIndex] = useState(0);
  const [showPortionDetails, setShowPortionDetails] = useState(false);
  const [mobileStep, setMobileStep] = useState<0 | 1 | 2 | 3 | 4 | 5 | 6>(3);
  const [weighingInput, setWeighingInput] = useState('');

  const total = useMemo(
    () => lines.reduce((sum, line) => sum + line.quantity * line.unit_cost, 0),
    [lines]
  );

  const activeLine = lines[activeLineIndex] || emptyDraftLine();
  const committedLines = lines.filter((line, index) => index !== activeLineIndex && line.item_name.trim());
  const activeLineTotal = activeLine.quantity * activeLine.unit_cost;

  const updateLine = (index: number, field: keyof ReceiptDraftLine, value: string) => {
    setLines((current) => current.map((line, lineIndex) => {
      if (lineIndex !== index) return line;
      if (field === 'item_name' || field === 'unit' || field === 'portion_details') return { ...line, [field]: value };
      return { ...line, [field]: parseDecimalInput(value) };
    }));
  };

  const removeLine = (index: number) => {
    setLines((current) => current.length === 1 ? [emptyDraftLine()] : current.filter((_, lineIndex) => lineIndex !== index));
    setActiveLineIndex((current) => current > index ? current - 1 : Math.min(current, Math.max(0, lines.length - 2)));
  };

  const addToRail = () => {
    if (!activeLine.item_name.trim() || activeLine.quantity <= 0 || activeLine.unit_cost < 0) {
      toast.error('Completa nombre, cantidad y costo antes de agregar la comanda.');
      return;
    }
    setLines((current) => [...current, emptyDraftLine()]);
    setActiveLineIndex(lines.length);
    setShowPortionDetails(false);
  };

  const selectLine = (index: number) => {
    setActiveLineIndex(index);
    setShowPortionDetails(Boolean(lines[index]?.portion_details));
    setWeighingInput('');
    setMobileStep(4);
  };

  const addWeighing = () => {
    const weighing = parseDecimalInput(weighingInput);
    if (weighing <= 0) {
      toast.error('Ingresa un peso mayor a cero para esta bolsa.');
      return;
    }
    setLines((current) => current.map((line, index) => index !== activeLineIndex ? line : {
      ...line,
      weighings: [...line.weighings, weighing],
      quantity: line.quantity + weighing,
    }));
    setWeighingInput('');
  };

  const removeWeighing = (weighingIndex: number) => {
    setLines((current) => current.map((line, index) => {
      if (index !== activeLineIndex) return line;
      const weighings = line.weighings.filter((_, index) => index !== weighingIndex);
      return { ...line, weighings, quantity: weighings.reduce((sum, value) => sum + value, 0) };
    }));
  };

  const openMobileSummary = () => {
    if (committedLines.length === 0) {
      toast.error('Agrega al menos un artículo para ver el resumen.');
      return;
    }
    setMobileStep(6);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;
    const receiptLines = lines.filter((line) => line.item_name.trim());
    if (receiptLines.length === 0 || receiptLines.some((line) => line.quantity <= 0 || line.unit_cost < 0)) {
      toast.error('Completa cada artículo con una cantidad válida.');
      return;
    }

    setIsSaving(true);
    try {
      const portionNotes = receiptLines
        .filter((line) => line.portion_details.trim() || line.weighings.length > 0)
        .map((line) => {
          const weights = line.weighings.length > 0 ? `Pesajes: ${line.weighings.map((value) => `${formatQuantity(value)} ${line.unit}`).join(', ')}` : '';
          return `${line.item_name.trim()}: ${[weights, line.portion_details.trim()].filter(Boolean).join(' | ')}`;
        })
        .join('\n');
      const receipt = await createInventoryReceipt({
        supplier_name: supplierName.trim(),
        notes: [notes.trim(), portionNotes ? `Detalles de porcionadura:\n${portionNotes}` : ''].filter(Boolean).join('\n\n'),
        lines: receiptLines.map(({ portion_details, weighings, ...line }) => ({ ...line, item_name: line.item_name.trim() })),
      }, token);
      toast.success(`Recepción ${receipt.receipt_number} registrada.`);
      setSupplierName('');
      setNotes('');
      setLines([emptyDraftLine()]);
      setActiveLineIndex(0);
      setShowPortionDetails(false);
      setMobileStep(3);
      setWeighingInput('');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'No se pudo registrar la recepción.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f4f1ea] text-slate-900">
      <Toaster position="top-right" />
      <form onSubmit={handleSubmit} className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[1.35rem] border border-[#e2dcd0] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
          <header className="relative hidden border-b border-[#e2dcd0] bg-[#fbfaf7] px-5 py-5 sm:px-8 lg:block">
            <div className="absolute left-8 top-0 h-2 w-28 rounded-b-full bg-[#d9d0c2]" />
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div><p className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#a26c32]"><FiFolder /> Folder de recepción</p><h1 className="text-2xl font-black tracking-tight text-[#27313a] sm:text-3xl">Recepción de inventario</h1><p className="mt-1 text-sm text-[#69747c]">Arma la entrega una comanda a la vez.</p></div>
              <div className="flex flex-wrap gap-2 self-start sm:self-auto"><button type="button" onClick={() => navigate('/inventory/receipts/history')} className="rounded-lg border border-[#2563eb] px-3 py-2 text-sm font-bold text-[#2563eb] transition hover:bg-[#eef4ff]">Ver historial</button><button type="button" onClick={() => navigate('/dashboard')} className="rounded-lg border border-[#d9d0c2] px-3 py-2 text-sm font-semibold text-[#59636a] transition hover:bg-[#f1ede6]">Volver al panel</button></div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2"><label className="block"><span className="text-xs font-bold uppercase tracking-wide text-[#69747c]">Proveedor</span><input value={supplierName} onChange={(event) => setSupplierName(event.target.value)} placeholder="Ej. Carnes S.A." className="mt-1 w-full rounded-lg border-[#d9dfe3] bg-white px-3 py-2.5 focus:border-[#2563eb] focus:ring-[#2563eb]" /></label><label className="block"><span className="text-xs font-bold uppercase tracking-wide text-[#69747c]">Recibe</span><input value={`${user?.username || 'Usuario'} (${user?.role || ''})`} readOnly className="mt-1 w-full rounded-lg border-[#e6e8e9] bg-[#f3f5f6] px-3 py-2.5 text-[#69747c]" /></label></div>
          </header>
          <header className="border-b border-[#e2dcd0] bg-[#fbfaf7] px-4 py-5 lg:hidden">
            <div className="flex items-start justify-between gap-3"><div><p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-[#a26c32]"><FiFolder /> Folder de recepción</p><h1 className="mt-1 text-2xl font-black tracking-tight text-[#27313a]">Nueva recepción</h1></div><button type="button" onClick={() => navigate('/dashboard')} aria-label="Volver al panel" className="rounded-lg border border-[#d9d0c2] p-2 text-[#59636a]"><FiArrowLeft /></button></div>
            <div className="mt-5 flex items-center gap-2"><div className={`h-2 flex-1 rounded-full ${mobileStep >= 0 ? 'bg-[#2563eb]' : 'bg-[#dfe5e9]'}`} /><div className={`h-2 flex-1 rounded-full ${mobileStep >= 1 ? 'bg-[#2563eb]' : 'bg-[#dfe5e9]'}`} /><div className={`h-2 flex-1 rounded-full ${mobileStep >= 2 ? 'bg-[#2563eb]' : 'bg-[#dfe5e9]'}`} /></div><div className="mt-2 flex justify-between text-[11px] font-bold text-[#69747c]"><span>Datos</span><span>Ítem</span><span>Resumen</span></div>
          </header>
          <div className="hidden lg:block">
          <div className="grid lg:grid-cols-[minmax(0,1fr)_21rem]">
            <section className="min-w-0 border-b border-[#e2dcd0] p-5 sm:p-8 lg:border-b-0 lg:border-r">
              <div className="mb-6 flex items-center justify-between gap-3"><div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#a26c32]"><FiPaperclip /> Hoja activa</p><h2 className="mt-1 text-xl font-black text-[#27313a]">{activeLine.item_name || 'Nuevo artículo'}</h2></div><span className="rounded-full bg-[#eef4ff] px-3 py-1 text-xs font-bold text-[#2563eb]">{activeLineIndex + 1} / {lines.length}</span></div>
              <div className="relative rounded-xl border border-[#e3e8eb] bg-white p-5 shadow-[0_8px_20px_rgba(45,55,65,0.06)] sm:p-7"><div className="pointer-events-none absolute inset-x-0 top-16 space-y-10 opacity-60"><div className="border-t border-[#edf0f2]" /><div className="border-t border-[#edf0f2]" /><div className="border-t border-[#edf0f2]" /><div className="border-t border-[#edf0f2]" /></div><div className="relative space-y-5"><label className="block"><span className="text-sm font-bold text-[#44515a]">Producto o corte</span><input autoFocus value={activeLine.item_name} onChange={(event) => updateLine(activeLineIndex, 'item_name', event.target.value)} placeholder="Ej. Panceta" className="mt-2 w-full rounded-lg border-[#cfd8de] bg-white px-4 py-3 text-lg font-semibold focus:border-[#2563eb] focus:ring-[#2563eb]" /></label><div className="grid gap-4 sm:grid-cols-2"><label className="block"><span className="text-sm font-bold text-[#44515a]">Cantidad</span><input type="number" min="0" step="0.001" value={activeLine.quantity || ''} onChange={(event) => updateLine(activeLineIndex, 'quantity', event.target.value)} placeholder="0.00" className="mt-2 w-full rounded-lg border-[#cfd8de] px-4 py-3 text-lg font-semibold focus:border-[#2563eb] focus:ring-[#2563eb]" /></label><label className="block"><span className="text-sm font-bold text-[#44515a]">Unidad</span><select value={activeLine.unit} onChange={(event) => updateLine(activeLineIndex, 'unit', event.target.value)} className="mt-2 w-full rounded-lg border-[#cfd8de] bg-white px-4 py-3 text-lg font-semibold focus:border-[#2563eb] focus:ring-[#2563eb]">{units.map((unit) => <option key={unit.value} value={unit.value}>{unit.label}</option>)}</select></label></div><div className="grid items-end gap-4 sm:grid-cols-[1fr_auto]"><label className="block"><span className="text-sm font-bold text-[#44515a]">Costo unitario</span><div className="relative mt-2"><span className="absolute left-4 top-3 text-[#69747c]">$</span><input type="number" min="0" step="0.01" value={activeLine.unit_cost || ''} onChange={(event) => updateLine(activeLineIndex, 'unit_cost', event.target.value)} placeholder="0.00" className="w-full rounded-lg border-[#cfd8de] py-3 pl-8 pr-4 text-lg font-semibold focus:border-[#2563eb] focus:ring-[#2563eb]" /></div></label><div className="rounded-lg bg-[#f5f7f8] px-4 py-3 sm:min-w-44"><p className="text-xs font-bold uppercase tracking-wide text-[#69747c]">Importe</p><p className="text-xl font-black text-[#27313a]">{formatMoney(activeLineTotal)}</p></div></div><div className="border-t border-[#edf0f2] pt-4"><button type="button" onClick={() => setShowPortionDetails((current) => !current)} className="flex items-center gap-2 text-sm font-bold text-[#2563eb]">{showPortionDetails ? <FiChevronDown className="rotate-180" /> : <FiChevronDown />} Porciones / detalles de porcionadura</button>{showPortionDetails && <textarea value={activeLine.portion_details} onChange={(event) => updateLine(activeLineIndex, 'portion_details', event.target.value)} rows={3} placeholder="Ej. Porcionar en bolsas de 500 g" className="mt-3 w-full rounded-lg border-[#cfd8de] px-3 py-2 focus:border-[#2563eb] focus:ring-[#2563eb]" />}</div></div></div>
              <div className="mt-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><button type="button" onClick={() => removeLine(activeLineIndex)} disabled={lines.length === 1} className="inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-[#b44949] transition hover:bg-[#fff1f1] disabled:cursor-not-allowed disabled:opacity-30"><FiTrash2 /> Quitar hoja</button><button type="button" onClick={addToRail} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#2563eb] px-5 py-3 font-bold text-white shadow-sm transition hover:bg-[#1d4ed8] active:scale-[0.98]"><FiPlus /> Minimizar a comandera</button></div>
            </section>
            <aside className="bg-[#f7f4ee] p-5 sm:p-6"><div className="mb-5 flex items-start justify-between gap-3"><div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-[#a26c32]"><FiPackage /> Riel de comandas</p><h2 className="mt-1 text-xl font-black text-[#27313a]">{committedLines.length} ítems</h2></div><div className="text-right"><p className="text-xs font-semibold text-[#69747c]">Total</p><p className="text-lg font-black text-[#27313a]">{formatMoney(total)}</p></div></div><div className="relative space-y-3 before:absolute before:bottom-2 before:left-3 before:top-2 before:w-1 before:rounded-full before:bg-[#c9c0b4] before:shadow-inner">{committedLines.length === 0 ? <div className="rounded-xl border border-dashed border-[#cfc6ba] bg-[#fbfaf7] px-5 py-10 text-center"><FiPaperclip className="mx-auto mb-3 text-2xl text-[#aa9f92]" /><p className="text-sm font-semibold text-[#69747c]">Riel vacío</p><p className="mt-1 text-xs leading-5 text-[#8b918f]">Completa la hoja para agregar el primer ítem.</p></div> : committedLines.map((line) => { const index = lines.indexOf(line); return <button type="button" key={index} onClick={() => selectLine(index)} className={`group relative ml-5 block w-[calc(100%-1.25rem)] border-l-4 ${categoryTone(line.item_name)} rounded-r-lg bg-white p-4 text-left shadow-[0_3px_10px_rgba(45,55,65,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_16px_rgba(45,55,65,0.14)]`}><span className="absolute -left-[1.7rem] top-5 h-3 w-3 rounded-full border-2 border-[#bdb3a7] bg-[#f7f4ee]" /><span className="block truncate pr-5 font-bold text-[#27313a]">{line.item_name}</span><span className="mt-2 flex items-center justify-between gap-2 text-xs text-[#69747c]"><span className="rounded-full bg-[#eef2f4] px-2 py-1 font-bold">{line.quantity} {line.unit}</span><strong className="text-[#44515a]">{formatMoney(line.quantity * line.unit_cost)}</strong></span><FiEdit3 className="absolute right-3 top-4 text-[#b4bdc2] opacity-0 transition group-hover:opacity-100" /></button>; })}</div></aside>
          </div>
          <footer className="flex flex-col justify-between gap-4 border-t border-[#e2dcd0] bg-[#fbfaf7] px-5 py-5 sm:flex-row sm:items-center sm:px-8"><label className="block sm:max-w-xl"><span className="text-xs font-bold uppercase tracking-wide text-[#69747c]">Notas de entrega</span><input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Observaciones generales de la recepción" className="mt-1 w-full rounded-lg border-[#d9dfe3] bg-white px-3 py-2.5 focus:border-[#2563eb] focus:ring-[#2563eb]" /></label><button type="submit" disabled={isSaving} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#10b981] px-6 py-3 font-black text-white shadow-sm transition hover:bg-[#059669] disabled:cursor-wait disabled:opacity-60"><FiSend /> {isSaving ? 'Registrando...' : 'Enviar folder completo'}</button></footer>
          </div>
          <div className="lg:hidden">
            {mobileStep === 6 && <div className="space-y-5 bg-[#fbfaf7] p-4"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-[#a26c32]">Paso 3 de 3</p><h2 className="mt-1 text-xl font-black text-[#27313a]">Resumen completo</h2><p className="mt-1 text-sm text-[#69747c]">Confirma cantidades, pesajes y costos antes de enviar.</p></div><div className="rounded-xl border border-[#e2e7e9] bg-white p-4 shadow-sm"><div className="grid grid-cols-2 gap-4"><div><p className="text-[10px] font-black uppercase tracking-wide text-[#8b918f]">Proveedor / empresa</p><p className="mt-1 font-black text-[#27313a]">{supplierName || 'Sin especificar'}</p></div><div><p className="text-[10px] font-black uppercase tracking-wide text-[#8b918f]">Fecha</p><p className="mt-1 font-bold text-[#44515a]">{new Date().toLocaleDateString('es-CO')}</p></div><div><p className="text-[10px] font-black uppercase tracking-wide text-[#8b918f]">Recibe</p><p className="mt-1 font-bold text-[#44515a]">{user?.username || 'Usuario'}</p></div><div><p className="text-[10px] font-black uppercase tracking-wide text-[#8b918f]">Ítems</p><p className="mt-1 font-bold tabular-nums text-[#44515a]">{lines.filter((line) => line.item_name.trim()).length}</p></div></div>{notes.trim() && <div className="mt-4 border-t border-[#edf0f2] pt-3"><p className="text-[10px] font-black uppercase tracking-wide text-[#8b918f]">Notas de entrega</p><p className="mt-1 whitespace-pre-wrap text-sm text-[#59636a]">{notes}</p></div>}</div><div className="space-y-3">{lines.filter((line) => line.item_name.trim()).map((line) => { const index = lines.indexOf(line); return <div key={index} className={`rounded-xl border-l-4 ${categoryTone(line.item_name)} border border-[#e2e7e9] bg-white p-4 shadow-sm`}><div className="flex items-start justify-between gap-3"><div><p className="text-lg font-black text-[#27313a]">{line.item_name}</p><p className="mt-1 text-sm font-bold uppercase tracking-wide text-[#8b918f]">Unidad: {line.unit}</p></div><button type="button" onClick={() => selectLine(index)} aria-label={`Editar ${line.item_name}`} className="rounded-lg p-2 text-[#2563eb] hover:bg-[#eef4ff]"><FiEdit3 /></button></div><div className="mt-4 grid grid-cols-3 gap-2 rounded-lg bg-[#f5f7f8] p-3"><div><p className="text-[10px] font-bold uppercase text-[#8b918f]">Cantidad</p><p className="mt-1 text-sm font-black tabular-nums text-[#27313a]">{formatQuantity(line.quantity)} {line.unit}</p></div><div><p className="text-[10px] font-bold uppercase text-[#8b918f]">Bolsas</p><p className="mt-1 text-sm font-black tabular-nums text-[#27313a]">{line.weighings.length || 1}</p></div><div><p className="text-[10px] font-bold uppercase text-[#8b918f]">Costo unit.</p><p className="mt-1 text-sm font-black tabular-nums text-[#27313a]">{formatMoney(line.unit_cost)}</p></div></div><div className="mt-3"><p className="text-xs font-black uppercase tracking-wide text-[#8b918f]">Detalle de pesajes</p>{line.weighings.length > 0 ? <div className="mt-2 grid grid-cols-2 gap-2">{line.weighings.map((weight, weighingIndex) => <div key={`${weight}-${weighingIndex}`} className="rounded-lg border border-[#edf0f2] px-3 py-2 text-xs font-bold tabular-nums text-[#59636a]">Bolsa {weighingIndex + 1}<br /><span className="text-sm text-[#27313a]">{formatQuantity(weight)} {line.unit}</span></div>)}</div> : <p className="mt-1 text-sm text-[#69747c]">Peso total ingresado manualmente.</p>}</div>{line.portion_details.trim() && <div className="mt-3 rounded-lg border border-[#f1e4c9] bg-[#fff9eb] p-3"><p className="text-xs font-black uppercase tracking-wide text-[#a26c32]">Porcionadura</p><p className="mt-1 text-sm text-[#59636a]">{line.portion_details}</p></div>}<div className="mt-4 flex items-center justify-between border-t border-[#edf0f2] pt-3"><span className="text-sm font-bold text-[#69747c]">Subtotal del producto</span><strong className="text-lg font-black tabular-nums text-[#27313a]">{formatMoney(line.quantity * line.unit_cost)}</strong></div></div>; })}</div><div className="rounded-xl bg-[#27313a] p-4 text-white"><div className="flex items-center justify-between"><span className="text-sm font-semibold text-[#dce4e7]">Total de la recepción</span><strong className="text-2xl font-black tabular-nums">{formatMoney(total)}</strong></div></div><div className="grid grid-cols-2 gap-3"><button type="button" onClick={() => setMobileStep(4)} className="rounded-xl border border-[#d9dfe3] px-3 py-3 font-bold text-[#59636a]">Editar pesajes</button><button type="submit" disabled={isSaving} className="flex items-center justify-center gap-2 rounded-xl bg-[#10b981] px-3 py-3 font-black text-white disabled:opacity-60"><FiCheck /> {isSaving ? 'Enviando...' : 'Enviar folder'}</button></div></div>}
            {mobileStep === 3 && <div className="space-y-5 bg-[#fbfaf7] p-4"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-[#a26c32]">Paso 1 de 3</p><h2 className="mt-1 text-xl font-black text-[#27313a]">Datos de la entrega</h2><p className="mt-1 text-sm text-[#69747c]">Identifica el folder antes de registrar los pesajes.</p></div><label className="block"><span className="text-sm font-bold text-[#44515a]">Proveedor / empresa</span><input value={supplierName} onChange={(event) => setSupplierName(event.target.value)} placeholder="Ej. Carnes S.A." className="mt-2 w-full rounded-xl border-[#cfd8de] px-4 py-3 text-base focus:border-[#2563eb] focus:ring-[#2563eb]" /></label><div className="rounded-xl border border-[#e5e8ea] bg-[#f5f7f8] p-4"><p className="text-xs font-bold uppercase tracking-wide text-[#69747c]">Recibe</p><p className="mt-1 font-bold text-[#27313a]">{user?.username || 'Usuario'}</p><p className="text-sm text-[#69747c]">{user?.role || 'Personal autorizado'}</p></div><label className="block"><span className="text-sm font-bold text-[#44515a]">Notas de entrega <span className="font-normal text-[#8b918f]">(opcional)</span></span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} placeholder="Factura, observaciones o condiciones" className="mt-2 w-full rounded-xl border-[#cfd8de] px-4 py-3 focus:border-[#2563eb] focus:ring-[#2563eb]" /></label><button type="button" onClick={() => setMobileStep(4)} className="w-full rounded-xl bg-[#2563eb] px-5 py-3.5 font-black text-white shadow-sm">Continuar con los ítems</button></div>}
            {mobileStep === 4 && <div className="space-y-5 bg-[#fbfaf7] p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-[#a26c32]">Paso 2 de 3</p><h2 className="mt-1 text-xl font-black text-[#27313a]">Pesajes del ítem</h2><p className="mt-1 text-sm text-[#69747c]">Agrega cada bolsa por separado. El total se suma automáticamente.</p></div><span className="rounded-full bg-[#eef4ff] px-3 py-1 text-xs font-black text-[#2563eb]">{committedLines.length} guardados</span></div><div className="rounded-xl border border-[#e3e8eb] bg-white p-4 shadow-[0_5px_15px_rgba(45,55,65,0.06)]"><label className="block"><span className="text-sm font-bold text-[#44515a]">Producto o corte</span><input autoFocus value={activeLine.item_name} onChange={(event) => updateLine(activeLineIndex, 'item_name', event.target.value)} placeholder="Ej. Bondiola" className="mt-2 w-full rounded-xl border-[#cfd8de] px-4 py-3 text-lg font-semibold focus:border-[#2563eb] focus:ring-[#2563eb]" /></label><div className="mt-4 grid grid-cols-[1.2fr_.8fr] gap-3"><label className="block"><span className="text-sm font-bold text-[#44515a]">Peso de esta bolsa</span><input type="text" inputMode="decimal" value={weighingInput} onChange={(event) => setWeighingInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addWeighing(); } }} placeholder="0,000" className="mt-2 w-full rounded-xl border-[#cfd8de] px-3 py-3 text-lg font-black tabular-nums focus:border-[#2563eb] focus:ring-[#2563eb]" /></label><label className="block"><span className="text-sm font-bold text-[#44515a]">Unidad</span><select value={activeLine.unit} onChange={(event) => updateLine(activeLineIndex, 'unit', event.target.value)} className="mt-2 w-full rounded-xl border-[#cfd8de] bg-white px-3 py-3 text-base font-bold focus:border-[#2563eb] focus:ring-[#2563eb]">{units.map((unit) => <option key={unit.value} value={unit.value}>{unit.value}</option>)}</select></label></div><button type="button" onClick={addWeighing} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-[#2563eb] px-4 py-3 font-black text-[#2563eb]"><FiPlus /> Agregar pesaje</button><div className="mt-4 rounded-xl bg-[#f5f7f8] p-3"><div className="flex items-center justify-between"><span className="text-sm font-bold text-[#69747c]">Pesajes registrados</span><strong className="text-lg font-black tabular-nums text-[#27313a]">{formatQuantity(activeLine.quantity)} {activeLine.unit}</strong></div>{activeLine.weighings.length === 0 ? <p className="mt-2 text-xs text-[#8b918f]">Aún no hay bolsas registradas.</p> : <div className="mt-3 flex flex-wrap gap-2">{activeLine.weighings.map((weight, index) => <button type="button" key={`${weight}-${index}`} onClick={() => removeWeighing(index)} className="rounded-full bg-white px-3 py-1.5 text-sm font-bold tabular-nums text-[#44515a] shadow-sm">Bolsa {index + 1}: {formatQuantity(weight)} {activeLine.unit} ×</button>)}</div>}</div><label className="mt-4 block"><span className="text-sm font-bold text-[#44515a]">Costo unitario</span><div className="relative mt-2"><span className="absolute left-4 top-3 text-[#69747c]">$</span><input type="text" inputMode="decimal" value={activeLine.unit_cost || ''} onChange={(event) => updateLine(activeLineIndex, 'unit_cost', event.target.value)} placeholder="0,00" className="w-full rounded-xl border-[#cfd8de] py-3 pl-8 pr-4 text-lg font-black tabular-nums focus:border-[#2563eb] focus:ring-[#2563eb]" /></div></label><div className="mt-4 flex items-center justify-between rounded-xl bg-[#27313a] px-4 py-3 text-white"><span className="text-sm font-semibold text-[#dce4e7]">Total del ítem</span><strong className="text-xl font-black tabular-nums">{formatMoney(activeLineTotal)}</strong></div><button type="button" onClick={() => setShowPortionDetails((current) => !current)} className="mt-4 flex items-center gap-2 text-sm font-bold text-[#2563eb]"><FiChevronDown className={showPortionDetails ? 'rotate-180' : ''} /> Porcionadura / detalle</button>{showPortionDetails && <textarea value={activeLine.portion_details} onChange={(event) => updateLine(activeLineIndex, 'portion_details', event.target.value)} rows={2} placeholder="Ej. Bolsas de 500 g" className="mt-3 w-full rounded-xl border-[#cfd8de] px-3 py-2 focus:border-[#2563eb] focus:ring-[#2563eb]" />}</div><button type="button" onClick={addToRail} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2563eb] px-5 py-3.5 font-black text-white shadow-sm"><FiPlus /> Guardar ítem y capturar otro</button><div className="grid grid-cols-2 gap-3"><button type="button" onClick={() => setMobileStep(3)} className="rounded-xl border border-[#d9dfe3] px-4 py-3 font-bold text-[#59636a]">Atrás</button><button type="button" onClick={openMobileSummary} className="rounded-xl border border-[#2563eb] px-4 py-3 font-bold text-[#2563eb]">Ver resumen</button></div></div>}
            {mobileStep === 5 && <div className="space-y-5 bg-[#fbfaf7] p-4"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-[#a26c32]">Paso 3 de 3</p><h2 className="mt-1 text-xl font-black text-[#27313a]">Resumen de pesajes</h2><p className="mt-1 text-sm text-[#69747c]">Cada producto queda consolidado y conserva sus bolsas.</p></div><div className="rounded-xl border border-[#e5e8ea] bg-[#f7f8f8] p-4"><p className="text-xs font-bold uppercase tracking-wide text-[#69747c]">Proveedor / empresa</p><p className="font-black text-[#27313a]">{supplierName || 'Sin especificar'}</p><p className="mt-2 text-xs font-bold uppercase tracking-wide text-[#69747c]">Recibe y fecha</p><p className="font-semibold text-[#44515a]">{user?.username || 'Usuario'} · {new Date().toLocaleDateString('es-CO')}</p></div><div className="space-y-3">{lines.filter((line) => line.item_name.trim()).map((line) => { const index = lines.indexOf(line); return <div key={index} className={`rounded-xl border-l-4 ${categoryTone(line.item_name)} border border-[#e5e8ea] bg-white p-4 shadow-sm`}><div className="flex items-start justify-between gap-3"><div><p className="font-black text-[#27313a]">{line.item_name}</p><p className="mt-1 text-base font-black tabular-nums text-[#44515a]">Total: {formatQuantity(line.quantity)} {line.unit}</p>{line.weighings.length > 0 && <div className="mt-2 space-y-1 text-xs font-semibold text-[#69747c]">{line.weighings.map((weight, weighingIndex) => <p key={`${weight}-${weighingIndex}`}>Bolsa {weighingIndex + 1}: {formatQuantity(weight)} {line.unit}</p>)}</div>}</div><button type="button" onClick={() => selectLine(index)} aria-label={`Editar ${line.item_name}`} className="rounded-lg p-2 text-[#2563eb] hover:bg-[#eef4ff]"><FiEdit3 /></button></div><div className="mt-3 flex items-center justify-between border-t border-[#edf0f2] pt-3"><span className="text-sm font-bold text-[#69747c]">Importe</span><strong className="tabular-nums text-[#27313a]">{formatMoney(line.quantity * line.unit_cost)}</strong></div></div>; })}</div><div className="rounded-xl bg-[#27313a] p-4 text-white"><div className="flex items-center justify-between"><span className="text-sm font-semibold text-[#dce4e7]">Total de la recepción</span><strong className="text-2xl font-black tabular-nums">{formatMoney(total)}</strong></div></div><button type="button" onClick={() => { setActiveLineIndex(lines.length - 1); setWeighingInput(''); setMobileStep(4); }} className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#2563eb] px-5 py-3 font-black text-[#2563eb]"><FiPlus /> Agregar otro ítem</button><div className="grid grid-cols-2 gap-3"><button type="button" onClick={() => setMobileStep(4)} className="rounded-xl border border-[#d9dfe3] px-3 py-3 font-bold text-[#59636a]">Editar pesajes</button><button type="submit" disabled={isSaving} className="flex items-center justify-center gap-2 rounded-xl bg-[#10b981] px-3 py-3 font-black text-white disabled:opacity-60"><FiCheck /> {isSaving ? 'Enviando...' : 'Enviar folder'}</button></div></div>}
            {mobileStep === 0 && <div className="space-y-5 p-4"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-[#a26c32]">Paso 1 de 3</p><h2 className="mt-1 text-xl font-black text-[#27313a]">Datos de la entrega</h2><p className="mt-1 text-sm text-[#69747c]">Identifica el folder antes de agregar los pesos.</p></div><label className="block"><span className="text-sm font-bold text-[#44515a]">Proveedor / empresa</span><input value={supplierName} onChange={(event) => setSupplierName(event.target.value)} placeholder="Ej. Carnes S.A." className="mt-2 w-full rounded-xl border-[#cfd8de] px-4 py-3 text-base focus:border-[#2563eb] focus:ring-[#2563eb]" /></label><div className="rounded-xl border border-[#e5e8ea] bg-[#f5f7f8] p-4"><p className="text-xs font-bold uppercase tracking-wide text-[#69747c]">Recibe</p><p className="mt-1 font-bold text-[#27313a]">{user?.username || 'Usuario'}</p><p className="text-sm text-[#69747c]">{user?.role || 'Personal autorizado'}</p></div><label className="block"><span className="text-sm font-bold text-[#44515a]">Notas de entrega <span className="font-normal text-[#8b918f]">(opcional)</span></span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} placeholder="Factura, observaciones o condiciones" className="mt-2 w-full rounded-xl border-[#cfd8de] px-4 py-3 focus:border-[#2563eb] focus:ring-[#2563eb]" /></label><button type="button" onClick={() => setMobileStep(1)} className="w-full rounded-xl bg-[#2563eb] px-5 py-3.5 font-black text-white shadow-sm">Continuar con los ítems</button></div>}
            {mobileStep === 1 && <div className="space-y-5 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-[#a26c32]">Paso 2 de 3</p><h2 className="mt-1 text-xl font-black text-[#27313a]">Agregar ítem</h2><p className="mt-1 text-sm text-[#69747c]">Los pesos parciales se guardan con hasta tres decimales.</p></div><span className="rounded-full bg-[#eef4ff] px-3 py-1 text-xs font-black text-[#2563eb]">{committedLines.length} guardados</span></div><div className="rounded-xl border border-[#e3e8eb] bg-white p-4 shadow-[0_5px_15px_rgba(45,55,65,0.06)]"><label className="block"><span className="text-sm font-bold text-[#44515a]">Producto o corte</span><input autoFocus value={activeLine.item_name} onChange={(event) => updateLine(activeLineIndex, 'item_name', event.target.value)} placeholder="Ej. Panceta" className="mt-2 w-full rounded-xl border-[#cfd8de] px-4 py-3 text-lg font-semibold focus:border-[#2563eb] focus:ring-[#2563eb]" /></label><div className="mt-4 grid grid-cols-[1.15fr_.85fr] gap-3"><label className="block"><span className="text-sm font-bold text-[#44515a]">Cantidad</span><input type="number" min="0" step="0.001" inputMode="decimal" value={activeLine.quantity || ''} onChange={(event) => updateLine(activeLineIndex, 'quantity', event.target.value)} placeholder="0,000" className="mt-2 w-full rounded-xl border-[#cfd8de] px-3 py-3 text-lg font-black tabular-nums focus:border-[#2563eb] focus:ring-[#2563eb]" /></label><label className="block"><span className="text-sm font-bold text-[#44515a]">Unidad</span><select value={activeLine.unit} onChange={(event) => updateLine(activeLineIndex, 'unit', event.target.value)} className="mt-2 w-full rounded-xl border-[#cfd8de] bg-white px-3 py-3 text-base font-bold focus:border-[#2563eb] focus:ring-[#2563eb]">{units.map((unit) => <option key={unit.value} value={unit.value}>{unit.value}</option>)}</select></label></div><label className="mt-4 block"><span className="text-sm font-bold text-[#44515a]">Costo unitario</span><div className="relative mt-2"><span className="absolute left-4 top-3 text-[#69747c]">$</span><input type="number" min="0" step="0.01" inputMode="decimal" value={activeLine.unit_cost || ''} onChange={(event) => updateLine(activeLineIndex, 'unit_cost', event.target.value)} placeholder="0,00" className="w-full rounded-xl border-[#cfd8de] py-3 pl-8 pr-4 text-lg font-black tabular-nums focus:border-[#2563eb] focus:ring-[#2563eb]" /></div></label><div className="mt-4 flex items-center justify-between rounded-xl bg-[#f5f7f8] px-4 py-3"><span className="text-sm font-bold text-[#69747c]">Total del ítem</span><strong className="text-xl font-black tabular-nums text-[#27313a]">{formatMoney(activeLineTotal)}</strong></div><button type="button" onClick={() => setShowPortionDetails((current) => !current)} className="mt-4 flex items-center gap-2 text-sm font-bold text-[#2563eb]"><FiChevronDown className={showPortionDetails ? 'rotate-180' : ''} /> Porcionadura / detalle</button>{showPortionDetails && <textarea value={activeLine.portion_details} onChange={(event) => updateLine(activeLineIndex, 'portion_details', event.target.value)} rows={2} placeholder="Ej. Bolsas de 500 g" className="mt-3 w-full rounded-xl border-[#cfd8de] px-3 py-2 focus:border-[#2563eb] focus:ring-[#2563eb]" />}</div><button type="button" onClick={addToRail} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2563eb] px-5 py-3.5 font-black text-white shadow-sm"><FiPlus /> Guardar ítem y capturar otro</button><div className="grid grid-cols-2 gap-3"><button type="button" onClick={() => setMobileStep(0)} className="rounded-xl border border-[#d9dfe3] px-4 py-3 font-bold text-[#59636a]">Atrás</button><button type="button" onClick={openMobileSummary} className="rounded-xl border border-[#2563eb] px-4 py-3 font-bold text-[#2563eb]">Ver resumen</button></div></div>}
            {mobileStep === 2 && <div className="space-y-5 p-4"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-[#a26c32]">Paso 3 de 3</p><h2 className="mt-1 text-xl font-black text-[#27313a]">Resumen del folder</h2><p className="mt-1 text-sm text-[#69747c]">Revisa la empresa, los pesos y el total antes de registrar.</p></div><div className="rounded-xl border border-[#e5e8ea] bg-[#f7f8f8] p-4"><div className="flex items-start gap-3"><FiInfo className="mt-0.5 text-[#2563eb]" /><div><p className="text-xs font-bold uppercase tracking-wide text-[#69747c]">Proveedor / empresa</p><p className="font-black text-[#27313a]">{supplierName || 'Sin especificar'}</p><p className="mt-2 text-xs font-bold uppercase tracking-wide text-[#69747c]">Recibe</p><p className="font-semibold text-[#44515a]">{user?.username || 'Usuario'} · {new Date().toLocaleDateString('es-CO')}</p></div></div></div><div className="space-y-3">{lines.filter((line) => line.item_name.trim()).map((line) => { const index = lines.indexOf(line); return <div key={index} className={`rounded-xl border-l-4 ${categoryTone(line.item_name)} border border-[#e5e8ea] bg-white p-4 shadow-sm`}><div className="flex items-start justify-between gap-3"><div><p className="font-black text-[#27313a]">{line.item_name}</p><p className="mt-1 text-sm font-bold tabular-nums text-[#59636a]">{formatQuantity(line.quantity)} {line.unit} · {formatMoney(line.unit_cost)} / unidad</p></div><button type="button" onClick={() => selectLine(index)} aria-label={`Editar ${line.item_name}`} className="rounded-lg p-2 text-[#2563eb] hover:bg-[#eef4ff]"><FiEdit3 /></button></div><div className="mt-3 flex items-center justify-between border-t border-[#edf0f2] pt-3"><span className="text-sm font-bold text-[#69747c]">Importe</span><strong className="tabular-nums text-[#27313a]">{formatMoney(line.quantity * line.unit_cost)}</strong></div></div>; })}</div><div className="rounded-xl bg-[#27313a] p-4 text-white"><div className="flex items-center justify-between"><span className="text-sm font-semibold text-[#dce4e7]">Total de la recepción</span><strong className="text-2xl font-black tabular-nums">{formatMoney(total)}</strong></div></div><button type="button" onClick={() => { setActiveLineIndex(lines.length - 1); setShowPortionDetails(false); setMobileStep(1); }} className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#2563eb] px-5 py-3 font-black text-[#2563eb]"><FiPlus /> Agregar otro ítem</button><div className="grid grid-cols-2 gap-3"><button type="button" onClick={() => setMobileStep(1)} className="rounded-xl border border-[#d9dfe3] px-3 py-3 font-bold text-[#59636a]">Editar ítems</button><button type="submit" disabled={isSaving} className="flex items-center justify-center gap-2 rounded-xl bg-[#10b981] px-3 py-3 font-black text-white disabled:opacity-60"><FiCheck /> {isSaving ? 'Enviando...' : 'Enviar folder'}</button></div></div>}
          </div>
        </section>
      </form>

    </main>
  );
};

export default InventoryReceiptPage;