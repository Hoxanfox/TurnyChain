// =================================================================
// ARCHIVO 14: /src/features/admin/components/AccompanimentManagement.tsx
// =================================================================
import React, { useEffect, useState, type FormEvent } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAccompaniments, addNewAccompaniment, removeAccompaniment, updateExistingAccompaniment } from './api/accompanimentsSlice.ts';
import type { AppDispatch, RootState } from '../../../../app/store.ts';
import type { Accompaniment } from '../../../../types/accompaniments.ts';

const AccompanimentManagement: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { items = [], status = 'idle' } = useSelector((state: RootState) => state.accompaniments) || {};
  const [name, setName] = useState('');
  const [price, setPrice] = useState(0);
  const [editing, setEditing] = useState<Accompaniment | null>(null);

  useEffect(() => {
    if (status === 'idle') dispatch(fetchAccompaniments());
  }, [status, dispatch]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (editing) {
      if (editing.name.trim()) {
        dispatch(updateExistingAccompaniment(editing));
        setEditing(null);
      }
    } else {
      if (name.trim()) {
        dispatch(addNewAccompaniment({ name: name.trim(), price }));
        setName('');
        setPrice(0);
      }
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('¿Seguro?')) dispatch(removeAccompaniment(id));
  };

  return (
    <div>
      <h3 className="text-lg font-medium mb-4">Gestionar Acompañantes</h3>
      <form onSubmit={handleSubmit} className="flex gap-4 mb-4 items-center">
        <input type="text" value={editing ? editing.name : name} 
               onChange={(e) => editing ? setEditing({...editing, name: e.target.value}) : setName(e.target.value)}
               placeholder="Nombre del acompañante" className="px-3 py-2 border rounded-lg flex-grow" />
        <input type="number" step="0.01" value={editing ? editing.price : price} 
               onChange={(e) => editing ? setEditing({...editing, price: parseFloat(e.target.value)}) : setPrice(parseFloat(e.target.value))}
               placeholder="Precio" className="px-3 py-2 border rounded-lg w-28" />
        <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">
          {editing ? 'Actualizar' : 'Añadir'}
        </button>
        {editing && <button type="button" onClick={() => setEditing(null)} className="bg-gray-500 text-white px-4 py-2 rounded-lg">Cancelar</button>}
      </form>
      <ul className="space-y-2">
        {items.map(acc => (
          <li key={acc.id} className="p-2 bg-gray-100 rounded flex justify-between items-center">
            <span>{acc.name} - ${acc.price.toFixed(2)}</span>
            <div className="space-x-2">
              <button onClick={() => setEditing(acc)} className="text-blue-500 hover:text-blue-700">Editar</button>
              <button onClick={() => handleDelete(acc.id)} className="text-red-500 hover:text-red-700">Eliminar</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AccompanimentManagement;