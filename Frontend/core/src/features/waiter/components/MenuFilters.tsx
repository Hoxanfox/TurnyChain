import React from 'react';

interface MenuFiltersProps {
  categories: { id: string; name: string; icon?: string }[];
  selectedCategory: string | null;
  onSelectCategory: (categoryId: string | null) => void;
  itemsCount?: { [categoryId: string]: number };
}

const MenuFilters: React.FC<MenuFiltersProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  itemsCount = {}
}) => {
  return (
    <div className="mb-4">
      {/* Scroll horizontal para móviles */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {/* Botón "Todos" */}
        <button
          onClick={() => onSelectCategory(null)}
          className={`
            flex-shrink-0 px-4 py-2 rounded-full font-medium text-sm transition-all shadow-md
            ${selectedCategory === null
              ? 'bg-indigo-600 text-white shadow-lg scale-105'
              : 'bg-white text-gray-700 border-2 border-indigo-200 hover:bg-indigo-50 hover:border-indigo-300'
            }
          `}
        >
          📋 Todos
          {itemsCount['all'] !== undefined && (
            <span className="ml-1.5 text-xs font-bold opacity-75">
              ({itemsCount['all']})
            </span>
          )}
        </button>

        {/* Botones de categorías */}
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onSelectCategory(category.id)}
            className={`
              flex-shrink-0 px-4 py-2 rounded-full font-medium text-sm transition-all shadow-md
              ${selectedCategory === category.id
                ? 'bg-indigo-600 text-white shadow-lg scale-105'
                : 'bg-white text-gray-700 border-2 border-gray-200 hover:bg-gray-50 hover:border-indigo-200'
              }
            `}
          >
            {category.icon && <span className="mr-1">{category.icon}</span>}
            {category.name}
            {itemsCount[category.id] !== undefined && (
              <span className="ml-1.5 text-xs font-bold opacity-75">
                ({itemsCount[category.id]})
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default MenuFilters;

