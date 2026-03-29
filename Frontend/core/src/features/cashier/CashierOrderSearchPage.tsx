import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import type { AppDispatch, RootState } from '../../app/store';
import { fetchActiveOrders } from '../shared/orders/api/ordersSlice';
import type { Order } from '../../types/orders';
import OrderGridView from '../shared/orders/components/OrderGridView';
import OrderDetailModal from '../shared/orders/components/OrderDetailModal';

interface GroupResult {
  root: Order;
  members: Order[];
}

const CashierOrderSearchPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { activeOrders, status } = useSelector((state: RootState) => state.orders);

  const [selectedOrderIdForDetail, setSelectedOrderIdForDetail] = useState<string | null>(null);

  const query = decodeURIComponent(orderId || '').trim().toLowerCase();

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchActiveOrders());
    }
  }, [dispatch, status]);

  const groupedResults = useMemo((): GroupResult[] => {
    if (!query) return [];

    const orderById = new Map<string, Order>();
    activeOrders.forEach((order) => orderById.set(order.id, order));

    const childrenByParent = new Map<string, Order[]>();
    activeOrders.forEach((order) => {
      if (!order.parent_order_id || !orderById.has(order.parent_order_id)) return;
      const list = childrenByParent.get(order.parent_order_id) || [];
      list.push(order);
      childrenByParent.set(order.parent_order_id, list);
    });

    childrenByParent.forEach((children, parentId) => {
      children.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      childrenByParent.set(parentId, children);
    });

    const directlyMatchedOrders = activeOrders.filter((order) =>
      order.id.toLowerCase().includes(query)
    );

    if (directlyMatchedOrders.length === 0) return [];

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
    directlyMatchedOrders.forEach((order) => {
      rootIds.add(findRootId(order));
    });

    const groups: GroupResult[] = [];

    rootIds.forEach((rootId) => {
      const root = orderById.get(rootId);
      if (!root) return;

      const members: Order[] = [root];

      const appendChildren = (parentId: string) => {
        const children = childrenByParent.get(parentId) || [];
        children.forEach((child) => {
          members.push(child);
          appendChildren(child.id);
        });
      };

      appendChildren(root.id);
      groups.push({ root, members });
    });

    groups.sort((a, b) => new Date(b.root.created_at).getTime() - new Date(a.root.created_at).getTime());
    return groups;
  }, [activeOrders, query]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-cyan-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg border border-indigo-100 p-4 md:p-6 mb-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Resultado de búsqueda por ID</h1>
              <p className="text-sm text-gray-600 mt-1">
                Consulta: <span className="font-semibold">{query || 'sin valor'}</span>
              </p>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
            >
              ← Volver al panel
            </button>
          </div>
        </div>

        {status === 'loading' ? (
          <div className="bg-white rounded-2xl shadow p-10 text-center text-gray-600">Cargando comandas...</div>
        ) : groupedResults.length === 0 ? (
          <div className="bg-white rounded-2xl shadow p-10 text-center">
            <p className="text-5xl mb-3">🔎</p>
            <p className="text-lg font-semibold text-gray-800">No se encontró ninguna comanda para ese ID.</p>
            <p className="text-sm text-gray-500 mt-2">Prueba con más caracteres del ID.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {groupedResults.map((group) => (
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
          editable={false}
        />
      )}
    </div>
  );
};

export default CashierOrderSearchPage;
