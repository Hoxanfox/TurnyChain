import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout } from '../../../../../features/auth/authSlice';
import type { AppDispatch } from '../../../../../app/store';

interface CashierMobileHeaderProps {
  porCobrarCount: number;
  pagadasCount: number;
  porVerificarCount: number;
  onOpenSidebar: () => void;
  onOpenPorCobrar: () => void;
  onOpenPagadas: () => void;
  onOpenPorVerificar: () => void;
  hasWsNotification?: boolean;
}

export const CashierMobileHeader: React.FC<CashierMobileHeaderProps> = ({
  porCobrarCount,
  pagadasCount,
  porVerificarCount,
  onOpenSidebar,
  onOpenPorCobrar,
  onOpenPagadas,
  onOpenPorVerificar,
  hasWsNotification = false,
}) => {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm text-slate-800">
      <div className="px-4 py-3 flex items-center justify-between relative">
        {/* Lado izquierdo: Botón Menú */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenSidebar}
            className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 rounded-xl transition-colors relative active:scale-95"
            title="Abrir menú"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            {hasWsNotification && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-indigo-500 border-2 border-white rounded-full animate-pulse"></span>
            )}
          </button>
        </div>

        {/* Centro: Título Minimalista */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏪</span>
            <h1 className="text-lg font-black tracking-tight text-slate-800">Caja</h1>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <button 
              onClick={onOpenPorCobrar}
              className="flex items-center justify-center w-8 h-6 rounded-full bg-blue-100 border border-blue-300 text-blue-700 text-xs font-bold hover:bg-blue-200 transition-colors shadow-sm"
              title="Mesas Por Cobrar"
            >
              {porCobrarCount}
            </button>
            <button 
              onClick={onOpenPagadas}
              className="flex items-center justify-center w-8 h-6 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-700 text-xs font-bold hover:bg-emerald-200 transition-colors shadow-sm"
              title="Mesas Pagadas"
            >
              {pagadasCount}
            </button>
            <button 
              onClick={onOpenPorVerificar}
              className="flex items-center justify-center w-8 h-6 rounded-full bg-orange-100 border border-orange-300 text-orange-700 text-xs font-bold hover:bg-orange-200 transition-colors shadow-sm"
              title="Mesas Por Verificar"
            >
              {porVerificarCount}
            </button>
          </div>
        </div>

        {/* Lado derecho: Perfil */}
        <div className="flex items-center gap-2 relative">
          <button 
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            className="w-10 h-10 rounded-full bg-indigo-50 border-2 border-indigo-100 flex items-center justify-center text-indigo-600 hover:bg-indigo-100 hover:border-indigo-200 transition-all active:scale-95 overflow-hidden"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          </button>

          {/* Menú de perfil dropdown */}
          {isProfileMenuOpen && (
            <>
              {/* Backdrop invisible para cerrar */}
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setIsProfileMenuOpen(false)}
              ></div>
              
              <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-slate-100 overflow-hidden z-50 animate-fade-in origin-top-right">
                <div className="p-4 bg-slate-50 border-b border-slate-100">
                  <p className="text-sm font-bold text-slate-800">Cajero Activo</p>
                  <p className="text-xs text-slate-500 mt-0.5">Turno en progreso</p>
                </div>
                <div className="p-2">
                  <button 
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Finalizar Turno
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
