import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CashierMetricsSummary, WaiterMetric } from '../types/metricsTypes';
import { getMonthValue } from '../utils/invoiceHistoryFormatters';

const MOCK_METRICS: WaiterMetric[] = [
  { name: 'Laura', total: 4250, count: 32, average: 132.81, share: 36.4 },
  { name: 'Carlos', total: 3180, count: 24, average: 132.5, share: 27.2 },
  { name: 'Andrea', total: 2440, count: 18, average: 135.56, share: 20.9 },
  { name: 'Miguel', total: 1220, count: 11, average: 110.91, share: 10.4 },
  { name: 'Sin mesero', total: 590, count: 5, average: 118, share: 5.1 },
];

export const useCashierMetrics = () => {
  const [month, setMonth] = useState(getMonthValue());
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [metrics, setMetrics] = useState<WaiterMetric[]>([]);

  const loadData = useCallback(async (append: boolean) => {
    setStatus('loading');
    setError(null);

    const nextMetrics = append ? [...metrics, ...MOCK_METRICS] : MOCK_METRICS;
    setMetrics(nextMetrics);
    setHasMore(false);
    setStatus('success');
  }, [metrics]);

  useEffect(() => {
    loadData(false);
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
    setHasMore(false);
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
    hasMore,
    loadData,
    setMonth: updateMonth,
  };
};
