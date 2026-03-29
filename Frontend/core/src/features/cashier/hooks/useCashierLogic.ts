// =================================================================
// ARCHIVO: /src/features/cashier/hooks/useCashierLogic.ts
// =================================================================
import { useState, useMemo } from 'react';
import type { Order } from '../../../types/orders';
import type { FilterStatus, PaymentMethodFilter, SortBy } from '../components/cashierDashboardShared/CashierFilters';
import type { CashierStatistics } from '../types/cashierDashboardTypes';

export const useCashierLogic = (activeOrders: Order[]) => {
  const getDayKey = (value: Date) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(value);

  const isPorCobrarStatus = (status: string) => status === 'entregado' || status === 'pendiente_aprobacion';

  // Estados de UI
  const [showStats, setShowStats] = useState(false); // 🔧 Oculto por defecto
  const [selectedTable, setSelectedTable] = useState<number | null>(null);

  // Estados de filtros
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<PaymentMethodFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [orderIdQuery, setOrderIdQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('time');

  // Estadísticas calculadas - SOLO DEL DÍA ACTUAL
  const statistics = useMemo((): CashierStatistics => {
    const todayKey = getDayKey(new Date());

    const stats = {
      totalPaid: 0,
      totalPending: 0,
      totalVerification: 0,
      totalDelivered: 0,
      cashTotal: 0,
      transferTotal: 0,
      ordersCount: 0,
      averageOrderValue: 0,
      // Estadísticas diarias
      dailyRevenue: 0,
      dailyCash: 0,
      dailyTransfer: 0,
      dailyOrdersCount: 0,
      dailyAverageTicket: 0,
    };

    // FILTRAR SOLO ÓRDENES DEL DÍA ACTUAL
    const todayOrders = activeOrders.filter((order) => {
      return getDayKey(new Date(order.created_at)) === todayKey;
    });

    stats.ordersCount = todayOrders.length;

    todayOrders.forEach((order) => {
      // Estadísticas por estado
      switch (order.status) {
        case 'pagado':
          stats.totalPaid += order.total;
          stats.dailyRevenue += order.total;
          break;
        case 'por_verificar':
          stats.totalVerification += order.total;
          break;
        case 'entregado':
        case 'pendiente_aprobacion':
          stats.totalDelivered += order.total;
          break;
        default:
          stats.totalPending += order.total;
      }

      // Contador de órdenes del día
      stats.dailyOrdersCount++;

      // Estadísticas por método de pago (solo para órdenes pagadas)
      if (order.status === 'pagado') {
        if (order.payment_method === 'efectivo') {
          stats.cashTotal += order.total;
          stats.dailyCash += order.total;
        } else if (order.payment_method === 'transferencia') {
          stats.transferTotal += order.total;
          stats.dailyTransfer += order.total;
        }
      }
    });

    stats.averageOrderValue = stats.ordersCount > 0
      ? (stats.totalPaid + stats.totalPending + stats.totalVerification + stats.totalDelivered) / stats.ordersCount
      : 0;

    stats.dailyAverageTicket = stats.dailyOrdersCount > 0
      ? stats.dailyRevenue / stats.dailyOrdersCount
      : 0;

    return stats;
  }, [activeOrders]);

  // Conteos de órdenes por estado (sin filtro, solo del día actual)
  const pendingVerificationCount = useMemo(() => {
    const todayKey = getDayKey(new Date());
    return activeOrders.filter((order) => {
      return getDayKey(new Date(order.created_at)) === todayKey && order.status === 'por_verificar';
    }).length;
  }, [activeOrders]);

  const deliveredCount = useMemo(() => {
    const todayKey = getDayKey(new Date());
    return activeOrders.filter((order) => {
      return getDayKey(new Date(order.created_at)) === todayKey && isPorCobrarStatus(order.status);
    }).length;
  }, [activeOrders]);

  const paidCount = useMemo(() => {
    const todayKey = getDayKey(new Date());
    return activeOrders.filter((order) => {
      return getDayKey(new Date(order.created_at)) === todayKey && order.status === 'pagado';
    }).length;
  }, [activeOrders]);

  // Filtrado y búsqueda de órdenes - SOLO DEL DÍA ACTUAL
  const filteredOrders = useMemo(() => {
    const todayKey = getDayKey(new Date());
    const normalizedOrderIdQuery = orderIdQuery.trim().toLowerCase();

    const todayOrders = activeOrders.filter((order) => getDayKey(new Date(order.created_at)) === todayKey);

    const baseMatched = todayOrders.filter((order) => {

      // Filtro por estado
      if (filterStatus !== 'all') {
        if (filterStatus === 'entregado' && !isPorCobrarStatus(order.status)) {
          return false;
        }
        if (filterStatus !== 'entregado' && order.status !== filterStatus) {
          return false;
        }
      }

      // Si está por cobrar, no exigir método de pago en el filtro de método
      if (isPorCobrarStatus(order.status) && paymentMethodFilter !== 'all') {
        return false;
      }

      // Filtro por método de pago
      if (!isPorCobrarStatus(order.status) && paymentMethodFilter !== 'all' && order.payment_method !== paymentMethodFilter) {
        return false;
      }

      // Búsqueda por texto
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          order.table_number.toString().includes(query) ||
          order.waiter_name?.toLowerCase().includes(query)
        );
      }

      return true;
    });

    if (!normalizedOrderIdQuery) {
      return baseMatched;
    }

    const directlyMatchedById = todayOrders.filter((order) =>
      order.id.toLowerCase().includes(normalizedOrderIdQuery)
    );

    if (directlyMatchedById.length === 0) {
      return [];
    }

    const relatedIds = new Set<string>();
    directlyMatchedById.forEach((order) => {
      relatedIds.add(order.id);
      if (order.parent_order_id) {
        relatedIds.add(order.parent_order_id);
      }
    });

    let changed = true;
    while (changed) {
      changed = false;

      todayOrders.forEach((order) => {
        const parentId = order.parent_order_id || '';
        const isRelated = relatedIds.has(order.id) || (!!parentId && relatedIds.has(parentId));

        if (!isRelated) {
          return;
        }

        if (!relatedIds.has(order.id)) {
          relatedIds.add(order.id);
          changed = true;
        }

        if (parentId && !relatedIds.has(parentId)) {
          relatedIds.add(parentId);
          changed = true;
        }
      });
    }

    return todayOrders.filter((order) => relatedIds.has(order.id));
  }, [activeOrders, filterStatus, paymentMethodFilter, searchQuery, orderIdQuery]);

  // Ordenamiento de órdenes
  const sortedOrders = useMemo(() => {
    const sorted = [...filteredOrders];

    switch (sortBy) {
      case 'time':
        sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'total':
        sorted.sort((a, b) => b.total - a.total);
        break;
      case 'table':
        sorted.sort((a, b) => a.table_number - b.table_number);
        break;
    }

    return sorted;
  }, [filteredOrders, sortBy]);

  // Agrupación de órdenes por mesa
  const ordersByTable = useMemo(() => {
    return sortedOrders.reduce((acc, order) => {
      if (!acc[order.table_number]) {
        acc[order.table_number] = [];
      }
      acc[order.table_number].push(order);
      return acc;
    }, {} as Record<number, Order[]>);
  }, [sortedOrders]);

  // Órdenes de la mesa seleccionada (ordenadas)
  const sortedSelectedOrders = useMemo(() => {
    if (!selectedTable) return [];
    return ordersByTable[selectedTable] || [];
  }, [selectedTable, ordersByTable]);

  // Función para limpiar filtros
  const clearFilters = () => {
    setFilterStatus('all');
    setPaymentMethodFilter('all');
    setSearchQuery('');
    setOrderIdQuery('');
  };

  // Función para exportar reporte CSV
  const exportReport = () => {
    const csvContent = [
      ['Fecha', 'Mesa', 'Mesero', 'Total', 'Estado', 'Método de Pago'].join(','),
      ...sortedOrders.map((order) =>
        [
          new Date(order.created_at).toLocaleString(),
          order.table_number,
          order.waiter_name || 'N/A',
          order.total.toFixed(2),
          order.status,
          order.payment_method || 'N/A',
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `reporte_cajero_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  return {
    // Estados UI
    showStats,
    setShowStats,
    selectedTable,
    setSelectedTable,

    // Estados de filtros
    filterStatus,
    setFilterStatus,
    paymentMethodFilter,
    setPaymentMethodFilter,
    searchQuery,
    setSearchQuery,
    orderIdQuery,
    setOrderIdQuery,
    sortBy,
    setSortBy,

    // Datos calculados
    statistics,
    pendingVerificationCount,
    deliveredCount,
    paidCount,
    filteredOrders,
    sortedOrders,
    ordersByTable,
    sortedSelectedOrders,

    // Funciones
    clearFilters,
    exportReport,
  };
};

