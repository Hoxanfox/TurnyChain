-- Habilitar la extensión para generar UUIDs si no está habilitada
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =================================================================
-- CREACIÓN DE TABLAS
-- =================================================================

-- Tabla para usuarios y roles
CREATE TABLE "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "username" varchar(100) UNIQUE NOT NULL,
  "password_hash" text NOT NULL,
  "role" varchar(20) NOT NULL CHECK (role IN ('mesero', 'cajero', 'admin')),
  "created_at" timestamptz NOT NULL DEFAULT (now())
);

-- Tabla para los ítems del menú
CREATE TABLE "menu_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" varchar(255) NOT NULL,
  "description" text,
  "price" numeric(10, 2) NOT NULL CHECK (price >= 0),
  "category" varchar(50)
);

-- Tabla para las órdenes
CREATE TABLE "orders" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "waiter_id" uuid NOT NULL,
  "cashier_id" uuid,
  "table_number" integer NOT NULL,
  "status" varchar(30) NOT NULL DEFAULT 'pendiente_aprobacion',
  "total" numeric(10, 2) NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  "updated_at" timestamptz NOT NULL DEFAULT (now()),
  CONSTRAINT fk_waiter FOREIGN KEY(waiter_id) REFERENCES users(id),
  CONSTRAINT fk_cashier FOREIGN KEY(cashier_id) REFERENCES users(id)
);

-- Tabla de pivote para los ítems dentro de una orden (tabla de unión)
CREATE TABLE "order_items" (
  "order_id" uuid NOT NULL,
  "menu_item_id" uuid NOT NULL,
  "quantity" integer NOT NULL CHECK (quantity > 0),
  "price_at_order" numeric(10, 2) NOT NULL,
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
-- NOTA: La contraseña para ambos es '1234'. El hash fue generado con Bcrypt.
INSERT INTO users (username, password_hash, role) VALUES 
('admin', '$2a$12$weMjf207kO6kFCmqxMrOzujwsk781Qg00by1lWMc9jvLa9sfS.wGe', 'admin'),
('mesero1', '$2a$12$weMjf207kO6kFCmqxMrOzujwsk781Qg00by1lWMc9jvLa9sfS.wGe', 'mesero');

-- Insertar ítems de menú de ejemplo
INSERT INTO menu_items (name, description, price, category) VALUES
('Hamburguesa Clásica', 'Carne de res, queso, lechuga, tomate y salsa especial.', 15.50, 'Platos Fuertes'),
('Papas a la Francesa', 'Porción generosa de papas fritas crujientes.', 5.00, 'Entradas'),
('Ensalada César', 'Lechuga romana, crutones, queso parmesano y aderezo César.', 12.00, 'Entradas'),
('Gaseosa', 'Botella de 350ml, varios sabores.', 3.00, 'Bebidas'),
('Jugo Natural', 'Jugo de fruta fresca del día.', 4.50, 'Bebidas'),
('Torta de Chocolate', 'Porción de torta de chocolate con fudge.', 6.00, 'Postres');

