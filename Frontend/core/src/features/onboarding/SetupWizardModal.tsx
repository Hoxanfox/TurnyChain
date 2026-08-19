import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface SetupWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLaunchTutorial: () => void;
}

export const SetupWizardModal: React.FC<SetupWizardModalProps> = ({
  isOpen,
  onClose,
  onLaunchTutorial,
}) => {
  const [step, setStep] = useState(1);
  const navigate = useNavigate();

  if (!isOpen) return null;

  const totalSteps = 4;

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      onClose();
      onLaunchTutorial();
    }
  };

  const handlePrev = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-indigo-600 p-6 text-white shrink-0 relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-indigo-200 hover:text-white transition-colors"
          >
            ✕
          </button>
          <h2 className="text-2xl font-bold mb-2">Asistente de Configuración</h2>
          <p className="text-indigo-100">Configura los aspectos esenciales de TurnyChain (Paso {step} de {totalSteps})</p>
          
          {/* Progress Bar */}
          <div className="w-full bg-indigo-800 h-2 mt-4 rounded-full overflow-hidden">
            <div 
              className="bg-emerald-400 h-full transition-all duration-300"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
          {step === 1 && (
            <div className="text-center space-y-4">
              <span className="text-6xl block mb-4">👋</span>
              <h3 className="text-xl font-bold text-slate-800">¡Bienvenido a TurnyChain!</h3>
              <p className="text-slate-600">
                Este asistente rápido te ayudará a revisar que las configuraciones de tu restaurante estén listas antes de operar.
              </p>
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl text-left text-sm text-blue-800 mt-6">
                💡 <strong>Sugerencia:</strong> Puedes saltar este paso y volver más tarde desde el panel de Administración.
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-slate-800 mb-4">🍽️ Configuración de Mesas</h3>
              <p className="text-slate-600 mb-4">
                El sistema necesita saber cuántas mesas tienes. Esto se gestiona en la pestaña de <strong>Mesas</strong> del administrador.
              </p>
              <button 
                onClick={() => { onClose(); navigate('/admin/tables'); }}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-semibold border border-slate-300 transition-colors"
              >
                Ir a Crear Mesas Ahora
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-slate-800 mb-4">🖨️ Configuración de Impresoras</h3>
              <p className="text-slate-600 mb-4">
                Puedes conectar impresoras por Red (IP) o Localmente (USB) directamente desde el navegador. 
              </p>
              <button 
                onClick={() => { onClose(); navigate('/admin/printers'); }}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-semibold border border-slate-300 transition-colors"
              >
                Ir a Configurar Impresoras
              </button>
            </div>
          )}

          {step === 4 && (
            <div className="text-center space-y-4">
              <span className="text-6xl block mb-4">🎉</span>
              <h3 className="text-xl font-bold text-slate-800">¡Todo Listo!</h3>
              <p className="text-slate-600">
                Has completado la revisión rápida. Ahora te invitamos a tomar un recorrido interactivo por el sistema para conocer dónde está cada herramienta.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-between shrink-0">
          <button
            onClick={handlePrev}
            disabled={step === 1}
            className={`px-6 py-2 rounded-xl font-bold transition-colors ${
              step === 1 ? 'text-slate-400 cursor-not-allowed' : 'text-slate-600 hover:bg-slate-200 bg-slate-100'
            }`}
          >
            Atrás
          </button>
          
          <button
            onClick={handleNext}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors"
          >
            {step === totalSteps ? 'Finalizar e Iniciar Tutorial' : 'Siguiente'}
          </button>
        </div>

      </div>
    </div>
  );
};
