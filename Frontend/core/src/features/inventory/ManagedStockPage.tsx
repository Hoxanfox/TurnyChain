import React, { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiCheck, FiRefreshCw, FiSearch, FiTrash2 } from 'react-icons/fi';
import type { RootState } from '../../app/store';
import { clearManagedStock, getManagedStock, setManagedStock, type ManagedStockItem } from './api/managedStockAPI';

const ManagedStockPage: React.FC = () => {
  const navigate = useNavigate();
  const token = useSelector((state: RootState) => state.auth.token);
  const [items, setItems] = useState<ManagedStockItem[]>([]);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getManagedStock(token);
      setItems(result);
      setQuantities(Object.fromEntries(result.map(item => [item.id, String(item.quantity)])));
    } catch (loadError: any) {
      setError(loadError?.response?.data?.error || 'No se pudo cargar las existencias.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    window.addEventListener('stock_updated', load);
    return () => window.removeEventListener('stock_updated', load);
  }, [token]);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter(item => !term || `${item.name} ${item.category_name}`.toLowerCase().includes(term));
  }, [items, search]);

  const save = async (item: ManagedStockItem) => {
    const quantity = Number((quantities[item.id] || '').replace(',', '.'));
    if (!Number.isFinite(quantity) || quantity < 0) {
      setError('La existencia debe ser un número mayor o igual a cero.');
      return;
    }
    setSaving(item.id);
    setError(null);
    try {
      await setManagedStock(item.id, quantity, token!);
      setItems(current => current.map(currentItem => currentItem.id === item.id ? { ...currentItem, quantity } : currentItem));
    } catch (saveError: any) {
      setError(saveError?.response?.data?.error || 'No se pudo actualizar la existencia.');
    } finally {
      setSaving(null);
    }
  };

  const clear = async (item: ManagedStockItem) => {
    if (!window.confirm(`¿Borrar la existencia de ${item.name}?`)) return;
    setSaving(item.id);
    try {
      await clearManagedStock(item.id, token!);
      setQuantities(current => ({ ...current, [item.id]: '0' }));
      setItems(current => current.map(currentItem => currentItem.id === item.id ? { ...currentItem, quantity: 0 } : currentItem));
    } catch (clearError: any) {
      setError(clearError?.response?.data?.error || 'No se pudo borrar la existencia.');
    } finally {
      setSaving(null);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-900 sm:p-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-6 flex items-center justify-between gap-3">
          <div>
            <button onClick={() => navigate('/dashboard')} className="mb-2 flex items-center gap-2 text-sm font-bold text-indigo-600"><FiArrowLeft /> Volver</button>
            <h1 className="text-2xl font-black sm:text-3xl">Existencias</h1>
            <p className="text-sm text-slate-500">Actualiza las unidades de productos cuantificables.</p>
          </div>
          <button onClick={() => void load()} className="rounded-lg border bg-white p-3 text-indigo-600 shadow-sm" aria-label="Actualizar"><FiRefreshCw /></button>
        </header>
        <div className="mb-4 flex items-center gap-2 rounded-xl border bg-white px-3 py-2 shadow-sm">
          <FiSearch className="text-slate-400" />
          <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar producto o categoría..." className="w-full outline-none" />
        </div>
        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}
        {loading ? <p className="py-12 text-center text-slate-500">Cargando existencias...</p> : filteredItems.length === 0 ? (
          <div className="rounded-xl border bg-white p-10 text-center text-slate-500">No hay productos en categorías cuantificables.</div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map(item => (
              <div key={item.id} className="flex flex-col gap-3 rounded-xl border bg-white p-4 shadow-sm sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1"><p className="font-bold">{item.name}</p><p className="text-xs text-slate-500">{item.category_name}</p></div>
                <div className="flex items-center gap-2">
                  <input type="number" min="0" step="0.001" value={quantities[item.id] ?? ''} onChange={event => setQuantities(current => ({ ...current, [item.id]: event.target.value }))} className="w-28 rounded-lg border-2 border-slate-200 px-3 py-2 text-right font-bold" aria-label={`Existencia de ${item.name}`} />
                  <button onClick={() => void save(item)} disabled={saving === item.id} className="rounded-lg bg-indigo-600 p-3 text-white disabled:opacity-50" aria-label={`Guardar ${item.name}`}><FiCheck /></button>
                  <button onClick={() => void clear(item)} disabled={saving === item.id} className="rounded-lg border border-red-200 p-3 text-red-600 disabled:opacity-50" aria-label={`Borrar ${item.name}`}><FiTrash2 /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
};

export default ManagedStockPage;
