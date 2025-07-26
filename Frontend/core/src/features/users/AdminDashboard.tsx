// =================================================================
// ARCHIVO 6: /src/features/users/AdminDashboard.tsx (ACTUALIZADO)
// Propósito: Manejar el estado del modal de edición.
// =================================================================
import React, { useState } from 'react';
import CreateUserForm from './components/CreateUserForm';
import UserList from './components/UserList';
import EditUserModal from './components/EditUserModal';
import type { User } from '../../types/users';

const AdminDashboard: React.FC = () => {
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const handleEdit = (user: User) => {
    setEditingUser(user);
  };

  const handleCloseModal = () => {
    setEditingUser(null);
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Panel de Administrador</h1>
        <p className="text-gray-600">Gestión de usuarios del sistema.</p>
      </header>
      <main>
        <CreateUserForm />
        <UserList onEdit={handleEdit} />
      </main>
      {editingUser && (
        <EditUserModal user={editingUser} onClose={handleCloseModal} />
      )}
    </div>
  );
};

export default AdminDashboard;