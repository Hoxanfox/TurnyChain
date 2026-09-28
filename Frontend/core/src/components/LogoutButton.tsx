import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout, setActiveRole } from '../features/auth/authSlice';
import type { AppDispatch, RootState } from '../app/store';
import type { UserRole } from '../types/auth';

const LogoutButton: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);
  const roles = user?.roles?.length ? user.roles : user?.role ? [user.role] : [];

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <div className="flex items-center gap-2">
      {roles.length > 1 && (
        <select
          value={user?.role || roles[0]}
          onChange={(event) => {
            dispatch(setActiveRole(event.target.value as UserRole));
            window.location.assign('/dashboard');
          }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
          aria-label="Cambiar perfil activo"
        >
          {roles.map(role => <option key={role} value={role}>{role[0].toUpperCase() + role.slice(1)}</option>)}
        </select>
      )}
      <button onClick={handleLogout} className="rounded-lg bg-red-500 px-4 py-2 text-white hover:bg-red-600">
        Cerrar Sesión
      </button>
    </div>
  );
};

export default LogoutButton;