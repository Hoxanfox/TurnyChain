import React, { useState } from 'react';
import { settingsAPI } from '../../../settings/api/settingsAPI';
import type { Setting } from '../../../settings/api/settingsAPI';
import { FaLock, FaUpload, FaImage, FaQrcode } from 'react-icons/fa';
import { useSelector } from 'react-redux';
import { type RootState } from '../../../../app/store';

const SettingsManagement: React.FC = () => {
  const token = useSelector((state: RootState) => state.auth.token);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [qrCodePath, setQrCodePath] = useState<string | null>(null);
  const [logoPath, setLogoPath] = useState<string | null>(null);
  const [appName, setAppName] = useState<string>('TurnyChain');
  const [uploading, setUploading] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    setError(null);
    try {
      if (!token) throw new Error('No token found');
      await settingsAPI.verifyPassword(password, token);
      setIsUnlocked(true);
      loadSettings();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Contraseña incorrecta');
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const settings = await settingsAPI.getSettings();
      const qr = settings.find((s: Setting) => s.key === 'qr_code');
      const logo = settings.find((s: Setting) => s.key === 'logo');
      const name = settings.find((s: Setting) => s.key === 'app_name');
      if (qr) setQrCodePath(qr.value);
      if (logo) setLogoPath(logo.value);
      if (name) setAppName(name.value);
    } catch (err) {
      console.error("Error loading settings:", err);
    }
  };

  const handleSaveName = async () => {
    if (!appName.trim() || !token) return;
    setSavingName(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await settingsAPI.updateSetting('app_name', appName.trim(), token);
      setSuccessMsg('Nombre de la aplicación actualizado correctamente.');
      window.dispatchEvent(new Event('app-name-updated'));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al guardar el nombre de la aplicación.');
    } finally {
      setSavingName(false);
    }
  };

  const handleUpload = async (key: 'qr_code' | 'logo', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setSuccessMsg(null);
    setError(null);
    try {
      if (!token) throw new Error('No token found');
      const response = await settingsAPI.uploadImage(key, file, token);
      if (key === 'qr_code') setQrCodePath(response.url);
      if (key === 'logo') {
        setLogoPath(response.url);
        // Dispatch custom event to notify App.tsx to update logo globally
        window.dispatchEvent(new Event('app-logo-updated'));
      }
      setSuccessMsg(`Imagen de ${key === 'qr_code' ? 'QR' : 'Logo'} actualizada correctamente.`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al subir la imagen.');
    } finally {
      setUploading(false);
    }
  };

  const getFullUrl = (path: string) => {
    if (path.startsWith('http')) return path;
    // Replace old /uploads paths to /api/static if necessary
    const normalizedPath = path.startsWith('/uploads/') ? path.replace('/uploads/', '/api/static/') : path;
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
    return `${API_URL.replace('/api', '')}${normalizedPath}?v=${new Date().getTime()}`; // cache buster
  };

  if (!isUnlocked) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-gray-100 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaLock className="text-red-500 text-2xl" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Área Restringida</h2>
          <p className="text-gray-600 mb-6 text-sm">
            Para acceder a las configuraciones globales, por favor ingresa tu contraseña nuevamente.
          </p>
          
          <form onSubmit={handleUnlock}>
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 focus:ring-0 transition-colors mb-4"
              required
            />
            {error && <p className="text-red-500 text-sm mb-4 font-semibold">{error}</p>}
            <button
              type="submit"
              disabled={loading || !password}
              className={`w-full py-3 rounded-xl font-bold text-white transition-all ${
                loading || !password ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 shadow-md hover:shadow-lg'
              }`}
            >
              {loading ? 'Verificando...' : 'Desbloquear'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn p-4">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Ajustes Globales</h2>
        <p className="text-gray-600 text-sm">Administra imágenes y configuraciones para toda la aplicación.</p>
      </div>

      {successMsg && (
        <div className="mb-6 bg-green-50 text-green-700 p-4 rounded-xl border border-green-200 font-semibold text-sm">
          ✅ {successMsg}
        </div>
      )}
      {error && (
        <div className="mb-6 bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 font-semibold text-sm">
          ❌ {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* APP NAME CARD */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 md:col-span-2">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <FaLock className="text-blue-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-800">Nombre de la Aplicación</h3>
          </div>
          <p className="text-sm text-gray-500 mb-4">Este nombre aparecerá en la pestaña del navegador y como título principal.</p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              placeholder="Ej: Mi Restaurante"
              className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 focus:ring-0 transition-colors"
            />
            <button
              onClick={handleSaveName}
              disabled={savingName || !appName.trim()}
              className={`px-6 py-3 rounded-xl font-bold text-white transition-all ${
                savingName || !appName.trim() ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 shadow-md hover:shadow-lg'
              }`}
            >
              {savingName ? 'Guardando...' : 'Guardar Nombre'}
            </button>
          </div>
        </div>
        {/* LOGO CARD */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
              <FaImage className="text-indigo-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-800">Logo del Restaurante</h3>
          </div>
          <p className="text-sm text-gray-500 mb-4">Este logo reemplazará el ícono por defecto en la pestaña del navegador y en la interfaz.</p>
          
          <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 p-6 flex flex-col items-center justify-center mb-4">
            {logoPath ? (
              <img src={getFullUrl(logoPath)} alt="Logo" className="h-32 object-contain mb-4 rounded" />
            ) : (
              <div className="text-gray-400 mb-4 flex flex-col items-center">
                <FaImage className="text-4xl mb-2 opacity-50" />
                <span>Sin logo configurado</span>
              </div>
            )}
            
            <label className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${uploading ? 'bg-gray-200 text-gray-500' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}`}>
              <FaUpload />
              {uploading ? 'Subiendo...' : 'Subir Nuevo Logo'}
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={(e) => handleUpload('logo', e)} 
                disabled={uploading}
              />
            </label>
          </div>
        </div>

        {/* QR CARD */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <FaQrcode className="text-green-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-800">Código QR (Pagos/Menú)</h3>
          </div>
          <p className="text-sm text-gray-500 mb-4">Esta imagen se le mostrará a los clientes desde la tablet del mesero para escanear fácilmente.</p>
          
          <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 p-6 flex flex-col items-center justify-center mb-4">
            {qrCodePath ? (
              <img src={getFullUrl(qrCodePath)} alt="QR Code" className="h-48 w-48 object-contain mb-4 rounded" />
            ) : (
              <div className="text-gray-400 mb-4 flex flex-col items-center">
                <FaQrcode className="text-5xl mb-2 opacity-50" />
                <span>Sin QR configurado</span>
              </div>
            )}
            
            <label className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${uploading ? 'bg-gray-200 text-gray-500' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}>
              <FaUpload />
              {uploading ? 'Subiendo...' : 'Subir Nuevo QR'}
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={(e) => handleUpload('qr_code', e)} 
                disabled={uploading}
              />
            </label>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SettingsManagement;
