import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../../../app/store';
import type { CashierMetricsSummary, WaiterMetric } from '../types/metricsTypes';
import { getMonthValue } from '../utils/invoiceHistoryFormatters';
import { fetchWaiterApprovedStats } from '../api/waiterStatsApi';

export const useCashierMetrics = () => {
  const token = useSelector((state: RootState) => state.auth.token);
  const [month, setMonth] = useState(getMonthValue());
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<WaiterMetric[]>([]);

  const loadData = useCallback(async () => {
    if (!token) {
      setError('Token de autenticación no encontrado');
      setStatus('error');
      return;
    }

    setStatus('loading');
    setError(null);

    try {
      const rawStats = await fetchWaiterApprovedStats({
        token,
        month,
      });

      const totalRevenue = rawStats.reduce((sum, item) => sum + (item.total_amount || 0), 0);

      const transformed: WaiterMetric[] = rawStats.map((item) => {
        const total = item.total_amount || 0;
        const count = item.approved_count || 0;
        return {
          name: item.waiter_name || 'Sin nombre',
          total,
          count,
          average: count > 0 ? total / count : 0,
          share: totalRevenue > 0 ? parseFloat(((total / totalRevenue) * 100).toFixed(1)) : 0,
        };
      });

      // Ordenar por total descendente
      transformed.sort((a, b) => b.total - a.total);

      setMetrics(transformed);
      setStatus('success');
    } catch (err: any) {
      console.error('Error loading cashier metrics:', err);
      setError(err.response?.data?.error || err.message || 'Error al obtener métricas');
      setStatus('error');
    }
  }, [token, month]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const summary = useMemo((): CashierMetricsSummary => {
    const totalRevenue = metrics.reduce((sum, metric) => sum + metric.total, 0);
    const totalOrders = metrics.reduce((sum, metric) => sum + metric.count, 0);
    const averageTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const topWaiter = metrics[0];

    return {
      totalRevenue,
      totalOrders,
      averageTicket,
      topWaiterName: topWaiter?.name || 'Sin datos',
      topWaiterTotal: topWaiter?.total || 0,
      topWaiterOrders: topWaiter?.count || 0,
    };
  }, [metrics]);

  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
    setMetrics([]);
  }, []);

  const updateMonth = useCallback((value: string) => {
    setMonth(value);
    reset();
  }, [reset]);

  return {
    month,
    status,
    error,
    metrics,
    summary,
    hasMore: false,
    loadData,
    setMonth: updateMonth,
  };
};
