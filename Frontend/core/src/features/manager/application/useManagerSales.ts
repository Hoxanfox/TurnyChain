import { useCallback, useEffect, useMemo, useState } from 'react';
import { getDailySales, type DailySalesPoint } from '../api/salesApi';

export interface SalesSummary {
  today: number;
  todayOrders: number;
  month: number;
  monthOrders: number;
  total: number;
  totalOrders: number;
  averageTicket: number;
  bestDay: { date: string; total: number } | null;
}

const toKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

// Rellena con 0 los días sin ventas para que la gráfica sea continua.
const fillMissingDays = (points: DailySalesPoint[], start: Date, end: Date): DailySalesPoint[] => {
  const byDate = new Map(points.map(point => [point.date, point]));
  const result: DailySalesPoint[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());

  while (cursor <= last) {
    const key = toKey(cursor);
    const found = byDate.get(key);
    result.push(found ? { ...found } : { date: key, total: 0, order_count: 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  return result;
};

/**
 * Carga las ventas diarias de los últimos `days` días y calcula KPIs agregados.
 */
export const useManagerSales = (days: number) => {
  const [data, setData] = useState<DailySalesPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - (days - 1));

    setIsLoading(true);
    try {
      const points = await getDailySales(toKey(start), toKey(end));
      setData(fillMissingDays(points, start, end));
      setError(null);
    } catch (err) {
      console.error('Error loading manager sales', err);
      setError('No se pudieron cargar las ventas.');
    } finally {
      setIsLoading(false);
    }
  }, [days]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const summary = useMemo((): SalesSummary => {
    const now = new Date();
    const todayKey = toKey(now);
    const monthKey = todayKey.slice(0, 7);

    const total = data.reduce((sum, point) => sum + point.total, 0);
    const totalOrders = data.reduce((sum, point) => sum + point.order_count, 0);

    const todayPoint = data.find(point => point.date === todayKey);
    const monthPoints = data.filter(point => point.date.startsWith(monthKey));
    const month = monthPoints.reduce((sum, point) => sum + point.total, 0);
    const monthOrders = monthPoints.reduce((sum, point) => sum + point.order_count, 0);

    const bestDay = data.reduce<{ date: string; total: number } | null>(
      (best, point) =>
        point.total > 0 && (!best || point.total > best.total) ? { date: point.date, total: point.total } : best,
      null,
    );

    return {
      today: todayPoint?.total ?? 0,
      todayOrders: todayPoint?.order_count ?? 0,
      month,
      monthOrders,
      total,
      totalOrders,
      averageTicket: totalOrders > 0 ? total / totalOrders : 0,
      bestDay,
    };
  }, [data]);

  return { data, summary, isLoading, error, refresh };
};
