import React, { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiCheck, FiMinus, FiPlus, FiRefreshCw, FiSearch } from 'react-icons/fi';
import type { RootState } from '../../app/store';
import {
  getManagedStock,
  receiveManagedStock,
  updateManagedStockLocations,
  type ManagedStockItem,
  type StockReceiptLine,
} from './api/managedStockAPI';

const num = (value: string) => {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatQuantity = (value: number) =>
  value.toLocaleString('es-CO', { maximumFractionDigits: 3 });

const ManagedStockPage: React.FC = () => {
  const navigate = useNavigate();
  const token = useSelector((state: RootState) => state.auth.token);
  const [items, setItems] = useState<ManagedStockItem[]>([]);
  const [tab, setTab] = useState<'adjust' | 'receive'>('adjust');
  const [search, setSearch] = useState('');
  const [receiptSearch, setReceiptSearch] = useState('');
  const [locations, setLocations] = useState<Record<string, { warehouse: string; display: string }>>({});
  const [selected, setSelected] = useState<Record<string, StockReceiptLine>>({});
  const [supplier, setSupplier] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const result = await getManagedStock(token);
      setItems(result);
      setLocations(Object.fromEntries(result.map(item => [
        item.id,
        {
          warehouse: String(item.warehouse_quantity ?? 0),
          display: String(item.display_quantity ?? 0),
        },
      ])));
    } catch (caught: any) {
      setError(caught?.response?.data?.error || 'No se pudo cargar el inventario.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    window.addEventListener('stock_updated', load);
    return () => window.removeEventListener('stock_updated', load);
  }, [token]);

  const filtered = useMemo(() => {
    const term = (tab === 'adjust' ? search : receiptSearch).trim().toLowerCase();
    return items.filter(item =>
      !term || `${item.name} ${item.category_name}`.toLowerCase().includes(term)
    );
  }, [items, search, receiptSearch, tab]);

  const clamp = (value: number, maximum: number) =>
    Math.min(Math.max(value, 0), Math.max(maximum, 0));

  const changeDisplay = (item: ManagedStockItem, rawValue: string) => {
    const total = item.quantity;
    const display = clamp(num(rawValue), total);
    setLocations(current => ({
      ...current,
      [item.id]: {
        warehouse: String(Number((total - display).toFixed(3))),
        display: String(display),
      },
    }));
  };

  const changeWarehouse = (item: ManagedStockItem, rawValue: string) => {
    const total = item.quantity;
    const warehouse = clamp(num(rawValue), total);
    setLocations(current => ({
      ...current,
      [item.id]: {
        warehouse: String(warehouse),
        display: String(Number((total - warehouse).toFixed(3))),
      },
    }));
  };

  const stepLocation = (
    item: ManagedStockItem,
    location: 'warehouse' | 'display',
    delta: number
  ) => {
    const value = locations[item.id]?.[location] || '0';
    const next = clamp(num(value) + delta, item.quantity);
    if (location === 'display') changeDisplay(item, String(next));
    else changeWarehouse(item, String(next));
  };

  const save = async (item: ManagedStockItem) => {
    const value = locations[item.id];
    const warehouse = num(value?.warehouse || '0');
    const display = num(value?.display || '0');
    if (![warehouse, display].every(entry => entry >= 0) || Math.abs((warehouse + display) - item.quantity) > 0.001) {
      setError(`La distribución debe sumar exactamente ${formatQuantity(item.quantity)} unidades.`);
      return;
    }
    setSaving(item.id);
    setError(null);
    try {
      await updateManagedStockLocations(item.id, warehouse, display, token!);
      await load();
    } catch (caught: any) {
      setError(caught?.response?.data?.error || 'No se pudo actualizar el inventario.');
    } finally {
      setSaving(null);
    }
  };

  const toggle = (item: ManagedStockItem) => {
    setSelected(current => {
      const next = { ...current };
      if (next[item.id]) delete next[item.id];
      else next[item.id] = { item_id: item.id, quantity: 1, unit_cost: 0 };
      return next;
    });
  };

  const receive = async () => {
    const lines = Object.values(selected);
    if (!lines.length || lines.some(line => line.quantity <= 0 || line.unit_cost < 0)) {
      setError('Selecciona productos y registra cantidades válidas.');
      return;
    }
    setSaving('receipt');
    setError(null);
    try {
      await receiveManagedStock(supplier, notes, lines, token!);
      setSelected({});
      setSupplier('');
      setNotes('');
      await load();
    } catch (caught: any) {
      setError(caught?.response?.data?.error || 'No se pudo recibir la factura.');
    } finally {
      setSaving(null);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-900 sm:p-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="mb-2 flex items-center gap-2 text-sm font-bold text-indigo-600"
            >
              <FiArrowLeft /> Volver
            </button>
            <h1 className="text-3xl font-black">Inventario</h1>
            <p className="text-sm text-slate-500">Ajustes por ubicación y recepción de facturas.</p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-lg border bg-white p-3 text-indigo-600"
            aria-label="Actualizar inventario"
          >
            <FiRefreshCw />
          </button>
        </header>

        <div className="mb-5 grid grid-cols-2 gap-2 rounded-xl bg-slate-200 p-1">
          <button
            type="button"
            onClick={() => { setTab('adjust'); setError(null); }}
            className={`rounded-lg px-4 py-3 font-bold ${tab === 'adjust' ? 'bg-white text-indigo-700 shadow' : 'text-slate-600'}`}
          >
            Ajustar existencias
          </button>
          <button
            type="button"
            onClick={() => { setTab('receive'); setError(null); }}
            className={`rounded-lg px-4 py-3 font-bold ${tab === 'receive' ? 'bg-white text-emerald-700 shadow' : 'text-slate-600'}`}
          >
            Recibir factura
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {tab === 'adjust' ? (
          <>
            <div className="mb-5 rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-950">
              <p className="font-black">Distribución inteligente</p>
              <p className="mt-1 text-indigo-800">
                Al cambiar bodega o vitrina, la otra ubicación se calcula automáticamente.
                El total no cambia hasta que llegue una factura nueva.
              </p>
            </div>

            <div className="mb-4 flex items-center gap-2 rounded-xl border bg-white p-3">
              <FiSearch className="text-slate-400" />
              <input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Buscar producto o categoría..."
                aria-label="Buscar producto o categoría"
                className="w-full outline-none"
              />
            </div>

            {loading ? (
              <p className="py-8 text-center font-bold text-slate-500">Cargando inventario...</p>
            ) : (
              <div className="space-y-4">
                {filtered.map(item => {
                  const value = locations[item.id] || { warehouse: '0', display: '0' };
                  const warehouse = num(value.warehouse);
                  const display = num(value.display);
                  const displayPercent = item.quantity > 0 ? (display / item.quantity) * 100 : 0;
                  const changed = warehouse !== item.warehouse_quantity || display !== item.display_quantity;

                  return (
                    <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h2 className="text-lg font-black text-slate-900">{item.name}</h2>
                          <p className="text-xs font-semibold text-slate-500">{item.category_name}</p>
                        </div>
                        <div className="rounded-xl bg-purple-50 px-3 py-2 text-right">
                          <p className="text-[10px] font-black uppercase tracking-wide text-purple-500">Total fijo</p>
                          <p className="text-lg font-black text-purple-700">{formatQuantity(item.quantity)}</p>
                        </div>
                      </div>

                      <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-purple-500 transition-all"
                          style={{ width: `${displayPercent}%` }}
                          title={`${formatQuantity(display)} en vitrina`}
                        />
                      </div>
                      <div className="mt-1 flex justify-between text-[11px] font-bold text-slate-500">
                        <span>Vitrina {formatQuantity(display)}</span>
                        <span>Bodega {formatQuantity(warehouse)}</span>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <LocationEditor
                          label="Bodega"
                          hint="Existencias almacenadas"
                          value={value.warehouse}
                          maximum={item.quantity}
                          onChange={raw => changeWarehouse(item, raw)}
                          onMinus={() => stepLocation(item, 'warehouse', -1)}
                          onPlus={() => stepLocation(item, 'warehouse', 1)}
                          tone="slate"
                        />
                        <LocationEditor
                          label="Vitrina"
                          hint="Expuesto para venta"
                          value={value.display}
                          maximum={item.quantity}
                          onChange={raw => changeDisplay(item, raw)}
                          onMinus={() => stepLocation(item, 'display', -1)}
                          onPlus={() => stepLocation(item, 'display', 1)}
                          tone="purple"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => void save(item)}
                        disabled={saving === item.id || !changed}
                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 font-black text-white disabled:bg-slate-200 disabled:text-slate-400"
                      >
                        <FiCheck />
                        {saving === item.id ? 'Guardando...' : changed ? 'Guardar distribución' : 'Sin cambios'}
                      </button>
                    </article>
                  );
                })}
                {filtered.length === 0 && (
                  <p className="py-8 text-center text-sm font-semibold text-slate-500">
                    No se encontraron productos.
                  </p>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="mb-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-950">
              <p className="font-black">Recibir una factura</p>
              <p className="mt-1 text-emerald-800">
                Selecciona los productos que llegaron. La cantidad recibida se suma a bodega;
                la vitrina no cambia.
              </p>
            </div>

            <div className="mb-4 grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-semibold">
                Proveedor (opcional)
                <input
                  value={supplier}
                  onChange={event => setSupplier(event.target.value)}
                  placeholder="Ej. Distribuidora ABC"
                  className="mt-1 w-full rounded-xl border p-3"
                />
              </label>
              <label className="text-sm font-semibold">
                Nota de factura (opcional)
                <input
                  value={notes}
                  onChange={event => setNotes(event.target.value)}
                  placeholder="Número o referencia"
                  className="mt-1 w-full rounded-xl border p-3"
                />
              </label>
            </div>

            <div className="mb-4 flex items-center gap-2 rounded-xl border bg-white p-3">
              <FiSearch className="text-slate-400" />
              <input
                value={receiptSearch}
                onChange={event => setReceiptSearch(event.target.value)}
                placeholder="Buscar producto para agregar..."
                aria-label="Buscar producto para agregar a la factura"
                className="w-full outline-none"
              />
            </div>

            <div className="mb-3 text-sm font-bold text-slate-600">
              {Object.keys(selected).length} producto(s) seleccionado(s)
            </div>

            <div className="space-y-3">
              {filtered.map(item => (
                <article
                  key={item.id}
                  className={`rounded-2xl border bg-white p-4 ${selected[item.id] ? 'border-emerald-300 ring-1 ring-emerald-200' : 'border-slate-200'}`}
                >
                  <label className="flex items-center gap-3 font-black">
                    <input type="checkbox" checked={Boolean(selected[item.id])} onChange={() => toggle(item)} />
                    <span>{item.name}</span>
                    <span className="text-xs font-normal text-slate-500">{item.category_name}</span>
                  </label>
                  {selected[item.id] && (
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <label className="text-sm font-semibold">
                        Cantidad recibida
                        <input
                          type="number"
                          min="0.001"
                          step="0.001"
                          value={selected[item.id].quantity}
                          onChange={event => setSelected(current => ({
                            ...current,
                            [item.id]: { ...current[item.id], quantity: num(event.target.value) },
                          }))}
                          className="mt-1 w-full rounded-xl border p-3"
                        />
                      </label>
                      <label className="text-sm font-semibold">
                        Costo unitario
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={selected[item.id].unit_cost}
                          onChange={event => setSelected(current => ({
                            ...current,
                            [item.id]: { ...current[item.id], unit_cost: num(event.target.value) },
                          }))}
                          className="mt-1 w-full rounded-xl border p-3"
                        />
                      </label>
                    </div>
                  )}
                </article>
              ))}
            </div>

            <button
              type="button"
              onClick={() => void receive()}
              disabled={saving === 'receipt' || !Object.keys(selected).length}
              className="mt-5 w-full rounded-xl bg-emerald-600 px-4 py-3 font-black text-white disabled:opacity-50 sm:w-auto"
            >
              {saving === 'receipt' ? 'Registrando...' : `Registrar factura (${Object.keys(selected).length})`}
            </button>
          </>
        )}
      </div>
    </main>
  );
};

interface LocationEditorProps {
  label: string;
  hint: string;
  value: string;
  maximum: number;
  tone: 'slate' | 'purple';
  onChange: (value: string) => void;
  onMinus: () => void;
  onPlus: () => void;
}

const LocationEditor: React.FC<LocationEditorProps> = ({
  label,
  hint,
  value,
  maximum,
  tone,
  onChange,
  onMinus,
  onPlus,
}) => {
  const purple = tone === 'purple';
  return (
    <div className={`rounded-xl border p-3 ${purple ? 'border-purple-200 bg-purple-50/60' : 'border-slate-200 bg-slate-50'}`}>
      <div>
        <p className={`text-sm font-black ${purple ? 'text-purple-800' : 'text-slate-800'}`}>{label}</p>
        <p className="text-[11px] text-slate-500">{hint}</p>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={onMinus}
          disabled={num(value) <= 0}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-white text-slate-600 disabled:opacity-40"
          aria-label={`Restar una unidad de ${label}`}
        >
          <FiMinus />
        </button>
        <input
          type="number"
          min="0"
          max={maximum}
          step="0.001"
          value={value}
          onChange={event => onChange(event.target.value)}
          aria-label={`Existencias en ${label.toLowerCase()}`}
          className="min-w-0 flex-1 rounded-lg border bg-white px-2 py-2 text-center text-xl font-black outline-none"
        />
        <button
          type="button"
          onClick={onPlus}
          disabled={num(value) >= maximum}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white disabled:opacity-40 ${purple ? 'bg-purple-600' : 'bg-slate-700'}`}
          aria-label={`Agregar una unidad a ${label}`}
        >
          <FiPlus />
        </button>
      </div>
    </div>
  );
};

export default ManagedStockPage;
