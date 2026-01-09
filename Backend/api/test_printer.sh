#!/bin/bash

# Script para probar la conexión con impresoras ESC/POS
# Uso: ./test_printer.sh <IP> <PORT>

set -e

IP="${1:-192.168.1.100}"
PORT="${2:-9100}"

echo "========================================"
echo "🖨️  Test de Conexión de Impresora ESC/POS"
echo "========================================"
echo ""
echo "IP:    $IP"
echo "Puerto: $PORT"
echo ""

# 1. Verificar ping
echo "📡 Verificando conectividad de red..."
if ping -c 1 -W 2 "$IP" > /dev/null 2>&1; then
    echo "✅ Ping exitoso"
else
    echo "❌ No hay respuesta al ping"
    echo "   Verifica que la impresora esté encendida y en la red correcta"
    exit 1
fi

# 2. Verificar puerto
echo ""
echo "🔌 Verificando puerto $PORT..."
if timeout 3 bash -c "echo > /dev/tcp/$IP/$PORT" 2>/dev/null; then
    echo "✅ Puerto accesible"
else
    echo "❌ No se puede conectar al puerto $PORT"
    echo "   Verifica que:"
    echo "   - La impresora esté configurada para impresión de red"
    echo "   - El puerto sea el correcto (común: 9100, 515, 631)"
    echo "   - No haya firewall bloqueando la conexión"
    exit 1
fi

# 3. Enviar comando de prueba ESC/POS
echo ""
echo "📄 Enviando ticket de prueba..."

# Comandos ESC/POS
ESC=$'\x1b'
GS=$'\x1d'
INIT="${ESC}@"
CENTER="${ESC}a"$'\x01'
LEFT="${ESC}a"$'\x00'
BOLD_ON="${ESC}E"$'\x01'
BOLD_OFF="${ESC}E"$'\x00'
DOUBLE_ON="${GS}!"$'\x11'
DOUBLE_OFF="${GS}!"$'\x00'
CUT="${GS}V"$'\x01'

# Construir ticket de prueba
TICKET="${INIT}"
TICKET+="${CENTER}"
TICKET+="${DOUBLE_ON}${BOLD_ON}"
TICKET+="TEST DE CONEXION"
TICKET+="${DOUBLE_OFF}${BOLD_OFF}"
TICKET+=$'\n\n'
TICKET+="${LEFT}"
TICKET+="IP: $IP"
TICKET+=$'\n'
TICKET+="Puerto: $PORT"
TICKET+=$'\n'
TICKET+="Fecha: $(date '+%Y-%m-%d %H:%M:%S')"
TICKET+=$'\n\n'
TICKET+="${CENTER}"
TICKET+="Si ves esto, la"
TICKET+=$'\n'
TICKET+="conexion funciona! ✓"
TICKET+=$'\n\n\n'
TICKET+="${CUT}"

# Enviar a la impresora usando bash nativo
if (exec 3<>"/dev/tcp/$IP/$PORT" && echo -ne "$TICKET" >&3 && exec 3<&-); then
    echo "✅ Ticket enviado exitosamente"
    echo ""
    echo "🎉 La impresora debería estar imprimiendo ahora!"
    echo "   Si no imprime, verifica:"
    echo "   - Que tenga papel"
    echo "   - Que no haya errores en el panel"
    echo "   - Que soporte comandos ESC/POS"
else
    echo "❌ Error al enviar datos"
    echo "   Posible causa: timeout o conexión perdida"
    exit 1
fi

echo ""
echo "========================================"
echo "✅ Test completado"
echo "========================================"

