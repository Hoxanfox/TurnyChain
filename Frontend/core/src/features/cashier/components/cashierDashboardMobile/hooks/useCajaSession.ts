import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../../../app/store';
import type { CashierSession, CashierExpense } from '../types/cajaTypes';
import {
  openCashierSession,
  fetchActiveCashierSession,
  createCashierExpense,
  closeCashierSession
} from '../api/cajaApi';

export const useCajaSession = () => {
  const token = useSelector((state: RootState) => state.auth.token);
  const [session, setSession] = useState<CashierSession | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Carga la sesión activa desde el servidor
  const syncSession = useCallback(async () => {
    if (!token) {
      setSession(null);
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      const activeSession = await fetchActiveCashierSession(token);
      setSession(activeSession);
    } catch (err: any) {
      console.error('Error al sincronizar sesión de caja:', err);
      setError(err?.response?.data?.error || 'No se pudo cargar la sesión de caja activa');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  // Ejecuta la sincronización inicial al montar
  useEffect(() => {
    syncSession();
  }, [syncSession]);

  // Abre la caja registradora
  const handleOpenCaja = async (initialFund: number): Promise<CashierSession> => {
    if (!token) throw new Error('Usuario no autenticado');
    setIsLoading(true);
    setError(null);
    try {
      const newSession = await openCashierSession(token, initialFund);
      setSession(newSession);
      // Sincronizar para cargar ventas/totales en cero de forma limpia
      await syncSession();
      return newSession;
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Error al iniciar la caja';
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Registra un egreso/gasto
  const handleAddExpense = async (
    amount: number,
    description: string,
    file: File | null
  ): Promise<CashierExpense> => {
    if (!token) throw new Error('Usuario no autenticado');
    if (!session) throw new Error('No hay una sesión de caja activa');
    setIsLoading(true);
    setError(null);
    try {
      const expense = await createCashierExpense(token, amount, description, file);
      // Refrescar la sesión para reflejar el egreso en los totales esperados
      await syncSession();
      return expense;
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Error al registrar el egreso';
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Cierra el turno de caja
  const handleCloseCaja = async (
    actualCash: number,
    notes: string
  ): Promise<CashierSession> => {
    if (!token) throw new Error('Usuario no autenticado');
    if (!session) throw new Error('No hay una sesión de caja activa');
    setIsLoading(true);
    setError(null);
    try {
      const closedSession = await closeCashierSession(token, actualCash, notes);
      setSession(null);
      return closedSession;
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Error al procesar el cierre de caja';
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    session,
    isCajaAbierta: !!session && session.status === 'open',
    isLoading,
    error,
    syncSession,
    abrirCaja: handleOpenCaja,
    registrarGasto: handleAddExpense,
    cerrarCaja: handleCloseCaja,
  };
};
export type UseCajaSessionReturn = ReturnType<typeof useCajaSession>;
