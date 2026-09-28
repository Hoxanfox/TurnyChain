// =================================================================
// ARCHIVO 7: /src/features/users/components/EditUserModal.tsx (NUEVO ARCHIVO)
// Propósito: Modal para editar un usuario existente.
// =================================================================
import React, { useState, type FormEvent } from 'react';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../../app/store';
import { editUser } from '../api/usersSlice.ts';
import type { User } from '../../../types/users';

interface EditUserModalProps {
  user: User;
  onClose: () => void;
}

const EditUserModal: React.FC<EditUserModalProps> = ({ user, onClose }) => {
  const dispatch = useDispatch<AppDispatch>();
  const [username, setUsername] = useState(user.username);
  const [roles, setRoles] = useState(user.roles?.length ? user.roles : [user.role]);

  const toggleRole = (role: 'admin' | 'gerente' | 'cajero' | 'mesero') => {
    setRoles(current => current.includes(role) ? current.filter(item => item !== role) : [...current, role]);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (roles.length === 0) return;
    dispatch(editUser({ id: user.id, username, roles }));
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Editar Usuario</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="edit-username" className="block text-sm font-medium text-gray-700">Nombre de usuario</label>
            <input
              id="edit-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border rounded-md"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="edit-role" className="block text-sm font-medium text-gray-700">Rol</label>
            <div className="mt-1 flex flex-wrap gap-3 rounded-md border px-3 py-2 text-sm">
              {(['mesero', 'cajero', 'gerente', 'admin'] as const).map(option => (
                <label key={option} className="flex items-center gap-1.5">
                  <input type="checkbox" checked={roles.includes(option)} onChange={() => toggleRole(option)} />
                  {option[0].toUpperCase() + option.slice(1)}
                </label>
              ))}
            </div>
          </div>
          <div className="mt-6 flex justify-end space-x-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">Cancelar</button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Guardar Cambios</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditUserModal;