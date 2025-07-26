# Ubicación: /Backend/api/Dockerfile

# --- Etapa 1: Build ---
# CORRECCIÓN: Usamos una imagen de Go que coincide con la versión de tu proyecto
FROM golang:1.24-alpine AS builder

# Establecemos el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiamos los archivos de dependencias
COPY go.mod ./
COPY go.sum ./

# Descargamos las dependencias
RUN go mod download

# Copiamos todo el código fuente de la aplicación
COPY . .

# Compilamos la aplicación.
# CGO_ENABLED=0 crea un binario estático.
# -o /app/main crea el archivo ejecutable llamado 'main' en la carpeta /app
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/main ./cmd/api

# --- Etapa 2: Run ---
# Usamos una imagen mínima de Alpine para la ejecución, lo que hace la imagen final muy pequeña
FROM alpine:latest

WORKDIR /app

# Copiamos ÚNICAMENTE el binario compilado de la etapa anterior
COPY --from=builder /app/main .

# Exponemos el puerto que nuestra aplicación usará
EXPOSE 8080

# El comando que se ejecutará cuando el contenedor inicie
CMD ["/app/main"]
