import React, { useState } from 'react';
import { MdClose, MdAccessTime } from 'react-icons/md';

interface ClockPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectHour: (hourDate: Date) => void;
}

const ClockPickerModal: React.FC<ClockPickerModalProps> = ({ isOpen, onClose, onSelectHour }) => {
  const [selectedHour12, setSelectedHour12] = useState<number>(12);
  const [isPM, setIsPM] = useState<boolean>(new Date().getHours() >= 12);

  if (!isOpen) return null;

  // Math para posicionar los 12 números en el reloj
  const getPosition = (hour: number) => {
    const angle = (hour * 30 - 90) * (Math.PI / 180);
    const radius = 38; // 38% desde el centro
    const x = 50 + radius * Math.cos(angle);
    const y = 50 + radius * Math.sin(angle);
    return { left: `${x}%`, top: `${y}%` };
  };

  const handleConfirm = () => {
    const now = new Date();
    // Construir la fecha exacta para la hora elegida pero enfocada en "Hoy"
    const targetDate = new Date();
    
    let hour24 = selectedHour12;
    if (isPM && hour24 !== 12) hour24 += 12;
    if (!isPM && hour24 === 12) hour24 = 0;
    
    targetDate.setHours(hour24, 0, 0, 0);

    // Si la hora elegida es del futuro (ej son las 3pm y eligen 5pm), asumimos que hablan de ayer.
    if (targetDate > now) {
      targetDate.setDate(targetDate.getDate() - 1);
    }

    onSelectHour(targetDate);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center animate-fade-in px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl relative overflow-hidden flex flex-col transform animate-slide-up">
        
        {/* Encabezado */}
        <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-6 text-white text-center">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          >
            <MdClose size={20} />
          </button>
          <MdAccessTime size={40} className="mx-auto mb-2 text-indigo-100" />
          <h2 className="text-xl font-bold">Seleccionar Hora</h2>
          <p className="text-indigo-100 text-sm mt-1">Buscaremos transferencias en este rango</p>
        </div>

        {/* Cuerpo del Reloj */}
        <div className="p-8 flex flex-col items-center bg-slate-50">
          
          <div className="relative w-64 h-64 bg-white rounded-full shadow-inner border-4 border-indigo-50 flex items-center justify-center">
            {/* Centro del reloj */}
            <div className="w-3 h-3 bg-indigo-600 rounded-full absolute z-10 shadow-sm"></div>
            
            {/* Manecilla simulada */}
            <div 
              className="absolute w-1 bg-indigo-500 rounded-full origin-bottom transition-transform duration-300 ease-out"
              style={{ 
                height: '35%', 
                bottom: '50%',
                transform: `rotate(${selectedHour12 * 30}deg)`,
              }}
            >
              <div className="w-4 h-4 bg-indigo-600 rounded-full absolute -top-2 -left-1.5 shadow-md"></div>
            </div>

            {/* Números */}
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(hour => {
              const pos = getPosition(hour);
              const isSelected = selectedHour12 === hour;
              return (
                <button
                  key={hour}
                  onClick={() => setSelectedHour12(hour)}
                  className={`absolute w-10 h-10 -ml-5 -mt-5 rounded-full flex items-center justify-center text-lg font-bold transition-all duration-200 z-20 ${
                    isSelected 
                      ? 'bg-indigo-600 text-white shadow-lg scale-110' 
                      : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-600'
                  }`}
                  style={{ left: pos.left, top: pos.top }}
                >
                  {hour}
                </button>
              );
            })}
          </div>

          {/* AM / PM Toggle */}
          <div className="flex bg-slate-200 rounded-xl p-1 mt-8 w-48 shadow-inner">
            <button
              onClick={() => setIsPM(false)}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                !isPM ? 'bg-white text-indigo-700 shadow-md' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              AM
            </button>
            <button
              onClick={() => setIsPM(true)}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                isPM ? 'bg-white text-indigo-700 shadow-md' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              PM
            </button>
          </div>

          {/* Resumen */}
          <div className="mt-6 text-center">
            <p className="text-sm font-medium text-slate-500">Rango seleccionado:</p>
            <p className="text-xl font-black text-indigo-900 mt-1">
              {selectedHour12}:00 {isPM ? 'PM' : 'AM'} - {selectedHour12}:59 {isPM ? 'PM' : 'AM'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-100 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={handleConfirm}
            className="flex-1 py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-md hover:shadow-lg"
          >
            Filtrar
          </button>
        </div>

      </div>
    </div>
  );
};

export default ClockPickerModal;
