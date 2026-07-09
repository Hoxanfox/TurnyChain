import { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../../../app/store';
import { fetchProductStats } from '../api/productStatsApi';
import type { ProductSalesStat, ProductMetricsSummary } from '../types/metricsTypes';
import { useSearchParams } from 'react-router-dom';

export const useProductMetrics = () => {
  const { token } = useSelector((state: RootState) => state.auth);
  const [searchParams] = useSearchParams();
  const [metrics, setMetrics] = useState<ProductSalesStat[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filterDay = searchParams.get('day');
  const filterMonth = searchParams.get('month');
  const filterFrom = searchParams.get('from');
  const filterTo = searchParams.get('to');

  // Calculates the number of days for averaging
  const getDaysInPeriod = () => {
    if (filterDay) return 1;
    if (filterMonth) {
      const [year, month] = filterMonth.split('-').map(Number);
      return new Date(year, month, 0).getDate();
    }
    if (filterFrom && filterTo) {
      const start = new Date(filterFrom);
      const end = new Date(filterTo);
      return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    }
    return 1;
  };

  const daysInPeriod = getDaysInPeriod();

  const loadData = async () => {
    if (!token) return;
    
    let params = {};
    if (filterDay) params = { day: filterDay };
    else if (filterMonth) params = { month: filterMonth };
    else if (filterFrom && filterTo) params = { from: filterFrom, to: filterTo };
    else params = { day: new Date().toISOString().split('T')[0] }; // Default to today

    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchProductStats(token, params);
      setMetrics(data);
    } catch (err) {
      console.error('Error loading product metrics:', err);
      setError('Error al cargar métricas de productos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token, filterDay, filterMonth, filterFrom, filterTo]);

  const summary = useMemo((): ProductMetricsSummary => {
    if (metrics.length === 0) {
      return {
        totalProductsSold: 0,
        topProductName: 'N/A',
        topProductQuantity: 0,
        topCategoryName: 'N/A'
      };
    }

    const totalProductsSold = metrics.reduce((sum, metric) => sum + metric.total_quantity, 0);
    const topProduct = metrics[0]; // The API returns it ordered by total_quantity DESC

    // Find top category
    const categoryCounts: Record<string, number> = {};
    metrics.forEach(m => {
      categoryCounts[m.category_name] = (categoryCounts[m.category_name] || 0) + m.total_quantity;
    });

    let topCategoryName = 'N/A';
    let maxCategoryCount = 0;
    Object.entries(categoryCounts).forEach(([name, count]) => {
      if (count > maxCategoryCount) {
        maxCategoryCount = count;
        topCategoryName = name;
      }
    });

    return {
      totalProductsSold,
      topProductName: topProduct.product_name,
      topProductQuantity: topProduct.total_quantity,
      topCategoryName
    };
  }, [metrics]);

  return {
    metrics,
    summary,
    daysInPeriod,
    isLoading,
    error,
    hasFilters: !!(filterDay || filterMonth || (filterFrom && filterTo)),
    loadData
  };
};
