// =================================================================
// ARCHIVO 4: /src/features/admin/components/UserManagement.tsx (NUEVA UBICACIÓN)
// Propósito: Extraer la lógica de gestión de usuarios a su propio componente.
// =================================================================
import React, { useState } from 'react';
import CreateUserForm from '../../users/components/CreateUserForm';
import UserList from '../../users/components/UserList';
import EditUserModal from '../../users/components/EditUserModal';
import ChangePasswordModal from '../../users/components/ChangePasswordModal';
import type { User } from '../../../types/users';

const UserManagement: React.FC = () => {
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [changingPasswordUser, setChangingPasswordUser] = useState<User | null>(null);

  return (
    <div>
      <CreateUserForm />
      <UserList onEdit={setEditingUser} onChangePassword={setChangingPasswordUser} />
      {editingUser && (
        <EditUserModal user={editingUser} onClose={() => setEditingUser(null)} />
      )}
      {changingPasswordUser && (
        <ChangePasswordModal user={changingPasswordUser} onClose={() => setChangingPasswordUser(null)} />
      )}
    </div>
  );
};

export default UserManagement;