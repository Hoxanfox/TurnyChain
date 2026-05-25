import React from 'react';

interface CashierMobileTabsProps {
  viewMode: 'tables' | 'urgent';
  tablesCount: number;
  urgentCount: number;
  onChange: (value: 'tables' | 'urgent') => void;
}

export const CashierMobileTabs: React.FC<CashierMobileTabsProps> = ({
  viewMode,
  tablesCount,
  urgentCount,
  onChange,
}) => (
  <div className="px-4 pb-3 flex gap-2">
    <button
      onClick={() => onChange('tables')}
      className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all ${
        viewMode === 'tables'
          ? 'bg-white text-purple-600 shadow-lg'
          : 'bg-white bg-opacity-20 text-white'
      }`}
    >
      🪑 Por Mesas ({tablesCount})
    </button>
    <button
      onClick={() => onChange('urgent')}
      className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all ${
        viewMode === 'urgent'
          ? 'bg-white text-purple-600 shadow-lg'
          : 'bg-white bg-opacity-20 text-white'
      }`}
    >
      ⚠️ Urgentes ({urgentCount})
    </button>
  </div>
);
