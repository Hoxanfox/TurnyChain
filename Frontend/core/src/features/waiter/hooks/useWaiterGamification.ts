import { useMemo, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../app/store';
import type { Order } from '../../../types/orders';
import confetti from 'canvas-confetti';

export const useWaiterGamification = () => {
  const { myOrders } = useSelector((state: RootState) => state.orders);
  const { items: menuItems } = useSelector((state: RootState) => state.menu);

  // Consider "Bebidas" category
  const isValidOrder = (order: Order) => {
    // If no items, not valid
    if (!order.items || order.items.length === 0) return false;

    // Check if there is at least one item that is NOT a drink
    return order.items.some(orderItem => {
      const menuObj = menuItems.find(mi => mi.id === orderItem.menu_item_id);
      if (!menuObj) return true; // If we can't find it, assume it's food to be safe
      // Exclude if exactly 'Bebidas'
      return menuObj.category_name !== 'Bebidas';
    });
  };

  const validOrdersCount = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    return myOrders.filter(order => {
      const orderDate = new Date(order.created_at);
      return orderDate >= todayStart && order.status === 'pagado' && isValidOrder(order);
    }).length;
  }, [myOrders, menuItems]);

  const target = 40;
  const isMaestro = validOrdersCount >= target;

  const [hasCelebrated, setHasCelebrated] = useState(false);
  const [isCelebrating, setIsCelebrating] = useState(false);

  useEffect(() => {
    // Read from localStorage to remember if we already celebrated today
    const todayKey = new Date().toISOString().split('T')[0];
    const celebratedKey = `waiter_celebrated_${todayKey}`;
    const alreadyCelebrated = localStorage.getItem(celebratedKey) === 'true';

    if (isMaestro && !alreadyCelebrated && !hasCelebrated) {
      setHasCelebrated(true);
      setIsCelebrating(true); // Esto lanzará el video a pantalla completa
      
      // Guardarlo de inmediato para que no vuelva a saltar si el usuario recarga la página
      localStorage.setItem(celebratedKey, 'true');

      // Trigger confetti
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#FFD700', '#FFA500', '#FF8C00'] // Golden/fire colors
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#FFD700', '#FFA500', '#FF8C00']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };

      frame();

      // Trigger a big central pop
      setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#FFD700', '#FF4500', '#FFA500']
        });
      }, 500);
    }
  }, [isMaestro, hasCelebrated]);

  const stopCelebrating = () => {
    setIsCelebrating(false);
  };

  return {
    validOrdersCount,
    isMaestro,
    target,
    isCelebrating,
    stopCelebrating
  };
};
