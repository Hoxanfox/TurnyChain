// =================================================================
// ARCHIVO: /src/features/waiter/WaiterDashboard.tsx (REFACTORIZADO CON SWIPER)
// =================================================================
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { addNewOrder, fetchMyOrders } from '../shared/orders/api/ordersSlice.ts';
import { fetchTables } from '../admin/components/tables/api/tablesSlice.ts';
import type { AppDispatch, RootState } from '../../app/store';
import { logout } from '../auth/authSlice';
import { validatePaymentSession, validatePrinterOperational } from '../auth/sessionValidation';
import type { MenuItem, CartItem } from '../../types/menu';
import type { Order } from '../../types/orders';
import { FaQrcode } from 'react-icons/fa';
import { MdNotificationsActive, MdNotificationsNone } from 'react-icons/md';
import OrderDetailModal from '../shared/orders/components/OrderDetailModal.tsx';
import CheckoutModal from './components/CheckoutModal';
import CheckoutBeforeSendModal from './components/CheckoutBeforeSendModal';
import ConfirmSendWithoutChargeModal from './components/ConfirmSendWithoutChargeModal';
import PaymentValidationModal from './components/PaymentValidationModal';
import ColleagueOrdersModal from './components/ColleagueOrdersModal';
import WaiterProfileMenu from './components/WaiterProfileMenu';
import CustomizeOrderItemModal from './components/CustomizeOrderItemModal';
import QRModal from './components/QRModal';
import PanicButtonModal from './components/PanicButtonModal';
import { Swiper, SwiperSlide } from 'swiper/react';
import type { Swiper as SwiperType } from 'swiper';
import 'swiper/swiper-bundle.css';

// Importar los slides
import TablesSlide from './slides/TablesSlide';
import MenuSlide from './slides/MenuSlide';
import CartSlide from './slides/CartSlide';
import PaymentsSlide from './slides/PaymentsSlide';
import TransfersSlide from './slides/TransfersSlide';

// Importar hook de media query y vista desktop
import { useIsDesktop } from '../../hooks/useMediaQuery';
import WaiterDashboardDesktop from './WaiterDashboardDesktop';
import { useWaiterWebSocket } from '../../hooks/useWaiterWebSocket';

// Importar funciones y tipos comunes del feature
import {
  createCartItemFromCustomization,
  removeItemFromCart,
  updateCartItemPrice,
  incrementItemQuantity,
  decrementItemQuantity,
  toggleItemTakeout,
  buildOrderPayload,
  canSendOrderWithConnectivity,
  findTableById,
  isClientOnline,
  type CustomizationData
} from './utils/waiterUtils.ts';

import { formatMoney } from '../../utils/formatUtils.ts';
import { uploadSplitPayments } from '../shared/orders/api/ordersAPI.ts';
import type { PaymentInput } from '../shared/orders/api/ordersAPI.ts';
// Importar el modal de delivery
import DeliveryInfoModal from './components/DeliveryInfoModal';
// Importar toast y confetti
import toast, { Toaster } from 'react-hot-toast';
import { useWaiterGamification } from './hooks/useWaiterGamification';
import './styles/Gamification.css';

const WaiterDashboard: React.FC = () => {
    // Estado para nota especial de checkout en pedidos para llevar
    const [checkoutTakeoutNotes, setCheckoutTakeoutNotes] = useState<string>("");
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { tables } = useSelector((state: RootState) => state.tables);
  const { createOrderStatus } = useSelector((state: RootState) => state.orders);
  const { token, user } = useSelector((state: RootState) => state.auth);
  const swiperRef = useRef<SwiperType | null>(null);
  const isDesktop = useIsDesktop();

  const [hasWsNotification, setHasWsNotification] = useState(false);
  const [lastWsNotification, setLastWsNotification] = useState<string | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showPanicModal, setShowPanicModal] = useState(false);

  const [lastRawWsMessage, setLastRawWsMessage] = useState<any>(null);
  const [showToolsMenu, setShowToolsMenu] = useState(false);

  // 🏆 Hook de Gamificación
  const { isMaestro, isCelebrating, stopCelebrating } = useWaiterGamification();

  const handleWaiterWsNotification = useCallback((options: { title: string; message: string; type: 'info' | 'success' | 'warning' | 'error'; orderId?: string }) => {
    if (options.orderId) {
      toast.dismiss(`print-status-${options.orderId}`);
    }

    const isPayment = options.title.toLowerCase().includes('pago') || 
                      options.message.toLowerCase().includes('pago') ||
                      options.title.toLowerCase().includes('cobro');

    if (isPayment) {
      setHasWsNotification(true);
      setLastWsNotification(options.message || options.title);
    }
  }, []);

  const handleRawWsMessage = useCallback((msg: any) => {
    setLastRawWsMessage(msg);
    if (msg.type === 'BREB_TRANSFER_RECEIVED') {
      setHasWsNotification(true);
      setLastWsNotification(`Nueva transferencia por ${formatMoney(msg.payload.amount)}`);
    }
  }, []);

  const { sendMessage } = useWaiterWebSocket(handleWaiterWsNotification, handleRawWsMessage);

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
  const [isColleagueModalOpen, setIsColleagueModalOpen] = useState(false);
  const [selectedParentOrder, setSelectedParentOrder] = useState<Order | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [checkoutOrderId, setCheckoutOrderId] = useState<string | null>(null);
  const [checkoutGroupOrderInfos, setCheckoutGroupOrderInfos] = useState<{ id: string, total: number }[]>([]);
  const [checkoutOrderTotal, setCheckoutOrderTotal] = useState<number>(0);
  const [checkoutTableNumber, setCheckoutTableNumber] = useState<number>(0);
  const [isCheckoutBeforeSend, setIsCheckoutBeforeSend] = useState(false);
  const [isValidationModalOpen, setIsValidationModalOpen] = useState(false);
  const [validationStep, setValidationStep] = useState<'session' | 'printer' | 'saving'>('session');
  const [isPaymentFlowRunning, setIsPaymentFlowRunning] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [lastPaymentAttempt, setLastPaymentAttempt] = useState<{ paymentMethod: 'efectivo' | 'transferencia' | 'mixto'; proofFile: File | null; splitPayments?: PaymentInput[] } | null>(null);
  const [pendingSubmissionMode, setPendingSubmissionMode] = useState<'charge' | 'send' | null>(null);
  const [pendingTakeoutNotes, setPendingTakeoutNotes] = useState<string>('');
  const [isSendWithoutChargeModalOpen, setIsSendWithoutChargeModalOpen] = useState(false);
  const [pendingSendWithoutChargeNotes, setPendingSendWithoutChargeNotes] = useState<string>('');
  const [isOnline, setIsOnline] = useState<boolean>(isClientOnline());

  const buildRequestId = () =>
    globalThis.crypto?.randomUUID?.() ||
    `req-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;

  const waitForMinStepDuration = async (stepStartMs: number, minDurationMs = 800) => {
    const elapsed = Date.now() - stepStartMs;
    if (elapsed < minDurationMs) {
      await new Promise((resolve) => setTimeout(resolve, minDurationMs - elapsed));
    }
  };

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

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Conexion restablecida. Ya puedes enviar comandas.');
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.error('Sin conexion. No se enviaran comandas hasta reconectar.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Si es desktop, renderizar la vista de escritorio
  if (isDesktop) {
    return <WaiterDashboardDesktop sendMessage={sendMessage} />;
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
    if (selectedParentOrder) {
      setSelectedParentOrder(null);
    }
    setTableId(selectedTableId);
  };

  const handleOrderTypeChange = (newOrderType: string) => {
    if (selectedParentOrder) {
      setSelectedParentOrder(null);
    }
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

  const submitOrderWithoutCharge = async (notes?: string) => {
    if (createOrderStatus === 'loading' || isPaymentFlowRunning) return;
    if (!isOnline) {
      toast.error('Sin conexion a internet. Revisa tu red antes de enviar.');
      return;
    }

    setIsPaymentFlowRunning(true);

    try {
      setValidationError(null);
      setValidationStep('session');
      setIsValidationModalOpen(true);

      let stepStartedAt = Date.now();
      const sessionCheck = await validatePaymentSession(token);
      await waitForMinStepDuration(stepStartedAt);
      if (!sessionCheck.ok) {
        setValidationError(sessionCheck.message);
        toast.error(sessionCheck.message);
        if (sessionCheck.shouldLogout) {
          setIsValidationModalOpen(false);
          dispatch(logout());
          navigate('/login', { replace: true });
        }
        return;
      }

      setValidationStep('printer');
      stepStartedAt = Date.now();
      const printerCheck = await validatePrinterOperational(token);
      await waitForMinStepDuration(stepStartedAt);
      if (!printerCheck.ok) {
        setValidationError(printerCheck.message);
        toast.error(printerCheck.message);
        if (printerCheck.shouldLogout) {
          setIsValidationModalOpen(false);
          dispatch(logout());
          navigate('/login', { replace: true });
        }
        return;
      }

      setValidationStep('saving');
      stepStartedAt = Date.now();

      const customerNameForPayload =
        orderType === 'llevar'
          ? (notes || '')
          : orderType === 'domicilio'
          ? (deliveryData?.notes || `Cliente mesa ${checkoutTableNumber}`)
          : undefined;

      const payload = buildOrderPayload(
        cart,
        tableId,
        tables,
        orderType,
        selectedParentOrder?.id,
        customerNameForPayload,
        deliveryData || undefined
      );
      if (!payload) return;

      if (orderType === 'llevar' && notes) {
        payload.delivery_notes = notes;
      }

      await dispatch(addNewOrder({ orderData: payload })).unwrap();

      await waitForMinStepDuration(stepStartedAt, 700);

      setIsValidationModalOpen(false);
      setValidationError(null);

      setCart([]);
      setTableId('');
      setOrderType('mesa');
      setDeliveryData(null);
      setSelectedParentOrder(null);
      localStorage.removeItem('waiter-cart-draft');
    } catch (error: any) {
      if (error === 'CASH_REGISTER_CLOSED') {
        setValidationError('La caja está cerrada.');
        toast.error('La caja está cerrada. Pide al cajero que la abra antes de enviar comandas.');
      } else if (error === 'CASH_REGISTER_PENDING_CLOSE') {
        setValidationError('Cierre de caja pendiente.');
        toast.error('La caja tiene un cierre pendiente. Pide al cajero que realice el arqueo.');
      } else {
        setValidationError('No se pudo enviar la comanda. Intenta nuevamente.');
        toast.error('No se pudo enviar la comanda. Intenta nuevamente.');
      }
    } finally {
      setIsPaymentFlowRunning(false);
    }
  };

  const handleSendOrder = (notes?: string, mode: 'charge' | 'send' = 'charge') => {
    if (!canSendOrderWithConnectivity(cart, tableId, isOnline)) {
      if (!isOnline) {
        toast.error('Sin conexion a internet. Revisa tu red antes de enviar.');
      }
      return;
    }

    // Validar nota especial obligatoria para llevar
    if (orderType === 'llevar') {
      if (!notes || notes.trim() === '') {
        toast.error('Debes ingresar una nota especial para pedidos para llevar.');
        return;
      }
      setCheckoutTakeoutNotes(notes);
    } else {
      setCheckoutTakeoutNotes("");
    }

    // Si es domicilio y no hay datos de entrega, mostrar modal
    if (orderType === 'domicilio' && !deliveryData) {
      setPendingSubmissionMode(mode);
      setPendingTakeoutNotes(notes || '');
      setShowDeliveryModal(true);
      return;
    }

    if (mode === 'send') {
      setPendingSendWithoutChargeNotes(notes || '');
      setIsSendWithoutChargeModalOpen(true);
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
    handleSendOrder(pendingTakeoutNotes, pendingSubmissionMode || 'charge');
    setPendingSubmissionMode(null);
    setPendingTakeoutNotes('');
  };

  const handleConfirmSendWithoutCharge = async () => {
    setIsSendWithoutChargeModalOpen(false);
    await submitOrderWithoutCharge(pendingSendWithoutChargeNotes);
    setPendingSendWithoutChargeNotes('');
  };

  const handleSelectParentOrder = (order: Order) => {
    setSelectedParentOrder(order);

    const parentOrderType = order.order_type || 'mesa';
    setOrderType(parentOrderType);

    const matchedTable = tables.find((t) => t.table_number === order.table_number);
    if (matchedTable) {
      setTableId(matchedTable.id);
    }

    if (parentOrderType !== 'domicilio') {
      setDeliveryData(null);
    }

    toast.success(`Comanda adicional vinculada a la orden ${order.id.substring(0, 8).toUpperCase()}`);
    swiperRef.current?.slideTo(1);
  };

  const handleCheckout = (orderId: string, total: number, tableNumber: number) => {
    setCheckoutOrderId(orderId);
    setCheckoutGroupOrderInfos([{ id: orderId, total }]);
    setCheckoutOrderTotal(total);
    setCheckoutTableNumber(tableNumber);
  };

  const handleCheckoutGroup = (ordersInfo: { id: string, total: number }[], total: number, tableNumber: number) => {
    if (ordersInfo.length === 0) return;
    setCheckoutOrderId(ordersInfo[0].id);
    setCheckoutGroupOrderInfos(ordersInfo);
    setCheckoutOrderTotal(total);
    setCheckoutTableNumber(tableNumber);
  };

  const handleCheckoutSuccess = () => {
    setCheckoutOrderId(null);
    setCheckoutGroupOrderInfos([]);
    setCheckoutOrderTotal(0);
    setCheckoutTableNumber(0);
    dispatch(fetchMyOrders()); // Recargar órdenes después del pago
  };

  const runPaymentFlow = async (paymentMethod: 'efectivo' | 'transferencia' | 'mixto', proofFile: File | null, splitPayments?: PaymentInput[]): Promise<boolean> => {
    if (createOrderStatus === 'loading' || isPaymentFlowRunning) return false;
    if (!isOnline) {
      toast.error('Sin conexion a internet. No se puede validar ni enviar la comanda.');
      return false;
    }

    setIsPaymentFlowRunning(true);

    try {
      setValidationError(null);
      setValidationStep('session');
      setIsValidationModalOpen(true);

      let stepStartedAt = Date.now();
      const sessionCheck = await validatePaymentSession(token);
      await waitForMinStepDuration(stepStartedAt);
      if (!sessionCheck.ok) {
        setValidationError(sessionCheck.message);
        toast.error(sessionCheck.message);
        if (sessionCheck.shouldLogout) {
          setIsValidationModalOpen(false);
          dispatch(logout());
          navigate('/login', { replace: true });
        }
        return false;
      }

      setValidationStep('printer');
      stepStartedAt = Date.now();
      const printerCheck = await validatePrinterOperational(token);
      await waitForMinStepDuration(stepStartedAt);
      if (!printerCheck.ok) {
        setValidationError(printerCheck.message);
        toast.error(printerCheck.message);
        if (printerCheck.shouldLogout) {
          setIsValidationModalOpen(false);
          dispatch(logout());
          navigate('/login', { replace: true });
        }
        return false;
      }

      setValidationStep('saving');
      stepStartedAt = Date.now();

    // Ahora sí enviar la orden con los datos de pago
    const customerNameForPayload =
      orderType === 'llevar'
        ? checkoutTakeoutNotes
        : orderType === 'domicilio'
        ? (deliveryData?.notes || `Cliente mesa ${checkoutTableNumber}`)
        : undefined;

      const payload = buildOrderPayload(
      cart,
      tableId,
      tables,
      orderType,
      selectedParentOrder?.id,
      customerNameForPayload,
      deliveryData || undefined
    );
      if (!payload) {
        setValidationError('No se pudo construir la comanda. Revisa mesa y productos.');
        return false;
      }

      // Agregar delivery_notes si es para llevar y hay notas
      if (orderType === 'llevar' && checkoutTakeoutNotes) {
        payload.delivery_notes = checkoutTakeoutNotes;
      }

      console.log("Enviando payload de la orden al backend con datos de pago:", {
        orderData: payload,
        paymentMethod,
        hasProofFile: !!proofFile
      });

      const total = cart.reduce((sum, item) => sum + item.finalPrice, 0);
      const selectedTable = findTableById(tables, tableId);

      const requestId = buildRequestId();
      const createdOrder = await dispatch(addNewOrder({
        orderData: payload,
        paymentMethod: paymentMethod === 'mixto' ? undefined : paymentMethod,
        paymentProofFile: paymentMethod === 'mixto' ? undefined : proofFile,
        requestId,
      })).unwrap();

      if (paymentMethod === 'mixto' && splitPayments && splitPayments.length > 0) {
        toast.loading('💳 Procesando pagos mixtos...', { id: `split-payments-${createdOrder.id}` });
        try {
          await uploadSplitPayments(createdOrder.id, splitPayments, token || '');
          toast.success('✅ Pagos mixtos procesados', { id: `split-payments-${createdOrder.id}` });
        } catch (err: any) {
          toast.error(err.response?.data?.error || 'Error al procesar pagos mixtos. Revisa en detalle de la orden.', { id: `split-payments-${createdOrder.id}` });
        }
      }

      await waitForMinStepDuration(stepStartedAt, 700);

      toast.success(
        `💾 Comanda guardada en backend\nMesa ${selectedTable?.table_number || 'N/A'} • ${formatMoney(total)}\nID ${createdOrder.id.substring(0, 8).toUpperCase()}`,
        {
          duration: 3200,
        }
      );

      toast.loading('🖨️ Enviando a impresora. Te avisaremos cuando termine.', {
        id: `print-status-${createdOrder.id}`,
        duration: 5000,
      });

      setIsValidationModalOpen(false);
      setValidationError(null);
      setIsCheckoutBeforeSend(false);

      // Limpiar estado
      setCart([]);
      setTableId('');
      setOrderType('mesa');
      setDeliveryData(null);
      setSelectedParentOrder(null);
      localStorage.removeItem('waiter-cart-draft');
      return true;
    } catch (error: any) {
      if (error === 'CASH_REGISTER_CLOSED') {
        setValidationError('La caja está cerrada.');
        toast.error('La caja está cerrada. Pide al cajero que la abra antes de cobrar.');
      } else if (error === 'CASH_REGISTER_PENDING_CLOSE') {
        setValidationError('Cierre de caja pendiente.');
        toast.error('La caja tiene un cierre pendiente. Pide al cajero que realice el arqueo.');
      } else {
        setValidationError('No se pudo cobrar y enviar la comanda. Intenta nuevamente.');
        toast.error('No se pudo cobrar y enviar la comanda. Intenta nuevamente.');
      }
      return false;
    } finally {
      setIsPaymentFlowRunning(false);
    }
  };

  const handleConfirmPaymentBeforeSend = async (paymentMethod: 'efectivo' | 'transferencia' | 'mixto', proofFile: File | null, splitPayments?: PaymentInput[]): Promise<boolean> => {
    setLastPaymentAttempt({ paymentMethod, proofFile, splitPayments });
    return runPaymentFlow(paymentMethod, proofFile, splitPayments);
  };

  const handleRetryPaymentFlow = async () => {
    if (!lastPaymentAttempt) {
      return;
    }
    await runPaymentFlow(lastPaymentAttempt.paymentMethod, lastPaymentAttempt.proofFile, lastPaymentAttempt.splitPayments);
  };

  const handleBackToCheckout = () => {
    setIsValidationModalOpen(false);
    setValidationError(null);
  };

  const selectedTable = findTableById(tables, tableId);

  return (
    <>
      {/* Toaster para notificaciones */}
      <Toaster position="top-center" />

      <div className="flex flex-col h-screen-mobile bg-gray-100">

        {/* Overlay de Video de Celebración */}
        {isCelebrating && (
          <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="relative w-full max-w-md rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(255,140,0,0.5)] animate-[float-up_0.5s_ease-out]">
              <video 
                autoPlay 
                playsInline 
                onEnded={stopCelebrating}
                className="w-full h-auto object-contain"
              >
                <source src="/mira_ayudame_a_realizar_una_an.mp4" type="video/mp4" />
              </video>
            </div>
          </div>
        )}

        <header className="relative z-50 px-4 py-2 flex justify-between items-center shadow-md transition-all duration-500 bg-gradient-to-r from-indigo-600 to-indigo-700">
          {/* Capa de Fondos Gamificación */}
          <div className="gamification-bg-container rounded-b-lg">
          </div>
          <div className="flex items-center gap-2 z-10">
            <h1 
              onClick={() => {
                if (hasWsNotification) {
                  setHasWsNotification(false);
                }
              }}
              className={`font-bold cursor-pointer inline-block ${hasWsNotification ? 'drop-shadow-md text-yellow-300' : ''} ${isMaestro ? 'maestro-text text-lg tracking-wide' : 'text-lg text-white'}`}
              title={hasWsNotification ? (lastWsNotification || 'Nuevas notificaciones - Clic para limpiar') : ''}
            >
              {isMaestro ? `⭐ Consagrado` : 'Mesero'}
            </h1>
          </div>
          <div className="flex gap-2 items-center z-10">
            <button 
              onClick={() => {
                swiperRef.current?.slideTo(4);
                setHasWsNotification(false);
              }}
              className="relative w-9 h-9 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors shadow-sm"
              title="Notificaciones de Transferencias"
            >
              {hasWsNotification ? (
                <>
                  <MdNotificationsActive className="text-yellow-300 text-xl animate-pulse" />
                  <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-indigo-600"></span>
                </>
              ) : (
                <MdNotificationsNone className="text-white text-xl" />
              )}
            </button>

            {/* Botón de Pánico (Solo para Meseros) */}
            {user?.role === 'mesero' && (
              <button 
                onClick={() => setShowPanicModal(true)}
                className="w-9 h-9 bg-red-500/80 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-sm text-white border border-red-300"
                title="Reportar Agotado"
              >
                🚨
              </button>
            )}
            
            {/* Tools Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setShowToolsMenu(!showToolsMenu)}
                className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors shadow-sm text-white"
                title="Herramientas"
              >
                🛠️
              </button>
              
              {showToolsMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl overflow-hidden z-50 border border-gray-100 animate-fade-in">
                  <div className="py-1">
                    <button 
                      onClick={() => {
                        setShowQRModal(true);
                        setShowToolsMenu(false);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-indigo-50 text-gray-700 font-medium flex items-center gap-3 transition-colors"
                    >
                      <FaQrcode className="text-indigo-600 text-lg" /> Código QR
                    </button>
                    
                    <button
                      onClick={() => {
                        swiperRef.current?.slideTo(3);
                        setShowToolsMenu(false);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-indigo-50 text-gray-700 font-medium flex items-center gap-3 transition-colors border-t border-gray-50"
                    >
                      <span className="text-lg">💰</span> Pagos / Hoy
                    </button>
                    
                    <button
                      onClick={() => {
                        setIsColleagueModalOpen(true);
                        setShowToolsMenu(false);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-violet-50 text-gray-700 font-medium flex items-center gap-3 transition-colors border-t border-gray-50"
                    >
                      <span className="text-lg">🤝</span> Cobrar a Compañeros
                    </button>
                    
                    {user?.role === 'cajero' && (
                      <button
                        onClick={() => navigate('/dashboard')}
                        className="w-full text-left px-4 py-3 hover:bg-amber-50 text-amber-700 font-bold flex items-center gap-3 transition-colors border-t border-gray-50"
                      >
                        <span className="text-lg">🔙</span> Volver al Cajero
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <WaiterProfileMenu />
          </div>
        </header>

        {/* Cierra dropdown si se hace clic afuera (hack rápido cubriendo el resto) */}
        {showToolsMenu && (
          <div className="fixed inset-0 z-40" onClick={() => setShowToolsMenu(false)}></div>
        )}

        {selectedParentOrder && (
          <div className="bg-emerald-50 border-y border-emerald-200 px-4 py-2 flex items-center justify-between">
            <p className="text-xs font-semibold text-emerald-800">
              Comanda hija de {selectedParentOrder.id.substring(0, 8).toUpperCase()} • Mesa {selectedParentOrder.table_number}
            </p>
            <button
              onClick={() => setSelectedParentOrder(null)}
              className="text-xs text-emerald-700 hover:text-emerald-900 font-bold"
            >
              Quitar
            </button>
          </div>
        )}

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
                onSendOrderWithoutCharge={(notes) => handleSendOrder(notes, 'send')}
                onChargeAndSendOrder={(notes) => handleSendOrder(notes, 'charge')}
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
                onCheckout={(orderId, total, tableNumber) => handleCheckout(orderId, total, tableNumber)}
                onCheckoutGroup={handleCheckoutGroup}
                onSelectParentOrder={handleSelectParentOrder}
              />
            </SwiperSlide>

            {/* Slide 5: Notificaciones (Transferencias) */}
            <SwiperSlide>
              <TransfersSlide 
                isOpen={true} 
                onClose={() => swiperRef.current?.slideTo(0)} 
                wsMessage={lastRawWsMessage}
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
            <button
              onClick={() => swiperRef.current?.slideTo(4)}
              className={`w-2 h-2 rounded-full transition-all ${
                activeSlide === 4 ? 'bg-indigo-600 w-8' : 'bg-gray-300'
              }`}
              aria-label="Ir a Transferencias"
            />
          </div>
          <p className="text-center text-xs text-gray-600 font-medium">
            {activeSlide === 0 && '📋 Paso 1: Selecciona una mesa'}
            {activeSlide === 1 && '🍽️ Paso 2: Elige del menú'}
            {activeSlide === 2 && '✅ Paso 3: Revisa y envía'}
            {activeSlide === 3 && '💳 Gestión de Pagos'}
            {activeSlide === 4 && '🔔 Notificaciones y Transferencias'}
          </p>
        </footer>
      </div>

      {/* Modales */}
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
          groupOrderInfos={checkoutGroupOrderInfos}
          orderTotal={checkoutOrderTotal}
          tableNumber={checkoutTableNumber}
          onClose={() => {
            setCheckoutOrderId(null);
            setCheckoutGroupOrderInfos([]);
          }}
          onSuccess={handleCheckoutSuccess}
        />
      )}
      {isCheckoutBeforeSend && (
        <CheckoutBeforeSendModal
          orderTotal={checkoutOrderTotal}
          tableNumber={checkoutTableNumber}
          onClose={() => setIsCheckoutBeforeSend(false)}
          onConfirm={handleConfirmPaymentBeforeSend}
          externalSubmitting={isPaymentFlowRunning}
          isOnline={isOnline}
        />
      )}
      <PaymentValidationModal
        isOpen={isValidationModalOpen}
        currentStep={validationStep}
        tableNumber={checkoutTableNumber}
        errorMessage={validationError}
        onRetry={handleRetryPaymentFlow}
        onBackToCheckout={handleBackToCheckout}
      />
      {showPanicModal && (
        <PanicButtonModal 
          onClose={() => setShowPanicModal(false)} 
          sendMessage={sendMessage}
        />
      )}
      {showDeliveryModal && (
        <DeliveryInfoModal
          onClose={() => setShowDeliveryModal(false)}
          onConfirm={handleDeliveryInfoConfirm}
        />
      )}
      {isSendWithoutChargeModalOpen && (
        <ConfirmSendWithoutChargeModal
          onClose={() => {
            setIsSendWithoutChargeModalOpen(false);
            setPendingSendWithoutChargeNotes('');
          }}
          onConfirm={handleConfirmSendWithoutCharge}
        />
      )}
      {isColleagueModalOpen && (
        <ColleagueOrdersModal
          onClose={() => setIsColleagueModalOpen(false)}
          onCheckout={(orderId, total, tableNumber) => {
            setIsColleagueModalOpen(false);
            handleCheckout(orderId, total, tableNumber);
          }}
          onCheckoutGroup={(orderIds, total, tableNumber) => {
            setIsColleagueModalOpen(false);
            handleCheckoutGroup(orderIds, total, tableNumber);
          }}
          onViewDetails={(orderId) => {
            setIsColleagueModalOpen(false);
            setViewingOrderId(orderId);
          }}
          onSelectParentOrder={(order) => {
            setIsColleagueModalOpen(false);
            handleSelectParentOrder(order);
          }}
        />
      )}
      {/* QR Modal */}
      {showQRModal && (
        <QRModal onClose={() => setShowQRModal(false)} />
      )}
    </>
  );
};

export default WaiterDashboard;
