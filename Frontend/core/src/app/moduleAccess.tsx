import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { settingsAPI, type Setting } from '../features/settings/api/settingsAPI';

export type ModuleId =
  | 'users' | 'employees' | 'attendance' | 'orders' | 'tables' | 'menu'
  | 'categories' | 'ingredients' | 'accompaniments' | 'stations' | 'printers'
  | 'backup' | 'settings' | 'inventory' | 'payables' | 'cash_register'
  | 'payments' | 'reports' | 'invoices';

interface ModuleAccessContextValue {
  loading: boolean;
  isEnabled: (module: ModuleId) => boolean;
  refresh: () => Promise<void>;
}

const ModuleAccessContext = createContext<ModuleAccessContextValue | null>(null);

const parseEnabled = (value: string | undefined) => {
  if (value === undefined || value.trim() === '') return true;
  const normalized = value.trim().replace(/^"|"$/g, '').toLowerCase();
  return !['false', '0', 'no', 'off'].includes(normalized);
};

export const ModuleAccessProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setSettings(await settingsAPI.getSettings());
    } catch (error) {
      console.error('No se pudo cargar la configuración de módulos:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const handleSettingsUpdate = () => { void refresh(); };
    window.addEventListener('settings_updated', handleSettingsUpdate);
    window.addEventListener('ws_setting_updated', handleSettingsUpdate);
    return () => {
      window.removeEventListener('settings_updated', handleSettingsUpdate);
      window.removeEventListener('ws_setting_updated', handleSettingsUpdate);
    };
  }, [refresh]);

  const value = useMemo<ModuleAccessContextValue>(() => ({
    loading,
    isEnabled: (module) => parseEnabled(settings.find(setting => setting.key === `module_${module}_enabled`)?.value),
    refresh,
  }), [loading, settings]);

  return <ModuleAccessContext.Provider value={value}>{children}</ModuleAccessContext.Provider>;
};

export const useModuleAccess = () => {
  const context = useContext(ModuleAccessContext);
  if (!context) throw new Error('useModuleAccess debe usarse dentro de ModuleAccessProvider');
  return context;
};

export const ModuleRoute: React.FC<React.PropsWithChildren<{ module: ModuleId }>> = ({ module, children }) => {
  const { isEnabled } = useModuleAccess();
  return isEnabled(module) ? <>{children}</> : <Navigate to="/dashboard" replace />;
};
