import React from 'react';

interface OrderIdSearchModalProps {
  isOpen: boolean;
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  onClose: () => void;
}

export const OrderIdSearchModal: React.FC<OrderIdSearchModalProps> = ({
  isOpen,
  value,
  onChange,
  onSubmit,
  onClose,
}) => {
  if (!isOpen) return null;

  const trimmedValue = value.trim();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 pb-4 flex flex-col gap-2">
          <div className="flex items-center justify-between mb-2">
            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 active:scale-95 transition-all">
              ✕
            </button>
          </div>
          
          <h2 className="text-xl font-black text-slate-800">Buscar por ID</h2>
          <p className="text-sm font-medium text-slate-500 leading-tight">
            Ingresa el código (ej. 9f3a) para localizar la comanda rápidamente.
          </p>
        </div>

        <div className="px-6 pb-6 pt-2">
          <div className="relative group">
            <input
              type="text"
              autoFocus
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && trimmedValue) {
                  onSubmit(trimmedValue);
                }
              }}
              placeholder="Ej: 9f3a"
              className="w-full bg-slate-50 border-2 border-slate-200 text-slate-800 font-bold text-lg px-4 py-3 rounded-2xl outline-none focus:border-indigo-500 focus:bg-white transition-colors"
            />
            {value && (
              <button
                onClick={() => onChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center bg-slate-200 text-slate-600 rounded-full hover:bg-slate-300 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>
          
          <button
            onClick={() => onSubmit(trimmedValue)}
            disabled={!trimmedValue}
            className="w-full mt-4 flex items-center justify-center gap-2 bg-indigo-600 text-white font-bold py-3.5 px-4 rounded-2xl hover:bg-indigo-700 active:scale-95 disabled:bg-slate-300 disabled:text-slate-500 transition-all shadow-md disabled:shadow-none"
          >
            Buscar Comanda
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};
