# Ubicación: /Backend/baseDatos/Dockerfile

# Usamos una imagen oficial de PostgreSQL con entrypoint válido.
FROM postgres:16-alpine

# Copiamos nuestro script de inicialización al directorio especial de Docker
# La imagen de Postgres ejecutará automáticamente cualquier script .sql en esta carpeta
# la primera vez que se inicie el contenedor.
COPY init.sql /docker-entrypoint-initdb.d/
