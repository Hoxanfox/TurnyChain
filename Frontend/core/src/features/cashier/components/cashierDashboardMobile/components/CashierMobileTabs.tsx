import React from 'react';

interface CashierMobileTabsProps {
  viewMode: 'tables' | 'urgent' | 'waiter-stats';
  tablesCount: number;
  urgentCount: number;
  onChange: (value: 'tables' | 'urgent' | 'waiter-stats') => void;
}

export const CashierMobileTabs: React.FC<CashierMobileTabsProps> = ({
  viewMode,
  tablesCount,
  urgentCount,
  onChange,
}) => (
  <div className="px-4 py-3 flex gap-2 overflow-x-auto no-scrollbar">
    <button
      onClick={() => onChange('tables')}
      className={`flex-1 min-w-[110px] px-3 py-2.5 rounded-xl font-semibold transition-all text-sm ${
        viewMode === 'tables'
          ? 'bg-purple-600 text-white shadow-md shadow-purple-200'
          : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
      }`}
    >
      🪑 Mesas ({tablesCount})
    </button>
    <button
      onClick={() => onChange('urgent')}
      className={`flex-1 min-w-[110px] px-3 py-2.5 rounded-xl font-semibold transition-all text-sm ${
        viewMode === 'urgent'
          ? 'bg-red-500 text-white shadow-md shadow-red-200'
          : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
      }`}
    >
      ⚠️ Urgentes ({urgentCount})
    </button>
    <button
      onClick={() => onChange('waiter-stats')}
      className={`flex-1 min-w-[110px] px-3 py-2.5 rounded-xl font-semibold transition-all text-sm ${
        viewMode === 'waiter-stats'
          ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
          : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
      }`}
    >
      📊 Meseros
    </button>
  </div>
);
