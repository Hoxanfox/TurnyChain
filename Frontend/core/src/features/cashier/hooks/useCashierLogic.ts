// =================================================================
// ARCHIVO: /src/features/cashier/hooks/useCashierLogic.ts
// =================================================================
import { useState, useMemo } from 'react';
import type { Order } from '../../../types/orders';
import type { FilterStatus, PaymentMethodFilter, SortBy } from '../components/CashierFilters';

interface CashierStatistics {
  totalPaid: number;
  totalPending: number;
  totalVerification: number;
  totalDelivered: number;
  cashTotal: number;
  transferTotal: number;
  ordersCount: number;
  averageOrderValue: number;
  // Nuevas estadísticas diarias
  dailyRevenue: number;        // Ingresos totales del día (solo pagos verificados)
  dailyCash: number;           // Dinero en efectivo del día
  dailyTransfer: number;       // Dinero en transferencia del día
  dailyOrdersCount: number;    // Cantidad de órdenes del día
  dailyAverageTicket: number;  // Ticket promedio del día
}

export const useCashierLogic = (activeOrders: Order[]) => {
  // Estados de UI
  const [showStats, setShowStats] = useState(true);
  const [selectedTable, setSelectedTable] = useState<number | null>(null);

  // Estados de filtros
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<PaymentMethodFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('time');

  // Estadísticas calculadas
  const statistics = useMemo((): CashierStatistics => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const stats = {
      totalPaid: 0,
      totalPending: 0,
      totalVerification: 0,
      totalDelivered: 0,
      cashTotal: 0,
      transferTotal: 0,
      ordersCount: activeOrders.length,
      averageOrderValue: 0,
      // Estadísticas diarias
      dailyRevenue: 0,
      dailyCash: 0,
      dailyTransfer: 0,
      dailyOrdersCount: 0,
      dailyAverageTicket: 0,
    };

    activeOrders.forEach((order) => {
      const orderDate = new Date(order.created_at);
      const isToday = orderDate >= todayStart;

      // Estadísticas generales
      switch (order.status) {
        case 'pagado':
          stats.totalPaid += order.total;
          break;
        case 'por_verificar':
          stats.totalVerification += order.total;
          break;
        case 'entregado':
          stats.totalDelivered += order.total;
          break;
        default:
          stats.totalPending += order.total;
      }

      if (order.payment_method === 'efectivo') {
        stats.cashTotal += order.total;
      } else if (order.payment_method === 'transferencia') {
        stats.transferTotal += order.total;
      }

      // Estadísticas diarias (solo órdenes del día actual)
      if (isToday) {
        stats.dailyOrdersCount++;

        // Solo contar en ingresos las órdenes pagadas (verificadas)
        if (order.status === 'pagado') {
          stats.dailyRevenue += order.total;

          if (order.payment_method === 'efectivo') {
            stats.dailyCash += order.total;
          } else if (order.payment_method === 'transferencia') {
            stats.dailyTransfer += order.total;
          }
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

  // Conteo de órdenes por verificar
  const pendingVerificationCount = useMemo(() => {
    return activeOrders.filter((order) => order.status === 'por_verificar').length;
  }, [activeOrders]);

  // Filtrado y búsqueda de órdenes
  const filteredOrders = useMemo(() => {
    return activeOrders.filter((order) => {
      // Filtro por estado
      if (filterStatus !== 'all' && order.status !== filterStatus) {
        return false;
      }

      // Filtro por método de pago
      if (paymentMethodFilter !== 'all' && order.payment_method !== paymentMethodFilter) {
        return false;
      }

      // Búsqueda por texto
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          order.id.toLowerCase().includes(query) ||
          order.table_number.toString().includes(query) ||
          order.waiter_name?.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [activeOrders, filterStatus, paymentMethodFilter, searchQuery]);

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
    sortBy,
    setSortBy,

    // Datos calculados
    statistics,
    pendingVerificationCount,
    filteredOrders,
    sortedOrders,
    ordersByTable,
    sortedSelectedOrders,

    // Funciones
    clearFilters,
    exportReport,
  };
};

