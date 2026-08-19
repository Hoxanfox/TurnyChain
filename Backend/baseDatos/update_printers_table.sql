-- Este script añade la columna 'print_layout' a la tabla 'printers' en bases de datos de producción
-- que fueron creadas antes de la actualización que incluyó esta columna en el init.sql.

ALTER TABLE printers 
ADD COLUMN IF NOT EXISTS print_layout jsonb NOT NULL DEFAULT '["header", "order_info", "items", "totals", "notes", "footer"]';
