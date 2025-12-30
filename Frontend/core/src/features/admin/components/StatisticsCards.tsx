// =================================================================
// COMPONENTE DE TARJETAS DE ESTADÍSTICAS
// =================================================================
import React from 'react';
import { FaUsers, FaClipboardList, FaUtensils, FaTags } from 'react-icons/fa';

interface StatisticsCardsProps {
  totalUsers?: number;
  activeOrders?: number;
  menuItems?: number;
  categories?: number;
}

const StatisticsCards: React.FC<StatisticsCardsProps> = ({
  totalUsers = 0,
  activeOrders = 0,
  menuItems = 0,
  categories = 0,
}) => {
  const cards = [
    {
      title: 'Usuarios',
      value: totalUsers,
      icon: FaUsers,
      bgColor: 'from-blue-500 to-blue-600',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
    {
      title: 'Órdenes Activas',
      value: activeOrders,
      icon: FaClipboardList,
      bgColor: 'from-green-500 to-green-600',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
    },
    {
      title: 'Items de Menú',
      value: menuItems,
      icon: FaUtensils,
      bgColor: 'from-purple-500 to-purple-600',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
    },
    {
      title: 'Categorías',
      value: categories,
      icon: FaTags,
      bgColor: 'from-orange-500 to-orange-600',
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {cards.map((card, index) => (
        <div
          key={index}
          className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden"
        >
          <div className={`h-2 bg-gradient-to-r ${card.bgColor}`} />
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">{card.title}</p>
                <p className="text-3xl font-bold text-gray-800">{card.value}</p>
              </div>
              <div className={`p-4 rounded-full ${card.iconBg}`}>
                <card.icon className={`text-2xl ${card.iconColor}`} />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatisticsCards;

