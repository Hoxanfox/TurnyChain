import { useState, useMemo, useEffect } from 'react';
import type { Order } from '../../../../../types/orders';
import { getOrderPaymentCategory } from '../../../hooks/useCashierLogic';
import type { FilterStatus, PaymentMethodFilter } from '../../cashierDashboardShared/CashierFilters';
import type { CashierStatistics } from '../../../types/cashierDashboardTypes';

export interface UseCashierDesktopViewModelProps {
  ordersByTable: Record<number, Order[]>;
  statistics: CashierStatistics;
  filterStatus: FilterStatus;
  paymentMethodFilter: PaymentMethodFilter;
  searchQuery: string;
  waiterQuery: string;
  orderIdQuery: string;
  selectedTable: number | null;
  shortcutTarget?: { tableNumber: number; orderId: string } | null;
  shortcutNonce?: number;
  onSelectTable: (tableNumber: number | null) => void;
}

export const useCashierDesktopViewModel = ({
  ordersByTable,
  filterStatus,
  paymentMethodFilter,
  searchQuery,
  waiterQuery,
  orderIdQuery,
  shortcutTarget,
  shortcutNonce,
  onSelectTable,
}: UseCashierDesktopViewModelProps) => {
  const [viewMode, setViewMode] = useState<'tables' | 'urgent'>('tables');
  const [urgentTab, setUrgentTab] = useState<'por_verificar' | 'entregado' | 'pagado' | 'cancelado'>('por_verificar');
  const [focusedOrderId, setFocusedOrderId] = useState<string | null>(null);
  
  // Modals state
  const [isOrderSearchModalOpen, setIsOrderSearchModalOpen] = useState(false);
  const [isWaiterPickerOpen, setIsWaiterPickerOpen] = useState(false);
  const [isQuickTablePickerOpen, setIsQuickTablePickerOpen] = useState(false);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [openPrintMonitorSignal, setOpenPrintMonitorSignal] = useState(0);
  
  // Modals data state
  const [selectedProofOrder, setSelectedProofOrder] = useState<Order | null>(null);
  const [selectedOrderIdForDetail, setSelectedOrderIdForDetail] = useState<string | null>(null);

  const isPorCobrarStatus = (status: string) => status === 'entregado' || status === 'pendiente_aprobacion';
  const isPayableStatus = (status: string) => status === 'por_verificar' || isPorCobrarStatus(status);

  // Derived Data
  const allOrders = useMemo(() => Object.values(ordersByTable).flat(), [ordersByTable]);
  const totalOrders = allOrders.length;

  const cashPayments = useMemo(() => allOrders.filter((o) => o.status === 'pagado' && getOrderPaymentCategory(o) === 'efectivo').length, [allOrders]);
  const transferPayments = useMemo(() => allOrders.filter((o) => o.status === 'pagado' && getOrderPaymentCategory(o) === 'transferencia').length, [allOrders]);
  const mixedPayments = useMemo(() => allOrders.filter((o) => o.status === 'pagado' && getOrderPaymentCategory(o) === 'mixto').length, [allOrders]);
  const urgentOrders = useMemo(() => allOrders.filter((o) => o.status === 'por_verificar'), [allOrders]);
  const deliveredOrders = useMemo(() => allOrders.filter((o) => isPorCobrarStatus(o.status)), [allOrders]);
  const paidOrders = useMemo(() => allOrders.filter((o) => o.status === 'pagado'), [allOrders]);
  
  const tableNumbers = useMemo(() => Object.keys(ordersByTable).map(Number).sort((a, b) => a - b), [ordersByTable]);

  const waiterOptions = useMemo(() => {
    const waiterMap = new Map<string, { ordersCount: number; tables: Set<number> }>();

    allOrders.forEach((order) => {
      const waiterName = (order.waiter_name || '').trim();
      if (!waiterName) return;

      const current = waiterMap.get(waiterName) || { ordersCount: 0, tables: new Set<number>() };
      current.ordersCount += 1;
      current.tables.add(order.table_number);
      waiterMap.set(waiterName, current);
    });

    return Array.from(waiterMap.entries())
      .map(([name, value]) => ({
        name,
        ordersCount: value.ordersCount,
        tablesCount: value.tables.size,
      }))
      .sort((a, b) => b.ordersCount - a.ordersCount || a.name.localeCompare(b.name));
  }, [allOrders]);

  const filteredGroupedOrders = useMemo(() => {
    const orderById = new Map<string, Order>();
    allOrders.forEach((order) => orderById.set(order.id, order));

    const childrenByParent = new Map<string, Order[]>();
    allOrders.forEach((order) => {
      if (!order.parent_order_id || !orderById.has(order.parent_order_id)) return;
      const list = childrenByParent.get(order.parent_order_id) || [];
      list.push(order);
      childrenByParent.set(order.parent_order_id, list);
    });

    const roots = allOrders
      .filter((order) => !order.parent_order_id || !orderById.has(order.parent_order_id))
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    return roots
      .map((root) => {
        const members: Order[] = [root];

        const appendChildren = (parentId: string) => {
          const children = childrenByParent.get(parentId) || [];
          children.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          children.forEach((child) => {
            members.push(child);
            appendChildren(child.id);
          });
        };

        appendChildren(root.id);

        return {
          root,
          members,
          isLinkedGroup: members.length > 1,
          payableTotal: members
            .filter((member) => isPayableStatus(member.status))
            .reduce((sum, current) => sum + current.total, 0),
          pendingMembers: members.filter((member) => member.status === 'por_verificar'),
        };
      })
      .filter((group) => {
        if (urgentTab === 'por_verificar') {
          return group.members.some(m => m.status === 'por_verificar');
        }
        if (urgentTab === 'entregado') {
          return group.members.some(m => isPorCobrarStatus(m.status));
        }
        if (urgentTab === 'pagado') {
          return group.members.some(m => m.status === 'pagado');
        }
        if (urgentTab === 'cancelado') {
          return group.members.some(m => m.status === 'cancelado');
        }
        return false;
      });
  }, [allOrders, urgentTab]);

  const activeFiltersCount = useMemo(() => [
    filterStatus !== 'all',
    paymentMethodFilter !== 'all',
    searchQuery.trim() !== '',
    waiterQuery.trim() !== '',
    orderIdQuery.trim() !== '',
  ].filter(Boolean).length, [filterStatus, paymentMethodFilter, searchQuery, waiterQuery, orderIdQuery]);

  // Handle shortcuts
  useEffect(() => {
    if (!shortcutTarget || !shortcutNonce) return;
    setViewMode('tables');
    onSelectTable(shortcutTarget.tableNumber);
    setFocusedOrderId(shortcutTarget.orderId);
  }, [shortcutNonce, shortcutTarget, onSelectTable]);

  return {
    state: {
      viewMode,
      urgentTab,
      focusedOrderId,
      isOrderSearchModalOpen,
      isWaiterPickerOpen,
      isQuickTablePickerOpen,
      isAttendanceModalOpen,
      openPrintMonitorSignal,
      selectedProofOrder,
      selectedOrderIdForDetail,
    },
    actions: {
      setViewMode,
      setUrgentTab,
      setFocusedOrderId,
      setIsOrderSearchModalOpen,
      setIsWaiterPickerOpen,
      setIsQuickTablePickerOpen,
      setIsAttendanceModalOpen,
      setOpenPrintMonitorSignal,
      setSelectedProofOrder,
      setSelectedOrderIdForDetail,
    },
    derived: {
      allOrders,
      totalOrders,
      cashPayments,
      transferPayments,
      mixedPayments,
      urgentOrders,
      deliveredOrders,
      paidOrders,
      tableNumbers,
      waiterOptions,
      filteredGroupedOrders,
      activeFiltersCount,
    }
  };
};
