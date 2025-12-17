// =================================================================
// ARCHIVO: /src/utils/orderDetailsCache.ts
// Helper temporal para guardar/recuperar detalles completos de órdenes
// Sistema con límites y limpieza automática para evitar saturar localStorage
// =================================================================

import type { Ingredient } from '../types/ingredients';
import type { Accompaniment } from '../types/accompaniments';

export interface CachedOrderItemDetails {
  menu_item_id: string;
  all_ingredients: Ingredient[];
  all_accompaniments: Accompaniment[];
}

const CACHE_KEY = 'turnychain_order_details_cache';
const CACHE_EXPIRY_HOURS = 24; // Mantener cache por 24 horas
const MAX_CACHED_ORDERS = 50; // Máximo 50 órdenes en cache (evita saturación)
const QUOTA_EXCEEDED_ERROR = 'QuotaExceededError';

interface CacheEntry {
  orderId: string;
  items: CachedOrderItemDetails[];
  timestamp: number;
}

interface CacheStats {
  totalOrders: number;
  oldestTimestamp: number;
  newestTimestamp: number;
  estimatedSizeKB: number;
}

// Guardar detalles completos de una orden recién creada
export const cacheOrderDetails = (orderId: string, items: CachedOrderItemDetails[]): void => {
  try {
    const cache = getCacheData();
    const entry: CacheEntry = {
      orderId,
      items,
      timestamp: Date.now()
    };

    // Agregar nueva entrada
    cache[orderId] = entry;

    // Limpiar entradas antiguas ANTES de guardar
    cleanExpiredCache(cache);

    // Verificar límite de órdenes
    enforceMaxOrdersLimit(cache);

    // Intentar guardar
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
      console.log('✅ Detalles de orden guardados en cache:', orderId);
      logCacheStats(cache);
    } catch (storageError: any) {
      // Si se excede la cuota, limpiar agresivamente y reintentar
      if (storageError.name === QUOTA_EXCEEDED_ERROR || storageError.code === 22) {
        console.warn('⚠️  Cuota de localStorage excedida. Limpiando cache...');
        aggressiveCleanup(cache);

        // Reintentar con cache reducido
        localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
        console.log('✅ Cache guardado después de limpieza agresiva');
      } else {
        throw storageError;
      }
    }
  } catch (error) {
    console.error('❌ Error crítico guardando cache de orden:', error);
    // En caso de error crítico, intentar limpiar todo el cache
    try {
      localStorage.removeItem(CACHE_KEY);
      console.log('🗑️  Cache completamente limpiado por error');
    } catch (cleanError) {
      console.error('❌ No se pudo limpiar el cache:', cleanError);
    }
  }
};

// Recuperar detalles completos de una orden
export const getCachedOrderDetails = (orderId: string): CachedOrderItemDetails[] | null => {
  try {
    const cache = getCacheData();
    const entry = cache[orderId];

    if (!entry) {
      console.log('⚠️  No hay cache para orden:', orderId);
      return null;
    }

    // Verificar si expiró
    const expiryTime = CACHE_EXPIRY_HOURS * 60 * 60 * 1000;
    if (Date.now() - entry.timestamp > expiryTime) {
      console.log('⚠️  Cache expirado para orden:', orderId);
      delete cache[orderId];
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
      return null;
    }

    console.log('✅ Detalles recuperados del cache para orden:', orderId);
    return entry.items;
  } catch (error) {
    console.error('Error recuperando cache de orden:', error);
    return null;
  }
};

// Obtener todos los datos del cache
const getCacheData = (): Record<string, CacheEntry> => {
  try {
    const data = localStorage.getItem(CACHE_KEY);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('Error leyendo cache:', error);
    return {};
  }
};

// Limpiar entradas expiradas
const cleanExpiredCache = (cache: Record<string, CacheEntry>): void => {
  const expiryTime = CACHE_EXPIRY_HOURS * 60 * 60 * 1000;
  const now = Date.now();
  let removed = 0;

  Object.keys(cache).forEach(orderId => {
    if (now - cache[orderId].timestamp > expiryTime) {
      delete cache[orderId];
      removed++;
    }
  });

  if (removed > 0) {
    console.log(`🧹 Limpiadas ${removed} órdenes expiradas del cache`);
  }
};

// Limitar el número máximo de órdenes en cache (FIFO - First In First Out)
const enforceMaxOrdersLimit = (cache: Record<string, CacheEntry>): void => {
  const orderIds = Object.keys(cache);

  if (orderIds.length <= MAX_CACHED_ORDERS) {
    return; // No excede el límite
  }

  // Ordenar por timestamp (más antiguo primero)
  const sortedIds = orderIds.sort((a, b) => cache[a].timestamp - cache[b].timestamp);

  // Eliminar las más antiguas hasta cumplir el límite
  const toRemove = sortedIds.slice(0, orderIds.length - MAX_CACHED_ORDERS);
  toRemove.forEach(id => delete cache[id]);

  console.log(`🧹 Eliminadas ${toRemove.length} órdenes antiguas (límite: ${MAX_CACHED_ORDERS})`);
};

// Limpieza agresiva: eliminar el 50% de las órdenes más antiguas
const aggressiveCleanup = (cache: Record<string, CacheEntry>): void => {
  const orderIds = Object.keys(cache);

  if (orderIds.length === 0) {
    return;
  }

  // Ordenar por timestamp
  const sortedIds = orderIds.sort((a, b) => cache[a].timestamp - cache[b].timestamp);

  // Eliminar el 50% más antiguo
  const toRemove = Math.ceil(sortedIds.length / 2);
  const idsToRemove = sortedIds.slice(0, toRemove);

  idsToRemove.forEach(id => delete cache[id]);

  console.log(`🔥 Limpieza agresiva: eliminadas ${toRemove} órdenes (50% más antiguas)`);
};

// Obtener estadísticas del cache
const logCacheStats = (cache: Record<string, CacheEntry>): void => {
  const orderIds = Object.keys(cache);

  if (orderIds.length === 0) {
    console.log('📊 Cache vacío');
    return;
  }

  const timestamps = orderIds.map(id => cache[id].timestamp);
  const oldest = Math.min(...timestamps);
  const newest = Math.max(...timestamps);

  // Estimar tamaño
  const jsonString = JSON.stringify(cache);
  const sizeKB = Math.round(jsonString.length / 1024);

  const stats: CacheStats = {
    totalOrders: orderIds.length,
    oldestTimestamp: oldest,
    newestTimestamp: newest,
    estimatedSizeKB: sizeKB
  };

  const ageHours = Math.round((Date.now() - oldest) / (60 * 60 * 1000));

  console.log(`📊 Cache: ${stats.totalOrders} órdenes, ~${sizeKB} KB, edad máxima: ${ageHours}h`);

  // Advertencia si se acerca al límite
  if (sizeKB > 4000) { // 4 MB
    console.warn('⚠️  Cache cerca del límite de localStorage (>4 MB)');
  }
};

// Limpiar todo el cache (útil para debugging)
export const clearOrderDetailsCache = (): void => {
  localStorage.removeItem(CACHE_KEY);
  console.log('🗑️  Cache de órdenes limpiado');
};

// Obtener estadísticas del cache (público)
export const getCacheStats = (): CacheStats | null => {
  try {
    const cache = getCacheData();
    const orderIds = Object.keys(cache);

    if (orderIds.length === 0) {
      return null;
    }

    const timestamps = orderIds.map(id => cache[id].timestamp);
    const oldest = Math.min(...timestamps);
    const newest = Math.max(...timestamps);

    const jsonString = JSON.stringify(cache);
    const sizeKB = Math.round(jsonString.length / 1024);

    return {
      totalOrders: orderIds.length,
      oldestTimestamp: oldest,
      newestTimestamp: newest,
      estimatedSizeKB: sizeKB
    };
  } catch (error) {
    console.error('Error obteniendo estadísticas del cache:', error);
    return null;
  }
};

// Forzar limpieza manual del cache
export const manualCleanup = (): void => {
  try {
    const cache = getCacheData();
    cleanExpiredCache(cache);
    enforceMaxOrdersLimit(cache);
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    console.log('✅ Limpieza manual completada');
    logCacheStats(cache);
  } catch (error) {
    console.error('Error en limpieza manual:', error);
  }
};

