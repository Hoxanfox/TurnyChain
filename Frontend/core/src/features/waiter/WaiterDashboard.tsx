// =================================================================
// ARCHIVO 3: /src/features/waiter/WaiterDashboard.tsx (ACTUALIZADO)
// =================================================================
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addNewOrder } from '../orders/ordersSlice';
import { fetchTables } from '../tables/tablesSlice';
import type { AppDispatch, RootState } from '../../app/store';
import type { MenuItem, CartItem } from '../../types/menu';
import type { OrderItemPayload } from '../../types/orders'; // CORRECCIÓN: Se elimina la importación de Customizations
import OrderDetailModal from '../shared/OrderDetailModal';
import MenuDisplay from './components/MenuDisplay';
import CurrentOrder from './components/CurrentOrder';
import MyOrdersModal from './components/MyOrdersModal';
import LogoutButton from '../../components/LogoutButton';
import CustomizeOrderItemModal from './components/CustomizeOrderItemModal';

// Se define el tipo de los datos de personalización que vienen del modal.
interface CustomizationData {
    price: number;
    finalPrice: number;
    selectedAccompaniments: any[];
    removedIngredients: any[];
    notes: string;
}

const WaiterDashboard: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { tables } = useSelector((state: RootState) => state.tables);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [tableId, setTableId] = useState('');
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [viewingOrderId, setViewingOrderId] = useState<string | null>(null);
  const [isMyOrdersModalOpen, setIsMyOrdersModalOpen] = useState(false);

  useEffect(() => {
    dispatch(fetchTables());
  }, [dispatch]);

  const handleConfirmCustomization = (customizationData: CustomizationData) => {
    if (!customizingItem) return;

    const newCartItem: CartItem = {
      ...customizingItem,
      ...customizationData,
      cartItemId: `${customizingItem.id}-${Date.now()}`,
    };
    setCart(currentCart => [...currentCart, newCartItem]);
  };

  const handleCartAction = (item: CartItem, action: 'delete') => {
    if (action === 'delete') {
        setCart(currentCart => currentCart.filter(ci => ci.cartItemId !== item.cartItemId));
    }
  };

  const handleSendOrder = () => {
    if (!tableId || cart.length === 0) return;
    
    const selectedTable = tables.find(t => t.id === tableId);
    if (!selectedTable) return;

    const orderItems: OrderItemPayload[] = cart.map(item => ({
      menu_item_id: item.id,
      quantity: 1,
      price_at_order: item.finalPrice,
      notes: item.notes,
      customizations: {
        removed_ingredients: item.removedIngredients,
        selected_accompaniments: item.selectedAccompaniments,
      }
    }));
    
    const payload = { 
        table_id: tableId,
        table_number: selectedTable.table_number,
        items: orderItems 
    };

    console.log("Enviando payload de la orden al backend:", JSON.stringify(payload, null, 2));

    dispatch(addNewOrder(payload));
    setCart([]);
    setTableId('');
  };

  const handleSelectOrder = (orderId: string) => {
    setIsMyOrdersModalOpen(false);
    setViewingOrderId(orderId);
  };

  return (
    <>
      <div className="flex flex-col lg:flex-row h-screen bg-gray-100 font-sans">
        <div className="w-full lg:w-1/3 bg-white p-4 shadow-lg flex flex-col">
          <CurrentOrder 
              cart={cart}
              tableId={tableId}
              tables={tables}
              onTableChange={setTableId}
              onSendOrder={handleSendOrder}
              onCartAction={handleCartAction}
              onEditItem={() => {}} // Placeholder
          />
        </div>
        <div className="w-full lg:w-2/3 p-4 flex flex-col">
          <header className="flex justify-between items-center mb-4">
            <button onClick={() => setIsMyOrdersModalOpen(true)} className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-600">
              Mis Órdenes
            </button>
            <LogoutButton />
          </header>
          <div className="overflow-y-auto">
              <MenuDisplay onAddToCart={setCustomizingItem} />
          </div>
        </div>
      </div>
      
      {isMyOrdersModalOpen && <MyOrdersModal onClose={() => setIsMyOrdersModalOpen(false)} onSelectOrder={handleSelectOrder} />}
      {viewingOrderId && <OrderDetailModal orderId={viewingOrderId} onClose={() => setViewingOrderId(null)} />}
      {customizingItem && <CustomizeOrderItemModal item={customizingItem} onClose={() => setCustomizingItem(null)} onConfirm={handleConfirmCustomization} />}
    </>
  );
};

export default WaiterDashboard;