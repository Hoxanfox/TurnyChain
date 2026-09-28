import { useCallback, useEffect, useState } from 'react';
import { attendanceApi, type AttendanceReport } from '../../cashier/api/attendanceApi';

interface ManagerSummary {
  reports: AttendanceReport[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

const getDateKey = (date: Date) => {
  const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}`;
};

export const useManagerSummary = (): ManagerSummary => {
  const [reports, setReports] = useState<AttendanceReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    setIsLoading(true);
    try {
      const data = await attendanceApi.getAttendanceReport(getDateKey(start), getDateKey(end));
      setReports(data || []);
      setError(null);
    } catch (err) {
      console.error('Error loading manager summary', err);
      setError('No se pudo cargar el resumen del gerente.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { reports, isLoading, error, refresh };
};
