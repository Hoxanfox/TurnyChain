# Ubicación: /Backend/baseDatos/Dockerfile

# Usamos la imagen oficial de PostgreSQL
FROM postgres:13-alpine

# Copiamos nuestro script de inicialización al directorio especial de Docker
# La imagen de Postgres ejecutará automáticamente cualquier script .sql en esta carpeta
# la primera vez que se inicie el contenedor.
COPY init.sql /docker-entrypoint-initdb.d/
