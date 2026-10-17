import React, { useEffect, useMemo, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import {
  addSupplierInvoicePayment,
  createSupplierInvoice,
  deleteSupplierInvoice,
  getSupplierInvoiceAttachmentUrl,
  getSupplierInvoices,
  updateSupplierInvoice,
  type SupplierInvoice,
  type SupplierInvoiceInput,
} from '../api/supplierInvoicesApi';

const money = (value: number) => `$${value.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const today = () => new Date().toISOString().slice(0, 10);
const inputClass = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100';
const emptyForm = (): SupplierInvoiceInput => ({ invoice_number: '', supplier_name: '', issue_date: today(), due_date: '', total: 0, notes: '', attachment: null });

const statusLabel: Record<SupplierInvoice['status'], string> = {
  pendiente: 'Pendiente', parcial: 'Pago parcial', pagada: 'Pagada', saldo_favor: 'Saldo a favor',
};

export const SupplierInvoicesPage: React.FC = () => {
  const [invoices, setInvoices] = useState<SupplierInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | SupplierInvoice['status']>('all');
  const [form, setForm] = useState<SupplierInvoiceInput>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<SupplierInvoice | null>(null);
  const [payment, setPayment] = useState({ amount: '', payment_method: 'transferencia' as 'efectivo' | 'transferencia' | 'otro', payment_date: today(), reference: '', notes: '' });
  const [isSaving, setIsSaving] = useState(false);

  const refresh = async () => {
    setIsLoading(true);
    try { setInvoices(await getSupplierInvoices()); } catch { toast.error('No se pudieron cargar las facturas.'); } finally { setIsLoading(false); }
  };

  useEffect(() => { void refresh(); }, []);

  const filteredInvoices = useMemo(() => invoices.filter((invoice) => {
    const matchesSearch = `${invoice.invoice_number} ${invoice.supplier_name}`.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && (statusFilter === 'all' || invoice.status === statusFilter);
  }), [invoices, search, statusFilter]);

  const summary = useMemo(() => ({
    total: invoices.reduce((sum, invoice) => sum + invoice.total, 0),
    balance: invoices.reduce((sum, invoice) => sum + invoice.balance, 0),
    paid: invoices.reduce((sum, invoice) => sum + invoice.paid_total, 0),
  }), [invoices]);

  const startEdit = (invoice: SupplierInvoice) => {
    setEditingId(invoice.id);
    setForm({ invoice_number: invoice.invoice_number, supplier_name: invoice.supplier_name, issue_date: invoice.issue_date.slice(0, 10), due_date: invoice.due_date?.slice(0, 10) || '', total: invoice.total, notes: invoice.notes || '', attachment: null });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submitInvoice = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.invoice_number.trim() || !form.supplier_name.trim() || form.total <= 0) { toast.error('Completa proveedor, número y total.'); return; }
    setIsSaving(true);
    try {
      if (editingId) await updateSupplierInvoice(editingId, form); else await createSupplierInvoice(form);
      toast.success(editingId ? 'Factura actualizada.' : 'Factura creada.');
      setForm(emptyForm()); setEditingId(null); await refresh();
    } catch (error: any) { toast.error(error?.response?.data?.error || 'No se pudo guardar la factura.'); } finally { setIsSaving(false); }
  };

  const removeInvoice = async (invoice: SupplierInvoice) => {
    if (!window.confirm(`¿Borrar la factura ${invoice.invoice_number}?`)) return;
    try { await deleteSupplierInvoice(invoice.id); toast.success('Factura eliminada.'); await refresh(); } catch (error: any) { toast.error(error?.response?.data?.error || 'No se pudo borrar.'); }
  };

  const submitPayment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected || Number(payment.amount) <= 0) return;
    try {
      const updated = await addSupplierInvoicePayment(selected.id, { ...payment, amount: Number(payment.amount) });
      setInvoices((current) => current.map((invoice) => invoice.id === updated.id ? updated : invoice));
      setSelected(updated); setPayment({ amount: '', payment_method: 'transferencia', payment_date: today(), reference: '', notes: '' });
      toast.success('Pago registrado.');
    } catch (error: any) { toast.error(error?.response?.data?.error || 'No se pudo registrar el pago.'); }
  };

  return (
    <section className="space-y-5">
      <Toaster position="top-right" />
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600">Tesorería</p><h2 className="mt-1 text-2xl font-black text-slate-900">Cuentas por pagar</h2><p className="mt-1 text-sm text-slate-500">Controla facturas, pagos parciales y saldos de proveedores.</p></div>
        <button onClick={() => { setForm(emptyForm()); setEditingId(null); }} className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-700">+ Nueva factura</button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3"><Kpi label="Facturado" value={money(summary.total)} tone="violet" /><Kpi label="Pagado" value={money(summary.paid)} tone="emerald" /><Kpi label="Saldo pendiente" value={money(summary.balance)} tone="amber" /></div>

      <form onSubmit={submitInvoice} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-center justify-between"><h3 className="font-black text-slate-900">{editingId ? 'Editar factura' : 'Registrar factura'}</h3>{editingId && <button type="button" onClick={() => { setEditingId(null); setForm(emptyForm()); }} className="text-sm font-bold text-slate-500">Cancelar edición</button>}</div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Número de factura"><input value={form.invoice_number} onChange={(event) => setForm({ ...form, invoice_number: event.target.value })} className={inputClass} placeholder="FAC-001" /></Field>
          <Field label="Proveedor / comercio"><input value={form.supplier_name} onChange={(event) => setForm({ ...form, supplier_name: event.target.value })} className={inputClass} placeholder="Nombre del proveedor" /></Field>
          <Field label="Fecha emisión"><input type="date" value={form.issue_date} onChange={(event) => setForm({ ...form, issue_date: event.target.value })} className={inputClass} /></Field>
          <Field label="Fecha vencimiento"><input type="date" value={form.due_date} onChange={(event) => setForm({ ...form, due_date: event.target.value })} className={inputClass} /></Field>
          <Field label="Total"><input type="number" min="0.01" step="0.01" value={form.total || ''} onChange={(event) => setForm({ ...form, total: Number(event.target.value) })} className={inputClass} /></Field>
          <Field label="Foto / archivo"><input type="file" accept="image/*,application/pdf" onChange={(event) => setForm({ ...form, attachment: event.target.files?.[0] || null })} className={`${inputClass} text-xs`} /></Field>
          <Field label="Notas"><input value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className={inputClass} placeholder="Observaciones" /></Field>
          <button disabled={isSaving} className="self-end rounded-lg bg-emerald-600 px-4 py-2.5 font-bold text-white hover:bg-emerald-700 disabled:opacity-50">{isSaving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear factura'}</button>
        </div>
      </form>

      <div className="flex flex-col gap-3 sm:flex-row"><input value={search} onChange={(event) => setSearch(event.target.value)} className="input flex-1" placeholder="Buscar por proveedor o número..." /><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className="input sm:w-52"><option value="all">Todos los estados</option><option value="pendiente">Pendientes</option><option value="parcial">Parciales</option><option value="pagada">Pagadas</option><option value="saldo_favor">Saldo a favor</option></select></div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Factura</th><th className="px-4 py-3">Proveedor</th><th className="px-4 py-3">Vence</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Saldo</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Acciones</th></tr></thead><tbody className="divide-y divide-slate-100">{isLoading ? <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">Cargando facturas...</td></tr> : filteredInvoices.map((invoice) => <tr key={invoice.id} className="hover:bg-slate-50"><td className="px-4 py-3 font-bold text-slate-800"><div>{invoice.invoice_number}</div>{invoice.attachment_path && <a href={getSupplierInvoiceAttachmentUrl(invoice.attachment_path)} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs font-semibold text-indigo-600 hover:underline">Ver factura adjunta</a>}</td><td className="px-4 py-3">{invoice.supplier_name}</td><td className="px-4 py-3 text-slate-500">{invoice.due_date?.slice(0, 10) || 'Sin fecha'}</td><td className="px-4 py-3 font-semibold">{money(invoice.total)}</td><td className="px-4 py-3 font-bold text-amber-700">{invoice.credit_balance > 0 ? `+${money(invoice.credit_balance)}` : money(invoice.balance)}</td><td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${invoice.status === 'pagada' ? 'bg-emerald-100 text-emerald-700' : invoice.status === 'saldo_favor' ? 'bg-violet-100 text-violet-700' : invoice.status === 'parcial' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>{statusLabel[invoice.status]}</span></td><td className="whitespace-nowrap px-4 py-3"><button onClick={() => setSelected(invoice)} className="mr-2 font-bold text-indigo-600 hover:underline">Pagos</button><button onClick={() => startEdit(invoice)} className="mr-2 font-bold text-slate-600 hover:underline">Editar</button><button onClick={() => removeInvoice(invoice)} className="font-bold text-rose-600 hover:underline">Borrar</button></td></tr>)}</tbody></table></div></div>

      {selected && <PaymentPanel invoice={selected} payment={payment} setPayment={setPayment} onClose={() => setSelected(null)} onSubmit={submitPayment} />}
    </section>
  );
};

const PaymentPanel = ({ invoice, payment, setPayment, onClose, onSubmit }: any) => <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"><div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-wide text-indigo-500">Pagos de factura</p><h3 className="text-xl font-black">{invoice.invoice_number} · {invoice.supplier_name}</h3><p className="mt-1 text-sm text-slate-500">Pagado {money(invoice.paid_total)} · Saldo {money(invoice.balance)}</p></div><button onClick={onClose} className="text-2xl text-slate-400">×</button></div><div className="mt-4 max-h-40 space-y-2 overflow-y-auto">{invoice.payments.map((item: any) => <div key={item.id} className="flex justify-between rounded-lg bg-slate-50 p-3 text-sm"><span>{item.payment_date?.slice(0, 10)} · {item.payment_method}</span><strong>{money(item.amount)}</strong></div>)}</div><form onSubmit={onSubmit} className="mt-4 space-y-3 border-t border-slate-100 pt-4"><input required type="number" min="0.01" step="0.01" value={payment.amount} onChange={(event) => setPayment({ ...payment, amount: event.target.value })} className={inputClass} placeholder="Monto del pago" /><div className="grid grid-cols-2 gap-3"><input required type="date" value={payment.payment_date} onChange={(event) => setPayment({ ...payment, payment_date: event.target.value })} className={inputClass} /><select value={payment.payment_method} onChange={(event) => setPayment({ ...payment, payment_method: event.target.value })} className={inputClass}><option value="transferencia">Transferencia</option><option value="efectivo">Efectivo</option><option value="otro">Otro</option></select></div><input value={payment.reference} onChange={(event) => setPayment({ ...payment, reference: event.target.value })} className={inputClass} placeholder="Referencia / comprobante" /><button className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-bold text-white hover:bg-indigo-700">Registrar pago</button></form></div></div>;

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => <label className="block"><span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span>{children}</label>;
const Kpi = ({ label, value, tone }: { label: string; value: string; tone: 'violet' | 'emerald' | 'amber' }) => <div className={`rounded-2xl border p-4 ${tone === 'violet' ? 'border-violet-100 bg-violet-50' : tone === 'emerald' ? 'border-emerald-100 bg-emerald-50' : 'border-amber-100 bg-amber-50'}`}><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-xl font-black text-slate-900">{value}</p></div>;