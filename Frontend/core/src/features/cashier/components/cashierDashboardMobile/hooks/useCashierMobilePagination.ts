import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Order } from '../../../../../types/orders';

const DEFAULT_TABLES_PAGE = 8;
const DEFAULT_URGENT_PAGE = 6;

export const useCashierMobilePagination = (
  tableNumbers: number[],
  urgentOrders: Order[],
  tablesPageSize = DEFAULT_TABLES_PAGE,
  urgentPageSize = DEFAULT_URGENT_PAGE
) => {
  const [tableLimit, setTableLimit] = useState(tablesPageSize);
  const [urgentLimit, setUrgentLimit] = useState(urgentPageSize);

  useEffect(() => {
    if (tableNumbers.length === 0) {
      setTableLimit(tablesPageSize);
      return;
    }
    if (tableNumbers.length < tableLimit) {
      setTableLimit(tableNumbers.length);
    }
  }, [tableNumbers.length, tableLimit, tablesPageSize]);

  useEffect(() => {
    if (urgentOrders.length === 0) {
      setUrgentLimit(urgentPageSize);
      return;
    }
    if (urgentOrders.length < urgentLimit) {
      setUrgentLimit(urgentOrders.length);
    }
  }, [urgentOrders.length, urgentLimit, urgentPageSize]);

  const visibleTableNumbers = useMemo(
    () => tableNumbers.slice(0, tableLimit),
    [tableNumbers, tableLimit]
  );

  const visibleUrgentOrders = useMemo(
    () => urgentOrders.slice(0, urgentLimit),
    [urgentOrders, urgentLimit]
  );

  const hasMoreTables = tableNumbers.length > tableLimit;
  const hasMoreUrgent = urgentOrders.length > urgentLimit;

  const loadMoreTables = useCallback(() => {
    setTableLimit((prev) => Math.min(prev + tablesPageSize, tableNumbers.length));
  }, [tableNumbers.length, tablesPageSize]);

  const loadMoreUrgent = useCallback(() => {
    setUrgentLimit((prev) => Math.min(prev + urgentPageSize, urgentOrders.length));
  }, [urgentOrders.length, urgentPageSize]);

  return {
    visibleTableNumbers,
    visibleUrgentOrders,
    hasMoreTables,
    hasMoreUrgent,
    loadMoreTables,
    loadMoreUrgent,
  };
};
