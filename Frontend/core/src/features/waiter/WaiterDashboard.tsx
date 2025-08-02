// =================================================================
// ARCHIVO 4: /src/features/waiter/WaiterDashboard.tsx (REFACTORIZADO)
// =================================================================
import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { addNewOrder } from '../orders/ordersSlice';
import type { AppDispatch } from '../../app/store';
import type { MenuItem } from '../../types/menu';
import type { OrderItem } from '../../types/orders';
import EditOrderItemModal from './components/EditOrderItemModal';
import OrderDetailModal from '../shared/OrderDetailModal';
import MenuDisplay from './components/MenuDisplay';
import CurrentOrder from './components/CurrentOrder';
//import MyOrdersList from './components/MyOrdersList';
import LogoutButton from '../../components/LogoutButton';
import MyOrdersModal from './components/MyOrdersModal';

interface CartItem extends MenuItem {
  quantity: number;
  notes?: string;
}

type MobileView = 'order' | 'menu';

const WaiterDashboard: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [tableNumber, setTableNumber] = useState('');
  const [editingItem, setEditingItem] = useState<CartItem | null>(null);
  const [viewingOrderId, setViewingOrderId] = useState<string | null>(null);
  const [isMyOrdersModalOpen, setIsMyOrdersModalOpen] = useState(false);
  const [mobileView, setMobileView] = useState<MobileView>('order');

  const handleCartAction = (item: MenuItem, action: 'add' | 'remove' | 'delete') => {
    setCart(currentCart => {
      const existingItem = currentCart.find(ci => ci.id === item.id);
      if (!existingItem) return action === 'add' ? [...currentCart, { ...item, quantity: 1 }] : currentCart;
      if (action === 'delete' || (action === 'remove' && existingItem.quantity === 1)) {
        return currentCart.filter(ci => ci.id !== item.id);
      }
      return currentCart.map(ci => 
        ci.id === item.id 
          ? { ...ci, quantity: action === 'add' ? ci.quantity + 1 : ci.quantity - 1 } 
          : ci
      );
    });
  };

  const handleUpdateItemInCart = (updatedItem: CartItem) => {
    setCart(currentCart => currentCart.map(item => item.id === updatedItem.id ? updatedItem : item));
  };

  const handleSendOrder = () => {
    if (!tableNumber || cart.length === 0) return;
    const orderItems: OrderItem[] = cart.map(item => ({
      menu_item_id: item.id,
      quantity: item.quantity,
      price_at_order: item.price,
      notes: item.notes,
    }));
    dispatch(addNewOrder({ table_number: parseInt(tableNumber, 10), items: orderItems }));
    setCart([]);
    setTableNumber('');
  };

  const handleSelectOrder = (orderId: string) => {
    setIsMyOrdersModalOpen(false);
    setViewingOrderId(orderId);
  };

  return (
    <>
      <div className="flex flex-col lg:flex-row h-screen bg-gray-100 font-sans">
        {/* Vista de Escritorio */}
        <div className="hidden lg:flex flex-col w-full">
          <header className="p-4 bg-white shadow-md flex justify-between items-center">
            <h1 className="text-xl font-bold text-indigo-600">TurnyChain - Mesero</h1>
            <div className="flex items-center space-x-4">
              <button onClick={() => setIsMyOrdersModalOpen(true)} className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-600">Mis Órdenes</button>
              <LogoutButton />
            </div>
          </header>
          <div className="flex flex-grow overflow-hidden">
            <div className="w-1/3 bg-white p-4 shadow-lg flex flex-col">
              <CurrentOrder 
                  cart={cart} tableNumber={tableNumber} onTableNumberChange={setTableNumber}
                  onCartAction={handleCartAction} onSendOrder={handleSendOrder} onEditItem={setEditingItem}
              />
            </div>
            <div className="w-2/3 p-4 flex flex-col">
              <div className="overflow-y-auto"><MenuDisplay onAddToCart={(item) => handleCartAction(item, 'add')} /></div>
            </div>
          </div>
        </div>

        {/* Vista Móvil */}
        <div className="lg:hidden flex flex-col h-full w-full">
          <header className="p-4 bg-white shadow-md flex justify-between items-center">
            <button onClick={() => setIsMyOrdersModalOpen(true)} className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-600">Mis Órdenes</button>
            <LogoutButton />
          </header>
          <main className="flex-grow p-4 overflow-y-auto relative">
            {mobileView === 'order' && (
              <>
                <CurrentOrder 
                    cart={cart} tableNumber={tableNumber} onTableNumberChange={setTableNumber}
                    onCartAction={handleCartAction} onSendOrder={handleSendOrder} onEditItem={setEditingItem}
                />
                <button onClick={() => setMobileView('menu')} className="absolute bottom-4 right-4 bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:bg-indigo-700">
                  Ver Menú &gt;&gt;&gt;
                </button>
              </>
            )}
            {mobileView === 'menu' && (
              <>
                <MenuDisplay onAddToCart={(item) => handleCartAction(item, 'add')} />
                <button onClick={() => setMobileView('order')} className="absolute bottom-4 left-4 bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:bg-indigo-700">
                  &lt;&lt;&lt; Ver Orden
                </button>
              </>
            )}
          </main>
        </div>
      </div>
      
      {isMyOrdersModalOpen && <MyOrdersModal onClose={() => setIsMyOrdersModalOpen(false)} onSelectOrder={handleSelectOrder} />}
      {viewingOrderId && <OrderDetailModal orderId={viewingOrderId} onClose={() => setViewingOrderId(null)} />}
      {editingItem && <EditOrderItemModal item={editingItem} onClose={() => setEditingItem(null)} onUpdate={handleUpdateItemInCart} />}
    </>
  );
};

export default WaiterDashboard;
