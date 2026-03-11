#!/bin/bash

# Script para probar la conectividad con las impresoras
# Uso: ./test_printer_connection.sh <IP> <PORT>

IP=${1:-192.168.1.100}
PORT=${2:-9100}

echo "================================================"
echo "🖨️  Test de Conectividad de Impresora"
echo "================================================"
echo "IP: $IP"
echo "Puerto: $PORT"
echo ""

# 1. Verificar si el host está alcanzable
echo "1️⃣  Verificando conectividad de red..."
if ping -c 1 -W 2 $IP &> /dev/null; then
    echo "✅ Host $IP está alcanzable"
else
    echo "❌ Host $IP NO responde al ping"
    echo "   Verifica que la impresora esté encendida y en la red"
    exit 1
fi

echo ""

# 2. Verificar si el puerto está abierto
echo "2️⃣  Verificando puerto $PORT..."
if timeout 3 bash -c "echo -n '' > /dev/tcp/$IP/$PORT" 2>/dev/null; then
    echo "✅ Puerto $PORT está abierto"
else
    echo "❌ Puerto $PORT está cerrado o no responde"
    echo "   Verifica la configuración de la impresora"
    exit 1
fi

echo ""

# 3. Usar netcat si está disponible
echo "3️⃣  Probando conexión TCP con nc..."
if command -v nc &> /dev/null; then
    if nc -zv -w 3 $IP $PORT 2>&1 | grep -q succeeded; then
        echo "✅ Conexión TCP exitosa con nc"
    else
        echo "⚠️  nc reporta problemas de conexión"
    fi
else
    echo "ℹ️  nc (netcat) no está instalado, omitiendo esta prueba"
fi

echo ""
echo "================================================"
echo "✅ Impresora en $IP:$PORT parece estar funcionando"
echo "================================================"

