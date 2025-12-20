// =================================================================
// ARCHIVO: /src/features/waiter/WaiterDashboardDesktop.tsx
// Vista de escritorio con layout de columnas
// =================================================================
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addNewOrder } from '../shared/orders/api/ordersSlice.ts';
import { fetchTables } from '../admin/components/tables/api/tablesSlice.ts';
import type { AppDispatch, RootState } from '../../app/store';
import type { MenuItem, CartItem } from '../../types/menu';
import OrderDetailModal from '../shared/orders/components/OrderDetailModal.tsx';
import MyOrdersModal from './components/MyOrdersModal';
import CheckoutBeforeSendModal from './components/CheckoutBeforeSendModal';
import LogoutButton from '../../components/LogoutButton';
import CustomizeOrderItemModal from './components/CustomizeOrderItemModal';
import MenuDisplay from './components/MenuDisplay';
import CurrentOrder from './components/CurrentOrder';

// Importar funciones y tipos comunes del feature
import {
  createCartItemFromCustomization,
  removeItemFromCart,
  updateCartItemPrice,
  incrementItemQuantity,
  decrementItemQuantity,
  toggleItemTakeout,
  buildOrderPayload,
  canSendOrder,
  findTableById,
  type CustomizationData
} from './utils/waiterUtils.ts';
import DeliveryInfoModal from './components/DeliveryInfoModal';

const WaiterDashboardDesktop: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { tables } = useSelector((state: RootState) => state.tables);
  const { status } = useSelector((state: RootState) => state.tables);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [tableId, setTableId] = useState('');
  const [orderType, setOrderType] = useState<string>('mesa');
  const [deliveryData, setDeliveryData] = useState<{
    address: string;
    phone: string;
    notes?: string;
  } | null>(null);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [editingCartItem, setEditingCartItem] = useState<CartItem | null>(null);
  const [viewingOrderId, setViewingOrderId] = useState<string | null>(null);
  const [isMyOrdersModalOpen, setIsMyOrdersModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isCheckoutBeforeSend, setIsCheckoutBeforeSend] = useState(false);
  const [checkoutOrderTotal, setCheckoutOrderTotal] = useState<number>(0);
  const [checkoutTableNumber, setCheckoutTableNumber] = useState<number>(0);

  useEffect(() => {
    dispatch(fetchTables());
  }, [dispatch]);

  const handleConfirmCustomization = (customizationData: CustomizationData) => {
    if (!customizingItem) return;

    const newCartItem = createCartItemFromCustomization(customizingItem, customizationData);
    setCart(currentCart => [...currentCart, newCartItem]);
  };

  const handleAddToCart = (item: MenuItem) => {
    setCustomizingItem(item);
  };

  const handleEditCartItem = (item: CartItem) => {
    setEditingCartItem(item);
  };

  const handleConfirmEditCartItem = (customizationData: CustomizationData) => {
    if (!editingCartItem) return;

    // Actualizar el item existente en el carrito
    setCart(currentCart =>
      currentCart.map(cartItem =>
        cartItem.cartItemId === editingCartItem.cartItemId
          ? {
              ...editingCartItem,
              ...customizationData,
            }
          : cartItem
      )
    );

    setEditingCartItem(null);
  };

  const handleCartAction = (item: CartItem, action: 'delete') => {
    if (action === 'delete') {
      setCart(currentCart => removeItemFromCart(currentCart, item.cartItemId));
    }
  };

  const handleUpdateItemPrice = (cartItemId: string, newPrice: number) => {
    setCart(currentCart => updateCartItemPrice(currentCart, cartItemId, newPrice));
  };

  const handleIncrementQuantity = (cartItemId: string) => {
    setCart(currentCart => incrementItemQuantity(currentCart, cartItemId));
  };

  const handleDecrementQuantity = (cartItemId: string) => {
    setCart(currentCart => decrementItemQuantity(currentCart, cartItemId));
  };

  const handleToggleTakeout = (cartItemId: string) => {
    setCart(currentCart => toggleItemTakeout(currentCart, cartItemId));
  };

  const handleOrderTypeChange = (newOrderType: string) => {
    setOrderType(newOrderType);
    if (newOrderType !== 'domicilio') {
      setDeliveryData(null);
    }

    // Auto-seleccionar mesa virtual según el tipo
    if (newOrderType === 'llevar') {
      const virtualTable = tables.find(t => t.table_number === 9999);
      if (virtualTable) {
        setTableId(virtualTable.id);
      }
    } else if (newOrderType === 'domicilio') {
      const virtualTable = tables.find(t => t.table_number === 9998);
      if (virtualTable) {
        setTableId(virtualTable.id);
      }
    } else if (newOrderType === 'mesa') {
      // Limpiar selección de mesa cuando se vuelve a tipo mesa
      setTableId('');
    }
  };

  const handleSendOrder = () => {
    if (!canSendOrder(cart, tableId)) return;

    // Si es domicilio y no hay datos de entrega, mostrar modal
    if (orderType === 'domicilio' && !deliveryData) {
      setShowDeliveryModal(true);
      return;
    }

    // Calcular el total del carrito
    const total = cart.reduce((sum, item) => sum + item.finalPrice, 0);
    const selectedTable = findTableById(tables, tableId);

    if (!selectedTable) return;

    // Abrir modal de checkout antes de enviar
    setCheckoutOrderTotal(total);
    setCheckoutTableNumber(selectedTable.table_number);
    setIsCheckoutBeforeSend(true);
  };

  const handleDeliveryInfoConfirm = (data: {
    address: string;
    phone: string;
    notes?: string;
  }) => {
    setDeliveryData(data);
    setShowDeliveryModal(false);
    handleSendOrder();
  };

  const handleConfirmPaymentBeforeSend = (paymentMethod: 'efectivo' | 'transferencia', proofFile: File | null) => {
    // Cerrar el modal de checkout
    setIsCheckoutBeforeSend(false);

    // Ahora sí enviar la orden con los datos de pago
    const payload = buildOrderPayload(cart, tableId, tables, orderType, deliveryData || undefined);
    if (!payload) return;

    console.log("Enviando payload de la orden al backend con datos de pago:", {
      orderData: payload,
      paymentMethod,
      hasProofFile: !!proofFile
    });

    dispatch(addNewOrder({
      orderData: payload,
      paymentMethod,
      paymentProofFile: proofFile
    }));

    setCart([]);
    setTableId('');
    setOrderType('mesa');
    setDeliveryData(null);
  };

  const handleSelectOrder = (orderId: string) => {
    setIsMyOrdersModalOpen(false);
    setIsHistoryModalOpen(false);
    setViewingOrderId(orderId);
  };

  const selectedTable = findTableById(tables, tableId);

  return (
    <>
      <div className="flex flex-col h-screen bg-gray-100">
        {/* Header */}
        <header className="bg-white shadow-md px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Panel Mesero - Vista Escritorio</h1>
          <div className="flex gap-3">
            <button
              onClick={() => setIsMyOrdersModalOpen(true)}
              className="bg-blue-500 text-white px-5 py-2 rounded-lg shadow hover:bg-blue-600 transition-colors"
            >
              Hoy
            </button>
            <button
              onClick={() => setIsHistoryModalOpen(true)}
              className="bg-purple-500 text-white px-5 py-2 rounded-lg shadow hover:bg-purple-600 transition-colors"
            >
              Historial
            </button>
            <LogoutButton />
          </div>
        </header>

        {/* Contenido principal en 3 columnas */}
        <div className="flex-grow overflow-hidden flex gap-4 p-4">
          {/* Columna 1: Mesas (25%) */}
          <div className="w-1/4 bg-white rounded-lg shadow-lg p-4 flex flex-col">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Tipo de Orden</h2>

            {/* Selector de Tipo de Orden */}
            <div className="mb-4">
              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={() => handleOrderTypeChange('mesa')}
                  className={`p-3 rounded-lg transition-all ${
                    orderType === 'mesa'
                      ? 'bg-indigo-600 text-white shadow-lg'
                      : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🍽️</span>
                    <div className="text-left">
                      <p className="font-bold text-sm">MESA</p>
                      <p className="text-xs opacity-80">Consumo en local</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => handleOrderTypeChange('llevar')}
                  className={`p-3 rounded-lg transition-all ${
                    orderType === 'llevar'
                      ? 'bg-green-600 text-white shadow-lg'
                      : 'bg-green-50 text-green-800 hover:bg-green-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🥡</span>
                    <div className="text-left">
                      <p className="font-bold text-sm">LLEVAR</p>
                      <p className="text-xs opacity-80">Para recoger</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => handleOrderTypeChange('domicilio')}
                  className={`p-3 rounded-lg transition-all ${
                    orderType === 'domicilio'
                      ? 'bg-purple-600 text-white shadow-lg'
                      : 'bg-purple-50 text-purple-800 hover:bg-purple-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🏍️</span>
                    <div className="text-left">
                      <p className="font-bold text-sm">DOMICILIO</p>
                      <p className="text-xs opacity-80">Entrega a casa</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Selector de Mesa (solo para tipo "mesa") */}
            {orderType === 'mesa' && (
              <>
                <h3 className="text-lg font-semibold mb-3 text-gray-700">Mesas</h3>
                {status === 'loading' && <p className="text-gray-600">Cargando mesas...</p>}
                <div className="flex-grow overflow-y-auto">
                  <div className="grid grid-cols-2 gap-3">
                    {tables.filter(t => t.table_number < 9998).map(table => (
                      <button
                        key={table.id}
                        onClick={() => setTableId(table.id)}
                        className={`p-4 rounded-lg shadow transition-all transform hover:scale-105 ${
                          tableId === table.id
                            ? 'bg-indigo-600 text-white ring-4 ring-indigo-300'
                            : table.is_active
                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        }`}
                      >
                        <div className="text-center">
                          <p className="text-2xl font-bold mb-1">{table.table_number}</p>
                          <p className="text-xs capitalize">{table.is_active ? 'Disponible' : 'Inactiva'}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Confirmación para llevar */}
            {orderType === 'llevar' && (
              <div className="flex-grow flex items-center justify-center">
                <div className="bg-green-50 border-2 border-green-300 rounded-xl p-6 text-center">
                  <span className="text-5xl mb-3 block">🥡</span>
                  <h3 className="text-lg font-bold text-green-800 mb-2">Para Llevar</h3>
                  <p className="text-sm text-green-700">Todo será empacado</p>
                  <p className="text-xs text-green-600 mt-2">Mesa virtual: 9999</p>
                </div>
              </div>
            )}

            {/* Confirmación para domicilio */}
            {orderType === 'domicilio' && (
              <div className="flex-grow flex items-center justify-center">
                <div className="bg-purple-50 border-2 border-purple-300 rounded-xl p-6 text-center">
                  <span className="text-5xl mb-3 block">🏍️</span>
                  <h3 className="text-lg font-bold text-purple-800 mb-2">Domicilio</h3>
                  <p className="text-sm text-purple-700">Entrega a casa</p>
                  <p className="text-xs text-purple-600 mt-2">Mesa virtual: 9998</p>
                </div>
              </div>
            )}
            {tableId && selectedTable && (
              <div className="mt-4 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                <p className="text-sm font-semibold text-indigo-800">
                  Mesa seleccionada: {selectedTable.table_number}
                </p>
              </div>
            )}
          </div>

          {/* Columna 2: Menú (50%) */}
          <div className="w-1/2 bg-gray-50 rounded-lg shadow-lg p-4 flex flex-col">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-gray-800">Menú</h2>
              {selectedTable && (
                <p className="text-sm text-gray-600 mt-1">
                  Agregando platos para <span className="font-semibold">Mesa {selectedTable.table_number}</span>
                </p>
              )}
              {!tableId && (
                <p className="text-sm text-red-500 mt-1">
                  Primero selecciona una mesa
                </p>
              )}
            </div>
            <div className="flex-grow overflow-y-auto">
              <MenuDisplay onAddToCart={handleAddToCart} />
            </div>
          </div>

          {/* Columna 3: Comanda/Carrito (25%) */}
          <div className="w-1/4 bg-white rounded-lg shadow-lg p-4 flex flex-col">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Comanda</h2>
            {cart.length === 0 && (
              <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800 text-center">
                  El carrito está vacío.
                </p>
              </div>
            )}
            <div className="flex-grow overflow-hidden">
              <CurrentOrder
                cart={cart}
                tableId={tableId}
                tables={tables}
                orderType={orderType}
                onTableChange={setTableId}
                onCartAction={handleCartAction}
                onSendOrder={handleSendOrder}
                onEditItem={handleEditCartItem}
                onUpdateItemPrice={handleUpdateItemPrice}
                onIncrementQuantity={handleIncrementQuantity}
                onDecrementQuantity={handleDecrementQuantity}
                onToggleTakeout={handleToggleTakeout}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Modales */}
      {isMyOrdersModalOpen && (
        <MyOrdersModal
          onClose={() => setIsMyOrdersModalOpen(false)}
          onSelectOrder={handleSelectOrder}
          filterByToday={true}
        />
      )}
      {isHistoryModalOpen && (
        <MyOrdersModal
          onClose={() => setIsHistoryModalOpen(false)}
          onSelectOrder={handleSelectOrder}
          filterByToday={false}
        />
      )}
      {viewingOrderId && (
        <OrderDetailModal
          orderId={viewingOrderId}
          onClose={() => setViewingOrderId(null)}
        />
      )}
      {customizingItem && (
        <CustomizeOrderItemModal
          item={customizingItem}
          onClose={() => setCustomizingItem(null)}
          onConfirm={handleConfirmCustomization}
        />
      )}
      {editingCartItem && (
        <CustomizeOrderItemModal
          item={editingCartItem}
          onClose={() => setEditingCartItem(null)}
          onConfirm={handleConfirmEditCartItem}
        />
      )}
      {isCheckoutBeforeSend && (
        <CheckoutBeforeSendModal
          orderTotal={checkoutOrderTotal}
          tableNumber={checkoutTableNumber}
          onClose={() => setIsCheckoutBeforeSend(false)}
          onConfirm={handleConfirmPaymentBeforeSend}
        />
      )}
      {showDeliveryModal && (
        <DeliveryInfoModal
          onClose={() => setShowDeliveryModal(false)}
          onConfirm={handleDeliveryInfoConfirm}
        />
      )}
    </>
  );
};

export default WaiterDashboardDesktop;

