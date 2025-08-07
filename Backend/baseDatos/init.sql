-- =================================================================
-- CREACIÓN DE TABLAS (ACTUALIZADO PARA SPRINT 4)
-- =================================================================

-- Tabla para usuarios y roles
CREATE TABLE "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "username" varchar(100) UNIQUE NOT NULL,
  "password_hash" text NOT NULL,
  "role" varchar(20) NOT NULL CHECK (role IN ('mesero', 'cajero', 'admin')),
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT (now())
);

-- Tabla para las mesas del restaurante (¡NUEVA!)
CREATE TABLE "tables" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "table_number" integer UNIQUE NOT NULL,
  "is_active" boolean NOT NULL DEFAULT true
);

-- Tabla para los ítems del menú (¡ACTUALIZADA!)
CREATE TABLE "menu_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" varchar(255) NOT NULL,
  "description" text,
  "price" numeric(10, 2) NOT NULL CHECK (price >= 0),
  "category" varchar(50),
  "is_available" boolean NOT NULL DEFAULT true, -- Para soft delete
  "modifiers" jsonb -- Para opciones adicionales (ej. término de la carne)
);

-- Tabla para las órdenes (¡ACTUALIZADA!)
CREATE TABLE "orders" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "waiter_id" uuid NOT NULL,
  "cashier_id" uuid,
  "table_id" uuid NOT NULL, -- Ahora referencia a la tabla 'tables'
  "table_number" integer NOT NULL, -- Mantenemos por conveniencia
  "status" varchar(30) NOT NULL DEFAULT 'pendiente_aprobacion',
  "total" numeric(10, 2) NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  "updated_at" timestamptz NOT NULL DEFAULT (now()),
  CONSTRAINT fk_waiter FOREIGN KEY(waiter_id) REFERENCES users(id),
  CONSTRAINT fk_cashier FOREIGN KEY(cashier_id) REFERENCES users(id),
  CONSTRAINT fk_table FOREIGN KEY(table_id) REFERENCES tables(id)
);

-- Tabla de pivote para los ítems dentro de una orden
CREATE TABLE "order_items" (
  "order_id" uuid NOT NULL,
  "menu_item_id" uuid NOT NULL,
  "quantity" integer NOT NULL CHECK (quantity > 0),
  "price_at_order" numeric(10, 2) NOT NULL,
  "notes" text,
  CONSTRAINT fk_order FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_menu_item FOREIGN KEY(menu_item_id) REFERENCES menu_items(id),
  PRIMARY KEY ("order_id", "menu_item_id")
);

-- =================================================================
-- FUNCIONES Y TRIGGERS
-- =================================================================

-- Función para actualizar el timestamp de 'updated_at' automáticamente
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger que se dispara antes de actualizar una orden
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON orders
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();


-- =================================================================
-- ÍNDICES Y DATOS DE PRUEBA (SEED DATA)
-- =================================================================

-- Crear índices para mejorar el rendimiento de las búsquedas
CREATE INDEX ON "orders" ("status");
CREATE INDEX ON "orders" ("waiter_id");

-- Insertar usuarios de ejemplo
INSERT INTO users (id, username, password_hash, role) VALUES 
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'admin', '$2a$12$weMjf207kO6kFCmqxMrOzujwsk781Qg00by1lWMc9jvLa9sfS.wGe', 'admin'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'mesero1', '$2a$12$weMjf207kO6kFCmqxMrOzujwsk781Qg00by1lWMc9jvLa9sfS.wGe', 'mesero'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'cajero1', '$2a$12$weMjf207kO6kFCmqxMrOzujwsk781Qg00by1lWMc9jvLa9sfS.wGe', 'cajero');

-- Insertar mesas de ejemplo
INSERT INTO tables (id, table_number) VALUES
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11', 1),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b12', 2),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b13', 3);

-- Insertar ítems de menú de ejemplo
INSERT INTO menu_items (id, name, description, price, category, modifiers) VALUES
('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Hamburguesa Clásica', 'Carne de res, queso, lechuga, tomate.', 15.50, 'Platos Fuertes', '{"termino": ["medio", "tres cuartos", "bien cocido"], "adiciones": ["tocineta", "queso extra"]}'),
('f47ac10b-58cc-4372-a567-0e02b2c3d480', 'Papas a la Francesa', 'Porción generosa de papas fritas.', 5.00, 'Entradas', NULL),
('f47ac10b-58cc-4372-a567-0e02b2c3d481', 'Gaseosa', 'Botella de 350ml.', 3.00, 'Bebidas', '{"opciones": ["con hielo", "sin hielo"]}');

-- Insertar una orden de ejemplo para el 'mesero1' en la 'mesa 1'
INSERT INTO orders (id, waiter_id, table_id, table_number, status, total) VALUES
('c4b5b7b0-1b1a-4b0e-8b0a-1b1a4b0e8b0a', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11', 1, 'pendiente_aprobacion', 23.50);

-- Insertar los ítems de la orden de ejemplo
INSERT INTO order_items (order_id, menu_item_id, quantity, price_at_order, notes) VALUES
('c4b5b7b0-1b1a-4b0e-8b0a-1b1a4b0e8b0a', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 1, 15.50, 'Término medio, sin cebolla'),
('c4b5b7b0-1b1a-4b0e-8b0a-1b1a4b0e8b0a', 'f47ac10b-58cc-4372-a567-0e02b2c3d480', 1, 5.00, NULL),
('c4b5b7b0-1b1a-4b0e-8b0a-1b1a4b0e8b0a', 'f47ac10b-58cc-4372-a567-0e02b2c3d481', 1, 3.00, NULL);