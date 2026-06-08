import { useState, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import type { AppDispatch } from '../../../../../app/store';
import { logout } from '../../../../auth/authSlice';
import type { CashierSession, CashierExpense } from '../types/cajaTypes';

export const useCierreCaja = (
  activeSession: CashierSession | null,
  onClose: () => void,
  cerrarCajaApi: (actualCash: number, notes: string) => Promise<CashierSession>
) => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  // Estados del formulario
  const [actualCashStr, setActualCashStr] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isConfirmed, setIsConfirmed] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Leer inmutables de la sesión de caja activa
  const initialFund = activeSession?.initial_fund ?? 0;
  const cashSales = activeSession?.cash_sales ?? 0;
  const transferSales = activeSession?.transfer_sales ?? 0;
  const totalSales = activeSession?.total_sales ?? 0;
  const ordersCount = activeSession?.orders_count ?? 0;
  const expenses = useMemo((): CashierExpense[] => {
    return activeSession?.expenses ?? [];
  }, [activeSession]);

  // Suma de egresos
  const totalExpenses = useMemo(() => {
    return expenses.reduce((acc, curr) => acc + curr.amount, 0);
  }, [expenses]);

  // Efectivo Real digitado
  const actualCash = useMemo(() => {
    const val = parseFloat(actualCashStr);
    return isNaN(val) ? 0 : val;
  }, [actualCashStr]);

  // Cálculos contables: Fondo Inicial + Ventas Efectivo - Egresos
  const expectedCash = useMemo(() => {
    return initialFund + cashSales - totalExpenses;
  }, [initialFund, cashSales, totalExpenses]);

  const discrepancy = useMemo(() => {
    return actualCash - expectedCash;
  }, [actualCash, expectedCash]);

  const discrepancyType = useMemo(() => {
    if (discrepancy === 0) return 'square';
    if (discrepancy < 0) return 'missing';
    return 'surplus';
  }, [discrepancy]);

  const isDiscrepancy = discrepancy !== 0;

  // Validación: Si hay descuadre, la justificación es obligatoria
  const isFormValid = useMemo(() => {
    if (!isConfirmed) return false;
    if (actualCashStr === '') return false;
    if (isDiscrepancy && notes.trim().length === 0) return false;
    return true;
  }, [isConfirmed, actualCashStr, isDiscrepancy, notes]);

  // Descarga del reporte CSV con desglose de egresos
  const downloadClosureReport = (finalSession: CashierSession) => {
    const timestamp = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' });
    const cashierName = finalSession.cashier_name || 'Cajero';

    const csvRows = [
      ['REPORTE OFICIAL DE ARQUEO Y CIERRE DE CAJA', ''],
      ['Fecha y Hora Cierre', timestamp],
      ['Cajero', cashierName],
      ['ID Cajero', finalSession.cashier_id],
      ['ID Sesion', finalSession.id],
      ['', ''],
      ['RESUMEN FINANCIERO DEL TURNO', ''],
      ['Fondo Inicial Base (+)', initialFund.toFixed(2)],
      ['Ventas en Efectivo (+)', cashSales.toFixed(2)],
      ['Total Ventas Transferencia/Tarjeta', transferSales.toFixed(2)],
      ['Egresos/Gastos Registrados (-)', totalExpenses.toFixed(2)],
      ['Total Ventas Facturadas (Efectivo+Transferencia)', totalSales.toFixed(2)],
      ['Cantidad de Ordenes Procesadas', ordersCount],
      ['', ''],
      ['CONCILIACIÓN', ''],
      ['Efectivo Esperado en Gaveta', expectedCash.toFixed(2)],
      ['Efectivo Real Arqueado', actualCash.toFixed(2)],
      ['Diferencia / Descuadre', discrepancy.toFixed(2)],
      ['Estado de Turno', discrepancyType === 'square' ? 'CUADRADA' : discrepancyType === 'missing' ? 'FALTANTE' : 'SOBRANTE'],
      ['Observaciones/Justificación', notes || 'Sin observaciones'],
      ['', ''],
    ];

    // Detallar los egresos individuales si existen
    if (expenses.length > 0) {
      csvRows.push(['DETALLE DE EGRESOS/GASTOS REGISTRADOS', '']);
      csvRows.push(['Fecha', 'Descripción', 'Monto ($)']);
      expenses.forEach((exp) => {
        const dateFormatted = new Date(exp.created_at).toLocaleTimeString('es-CO', { timeZone: 'America/Bogota' });
        csvRows.push([dateFormatted, exp.description, exp.amount.toFixed(2)]);
      });
    } else {
      csvRows.push(['DETALLE DE EGRESOS/GASTOS REGISTRADOS', 'No se registraron gastos en este turno']);
    }

    const csvContent = '\uFEFF' + csvRows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `cierre_caja_${new Date().toISOString().slice(0, 10)}_${cashierName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCierreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const closedSession = await cerrarCajaApi(actualCash, notes.trim());
      
      // Lanzar confeti
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });

      // Descargar archivo CSV oficial
      downloadClosureReport(closedSession);

      // Pequeña pausa estética
      setTimeout(() => {
        setIsLoading(false);
        onClose();
        // Cerrar sesión y redirigir
        dispatch(logout());
        navigate('/login');
      }, 1500);
    } catch (err: any) {
      setIsLoading(false);
      setError(err?.message || 'Error al procesar el cierre en el servidor. Intente nuevamente.');
    }
  };

  const resetForm = () => {
    setActualCashStr('');
    setNotes('');
    setIsConfirmed(false);
    setError(null);
  };

  return {
    actualCashStr,
    setActualCashStr,
    notes,
    setNotes,
    isConfirmed,
    setIsConfirmed,
    isLoading,
    error,
    initialFund,
    cashSales,
    transferSales,
    totalSales,
    ordersCount,
    expenses,
    totalExpenses,
    expectedCash,
    actualCash,
    discrepancy,
    discrepancyType,
    isDiscrepancy,
    isFormValid,
    handleCierreSubmit,
    resetForm,
  };
};
