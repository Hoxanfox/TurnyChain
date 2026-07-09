import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import type { RestaurantLayout } from '../../../../types/layout';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

export function useTableLayout() {
  const [layout, setLayout] = useState<RestaurantLayout>({ nodes: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchLayout();

    const handleWsMessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'setting_updated' && message.payload?.key === 'table_layout') {
          const parsed = JSON.parse(message.payload.value);
          if (parsed && parsed.nodes) {
            setLayout(parsed);
          }
        }
      } catch (err) {
        // Ignorar
      }
    };

    // La URL debe coincidir con la de WS de la app, esto es una simplificación asumiendo 
    // que la conexión principal despacha eventos custom o deberíamos suscribirnos aquí.
    // Como TurnyChain probablemente usa un contexto global de WS, lo correcto es escuchar el window event
    // si el ws principal despacha eventos al window. Si no, lo dejamos simple por ahora o leemos desde el ws global si existe.
    window.addEventListener('ws_setting_updated', handleWsMessage as EventListener);
    
    return () => {
      window.removeEventListener('ws_setting_updated', handleWsMessage as EventListener);
    };
  }, []);

  const fetchLayout = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/settings/table_layout`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data && response.data.value) {
        // value is a stringified JSON if it comes from our settings table
        const parsed = JSON.parse(response.data.value);
        if (parsed && parsed.nodes) {
          setLayout(parsed);
        }
      }
    } catch (error: any) {
      // Si el setting no existe aún (404), no es un error
      if (error.response?.status !== 404) {
        console.error('Error fetching table layout:', error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const saveLayout = async (newLayout: RestaurantLayout) => {
    try {
      setIsSaving(true);
      const token = localStorage.getItem('token');
      
      await axios.post(`${API_URL}/settings`, {
        key: 'table_layout',
        value: JSON.stringify(newLayout)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setLayout(newLayout);
      toast.success('Plano guardado exitosamente');
    } catch (error) {
      console.error('Error saving table layout:', error);
      toast.error('Error al guardar el plano');
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    layout,
    setLayout,
    isLoading,
    isSaving,
    saveLayout,
    fetchLayout
  };
}
