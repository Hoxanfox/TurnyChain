# TurnyChain 🚀

TurnyChain es un sistema de gestión integral para restaurantes, impulsado por una arquitectura de microservicios. Cuenta con un robusto backend en Go, un frontend moderno y dinámico en React, una base de datos PostgreSQL, e integración con Blockchain para auditorías y notarización de facturas, además de monitoreo avanzado a través de Grafana y Prometheus.

---

## 📋 Requisitos Previos

Para que el sistema funcione de manera sencilla y sin conflictos en cualquier entorno, todo está contenido usando Docker. Solo necesitas instalar:

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Asegúrate de que esté ejecutándose).
- Git (Opcional, para clonar el repositorio).

---

## ⚙️ Guía Rápida de Instalación y Arranque

### 1. Clonar el repositorio
Si aún no lo has hecho, descarga o clona el repositorio en tu máquina local.

### 2. Configurar las Variables de Entorno (`.env`)
El sistema necesita un archivo de configuración para enlazar la base de datos, la blockchain y la seguridad.
1. En la carpeta raíz (donde está este archivo `README.md`), encontrarás un archivo llamado `.env.example`.
2. Duplica ese archivo y renómbralo a `.env`.
3. Abre `.env` con cualquier editor de texto y completa las credenciales. **Ojo:** Las configuraciones críticas como `WALLET_PRIVATE_KEY` e `INVOICE_ENCRYPTION_KEY` deben ser tratadas con absoluta seguridad. No utilices tu billetera principal de criptomonedas para pruebas.

### 3. Levantar el Sistema
Abre una terminal o símbolo del sistema (CMD/PowerShell) en la carpeta raíz del proyecto y ejecuta:

```bash
docker-compose up -d --build
```

Este comando descargará las dependencias necesarias, construirá el Frontend y el Backend, y encenderá todos los servicios (Base de Datos, API, Frontend, Monitoreo).
_Nota: La primera vez que se ejecute puede tardar un poco mientras descarga las imágenes (Go, Node, Postgres, Prometheus, Grafana)._

---

## 🌐 Cómo Acceder al Sistema

Una vez que los contenedores estén corriendo (`docker-compose ps` para verificar), puedes acceder a las diferentes partes del sistema desde tu navegador web:

- **Frontend (Aplicación Principal):** `http://localhost:8081`
  - *Aquí operará el Administrador, el Cajero y el Mesero.*
- **Backend (API Base):** `http://localhost:8080`
- **Panel de Monitoreo (Grafana):** `http://localhost:3000`
- **Métricas Raw (Prometheus):** `http://localhost:9090`

---

## 🧑‍💻 Roles y Flujo de Trabajo

TurnyChain está diseñado para operar con tres perfiles principales, cada uno con una función específica dentro del restaurante:

1. **Administrador:** 
   - Tiene acceso total al sistema.
   - Encargado de crear el **Menú** (Categorías y Productos), gestionar **Empleados**, configurar **Mesas** y revisar las **Métricas** de negocio y **Corte de Caja**.
2. **Cajero:**
   - Su pantalla principal es la **Cola de Órdenes**. 
   - Se encarga de verificar pagos, enviar comandas a cocina y revisar el estado general de las mesas. Puede imprimir tickets manuales si es necesario.
3. **Mesero:**
   - Su vista está optimizada para dispositivos móviles (Tablets/Teléfonos).
   - Toma los pedidos directamente en la mesa, los envía al sistema y consulta rápidamente el estado de preparación de los alimentos.

---

## 🎯 Primeros Pasos en el Sistema (Configuración Inicial)

Si es la **primera vez** que ingresas a la plataforma tras la instalación, te recomendamos seguir este flujo:

1. Ingresa al **Panel de Administrador**.
2. Usa el **Asistente de Configuración (Wizard)** ubicado en la barra lateral de herramientas (ícono ⚙️). Este asistente te recordará:
   - Crear las mesas de tu restaurante.
   - Configurar tus impresoras (Locales USB o de Red) para que la cocina reciba las comandas.
3. Una vez finalices el asistente, se lanzará un **Tutorial Interactivo (ícono ❓)** que te dará un recorrido rápido por la interfaz para familiarizarte con los botones principales.
4. **Crea a tu personal** (Cajeros y Meseros) desde la sección "Empleados" para que puedan empezar a tomar pedidos.

---

## 🛠️ Solución de Problemas Comunes (FAQ)

- **La aplicación no carga o muestra error de conexión:** 
  Verifica que Docker Desktop esté abierto y que ejecutaste el comando `docker-compose up -d`. Comprueba el estado con `docker-compose ps`.
- **Las comandas no se imprimen en la cocina:**
  1. Si es impresora de Red: Asegúrate de que la IP configurada en el sistema coincida con la de la impresora.
  2. Si es USB: Asegúrate de dar los permisos a tu navegador web cuando te solicite acceso al dispositivo USB. 
  3. Revisa el **Monitor de Impresión** en el panel de administrador para reintentar órdenes fallidas.
- **Quiero ver información antigua pero no aparece en la pantalla principal:**
  El sistema mantiene limpia la vista actual. Usa el buscador de comandas (ícono 🔍) ingresando el ID de la orden o el nombre del mesero para encontrar pagos pasados.

---

## ⚠️ Consideraciones y Buenas Prácticas (Técnicas)

Para garantizar un funcionamiento sin interrupciones, debes tener en cuenta lo siguiente:

1. **Docker Siempre Abierto:** Docker Desktop debe estar abierto e inicializado. Si el servidor (computadora principal) se apaga, asegúrate de volver a encender Docker y ejecutar el sistema.
2. **Manejo de la Base de Datos:** Los datos se guardan en volúmenes de Docker (`postgres_data`). Aunque apagues el contenedor, tus datos se conservarán.
3. **Respaldos (Backups):** Es vital usar la herramienta de respaldos ubicada en el panel de administrador para descargar copias de seguridad semanales. ¡Tu información es valiosa!

---

*Desarrollado con ❤️ para llevar la administración de restaurantes al siguiente nivel.*
