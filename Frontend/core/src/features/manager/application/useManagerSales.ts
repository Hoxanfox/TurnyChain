import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getDailySales,
  getMonthlySales,
  getYearlySales,
  getProductSales,
  type DailySalesPoint,
  type MonthlySalesPoint,
  type YearlySalesPoint,
  type ProductSalesPoint,
} from '../api/salesApi';

const bogotaParts = (date: Date) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  return Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
};

const currentMonth = () => {
  const parts = bogotaParts(new Date());
  return `${parts.year}-${parts.month}`;
};

const monthRange = (month: string) => {
  const [year, monthNumber] = month.split('-').map(Number);
  const start = new Date(Date.UTC(year, monthNumber - 1, 1));
  const next = new Date(Date.UTC(year, monthNumber, 1));
  return {
    from: `${year}-${String(monthNumber).padStart(2, '0')}-01`,
    to: `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-01`,
    days: Math.round((next.getTime() - start.getTime()) / 86400000),
  };
};

const fillRecentMonths = (points: MonthlySalesPoint[]) => {
  const now = bogotaParts(new Date());
  const cursor = new Date(Date.UTC(Number(now.year), Number(now.month) - 1, 1));
  const byMonth = new Map(points.map((point) => [point.month, point]));
  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() - (11 - index), 1));
    const month = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
    return byMonth.get(month) || { month, total: 0, order_count: 0 };
  });
};

const fillMonthDays = (points: DailySalesPoint[], month: string) => {
  const { days } = monthRange(month);
  const [year, monthNumber] = month.split('-').map(Number);
  const byDate = new Map(points.map((point) => [point.date, point]));
  return Array.from({ length: days }, (_, index) => {
    const date = `${year}-${String(monthNumber).padStart(2, '0')}-${String(index + 1).padStart(2, '0')}`;
    return byDate.get(date) || { date, total: 0, order_count: 0 };
  });
};

const trimToRecordedRange = (points: DailySalesPoint[]) => {
  const firstRecorded = points.findIndex((point) => point.order_count > 0 || point.total > 0);
  if (firstRecorded === -1) return points.slice(0, 1);
  let lastRecorded = points.length - 1;
  while (lastRecorded > firstRecorded && points[lastRecorded].order_count === 0 && points[lastRecorded].total === 0) lastRecorded -= 1;
  return points.slice(firstRecorded, lastRecorded + 1);
};

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

export const useManagerSales = () => {
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [dailyData, setDailyData] = useState<DailySalesPoint[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlySalesPoint[]>([]);
  const [yearlyData, setYearlyData] = useState<YearlySalesPoint[]>([]);
  const [productData, setProductData] = useState<ProductSalesPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const range = monthRange(selectedMonth);
      const [daily, monthly, yearly, products] = await Promise.all([
        getDailySales(range.from, range.to),
        getMonthlySales(),
        getYearlySales(),
        getProductSales(selectedMonth),
      ]);
      setDailyData(trimToRecordedRange(fillMonthDays(daily, selectedMonth)));
      setMonthlyData(fillRecentMonths(monthly));
      setYearlyData(yearly);
      setProductData(products);
      setError(null);
    } catch (err) {
      console.error('Error loading manager sales', err);
      setError('No se pudieron cargar las ventas.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => { void refresh(); }, [refresh]);

  const summary = useMemo((): SalesSummary => {
    const current = currentMonth();
    const total = dailyData.reduce((sum, point) => sum + point.total, 0);
    const totalOrders = dailyData.reduce((sum, point) => sum + point.order_count, 0);
    const today = dailyData.find((point) => point.date === `${current}-${bogotaParts(new Date()).day}`);
    const bestDay = dailyData.reduce<{ date: string; total: number } | null>((best, point) => point.total > 0 && (!best || point.total > best.total) ? { date: point.date, total: point.total } : best, null);
    const selectedMonthPoint = monthlyData.find((point) => point.month === selectedMonth);
    return {
      today: today?.total ?? 0,
      todayOrders: today?.order_count ?? 0,
      month: selectedMonthPoint?.total ?? total,
      monthOrders: selectedMonthPoint?.order_count ?? totalOrders,
      total,
      totalOrders,
      averageTicket: totalOrders > 0 ? total / totalOrders : 0,
      bestDay,
    };
  }, [dailyData, monthlyData, selectedMonth]);

  return { dailyData, monthlyData, yearlyData, productData, selectedMonth, setSelectedMonth, summary, isLoading, error, refresh };
};
