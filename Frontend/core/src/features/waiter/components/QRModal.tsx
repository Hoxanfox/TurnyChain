import React, { useState, useEffect } from 'react';
import { FaTimes, FaQrcode } from 'react-icons/fa';
import { settingsAPI } from '../../settings/api/settingsAPI';

interface QRModalProps {
  onClose: () => void;
}

const QRModal: React.FC<QRModalProps> = ({ onClose }) => {
  const [qrCodePath, setQrCodePath] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQR = async () => {
      try {
        const settings = await settingsAPI.getSettings();
        const qrSetting = settings.find(s => s.key === 'qr_code');
        if (qrSetting && qrSetting.value) {
          setQrCodePath(qrSetting.value);
        }
      } catch (err) {
        console.error("Error fetching QR config:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchQR();
  }, []);

  const getFullUrl = (path: string) => {
    if (path.startsWith('http')) return path;
    const normalizedPath = path.startsWith('/uploads/') ? path.replace('/uploads/', '/api/static/') : path;
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
    return `${API_URL.replace('/api', '')}${normalizedPath}`;
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-fadeIn relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-gray-100 text-gray-500 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors z-10"
        >
          <FaTimes size={20} />
        </button>

        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaQrcode className="text-3xl text-indigo-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Código QR</h2>
          <p className="text-sm text-gray-500 mb-6">Muestra este código al cliente para pagos o acceder al menú virtual.</p>

          <div className="bg-gray-50 rounded-2xl p-4 flex flex-col items-center justify-center min-h-[250px] border border-gray-200">
            {loading ? (
              <div className="animate-pulse flex flex-col items-center">
                <div className="w-48 h-48 bg-gray-200 rounded-xl mb-4"></div>
                <div className="h-4 w-32 bg-gray-200 rounded"></div>
              </div>
            ) : qrCodePath ? (
              <img 
                src={getFullUrl(qrCodePath)} 
                alt="QR Code" 
                className="w-full max-w-[250px] h-auto object-contain rounded-lg"
              />
            ) : (
              <div className="text-center text-gray-400">
                <FaQrcode className="text-5xl mx-auto mb-2 opacity-30" />
                <p>El administrador no ha configurado un QR.</p>
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="mt-6 w-full py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default QRModal;
