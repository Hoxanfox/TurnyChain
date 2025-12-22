-- =================================================================
-- MIGRACIÓN: Agregar tipos de orden (mesa, llevar, domicilio)
-- Fecha: 2025-12-20
-- =================================================================

-- Si la tabla orders ya existe y tiene datos, ejecuta esto:

-- 1. Agregar columna order_type
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_type VARCHAR(20) NOT NULL DEFAULT 'mesa'
    CHECK (order_type IN ('mesa', 'llevar', 'domicilio'));

-- 2. Agregar columnas para domicilio
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address TEXT NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_phone VARCHAR(20) NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_notes TEXT NULL;

-- 3. Crear mesas virtuales si no existen
INSERT INTO tables (id, table_number, is_active) VALUES
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b99', 9999, true)  -- Mesa virtual para LLEVAR
ON CONFLICT (table_number) DO NOTHING;

INSERT INTO tables (id, table_number, is_active) VALUES
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b98', 9998, true)  -- Mesa virtual para DOMICILIOS
ON CONFLICT (table_number) DO NOTHING;

-- 4. Verificar que las columnas se agregaron correctamente
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'orders'
AND column_name IN ('order_type', 'delivery_address', 'delivery_phone', 'delivery_notes');

-- 5. Verificar mesas virtuales
SELECT id, table_number, is_active
FROM tables
WHERE table_number IN (9998, 9999);

-- 6. Estadísticas de órdenes por tipo (después de migración todos serán 'mesa')
SELECT
    order_type,
    COUNT(*) as total_ordenes
FROM orders
GROUP BY order_type;

