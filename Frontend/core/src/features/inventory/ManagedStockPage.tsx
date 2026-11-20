import React, { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiCheck, FiMinus, FiPlus, FiRefreshCw, FiSearch, FiShoppingCart, FiTrash2, FiX } from 'react-icons/fi';
import type { RootState } from '../../app/store';
import {
  getManagedStock,
  receiveManagedStock,
  updateManagedStockLocations,
  updateManagedStockQuantity,
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
  const [totalValues, setTotalValues] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Record<string, StockReceiptLine>>({});
  const [supplier, setSupplier] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<ManagedStockItem | null>(null);
  const [isProductPickerOpen, setIsProductPickerOpen] = useState(false);
  const [receiptCategory, setReceiptCategory] = useState('all');

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
      setTotalValues(Object.fromEntries(result.map(item => [item.id, String(item.quantity)])));
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

  const saveTotal = async (item: ManagedStockItem) => {
    const quantity = num(totalValues[item.id] || '0');
    if (quantity < 0) {
      setError('La cantidad total no puede ser negativa.');
      return;
    }
    setSaving(item.id);
    setError(null);
    try {
      await updateManagedStockQuantity(item.id, quantity, token!);
      await load();
    } catch (caught: any) {
      setError(caught?.response?.data?.error || 'No se pudo ajustar la cantidad total.');
    } finally {
      setSaving(null);
    }
  };

  const toggle = (item: ManagedStockItem) => {
    setSelected(current => {
      const next = { ...current };
      if (next[item.id]) delete next[item.id];
      else next[item.id] = { item_id: item.id, quantity: '', unit_cost: '' };
      return next;
    });
  };

  const receive = async () => {
    const lines = Object.values(selected);
    if (!lines.length || lines.some(line => line.quantity === '' || line.unit_cost === '' || line.quantity <= 0 || line.unit_cost < 0)) {
      setError('Selecciona productos y registra cantidades válidas.');
      return;
    }
    setSaving('receipt');
    setError(null);
    try {
      await receiveManagedStock(supplier, notes, lines.map(line => ({
        item_id: line.item_id,
        quantity: Number(line.quantity),
        unit_cost: Number(line.unit_cost),
      })), token!);
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

  const receiptCategories = useMemo(
    () => Array.from(new Set(items.map(item => item.category_name).filter(Boolean))).sort(),
    [items]
  );
  const pickerItems = useMemo(() => {
    const term = receiptSearch.trim().toLowerCase();
    return items.filter(item =>
      (receiptCategory === 'all' || item.category_name === receiptCategory) &&
      (!term || `${item.name} ${item.category_name}`.toLowerCase().includes(term))
    );
  }, [items, receiptCategory, receiptSearch]);
  const selectedLines = Object.values(selected);
  const receiptTotalQuantity = selectedLines.reduce(
    (sum, line) => sum + (line.quantity === '' ? 0 : Number(line.quantity)),
    0
  );
  const receiptTotalCost = selectedLines.reduce(
    (sum, line) => {
      const quantity = line.quantity === '' ? 0 : Number(line.quantity);
      const unitCost = line.unit_cost === '' ? 0 : Number(line.unit_cost);
      return sum + quantity * unitCost;
    },
    0
  );

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
          {isProductPickerOpen && (
            <div className="fixed inset-0 z-[110] flex items-end justify-center bg-slate-950/70 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true">
              <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl bg-slate-50 shadow-2xl sm:rounded-3xl">
                <header className="flex items-center justify-between border-b bg-white p-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-emerald-600">Nueva entrada</p>
                    <h2 className="text-xl font-black text-slate-900">Elegir productos</h2>
                  </div>
                  <button type="button" onClick={() => setIsProductPickerOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xl" aria-label="Cerrar selector">
                    <FiX />
                  </button>
                </header>
                <div className="border-b bg-white p-3">
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3">
                    <FiSearch className="text-slate-400" />
                    <input
                      value={receiptSearch}
                      onChange={event => setReceiptSearch(event.target.value)}
                      placeholder="Buscar por nombre..."
                      className="w-full py-3 outline-none"
                      autoFocus
                    />
                  </div>
                  <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                    <button type="button" onClick={() => setReceiptCategory('all')} className={`shrink-0 rounded-full px-3 py-2 text-xs font-black ${receiptCategory === 'all' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      Todas
                    </button>
                    {receiptCategories.map(category => (
                      <button key={category} type="button" onClick={() => setReceiptCategory(category)} className={`shrink-0 rounded-full px-3 py-2 text-xs font-black ${receiptCategory === category ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        {category}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {pickerItems.map(item => {
                      const isSelected = Boolean(selected[item.id]);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => toggle(item)}
                          className={`flex min-h-28 items-center gap-3 rounded-2xl border p-3 text-left transition ${isSelected ? 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-100' : 'border-slate-200 bg-white hover:border-emerald-300'}`}
                        >
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.name} className="h-20 w-20 shrink-0 rounded-xl object-cover" />
                          ) : (
                            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-3xl">🍽️</div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 font-black text-slate-900">{item.name}</p>
                            <p className="mt-1 text-xs font-semibold text-slate-500">{item.category_name}</p>
                            <p className="mt-2 text-sm font-black text-purple-700">{formatQuantity(item.quantity)} actuales</p>
                          </div>
                          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg font-black ${isSelected ? 'bg-emerald-600 text-white' : 'border-2 border-slate-300 text-slate-400'}`}>
                            {isSelected ? '✓' : '+'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {pickerItems.length === 0 && (
                    <p className="py-10 text-center font-semibold text-slate-500">No hay productos con ese filtro.</p>
                  )}
                </div>
                <footer className="border-t bg-white p-3">
                  <button type="button" onClick={() => setIsProductPickerOpen(false)} className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-black text-white">
                    Listo — {Object.keys(selected).length} producto(s)
                  </button>
                </footer>
              </div>
            </div>
          )}
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
            Agregar unidades
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
                        <div className="flex min-w-0 items-center gap-3">
                          {item.image_url ? (
                            <button
                              type="button"
                              onClick={() => setPreviewItem(item)}
                              className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-200"
                              aria-label={`Ver imagen de ${item.name}`}
                            >
                              <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                            </button>
                          ) : (
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-2xl">🍽️</div>
                          )}
                          <div className="min-w-0">
                            <h2 className="truncate text-lg font-black text-slate-900">{item.name}</h2>
                            <p className="text-xs font-semibold text-slate-500">{item.category_name}</p>
                          </div>
                        </div>
                        <div className="rounded-xl bg-purple-50 px-3 py-2 text-right">
                          <p className="text-[10px] font-black uppercase tracking-wide text-purple-500">Total fijo</p>
                          <p className="text-lg font-black text-purple-700">{formatQuantity(item.quantity)}</p>
                        </div>
                      </div>

                      <div className="mt-4 flex items-end gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <label className="min-w-0 flex-1 text-xs font-black text-slate-700">
                          Cantidad total
                          <input
                            type="number"
                            min="0"
                            step="0.001"
                            value={totalValues[item.id] ?? ''}
                            onChange={event => setTotalValues(current => ({
                              ...current,
                              [item.id]: event.target.value,
                            }))}
                            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-lg font-black text-slate-900"
                            aria-label={`Cantidad total de ${item.name}`}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => void saveTotal(item)}
                          disabled={
                            saving === item.id ||
                            totalValues[item.id] === undefined ||
                            num(totalValues[item.id]) === item.quantity
                          }
                          className="h-[46px] shrink-0 rounded-lg bg-slate-800 px-3 text-sm font-black text-white disabled:bg-slate-200 disabled:text-slate-400"
                        >
                          Ajustar total
                        </button>
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
              <p className="font-black">Agregar unidades nuevas</p>
              <p className="mt-1 text-emerald-800">
                Selecciona los productos que llegaron. Las nuevas unidades se suman a bodega
                y conservan intacta la cantidad mostrada en vitrina.
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

            <button
              type="button"
              onClick={() => {
                setReceiptCategory('all');
                setReceiptSearch('');
                setIsProductPickerOpen(true);
              }}
              className="mb-4 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50 px-4 py-4 text-base font-black text-emerald-800 hover:bg-emerald-100"
            >
              <FiShoppingCart />
              Elegir productos para agregar
              {Object.keys(selected).length > 0 && (
                <span className="rounded-full bg-emerald-600 px-2.5 py-1 text-xs text-white">
                  {Object.keys(selected).length}
                </span>
              )}
            </button>

            {Object.keys(selected).length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-10 text-center">
                <p className="text-3xl">📦</p>
                <p className="mt-2 font-black text-slate-700">Aún no hay productos en esta entrada</p>
                <p className="mt-1 text-sm text-slate-500">Selecciona productos desde el buscador visual.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedLines.map(line => {
                  const item = items.find(candidate => candidate.id === line.item_id);
                  if (!item) return null;
                  const quantity = line.quantity === '' ? 0 : Number(line.quantity);
                  const unitCost = line.unit_cost === '' ? 0 : Number(line.unit_cost);
                  return (
                    <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
                      <div className="flex items-center gap-3">
                        {item.image_url ? (
                          <button type="button" onClick={() => setPreviewItem(item)} className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-200">
                            <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                          </button>
                        ) : (
                          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-2xl">🍽️</div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-black text-slate-900">{item.name}</p>
                          <p className="text-xs font-semibold text-slate-500">{item.category_name}</p>
                          <p className="mt-1 text-xs font-bold text-emerald-700">
                            {(quantity * unitCost).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggle(item)}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600"
                          aria-label={`Eliminar ${item.name}`}
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div>
                          <p className="mb-1 text-xs font-black text-slate-600">Cantidad</p>
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={() => setSelected(current => ({ ...current, [item.id]: { ...current[item.id], quantity: Math.max(0, quantity - 1) } }))} className="flex h-10 w-10 items-center justify-center rounded-lg border bg-slate-50"><FiMinus /></button>
                            <input
                              type="number"
                              min="0"
                              step="0.001"
                              value={line.quantity}
                              onChange={event => setSelected(current => ({ ...current, [item.id]: { ...current[item.id], quantity: event.target.value === '' ? '' : num(event.target.value) } }))}
                              className="h-10 min-w-0 flex-1 rounded-lg border px-3 text-center font-black"
                            />
                            <button type="button" onClick={() => setSelected(current => ({ ...current, [item.id]: { ...current[item.id], quantity: quantity + 1 } }))} className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600 text-white"><FiPlus /></button>
                          </div>
                        </div>
                        <label className="text-xs font-black text-slate-600">
                          Costo unitario
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.unit_cost}
                            placeholder="Opcional"
                            onChange={event => setSelected(current => ({ ...current, [item.id]: { ...current[item.id], unit_cost: event.target.value === '' ? '' : num(event.target.value) } }))}
                            className="mt-1 h-10 w-full rounded-lg border px-3 font-bold"
                          />
                        </label>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {Object.keys(selected).length > 0 && (
              <div className="sticky bottom-3 mt-4 rounded-2xl border border-emerald-200 bg-white p-3 shadow-xl">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-slate-50 p-2">
                    <p className="text-[10px] font-black uppercase text-slate-500">Productos</p>
                    <p className="text-lg font-black">{Object.keys(selected).length}</p>
                  </div>
                  <div className="rounded-xl bg-emerald-50 p-2">
                    <p className="text-[10px] font-black uppercase text-emerald-600">Unidades</p>
                    <p className="text-lg font-black text-emerald-800">{formatQuantity(receiptTotalQuantity)}</p>
                  </div>
                  <div className="rounded-xl bg-indigo-50 p-2">
                    <p className="text-[10px] font-black uppercase text-indigo-600">Costo total</p>
                    <p className="text-lg font-black text-indigo-800">{receiptTotalCost.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void receive()}
                  disabled={saving === 'receipt'}
                  className="mt-3 w-full rounded-xl bg-emerald-600 px-4 py-3 font-black text-white disabled:opacity-50"
                >
                  {saving === 'receipt' ? 'Registrando...' : 'Confirmar entrada'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
      {previewItem?.image_url && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-4"
          onClick={() => setPreviewItem(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={event => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewItem(null)}
              className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-xl font-black text-slate-700 shadow"
              aria-label="Cerrar imagen"
            >
              ×
            </button>
            <img src={previewItem.image_url} alt={previewItem.name} className="max-h-[68vh] w-full object-contain" />
            <div className="p-4">
              <p className="text-xl font-black text-slate-900">{previewItem.name}</p>
              <p className="mt-1 text-sm font-semibold text-slate-500">{previewItem.category_name}</p>
            </div>
          </div>
        </div>
      )}
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
