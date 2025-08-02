# Ubicación: /Frontend/core/Dockerfile

# --- Etapa 1: Build ---
# Usamos una imagen de Node.js para construir el proyecto
FROM node:20-alpine AS builder

# Establecemos el directorio de trabajo
WORKDIR /app

# Copiamos los archivos de dependencias y las instalamos
# Hacemos esto primero para aprovechar el caché de Docker
COPY package.json package-lock.json ./
RUN npm install

# Copiamos el resto del código fuente
COPY . .

# Construimos la aplicación para producción
RUN npm run build

# --- Etapa 2: Serve ---
# Usamos una imagen de Nginx para servir los archivos estáticos
FROM nginx:stable-alpine

# Copiamos los archivos construidos desde la etapa 'builder' al directorio de Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Copiamos nuestra configuración personalizada de Nginx
# Este archivo lo crearemos en el siguiente paso
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exponemos el puerto 80 (el puerto por defecto de Nginx)
EXPOSE 80

# El comando para iniciar Nginx
CMD ["nginx", "-g", "daemon off;"]
