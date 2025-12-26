-- =====================================================
-- MIGRACIÓN: Agregar soporte para tracking de popularidad
-- Fecha: 23 de diciembre de 2025
-- =====================================================

-- 1. Agregar la columna order_count a la tabla menu_items
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS order_count integer NOT NULL DEFAULT 0;

-- 2. Crear índices para mejorar el performance de búsquedas
CREATE INDEX IF NOT EXISTS idx_menu_items_order_count ON menu_items (order_count);
CREATE INDEX IF NOT EXISTS idx_menu_items_category_id ON menu_items (category_id);

-- 3. (Opcional) Si quieres inicializar los contadores basándote en órdenes existentes:
-- NOTA: Ejecutar esto solo si tienes datos históricos y quieres contar pedidos pasados

/*
UPDATE menu_items m
SET order_count = (
    SELECT COALESCE(SUM(oi.quantity), 0)
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    WHERE oi.menu_item_id = m.id
    AND o.status IN ('aprobado', 'en_preparacion', 'listo', 'entregado', 'pagado')
)
WHERE EXISTS (
    SELECT 1
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    WHERE oi.menu_item_id = m.id
);
*/

-- 4. Verificar que los cambios se aplicaron correctamente
SELECT
    table_name,
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_name = 'menu_items' AND column_name = 'order_count';

-- 5. Verificar índices creados
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'menu_items'
AND indexname IN ('idx_menu_items_order_count', 'idx_menu_items_category_id');

-- =====================================================
-- FIN DE LA MIGRACIÓN
-- =====================================================

