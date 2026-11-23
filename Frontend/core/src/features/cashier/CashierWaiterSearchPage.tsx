import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import type { AppDispatch, RootState } from '../../app/store';
import { fetchActiveOrders } from '../shared/orders/api/ordersSlice';
import { getOrdersSince } from '../shared/orders/api/ordersAPI';
import type { Order } from '../../types/orders';
import OrderGridView from '../shared/orders/components/OrderGridView';
import OrderDetailModal from '../shared/orders/components/OrderDetailModal';
import { formatMoney } from '../../utils/formatUtils.ts';

interface GroupResult {
  root: Order;
  members: Order[];
}

type StatusCategory = 'en_proceso' | 'por_cobrar' | 'por_verificar' | 'pagadas' | 'canceladas';
type StatusFilter = 'all' | StatusCategory;
type DayMode = 'today' | 'yesterday';

const STATUS_CHIPS: { value: StatusFilter; label: string; active: string; idle: string }[] = [
  { value: 'all', label: 'Todas', active: 'bg-gray-900 text-white border-gray-900', idle: 'bg-white text-gray-800 border-gray-300' },
  { value: 'por_cobrar', label: '🧾 Por Cobrar', active: 'bg-blue-600 text-white border-blue-600', idle: 'bg-white text-blue-700 border-blue-300' },
  { value: 'por_verificar', label: '⏳ Por Verificar', active: 'bg-amber-500 text-white border-amber-500', idle: 'bg-white text-amber-700 border-amber-300' },
  { value: 'pagadas', label: '✅ Pagadas', active: 'bg-emerald-600 text-white border-emerald-600', idle: 'bg-white text-emerald-700 border-emerald-300' },
  { value: 'en_proceso', label: '🔄 En proceso', active: 'bg-indigo-600 text-white border-indigo-600', idle: 'bg-white text-indigo-700 border-indigo-300' },
  { value: 'canceladas', label: '⛔ Canceladas', active: 'bg-red-600 text-white border-red-600', idle: 'bg-white text-red-700 border-red-300' },
];

const categoryOf = (status: string): StatusCategory => {
  if (status === 'pagado') return 'pagadas';
  if (status === 'cancelado') return 'canceladas';
  if (status === 'por_verificar') return 'por_verificar';
  if (status === 'entregado' || status === 'pendiente_aprobacion') return 'por_cobrar';
  return 'en_proceso';
};

const getDayKey = (value: Date) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value);

const shiftDayKey = (key: string, days: number) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
};

const CashierWaiterSearchPage: React.FC = () => {
  const { waiterName } = useParams<{ waiterName: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { activeOrders, status } = useSelector((state: RootState) => state.orders);
  const token = useSelector((state: RootState) => state.auth.token);

  const [selectedOrderIdForDetail, setSelectedOrderIdForDetail] = useState<string | null>(null);
  const [dayMode, setDayMode] = useState<DayMode>('today');
  const [yesterdayOrders, setYesterdayOrders] = useState<Order[]>([]);
  const [isLoadingYesterday, setIsLoadingYesterday] = useState(false);
  const [yesterdayError, setYesterdayError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [tableSearch, setTableSearch] = useState('');

  const query = decodeURIComponent(waiterName || '').trim().toLowerCase();
  const todayKey = getDayKey(new Date());
  const yesterdayKey = shiftDayKey(todayKey, -1);

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchActiveOrders());
    }
  }, [dispatch, status]);

  useEffect(() => {
    if (dayMode !== 'yesterday' || !token) return;
    let cancelled = false;
    setIsLoadingYesterday(true);
    setYesterdayError(null);
    getOrdersSince(token, `${yesterdayKey}T00:00:00-05:00`)
      .then((orders) => {
        if (!cancelled) {
          setYesterdayOrders(
            orders.filter((order) => getDayKey(new Date(order.created_at)) === yesterdayKey)
          );
        }
      })
      .catch(() => {
        if (!cancelled) setYesterdayError('No se pudieron cargar las comandas de ayer.');
      })
      .finally(() => {
        if (!cancelled) setIsLoadingYesterday(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dayMode, token, yesterdayKey]);

  const sourceOrders = useMemo(() => {
    if (dayMode === 'yesterday') return yesterdayOrders;
    return activeOrders.filter((order) => getDayKey(new Date(order.created_at)) === todayKey);
  }, [dayMode, yesterdayOrders, activeOrders, todayKey]);

  const matchedGroups = useMemo((): GroupResult[] => {
    if (!query) return [];

    const orderById = new Map<string, Order>();
    sourceOrders.forEach((order) => orderById.set(order.id, order));

    const childrenByParent = new Map<string, Order[]>();
    sourceOrders.forEach((order) => {
      if (!order.parent_order_id || !orderById.has(order.parent_order_id)) return;
      const list = childrenByParent.get(order.parent_order_id) || [];
      list.push(order);
      childrenByParent.set(order.parent_order_id, list);
    });

    childrenByParent.forEach((children, parentId) => {
      children.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      childrenByParent.set(parentId, children);
    });

    const matchedOrders = sourceOrders.filter((order) =>
      (order.waiter_name || '').toLowerCase().includes(query)
    );
    if (matchedOrders.length === 0) return [];

    const findRootId = (startOrder: Order): string => {
      let current = startOrder;
      while (current.parent_order_id && orderById.has(current.parent_order_id)) {
        const parent = orderById.get(current.parent_order_id);
        if (!parent) break;
        current = parent;
      }
      return current.id;
    };

    const rootIds = new Set<string>();
    matchedOrders.forEach((order) => rootIds.add(findRootId(order)));

    const groups: GroupResult[] = [];
    rootIds.forEach((rootId) => {
      const root = orderById.get(rootId);
      if (!root) return;

      const members: Order[] = [root];
      const appendChildren = (parentId: string) => {
        (childrenByParent.get(parentId) || []).forEach((child) => {
          members.push(child);
          appendChildren(child.id);
        });
      };
      appendChildren(root.id);

      groups.push({ root, members });
    });

    groups.sort((a, b) => new Date(b.root.created_at).getTime() - new Date(a.root.created_at).getTime());
    return groups;
  }, [sourceOrders, query]);

  const waiterOrders = useMemo(
    () =>
      matchedGroups
        .flatMap((group) => group.members)
        .filter((order) => (order.waiter_name || '').toLowerCase().includes(query)),
    [matchedGroups, query]
  );

  const counts = useMemo(() => {
    const result: Record<StatusFilter, number> = {
      all: waiterOrders.length,
      en_proceso: 0,
      por_cobrar: 0,
      por_verificar: 0,
      pagadas: 0,
      canceladas: 0,
    };
    waiterOrders.forEach((order) => {
      result[categoryOf(order.status)] += 1;
    });
    return result;
  }, [waiterOrders]);

  const summary = useMemo(() => {
    let vendido = 0;
    let porCobrar = 0;
    waiterOrders.forEach((order) => {
      const category = categoryOf(order.status);
      if (category === 'pagadas') vendido += order.total || 0;
      if (category === 'por_cobrar') porCobrar += order.total || 0;
    });
    const mesas = new Set(waiterOrders.map((order) => order.table_number)).size;
    return { vendido, porCobrar, mesas };
  }, [waiterOrders]);

  const visibleGroups = useMemo((): GroupResult[] => {
    const search = tableSearch.trim().toLowerCase().replace(/^mesa\s*/, '');
    const passesFilters = (order: Order) =>
      (statusFilter === 'all' || categoryOf(order.status) === statusFilter) &&
      (!search || String(order.table_number) === search || order.id.toLowerCase().startsWith(search));

    return matchedGroups
      .map((group) => ({ root: group.root, members: group.members.filter(passesFilters) }))
      .filter(
        (group) =>
          group.members.length > 0 &&
          group.members.some((member) => (member.waiter_name || '').toLowerCase().includes(query))
      );
  }, [matchedGroups, statusFilter, tableSearch, query]);

  const isLoading = dayMode === 'today' ? status === 'loading' : isLoadingYesterday;
  const periodLabel = dayMode === 'today' ? 'Hoy' : 'Ayer';

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-cyan-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="bg-white rounded-2xl shadow-lg border border-indigo-100 p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Resultado por Mesero</h1>
              <p className="text-sm text-gray-600 mt-1">
                Filtro: <span className="font-semibold">{query || 'sin valor'}</span>
              </p>
              <div className="flex gap-2 mt-3">
                {(['today', 'yesterday'] as DayMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setDayMode(mode)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold border-2 transition-colors ${
                      dayMode === mode
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-indigo-700 border-indigo-300 hover:bg-indigo-50'
                    }`}
                  >
                    {mode === 'today' ? 'Hoy' : 'Ayer'}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold self-start md:self-auto"
            >
              ← Volver al panel
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <p className="text-xs text-gray-500">Comandas hechas ({periodLabel})</p>
            <p className="text-2xl font-bold text-gray-900">{counts.all}</p>
          </div>
          <div className="bg-white rounded-xl border border-emerald-200 shadow-sm p-4">
            <p className="text-xs text-gray-500">Vendido (pagadas)</p>
            <p className="text-2xl font-bold text-emerald-700">{formatMoney(summary.vendido)}</p>
          </div>
          <div className="bg-white rounded-xl border border-blue-200 shadow-sm p-4">
            <p className="text-xs text-gray-500">Por cobrar</p>
            <p className="text-2xl font-bold text-blue-700">{formatMoney(summary.porCobrar)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <p className="text-xs text-gray-500">Mesas atendidas</p>
            <p className="text-2xl font-bold text-gray-900">{summary.mesas}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow border border-gray-200 p-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {STATUS_CHIPS.map((chip) => (
              <button
                key={chip.value}
                onClick={() => setStatusFilter(chip.value)}
                className={`px-3 py-1.5 rounded-full text-sm font-semibold border-2 transition-colors ${
                  statusFilter === chip.value ? chip.active : chip.idle
                }`}
              >
                {chip.label} ({counts[chip.value]})
              </button>
            ))}
          </div>
          <input
            type="text"
            value={tableSearch}
            onChange={(e) => setTableSearch(e.target.value)}
            placeholder="Buscar por número de mesa (ej. 5) o ID de comanda"
            className="w-full md:w-96 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        {yesterdayError && dayMode === 'yesterday' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center text-red-700 text-sm">
            ❌ {yesterdayError}
          </div>
        )}

        {isLoading ? (
          <div className="bg-white rounded-2xl shadow p-10 text-center text-gray-600">Cargando comandas...</div>
        ) : visibleGroups.length === 0 ? (
          <div className="bg-white rounded-2xl shadow p-10 text-center">
            <p className="text-5xl mb-3">🔎</p>
            <p className="text-lg font-semibold text-gray-800">
              {query && counts.all === 0
                ? `No se encontraron comandas de ese mesero (${periodLabel.toLowerCase()}).`
                : 'Ninguna comanda coincide con los filtros.'}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              {counts.all === 0
                ? 'Prueba con otro nombre o cambia el día.'
                : 'Cambia el estado o limpia la búsqueda por mesa.'}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {visibleGroups.map((group) => (
              <section key={group.root.id} className="bg-white rounded-2xl shadow border border-gray-200 p-4 md:p-5">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Mesa {group.root.table_number}</h2>
                    <p className="text-sm text-gray-600">
                      {group.members.length > 1
                        ? `Grupo de ${group.members.length} comandas (padre + hijas)`
                        : 'Comanda individual'}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      navigate('/dashboard', {
                        state: {
                          cashierShortcut: {
                            tableNumber: group.root.table_number,
                            orderId: group.root.id,
                          },
                        },
                      })
                    }
                    className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold"
                  >
                    Gestionar en modal de mesa
                  </button>
                </div>

                <OrderGridView
                  orders={group.members}
                  renderActions={(order) => (
                    <div className="space-y-2">
                      <button
                        onClick={() =>
                          navigate('/dashboard', {
                            state: {
                              cashierShortcut: {
                                tableNumber: order.table_number,
                                orderId: order.id,
                              },
                            },
                          })
                        }
                        className="w-full px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-semibold"
                      >
                        Ir a gestionar pago
                      </button>
                      <button
                        onClick={() => setSelectedOrderIdForDetail(order.id)}
                        className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                      >
                        Ver detalle
                      </button>
                    </div>
                  )}
                />
              </section>
            ))}
          </div>
        )}
      </div>

      {selectedOrderIdForDetail && (
        <OrderDetailModal
          orderId={selectedOrderIdForDetail}
          onClose={() => setSelectedOrderIdForDetail(null)}
          editable={true}
        />
      )}
    </div>
  );
};

export default CashierWaiterSearchPage;
