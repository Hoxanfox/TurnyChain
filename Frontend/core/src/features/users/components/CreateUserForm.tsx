// =================================================================
// ARCHIVO 5: /src/features/users/components/CreateUserForm.tsx
// Propósito: Sin cambios.
// =================================================================
import React, { useState, type FormEvent } from 'react';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../../app/store';
import { addNewUser } from '../api/usersSlice.ts';

const CreateUserForm: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'cajero' | 'mesero'>('mesero');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    dispatch(addNewUser({ username, password, role }));
    setUsername(''); setPassword(''); setRole('mesero');
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 bg-white rounded-lg shadow mb-8">
      <h3 className="text-lg font-medium mb-4">Crear Nuevo Usuario</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <input type="text" placeholder="Nombre de usuario" value={username} onChange={(e) => setUsername(e.target.value)} className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
        <input type="password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
        <select value={role} onChange={(e) => setRole(e.target.value as 'cajero' | 'mesero')} className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="mesero">Mesero</option>
          <option value="cajero">Cajero</option>
        </select>
      </div>
      <button type="submit" className="mt-4 w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700">Crear Usuario</button>
    </form>
  );
};

export default CreateUserForm;