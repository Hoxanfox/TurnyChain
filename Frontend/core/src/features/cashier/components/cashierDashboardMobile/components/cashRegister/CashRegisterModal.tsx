import React, { useState, useEffect } from 'react';
import type { CashRegisterSessionDetails, CashRegisterClosingDetails } from '../../api/cashRegisterApi';
import { getCurrentSessionDetails, getClosingSessionDetails } from '../../api/cashRegisterApi';
import { CashRegisterOpening } from './CashRegisterOpening';
import { CashRegisterActive } from './CashRegisterActive';
import { CashRegisterClosing } from './CashRegisterClosing';

interface CashRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CashRegisterModal: React.FC<CashRegisterModalProps> = ({ isOpen, onClose }) => {
  const [sessionDetails, setSessionDetails] = useState<CashRegisterSessionDetails | null>(null);
  const [closingDetails, setClosingDetails] = useState<CashRegisterClosingDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClosingLoading, setIsClosingLoading] = useState(false);
  const [currentTab, setCurrentTab] = useState<'active' | 'closing'>('active');

  const fetchSession = async () => {
    setIsLoading(true);
    try {
      const data = await getCurrentSessionDetails();
      setSessionDetails(data);
    } catch (error) {
      console.error('Error fetching cash register session', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoToClosing = async () => {
    setCurrentTab('closing');
    setIsClosingLoading(true);
    try {
      const data = await getClosingSessionDetails();
      setClosingDetails(data);
    } catch (error) {
      console.error('Error fetching closing session details', error);
    } finally {
      setIsClosingLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSession();
      setCurrentTab('active');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-4 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-3xl">🏪</span>
            <div>
              <h2 className="text-xl font-bold">Control de Caja</h2>
              <p className="text-xs text-emerald-100">
                {sessionDetails?.session ? 'Caja Abierta' : 'Caja Cerrada'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 flex items-center justify-center text-xl font-bold transition-colors"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-40">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600"></div>
              <p className="mt-4 text-gray-500 font-semibold">Cargando estado de la caja...</p>
            </div>
          ) : !sessionDetails?.session ? (
            <CashRegisterOpening onOpened={fetchSession} />
          ) : currentTab === 'active' ? (
            <CashRegisterActive 
              details={sessionDetails} 
              onExpenseAdded={fetchSession} 
              onGoToClosing={handleGoToClosing} 
            />
          ) : (
            isClosingLoading ? (
              <div className="flex flex-col items-center justify-center h-40">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600"></div>
                <p className="mt-4 text-gray-500 font-semibold">Cargando datos de cierre...</p>
              </div>
            ) : closingDetails ? (
              <CashRegisterClosing 
                details={closingDetails} 
                onClosed={() => {
                  fetchSession();
                  setTimeout(onClose, 2000); // Close modal after 2 seconds showing success
                }}
                onCancel={() => setCurrentTab('active')} 
              />
            ) : null
          )}
        </div>
      </div>
    </div>
  );
};
