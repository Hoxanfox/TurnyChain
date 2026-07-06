import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMenu, setSoldOutMenuId, setSoldOutAccompanimentId, setSoldOutIngredientId } from '../../admin/components/menu/api/menuSlice.ts';
import { fetchAccompaniments } from '../../admin/components/accompaniments/api/accompanimentsSlice.ts';
import { fetchIngredients } from '../../admin/components/ingredients/api/ingredientsSlice.ts';
import type { AppDispatch, RootState } from '../../../app/store';
import { FaSearch } from 'react-icons/fa';

interface PanicButtonModalProps {
  onClose: () => void;
  sendMessage?: (type: string, payload: any) => void;
}

type TabType = 'menu' | 'accompaniment' | 'ingredient';

const PanicButtonModal: React.FC<PanicButtonModalProps> = ({ onClose, sendMessage }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { items: menuItems, soldOutMenuIds, soldOutAccompanimentIds, soldOutIngredientIds } = useSelector((state: RootState) => state.menu);
  const { items: accompaniments, status: accStatus } = useSelector((state: RootState) => state.accompaniments);
  const { items: ingredients, status: ingStatus } = useSelector((state: RootState) => state.ingredients);

  const [activeTab, setActiveTab] = useState<TabType>('menu');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [showOnlySoldOut, setShowOnlySoldOut] = useState(false);

  useEffect(() => {
    if (menuItems.length === 0) dispatch(fetchMenu());
    if (accStatus === 'idle') dispatch(fetchAccompaniments());
    if (ingStatus === 'idle') dispatch(fetchIngredients());
  }, [dispatch, menuItems.length, accStatus, ingStatus]);

  // Extract unique categories for filter
  const categories = useMemo(() => {
    const categoryMap = new Map<string, { id: string; name: string }>();

    menuItems.forEach(item => {
      // If showing only sold out, skip items that are not sold out
      if (showOnlySoldOut && !soldOutMenuIds?.includes(item.id)) return;

      if (item.category_id && !categoryMap.has(item.category_id)) {
        categoryMap.set(item.category_id, {
          id: item.category_id,
          name: item.category_name || `Categoría ${item.category_id}`
        });
      }
    });

    return Array.from(categoryMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [menuItems, showOnlySoldOut, soldOutMenuIds]);

  // Filter menu items
  const filteredMenuItems = useMemo(() => {
    return menuItems.filter(item => {
      if (!item.is_available) return false;
      if (showOnlySoldOut && !soldOutMenuIds?.includes(item.id)) return false;
      if (selectedCategory !== 'ALL' && item.category_id !== selectedCategory) return false;
      if (searchTerm && !item.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });
  }, [menuItems, selectedCategory, searchTerm, showOnlySoldOut, soldOutMenuIds]);

  // Filter accompaniments
  const filteredAccompaniments = useMemo(() => {
    let result = accompaniments;
    if (showOnlySoldOut) {
      result = result.filter(a => soldOutAccompanimentIds?.includes(a.id));
    }
    if (searchTerm) {
      result = result.filter(a => a.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    return result;
  }, [accompaniments, searchTerm, showOnlySoldOut, soldOutAccompanimentIds]);

  // Filter ingredients
  const filteredIngredients = useMemo(() => {
    let result = ingredients;
    if (showOnlySoldOut) {
      result = result.filter(i => soldOutIngredientIds?.includes(i.id));
    }
    if (searchTerm) {
      result = result.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    return result;
  }, [ingredients, searchTerm, showOnlySoldOut, soldOutIngredientIds]);

  const handleToggle = (id: string, type: TabType, isSoldOut: boolean) => {
    const newStatus = !isSoldOut;
    if (type === 'menu') {
      dispatch(setSoldOutMenuId({ id, isSoldOut: newStatus }));
    } else if (type === 'accompaniment') {
      dispatch(setSoldOutAccompanimentId({ id, isSoldOut: newStatus }));
    } else if (type === 'ingredient') {
      dispatch(setSoldOutIngredientId({ id, isSoldOut: newStatus }));
    }

    if (sendMessage) {
      sendMessage('SOLD_OUT_TOGGLED', { id, type, isSoldOut: newStatus });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white p-0 rounded-xl shadow-2xl w-full max-w-3xl h-[85vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="bg-red-50 p-4 border-b border-red-200 flex justify-between items-center shrink-0">
          <h2 className="text-xl md:text-2xl font-bold text-red-600 flex items-center gap-2">
            <span className="text-2xl animate-pulse">🚨</span> Panel de Agotados
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 p-2 bg-white rounded-full shadow-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search & Tabs */}
        <div className="p-4 bg-white border-b shrink-0 flex flex-col gap-4 shadow-sm z-10">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar producto, acompañante o ingrediente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none transition-all"
              />
            </div>
            <button
              onClick={() => {
                setShowOnlySoldOut(!showOnlySoldOut);
                // Reset category if enabling showOnlySoldOut so it displays correctly
                if (!showOnlySoldOut) setSelectedCategory('ALL');
              }}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 border-2 ${
                showOnlySoldOut 
                  ? 'bg-red-50 border-red-500 text-red-700 shadow-inner' 
                  : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className={`w-3 h-3 rounded-full ${showOnlySoldOut ? 'bg-red-500 animate-pulse' : 'bg-gray-300'}`}></div>
              Solo Agotados
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
            <button
              onClick={() => setActiveTab('menu')}
              className={`px-4 py-2 rounded-full font-medium text-sm whitespace-nowrap transition-colors ${activeTab === 'menu' ? 'bg-red-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              Platos y Bebidas
            </button>
            <button
              onClick={() => setActiveTab('accompaniment')}
              className={`px-4 py-2 rounded-full font-medium text-sm whitespace-nowrap transition-colors ${activeTab === 'accompaniment' ? 'bg-red-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              Acompañantes
            </button>
            <button
              onClick={() => setActiveTab('ingredient')}
              className={`px-4 py-2 rounded-full font-medium text-sm whitespace-nowrap transition-colors ${activeTab === 'ingredient' ? 'bg-red-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              Ingredientes
            </button>
          </div>

          {activeTab === 'menu' && categories.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 pt-1 hide-scrollbar">
              <button
                onClick={() => setSelectedCategory('ALL')}
                className={`px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap border ${selectedCategory === 'ALL' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              >
                Todas las categorías
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap border ${selectedCategory === cat.id ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          
          {activeTab === 'menu' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filteredMenuItems.map(item => {
                const isSoldOut = soldOutMenuIds?.includes(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => handleToggle(item.id, 'menu', isSoldOut)}
                    className={`p-3 rounded-xl border-2 text-sm font-bold transition-all flex flex-col items-center justify-center text-center gap-2 h-28 relative overflow-hidden ${
                      isSoldOut 
                        ? 'bg-red-50 border-red-500 text-red-700 shadow-sm opacity-90 scale-95' 
                        : 'bg-white border-gray-200 text-gray-700 hover:border-red-300 hover:shadow-md'
                    }`}
                  >
                    <span className="line-clamp-2">{item.name}</span>
                    {isSoldOut && (
                      <div className="absolute bottom-0 left-0 right-0 bg-red-500 text-white text-[10px] py-1 tracking-wider uppercase">
                        Agotado
                      </div>
                    )}
                  </button>
                );
              })}
              {filteredMenuItems.length === 0 && (
                <div className="col-span-full text-center py-10 text-gray-500">
                  No se encontraron platos.
                </div>
              )}
            </div>
          )}

          {activeTab === 'accompaniment' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filteredAccompaniments.map(acc => {
                const isSoldOut = soldOutAccompanimentIds?.includes(acc.id);
                return (
                  <button
                    key={acc.id}
                    onClick={() => handleToggle(acc.id, 'accompaniment', isSoldOut)}
                    className={`p-3 rounded-xl border-2 text-sm font-bold transition-all flex flex-col items-center justify-center text-center gap-2 h-24 relative overflow-hidden ${
                      isSoldOut 
                        ? 'bg-red-50 border-red-500 text-red-700 shadow-sm opacity-90 scale-95' 
                        : 'bg-white border-gray-200 text-gray-700 hover:border-red-300 hover:shadow-md'
                    }`}
                  >
                    <span className="line-clamp-2">{acc.name}</span>
                    {isSoldOut && (
                      <div className="absolute bottom-0 left-0 right-0 bg-red-500 text-white text-[10px] py-1 tracking-wider uppercase">
                        Agotado
                      </div>
                    )}
                  </button>
                );
              })}
              {filteredAccompaniments.length === 0 && (
                <div className="col-span-full text-center py-10 text-gray-500">
                  No se encontraron acompañantes.
                </div>
              )}
            </div>
          )}

          {activeTab === 'ingredient' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filteredIngredients.map(ing => {
                const isSoldOut = soldOutIngredientIds?.includes(ing.id);
                return (
                  <button
                    key={ing.id}
                    onClick={() => handleToggle(ing.id, 'ingredient', isSoldOut)}
                    className={`p-3 rounded-xl border-2 text-sm font-bold transition-all flex flex-col items-center justify-center text-center gap-2 h-24 relative overflow-hidden ${
                      isSoldOut 
                        ? 'bg-red-50 border-red-500 text-red-700 shadow-sm opacity-90 scale-95' 
                        : 'bg-white border-gray-200 text-gray-700 hover:border-red-300 hover:shadow-md'
                    }`}
                  >
                    <span className="line-clamp-2">{ing.name}</span>
                    {isSoldOut && (
                      <div className="absolute bottom-0 left-0 right-0 bg-red-500 text-white text-[10px] py-1 tracking-wider uppercase">
                        Agotado
                      </div>
                    )}
                  </button>
                );
              })}
              {filteredIngredients.length === 0 && (
                <div className="col-span-full text-center py-10 text-gray-500">
                  No se encontraron ingredientes.
                </div>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
};

export default PanicButtonModal;
