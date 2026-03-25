// =================================================================
// ARCHIVO 9: /src/features/waiter/components/MenuDisplay.tsx (ACTUALIZADO)
// =================================================================
import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMenu } from '../../admin/components/menu/api/menuSlice.ts';
import type { AppDispatch, RootState } from '../../../app/store';
import type { MenuItem } from '../../../types/menu';
import MenuSearchBar from './MenuSearchBar';

interface MenuDisplayProps {
  onAddToCart: (item: MenuItem) => void;
}

const MenuDisplay: React.FC<MenuDisplayProps> = ({ onAddToCart }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { items: menuItems, status: menuStatus } = useSelector((state: RootState) => state.menu);

  // Estados para filtros y búsqueda
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (menuStatus === 'idle') {
      dispatch(fetchMenu());
    }
  }, [menuStatus, dispatch]);

  // Extraer categorías únicas del menú
  const categories = useMemo(() => {
    const categoryMap = new Map<string, { id: string; name: string; icon?: string }>();

    menuItems.forEach(item => {
      if (item.category_id && !categoryMap.has(item.category_id)) {
        categoryMap.set(item.category_id, {
          id: item.category_id,
          name: item.category_name || `Categoría ${item.category_id}`,
          icon: getCategoryIcon(item.category_name || '')
        });
      }
    });

    return Array.from(categoryMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [menuItems]);

  // Función helper para asignar iconos a categorías
  function getCategoryIcon(categoryName: string): string {
    const name = categoryName.toLowerCase();
    if (name.includes('hamburgue') || name.includes('burger')) return '🍔';
    if (name.includes('pizza')) return '🍕';
    if (name.includes('bebida') || name.includes('drink')) return '🥤';
    if (name.includes('postre') || name.includes('dessert')) return '🍰';
    if (name.includes('ensalada') || name.includes('salad')) return '🥗';
    if (name.includes('sopa') || name.includes('soup')) return '🍲';
    if (name.includes('pasta')) return '🍝';
    if (name.includes('pollo') || name.includes('chicken')) return '🍗';
    if (name.includes('carne') || name.includes('meat')) return '🥩';
    if (name.includes('pescado') || name.includes('fish')) return '🐟';
    if (name.includes('vegeta') || name.includes('vegan')) return '🥬';
    if (name.includes('desayuno') || name.includes('breakfast')) return '🍳';
    if (name.includes('café') || name.includes('coffee')) return '☕';
    return '🍽️';
  }

  // Filtrar y ordenar items
  const filteredAndSortedItems = useMemo(() => {
    let filtered = menuItems.filter(item => item.is_available);

    // Filtrar por categoría
    if (selectedCategory) {
      filtered = filtered.filter(item => item.category_id === selectedCategory);
    }

    // Filtrar por búsqueda
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchLower) ||
        item.description?.toLowerCase().includes(searchLower) ||
        item.category_name?.toLowerCase().includes(searchLower)
      );
    }

    // Ordenar por popularidad (Principio de Pareto)
    // Items con order_count más alto primero
    return [...filtered].sort((a, b) => {
      const countA = a.order_count || 0;
      const countB = b.order_count || 0;

      if (countA !== countB) {
        return countB - countA; // Más populares primero
      }

      // Si tienen el mismo order_count, ordenar alfabéticamente
      return a.name.localeCompare(b.name);
    });
  }, [menuItems, selectedCategory, searchTerm]);

  // Calcular threshold de popularidad (top 20%)
  const popularityThreshold = useMemo(() => {
    const sortedByCount = [...menuItems]
      .filter(item => item.order_count && item.order_count > 0)
      .sort((a, b) => (b.order_count || 0) - (a.order_count || 0));

    if (sortedByCount.length === 0) return Infinity;

    const top20Index = Math.max(0, Math.floor(sortedByCount.length * 0.2) - 1);
    return sortedByCount[top20Index]?.order_count || 0;
  }, [menuItems]);

  // Contar items por categoría para los badges
  const itemsCountByCategory = useMemo(() => {
    const counts: { [key: string]: number } = {
      all: menuItems.filter(item => item.is_available).length
    };

    menuItems.forEach(item => {
      if (item.is_available && item.category_id) {
        counts[item.category_id] = (counts[item.category_id] || 0) + 1;
      }
    });

    return counts;
  }, [menuItems]);

  // Función para determinar si un item es popular
  const isPopular = (item: MenuItem): boolean => {
    return (item.order_count || 0) >= popularityThreshold && (item.order_count || 0) > 0;
  };

  return (
    <div className="pb-4">
      {menuStatus === 'loading' && (
        <div className="flex justify-center items-center py-8">
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="text-gray-500 text-sm">Cargando menú...</p>
          </div>
        </div>
      )}

      {menuStatus === 'succeeded' && (
        <>
          {/* Selección de Categoría */}
          {!selectedCategory && (
            <>
              <h3 className="text-lg font-bold mb-3 text-gray-700">Selecciona una categoría</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className="flex flex-col items-center justify-center p-4 bg-white border-2 border-indigo-100 rounded-xl shadow hover:bg-indigo-50 hover:border-indigo-400 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    <span className="text-3xl mb-2">{cat.icon}</span>
                    <span className="font-semibold text-gray-800 text-sm text-center">{cat.name}</span>
                    <span className="text-xs text-gray-500 mt-1">{itemsCountByCategory[cat.id] || 0} items</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Si hay categoría seleccionada, mostrar buscador, botón para cambiar y los items */}
          {selectedCategory && (
            <>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-gray-700">
                  {categories.find(c => c.id === selectedCategory)?.icon} {categories.find(c => c.id === selectedCategory)?.name}
                </h3>
                <button
                  onClick={() => { setSelectedCategory(null); setSearchTerm(''); }}
                  className="px-3 py-1 rounded-full bg-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-300 transition-all"
                >
                  ← Cambiar categoría
                </button>
              </div>
              <MenuSearchBar
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                placeholder={`Buscar en ${categories.find(c => c.id === selectedCategory)?.name || ''}...`}
              />
              {/* Contador de resultados */}
              {searchTerm && (
                <div className="mb-3 text-sm text-gray-600">
                  {filteredAndSortedItems.length === 0 ? (
                    <p className="text-center py-4">
                      😕 No se encontraron resultados para "{searchTerm}"
                    </p>
                  ) : (
                    <p>
                      {filteredAndSortedItems.length} {filteredAndSortedItems.length === 1 ? 'producto encontrado' : 'productos encontrados'}
                    </p>
                  )}
                </div>
              )}
              {/* Grid de items filtrados por categoría y búsqueda */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredAndSortedItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => onAddToCart(item)}
                    className="relative p-4 bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl shadow-sm text-left hover:shadow-lg hover:border-indigo-300 hover:from-indigo-50 hover:to-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 active:scale-95"
                  >
                    {/* Badge de item popular */}
                    {isPopular(item) && (
                      <div className="absolute -top-2 -right-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1 z-10">
                        ⭐ Popular
                      </div>
                    )}
                    <p className="font-bold text-gray-900 text-sm mb-1 line-clamp-2 pr-2 min-h-[2.5rem]">
                      {item.name}
                    </p>
                    {item.description && (
                      <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                        {item.description}
                      </p>
                    )}
                    <p className="text-lg font-bold text-indigo-700 mt-auto">
                      ${item.price.toFixed(2)}
                    </p>
                  </button>
                ))}
              </div>
              {/* Mensaje si no hay items disponibles en la categoría */}
              {filteredAndSortedItems.length === 0 && !searchTerm && (
                <div className="text-center py-8">
                  <p className="text-gray-500">No hay productos disponibles en esta categoría</p>
                </div>
              )}
            </>
          )}
        </>
      )}

      {menuStatus === 'failed' && (
        <div className="flex justify-center items-center py-8">
          <p className="text-red-500">Error al cargar el menú. Intenta recargar.</p>
        </div>
      )}
    </div>
  );
};

export default MenuDisplay;


