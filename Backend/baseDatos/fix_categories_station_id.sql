-- Migración: Agregar columna station_id a categories
-- Fecha: 2025-12-25

-- Agregar columna station_id si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'categories'
        AND column_name = 'station_id'
    ) THEN
        ALTER TABLE categories ADD COLUMN station_id uuid REFERENCES stations(id);
        RAISE NOTICE 'Columna station_id agregada exitosamente';
    ELSE
        RAISE NOTICE 'Columna station_id ya existe';
    END IF;
END $$;

-- Verificar el resultado
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'categories'
ORDER BY ordinal_position;

