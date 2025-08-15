-- =================================================================
-- CREACIÓN DE TABLAS (ACTUALIZADO PARA SPRINT 5)
-- =================================================================

-- Borrar tablas antiguas si existen para un reinicio limpio
DROP TABLE IF EXISTS "order_items", "orders", "menu_item_ingredients", "menu_item_accompaniments", "menu_items", "categories", "ingredients", "accompaniments", "tables", "users" CASCADE;

-- Tabla para usuarios y roles
CREATE TABLE "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "username" varchar(100) UNIQUE NOT NULL,
  "password_hash" text NOT NULL,
  "role" varchar(20) NOT NULL CHECK (role IN ('mesero', 'cajero', 'admin')),
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT (now())
);

-- Tabla para las mesas del restaurante
CREATE TABLE "tables" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "table_number" integer UNIQUE NOT NULL,
  "is_active" boolean NOT NULL DEFAULT true
);

-- Nuevas tablas para la gestión granular del menú
CREATE TABLE "categories" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" varchar(100) UNIQUE NOT NULL
);

CREATE TABLE "ingredients" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" varchar(100) UNIQUE NOT NULL
);

CREATE TABLE "accompaniments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" varchar(100) UNIQUE NOT NULL,
  "price" numeric(10, 2) NOT NULL DEFAULT 0
);

-- Tabla de ítems del menú refactorizada
CREATE TABLE "menu_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" varchar(255) NOT NULL,
  "description" text,
  "price" numeric(10, 2) NOT NULL,
  "category_id" uuid NOT NULL REFERENCES "categories"("id"),
  "is_available" boolean NOT NULL DEFAULT true
);

-- Tablas de pivote para las relaciones
CREATE TABLE "menu_item_ingredients" (
  "menu_item_id" uuid NOT NULL REFERENCES "menu_items"("id") ON DELETE CASCADE,
  "ingredient_id" uuid NOT NULL REFERENCES "ingredients"("id") ON DELETE CASCADE,
  PRIMARY KEY ("menu_item_id", "ingredient_id")
);

CREATE TABLE "menu_item_accompaniments" (
  "menu_item_id" uuid NOT NULL REFERENCES "menu_items"("id") ON DELETE CASCADE,
  "accompaniment_id" uuid NOT NULL REFERENCES "accompaniments"("id") ON DELETE CASCADE,
  PRIMARY KEY ("menu_item_id", "accompaniment_id")
);

-- Tabla para las órdenes
CREATE TABLE "orders" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "waiter_id" uuid NOT NULL REFERENCES "users"("id"),
  "cashier_id" uuid REFERENCES "users"("id"),
  "table_id" uuid NOT NULL REFERENCES "tables"("id"),
  "table_number" integer NOT NULL,
  "status" varchar(30) NOT NULL DEFAULT 'pendiente_aprobacion',
  "total" numeric(10, 2) NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  "updated_at" timestamptz NOT NULL DEFAULT (now())
);

-- Tabla de pivote para los ítems dentro de una orden
CREATE TABLE "order_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "order_id" uuid NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
  "menu_item_id" uuid NOT NULL REFERENCES "menu_items"("id"),
  "quantity" integer NOT NULL CHECK (quantity > 0),
  "price_at_order" numeric(10, 2) NOT NULL,
  "notes" text,
  "customizations" jsonb
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

-- Insertar usuarios
INSERT INTO users (id, username, password_hash, role) VALUES 
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'admin', '$2a$12$weMjf207kO6kFCmqxMrOzujwsk781Qg00by1lWMc9jvLa9sfS.wGe', 'admin'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'mesero1', '$2a$12$weMjf207kO6kFCmqxMrOzujwsk781Qg00by1lWMc9jvLa9sfS.wGe', 'mesero'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'cajero1', '$2a$12$weMjf207kO6kFCmqxMrOzujwsk781Qg00by1lWMc9jvLa9sfS.wGe', 'cajero');

-- Insertar mesas
INSERT INTO tables (id, table_number) VALUES
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11', 1),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b12', 2);

-- Insertar categorías, ingredientes y acompañantes con UUIDs válidos
INSERT INTO categories (id, name) VALUES ('c01e6f2b-2250-4630-8a2e-8a3d2a1f9c34', 'Platos Fuertes'), ('c02e6f2b-2250-4630-8a2e-8a3d2a1f9c35', 'Bebidas');
INSERT INTO ingredients (id, name) VALUES ('i01e6f2b-2250-4630-8a2e-8a3d2a1f9c36', 'Panceta'), ('i02e6f2b-2250-4630-8a2e-8a3d2a1f9c37', 'Bondiola');
INSERT INTO accompaniments (id, name, price) VALUES ('a01e6f2b-2250-4630-8a2e-8a3d2a1f9c38', 'Papa', 2.00), ('a02e6f2b-2250-4630-8a2e-8a3d2a1f9c39', 'Yuca', 2.50), ('a03e6f2b-2250-4630-8a2e-8a3d2a1f9c40', 'Hielo', 0.00);

-- Insertar ítems de menú
INSERT INTO menu_items (id, name, description, price, category_id) VALUES
('m01e6f2b-2250-4630-8a2e-8a3d2a1f9c41', 'Picada de la Casa', 'Una deliciosa mezcla de carnes.', 50.00, 'c01e6f2b-2250-4630-8a2e-8a3d2a1f9c34'),
('m02e6f2b-2250-4630-8a2e-8a3d2a1f9c42', 'Gaseosa', 'Botella de 350ml.', 3.00, 'c02e6f2b-2250-4630-8a2e-8a3d2a1f9c35');

-- Relacionar ítems con ingredientes y acompañantes
INSERT INTO menu_item_ingredients (menu_item_id, ingredient_id) VALUES ('m01e6f2b-2250-4630-8a2e-8a3d2a1f9c41', 'i01e6f2b-2250-4630-8a2e-8a3d2a1f9c36'), ('m01e6f2b-2250-4630-8a2e-8a3d2a1f9c41', 'i02e6f2b-2250-4630-8a2e-8a3d2a1f9c37');
INSERT INTO menu_item_accompaniments (menu_item_id, accompaniment_id) VALUES ('m01e6f2b-2250-4630-8a2e-8a3d2a1f9c41', 'a01e6f2b-2250-4630-8a2e-8a3d2a1f9c38'), ('m01e6f2b-2250-4630-8a2e-8a3d2a1f9c41', 'a02e6f2b-2250-4630-8a2e-8a3d2a1f9c39'), ('m02e6f2b-2250-4630-8a2e-8a3d2a1f9c42', 'a03e6f2b-2250-4630-8a2e-8a3d2a1f9c40');
