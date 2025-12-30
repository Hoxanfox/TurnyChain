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
// Importar toast y confetti para versión desktop
import toast, { Toaster } from 'react-hot-toast';
import confetti from 'canvas-confetti';

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

  // 🆕 MEJORA UX #1: Persistencia del carrito (versión desktop)
  useEffect(() => {
    const savedDraft = localStorage.getItem('waiter-cart-draft-desktop');
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        const hoursSinceLastUpdate = (Date.now() - parsed.timestamp) / (1000 * 60 * 60);

        if (parsed.cart.length > 0 && hoursSinceLastUpdate < 4) {
          setCart(parsed.cart);
          setTableId(parsed.tableId || '');
          setOrderType(parsed.orderType || 'mesa');
          toast('📦 Tienes una orden sin terminar', {
            icon: '💡',
            duration: 4000,
          });
        } else {
          localStorage.removeItem('waiter-cart-draft-desktop');
        }
      } catch (error) {
        console.error('Error al recuperar carrito guardado:', error);
        localStorage.removeItem('waiter-cart-draft-desktop');
      }
    }
  }, []);

  useEffect(() => {
    if (cart.length > 0) {
      localStorage.setItem('waiter-cart-draft-desktop', JSON.stringify({
        cart,
        tableId,
        orderType,
        timestamp: Date.now()
      }));
    } else {
      localStorage.removeItem('waiter-cart-draft-desktop');
    }
  }, [cart, tableId, orderType]);

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

    // 🆕 MEJORA UX #3: Feedback celebratorio (versión desktop)
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });

    const total = cart.reduce((sum, item) => sum + item.finalPrice, 0);
    const selectedTable = findTableById(tables, tableId);
    toast.success(
      `🎉 ¡Orden enviada!\nMesa ${selectedTable?.table_number || 'N/A'} • $${total.toFixed(2)}\n${cart.length} productos`,
      {
        duration: 4000,
        style: {
          background: '#10b981',
          color: '#fff',
          fontWeight: 'bold',
          fontSize: '14px',
        },
        icon: '✅',
      }
    );

    setCart([]);
    setTableId('');
    setOrderType('mesa');
    setDeliveryData(null);
    localStorage.removeItem('waiter-cart-draft-desktop');
  };

  const handleSelectOrder = (orderId: string) => {
    setIsMyOrdersModalOpen(false);
    setIsHistoryModalOpen(false);
    setViewingOrderId(orderId);
  };

  const selectedTable = findTableById(tables, tableId);

  return (
    <>
      {/* Toaster para notificaciones */}
      <Toaster position="top-center" />

      <div className="flex flex-col h-screen bg-gray-100">
        {/* Header - Compacto */}
        <header className="bg-gradient-to-r from-indigo-600 to-indigo-700 shadow-md px-6 py-2.5 flex justify-between items-center">
          <h1 className="text-xl font-bold text-white">Panel Mesero</h1>
          <div className="flex gap-3">
            <button
              onClick={() => setIsMyOrdersModalOpen(true)}
              className="bg-white text-indigo-700 px-4 py-1.5 rounded-lg shadow-sm hover:bg-gray-50 transition-colors font-medium"
            >
              Hoy
            </button>
            <button
              onClick={() => setIsHistoryModalOpen(true)}
              className="bg-indigo-800 text-white px-4 py-1.5 rounded-lg shadow-sm hover:bg-indigo-900 transition-colors font-medium"
            >
              Historial
            </button>
            <LogoutButton />
          </div>
        </header>

        {/* Contenido principal en 3 columnas */}
        <div className="flex-grow overflow-hidden flex gap-3 p-3">
          {/* Columna 1: Mesas (25%) */}
          <div className="w-1/4 bg-gradient-to-b from-white to-gray-50 rounded-lg shadow-lg p-3 flex flex-col border border-gray-200">
            <h2 className="text-lg font-bold mb-3 text-gray-800">Tipo de Orden</h2>

            {/* Selector de Tipo de Orden */}
            <div className="mb-3">
              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={() => handleOrderTypeChange('mesa')}
                  className={`p-2.5 rounded-lg transition-all shadow-md ${
                    orderType === 'mesa'
                      ? 'bg-indigo-600 text-white shadow-lg scale-105'
                      : 'bg-white text-indigo-700 border-2 border-indigo-200 hover:bg-indigo-50'
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
                  className={`p-2.5 rounded-lg transition-all shadow-md ${
                    orderType === 'llevar'
                      ? 'bg-green-600 text-white shadow-lg scale-105'
                      : 'bg-white text-green-700 border-2 border-green-200 hover:bg-green-50'
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
                  className={`p-2.5 rounded-lg transition-all shadow-md ${
                    orderType === 'domicilio'
                      ? 'bg-purple-600 text-white shadow-lg scale-105'
                      : 'bg-white text-purple-700 border-2 border-purple-200 hover:bg-purple-50'
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
                <h3 className="text-sm font-semibold mb-2 text-gray-700">Seleccionar Mesa</h3>
                {status === 'loading' && <p className="text-gray-600 text-sm">Cargando mesas...</p>}
                <div className="flex-grow overflow-y-auto pr-1">
                  <div className="grid grid-cols-2 gap-2">
                    {tables.filter(t => t.table_number < 9998).map(table => (
                      <button
                        key={table.id}
                        onClick={() => setTableId(table.id)}
                        className={`p-3 rounded-lg shadow-md transition-all ${
                          tableId === table.id
                            ? 'bg-indigo-600 text-white shadow-lg scale-105'
                            : table.is_active
                              ? 'bg-white border-2 border-green-200 text-green-700 hover:bg-green-50'
                              : 'bg-gray-100 border-2 border-gray-300 text-gray-500'
                        }`}
                      >
                        <div className="text-center">
                          <p className="text-xl font-bold mb-0.5">{table.table_number}</p>
                          <p className="text-xs">{table.is_active ? '✓' : '✗'}</p>
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
                <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-400 rounded-xl p-5 text-center shadow-lg">
                  <span className="text-4xl mb-2 block">🥡</span>
                  <h3 className="text-base font-bold text-green-800 mb-1">Para Llevar</h3>
                  <p className="text-sm text-green-700">Todo será empacado</p>
                  <div className="mt-2 bg-white rounded px-2 py-1 inline-block">
                    <p className="text-xs text-green-600 font-mono font-bold">Mesa: 9999</p>
                  </div>
                </div>
              </div>
            )}

            {/* Confirmación para domicilio */}
            {orderType === 'domicilio' && (
              <div className="flex-grow flex items-center justify-center">
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-400 rounded-xl p-5 text-center shadow-lg">
                  <span className="text-4xl mb-2 block">🏍️</span>
                  <h3 className="text-base font-bold text-purple-800 mb-1">Domicilio</h3>
                  <p className="text-sm text-purple-700">Entrega a casa</p>
                  <div className="mt-2 bg-white rounded px-2 py-1 inline-block">
                    <p className="text-xs text-purple-600 font-mono font-bold">Mesa: 9998</p>
                  </div>
                </div>
              </div>
            )}
            {tableId && selectedTable && (
              <div className="mt-3 p-2.5 bg-indigo-50 rounded-lg border-2 border-indigo-300 shadow-sm">
                <p className="text-sm font-bold text-indigo-800 text-center">
                  ✓ Mesa: {selectedTable.table_number}
                </p>
              </div>
            )}
          </div>

          {/* Columna 2: Menú (50%) */}
          <div className="w-1/2 bg-gradient-to-b from-gray-50 to-white rounded-lg shadow-lg p-3 flex flex-col border border-gray-200">
            <div className="mb-2 pb-2 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-800">Menú</h2>
              {selectedTable && (
                <p className="text-xs text-gray-600 mt-0.5">
                  Agregando para <span className="font-bold text-indigo-700">Mesa {selectedTable.table_number}</span>
                </p>
              )}
              {!tableId && (
                <p className="text-xs text-red-600 mt-0.5 font-medium">
                  ⚠️ Primero selecciona una mesa
                </p>
              )}
            </div>
            <div className="flex-grow overflow-y-auto">
              <MenuDisplay onAddToCart={handleAddToCart} />
            </div>
          </div>

          {/* Columna 3: Comanda/Carrito (25%) */}
          <div className="w-1/4 bg-gradient-to-b from-white to-gray-50 rounded-lg shadow-lg p-3 flex flex-col border border-gray-200">
            <h2 className="text-lg font-bold mb-2 text-gray-800 pb-2 border-b border-gray-200">Comanda</h2>
            {cart.length === 0 && (
              <div className="mb-3 bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-300 rounded-lg p-2.5 shadow-sm">
                <p className="text-xs text-yellow-800 text-center font-medium">
                  🛒 El carrito está vacío
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

