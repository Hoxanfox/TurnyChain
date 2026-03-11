// =================================================================
// ARCHIVO: /src/features/waiter/components/WaiterProfileMenu.tsx
// Menú desplegable de perfil para el mesero: stats del día + logout
// =================================================================
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout } from '../../auth/authSlice';
import type { AppDispatch, RootState } from '../../../app/store';

const WaiterProfileMenu: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  const { myOrders } = useSelector((state: RootState) => state.orders);

  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Estadísticas del día actual
  const todayStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayOrders = (myOrders || []).filter((order: any) => {
      const d = new Date(order.created_at);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === today.getTime();
    });
    return {
      total: todayOrders.length,
      paid: todayOrders.filter((o: any) => o.status === 'pagado').length,
      pending: todayOrders.filter((o: any) => o.status === 'entregado').length,
      inVerification: todayOrders.filter((o: any) => o.status === 'por_verificar').length,
    };
  }, [myOrders]);

  const initials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : '??';

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <div ref={menuRef} className="relative">
      {/* Botón disparador */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="flex items-center gap-2 bg-white/15 hover:bg-white/25 active:bg-white/30 text-white px-3 py-1.5 rounded-lg transition-all font-medium text-sm"
      >
        <div className="w-7 h-7 rounded-full bg-indigo-300 text-indigo-900 flex items-center justify-center text-xs font-bold flex-shrink-0">
          {initials}
        </div>
        <span className="hidden sm:inline max-w-[90px] truncate">
          {user?.username || 'Mesero'}
        </span>
        <span className="text-xs opacity-80">{isOpen ? '▲' : '▼'}</span>
      </button>

      {/* Panel desplegable */}
      {isOpen && (
        <div
          style={{ colorScheme: 'light' }}
          className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden text-gray-900"
        >
          {/* Cabecera de perfil */}
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 p-4 text-white">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center text-2xl font-bold flex-shrink-0">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-lg leading-tight truncate">
                  {user?.username || 'Mesero'}
                </p>
                <span className="inline-block text-xs bg-white/20 px-2 py-0.5 rounded-full mt-1">
                  🍽️ Mesero
                </span>
              </div>
            </div>
          </div>

          {/* Estadísticas del día */}
          <div className="p-4 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              📊 Mi día de hoy
            </p>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-indigo-50 rounded-lg p-2.5 text-center">
                <p className="text-2xl font-bold text-indigo-700">{todayStats.total}</p>
                <p className="text-xs text-indigo-600 font-medium leading-tight">Órdenes</p>
              </div>
              <div className="bg-green-50 rounded-lg p-2.5 text-center">
                <p className="text-2xl font-bold text-green-700">{todayStats.paid}</p>
                <p className="text-xs text-green-600 font-medium leading-tight">Pagadas ✅</p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-2.5 text-center">
                <p className="text-2xl font-bold text-yellow-700">{todayStats.pending}</p>
                <p className="text-xs text-yellow-600 font-medium leading-tight">Por cobrar ⏳</p>
              </div>
            </div>

            {todayStats.inVerification > 0 && (
              <div className="mt-3 bg-orange-50 rounded-lg px-3 py-2 flex items-center gap-2">
                <span className="text-orange-500 text-sm">🔄</span>
                <p className="text-xs text-orange-700 font-medium">
                  {todayStats.inVerification} {todayStats.inVerification === 1 ? 'orden en' : 'órdenes en'} verificación
                </p>
              </div>
            )}
          </div>

          {/* Cerrar sesión */}
          <div className="p-3">
            <button
              onClick={handleLogout}
              className="w-full py-2.5 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 active:scale-95 text-white rounded-lg transition-all font-semibold text-sm flex items-center justify-center gap-2 shadow-sm"
            >
              🚪 Cerrar Sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WaiterProfileMenu;
