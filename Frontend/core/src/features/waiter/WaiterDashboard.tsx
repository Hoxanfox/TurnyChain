// =================================================================
// ARCHIVO: /src/features/waiter/WaiterDashboard.tsx (REFACTORIZADO CON SWIPER)
// =================================================================
import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addNewOrder, fetchMyOrders } from '../shared/orders/api/ordersSlice.ts';
import { fetchTables } from '../admin/components/tables/api/tablesSlice.ts';
import type { AppDispatch, RootState } from '../../app/store';
import type { MenuItem, CartItem } from '../../types/menu';
import OrderDetailModal from '../shared/orders/components/OrderDetailModal.tsx';
import MyOrdersModal from './components/MyOrdersModal';
import CheckoutModal from './components/CheckoutModal';
import CheckoutBeforeSendModal from './components/CheckoutBeforeSendModal';
import LogoutButton from '../../components/LogoutButton';
import CustomizeOrderItemModal from './components/CustomizeOrderItemModal';
import { Swiper, SwiperSlide } from 'swiper/react';
import type { Swiper as SwiperType } from 'swiper';
import 'swiper/swiper-bundle.css';

// Importar los slides
import TablesSlide from './slides/TablesSlide';
import MenuSlide from './slides/MenuSlide';
import CartSlide from './slides/CartSlide';
import PaymentsSlide from './slides/PaymentsSlide';

// Importar hook de media query y vista desktop
import { useIsDesktop } from '../../hooks/useMediaQuery';
import WaiterDashboardDesktop from './WaiterDashboardDesktop';

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

// Importar el modal de delivery
import DeliveryInfoModal from './components/DeliveryInfoModal';
// Importar toast y confetti
import toast, { Toaster } from 'react-hot-toast';
import confetti from 'canvas-confetti';

const WaiterDashboard: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { tables } = useSelector((state: RootState) => state.tables);
  const swiperRef = useRef<SwiperType | null>(null);
  const isDesktop = useIsDesktop();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [tableId, setTableId] = useState('');
  const [orderType, setOrderType] = useState<string>('mesa'); // "mesa" | "llevar" | "domicilio"
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
  const [activeSlide, setActiveSlide] = useState(0);
  const [checkoutOrderId, setCheckoutOrderId] = useState<string | null>(null);
  const [checkoutOrderTotal, setCheckoutOrderTotal] = useState<number>(0);
  const [checkoutTableNumber, setCheckoutTableNumber] = useState<number>(0);
  const [isCheckoutBeforeSend, setIsCheckoutBeforeSend] = useState(false);

  // 🆕 MEJORA UX #1: Persistencia del carrito (Efecto Zeigarnik)
  // Recuperar carrito guardado al montar el componente
  useEffect(() => {
    const savedDraft = localStorage.getItem('waiter-cart-draft');
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        const hoursSinceLastUpdate = (Date.now() - parsed.timestamp) / (1000 * 60 * 60);

        // Solo recuperar si tiene menos de 4 horas (un turno)
        if (parsed.cart.length > 0 && hoursSinceLastUpdate < 4) {
          setCart(parsed.cart);
          setTableId(parsed.tableId || '');
          setOrderType(parsed.orderType || 'mesa');
          toast('📦 Tienes una orden sin terminar', {
            icon: '💡',
            duration: 4000,
          });
        } else {
          // Limpiar si es muy viejo
          localStorage.removeItem('waiter-cart-draft');
        }
      } catch (error) {
        console.error('Error al recuperar carrito guardado:', error);
        localStorage.removeItem('waiter-cart-draft');
      }
    }
  }, []);

  // Guardar carrito en localStorage cada vez que cambie
  useEffect(() => {
    if (cart.length > 0) {
      localStorage.setItem('waiter-cart-draft', JSON.stringify({
        cart,
        tableId,
        orderType,
        timestamp: Date.now()
      }));
    } else {
      localStorage.removeItem('waiter-cart-draft');
    }
  }, [cart, tableId, orderType]);

  useEffect(() => {
    dispatch(fetchTables());
  }, [dispatch]);

  // Si es desktop, renderizar la vista de escritorio
  if (isDesktop) {
    return <WaiterDashboardDesktop />;
  }

  const handleConfirmCustomization = (customizationData: CustomizationData) => {
    if (!customizingItem) return;

    const newCartItem = createCartItemFromCustomization(customizingItem, customizationData);
    setCart(currentCart => [...currentCart, newCartItem]);

    // Navegar automáticamente al carrito después de agregar
    handleNavigateToCart();
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

  const handleSelectTable = (selectedTableId: string) => {
    setTableId(selectedTableId);
  };

  const handleOrderTypeChange = (newOrderType: string) => {
    setOrderType(newOrderType);
    // Limpiar datos de delivery si cambia de tipo
    if (newOrderType !== 'domicilio') {
      setDeliveryData(null);
    }
  };

  const handleToggleTakeout = (cartItemId: string) => {
    setCart(currentCart => toggleItemTakeout(currentCart, cartItemId));
  };

  const handleTableSelectedAndNavigate = () => {
    // Navegar automáticamente al menú cuando se selecciona una mesa
    swiperRef.current?.slideNext();
  };

  const handleNavigateToMenu = () => {
    swiperRef.current?.slideTo(1);
  };

  const handleNavigateToTables = () => {
    swiperRef.current?.slideTo(0);
  };

  const handleNavigateToCart = () => {
    swiperRef.current?.slideTo(2);
  };

  const handleAddToCart = (item: MenuItem) => {
    setCustomizingItem(item);
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

    // Continuar con el proceso de envío
    handleSendOrder();
  };

  const handleSelectOrder = (orderId: string) => {
    setIsMyOrdersModalOpen(false);
    setIsHistoryModalOpen(false);
    setViewingOrderId(orderId);
  };

  const handleCheckout = (orderId: string, total: number, tableNumber: number) => {
    setIsMyOrdersModalOpen(false);
    setIsHistoryModalOpen(false);
    setCheckoutOrderId(orderId);
    setCheckoutOrderTotal(total);
    setCheckoutTableNumber(tableNumber);
  };

  const handleCheckoutSuccess = () => {
    setCheckoutOrderId(null);
    setCheckoutOrderTotal(0);
    setCheckoutTableNumber(0);
    dispatch(fetchMyOrders()); // Recargar órdenes después del pago
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

    // 🆕 MEJORA UX #3: Feedback celebratorio (Peak-End Rule)
    // Confetti animation
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });

    // Toast personalizado con información de la orden
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

    // Limpiar estado
    setCart([]);
    setTableId('');
    setOrderType('mesa');
    setDeliveryData(null);
    localStorage.removeItem('waiter-cart-draft');
  };

  const selectedTable = findTableById(tables, tableId);

  return (
    <>
      {/* Toaster para notificaciones */}
      <Toaster position="top-center" />

      <div className="flex flex-col h-screen-mobile bg-gray-100">
        {/* Header - Compacto */}
        <header className="bg-gradient-to-r from-indigo-600 to-indigo-700 shadow-md px-4 py-2 flex justify-between items-center">
          <h1 className="text-lg font-bold text-white">Mesero</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setIsMyOrdersModalOpen(true)}
              className="bg-white text-indigo-700 px-3 py-1.5 rounded-lg shadow-sm hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              Hoy
            </button>
            <button
              onClick={() => setIsHistoryModalOpen(true)}
              className="bg-indigo-800 text-white px-3 py-1.5 rounded-lg shadow-sm hover:bg-indigo-900 transition-colors text-sm font-medium"
            >
              📋
            </button>
            <LogoutButton />
          </div>
        </header>

        {/* Swiper Container */}
        <div className="flex-grow overflow-hidden">
          <Swiper
            onSwiper={(swiper) => (swiperRef.current = swiper)}
            onSlideChange={(swiper) => setActiveSlide(swiper.activeIndex)}
            spaceBetween={0}
            slidesPerView={1}
            className="h-full w-full"
            speed={400}
            resistanceRatio={0.85}
            allowTouchMove={true}
            touchStartPreventDefault={false}
            touchStartForcePreventDefault={false}
            preventInteractionOnTransition={false}
            touchReleaseOnEdges={true}
            threshold={10}
            nested={false}
          >
            {/* Slide 1: Selector de Mesas */}
            <SwiperSlide>
              <TablesSlide
                selectedTableId={tableId}
                orderType={orderType}
                onSelectTable={handleSelectTable}
                onOrderTypeChange={handleOrderTypeChange}
                onRequestChangeSlide={handleTableSelectedAndNavigate}
              />
            </SwiperSlide>

            {/* Slide 2: Menú */}
            <SwiperSlide>
              <MenuSlide
                selectedTableId={tableId}
                tableNumber={selectedTable?.table_number}
                orderType={orderType}
                onAddToCart={handleAddToCart}
                onNavigateBack={handleNavigateToTables}
              />
            </SwiperSlide>

            {/* Slide 3: Carrito/Comanda */}
            <SwiperSlide>
              <CartSlide
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
                onNavigateToMenu={handleNavigateToMenu}
                onNavigateBack={handleNavigateToMenu}
              />
            </SwiperSlide>

            {/* Slide 4: Pagos */}
            <SwiperSlide>
              <PaymentsSlide
                onViewOrderDetails={(orderId) => setViewingOrderId(orderId)}
              />
            </SwiperSlide>
          </Swiper>
        </div>

        {/* Footer / Navigation Dots - Compacto */}
        <footer className="bg-white shadow-md px-4 py-2 border-t-2 border-indigo-100">
          <div className="flex justify-center items-center gap-2 mb-1">
            <button
              onClick={() => swiperRef.current?.slideTo(0)}
              className={`w-2 h-2 rounded-full transition-all ${
                activeSlide === 0 ? 'bg-indigo-600 w-8' : 'bg-gray-300'
              }`}
              aria-label="Ir a Mesas"
            />
            <button
              onClick={() => swiperRef.current?.slideTo(1)}
              className={`w-2 h-2 rounded-full transition-all ${
                activeSlide === 1 ? 'bg-indigo-600 w-8' : 'bg-gray-300'
              }`}
              aria-label="Ir a Menú"
            />
            <button
              onClick={() => swiperRef.current?.slideTo(2)}
              className={`w-2 h-2 rounded-full transition-all ${
                activeSlide === 2 ? 'bg-indigo-600 w-8' : 'bg-gray-300'
              }`}
              aria-label="Ir a Comanda"
            />
            <button
              onClick={() => swiperRef.current?.slideTo(3)}
              className={`w-2 h-2 rounded-full transition-all ${
                activeSlide === 3 ? 'bg-indigo-600 w-8' : 'bg-gray-300'
              }`}
              aria-label="Ir a Pagos"
            />
          </div>
          <p className="text-center text-xs text-gray-600 font-medium">
            {activeSlide === 0 && '📋 Paso 1: Selecciona una mesa'}
            {activeSlide === 1 && '🍽️ Paso 2: Elige del menú'}
            {activeSlide === 2 && '✅ Paso 3: Revisa y envía'}
            {activeSlide === 3 && '💳 Gestión de Pagos'}
          </p>
        </footer>
      </div>

      {/* Modales */}
      {isMyOrdersModalOpen && (
        <MyOrdersModal
          onClose={() => setIsMyOrdersModalOpen(false)}
          onSelectOrder={handleSelectOrder}
          onCheckout={handleCheckout}
          filterByToday={true}
        />
      )}
      {isHistoryModalOpen && (
        <MyOrdersModal
          onClose={() => setIsHistoryModalOpen(false)}
          onSelectOrder={handleSelectOrder}
          onCheckout={handleCheckout}
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
      {checkoutOrderId && (
        <CheckoutModal
          orderId={checkoutOrderId}
          orderTotal={checkoutOrderTotal}
          tableNumber={checkoutTableNumber}
          onClose={() => setCheckoutOrderId(null)}
          onSuccess={handleCheckoutSuccess}
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

export default WaiterDashboard;


