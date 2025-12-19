// =================================================================
// ARCHIVO: /src/components/Notification.tsx
// Componente de notificación visual para eventos en tiempo real
// =================================================================
import { useEffect } from 'react';

interface NotificationProps {
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
  onClose: () => void;
}

export function Notification({
  title,
  message,
  type,
  duration = 5000,
  onClose
}: NotificationProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const bgColors = {
    info: 'bg-blue-500',
    success: 'bg-green-500',
    warning: 'bg-orange-500',
    error: 'bg-red-500'
  };

  const icons = {
    info: '📬',
    success: '✅',
    warning: '⚠️',
    error: '❌'
  };

  return (
    <div
      className={`fixed top-4 right-4 ${bgColors[type]} text-white p-4 rounded-lg shadow-2xl z-[9999] animate-slide-in min-w-[300px] max-w-[400px]`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0">{icons[type]}</span>
        <div className="flex-1">
          <h4 className="font-bold text-lg mb-1">{title}</h4>
          <p className="text-sm opacity-90">{message}</p>
        </div>
        <button
          onClick={onClose}
          className="ml-2 text-white hover:text-gray-200 text-xl font-bold flex-shrink-0 transition-colors"
          aria-label="Cerrar notificación"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

