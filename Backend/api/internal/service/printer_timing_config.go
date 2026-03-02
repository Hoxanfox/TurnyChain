// =================================================================
// Configuración de Timing para Impresión
// Ajusta estos valores según el comportamiento de tus impresoras
// =================================================================

/*
┌─────────────────────────────────────────────────────────────────┐
│ GUÍA DE AJUSTE DE DELAYS                                        │
└─────────────────────────────────────────────────────────────────┘

SÍNTOMA                                    | SOLUCIÓN
─────────────────────────────────────────────────────────────────
Aún recibes "connection refused"         | Aumentar DELAY_AFTER_PRINT
Impresiones muy lentas                    | Reducir DELAY_AFTER_PRINT
Primera impresión bien, Caja falla        | Aumentar DELAY_BETWEEN_PHASES
Timeout en impresoras lentas              | Aumentar PRINTER_TIMEOUT
Impresora offline ocasionalmente          | Aumentar RETRY_ATTEMPTS

┌─────────────────────────────────────────────────────────────────┐
│ VALORES RECOMENDADOS SEGÚN TIPO DE IMPRESORA                   │
└─────────────────────────────────────────────────────────────────┘

TIPO                | DELAY_AFTER | DELAY_BETWEEN | TIMEOUT
─────────────────────────────────────────────────────────────────
Económica USB       | 500ms       | 1000ms        | 15s
Ethernet Industrial | 200ms       | 300ms         | 8s
WiFi                | 800ms       | 1500ms        | 20s
Bluetooth           | 1000ms      | 2000ms        | 25s
Compartida (1 para  |             |               |
todas las estaciones)| 700ms      | 1200ms        | 12s

*/

package service

import "time"

// =====================================================================
// CONFIGURACIÓN DE TIMING - AJUSTA SEGÚN TU HARDWARE
// =====================================================================

const (
	// DELAY_AFTER_PRINT: Espera después de enviar cada ticket
	// Permite que la impresora termine de procesar y libere el socket TCP
	//
	// Valor actual: 300ms (conservador)
	// Rango recomendado: 200ms - 1000ms
	DELAY_AFTER_PRINT = 300 * time.Millisecond

	// DELAY_BETWEEN_PHASES: Espera entre impresiones de estaciones y caja
	// Da tiempo a que todas las estaciones terminen antes de imprimir en caja
	//
	// Valor actual: 500ms
	// Rango recomendado: 300ms - 2000ms
	DELAY_BETWEEN_PHASES = 500 * time.Millisecond

	// PRINTER_TIMEOUT: Tiempo máximo de espera para conexión TCP
	//
	// Valor actual: 10s
	// Rango recomendado: 5s - 30s
	PRINTER_TIMEOUT = 10 * time.Second

	// RETRY_ATTEMPTS: Número de reintentos si la conexión falla
	//
	// Valor actual: 3
	// Rango recomendado: 2 - 5
	RETRY_ATTEMPTS = 3

	// RETRY_DELAY: Espera entre reintentos
	//
	// Valor actual: 500ms
	// Rango recomendado: 300ms - 2000ms
	RETRY_DELAY = 500 * time.Millisecond
)

// =====================================================================
// CÓMO USAR ESTAS CONSTANTES
// =====================================================================
//
// 1. En kitchen_ticket_service.go, reemplaza los valores hardcoded:
//
//    ANTES:
//    time.Sleep(300 * time.Millisecond)
//
//    DESPUÉS:
//    time.Sleep(DELAY_AFTER_PRINT)
//
// 2. En escpos_printer.go, reemplaza:
//
//    ANTES:
//    timeout: 10 * time.Second
//
//    DESPUÉS:
//    timeout: PRINTER_TIMEOUT
//
// =====================================================================

// =====================================================================
// DIAGNÓSTICO: Logs para identificar el problema
// =====================================================================
//
// Busca estos patterns en tus logs:
//
// ✅ FUNCIONANDO BIEN:
// 📄 Enviando ticket a Impresora Sopas
// ✅ Ticket impreso exitosamente
// ⏱️  Esperando liberación de sockets...
// 📄 Enviando ticket a Impresora Caja
// ✅ Ticket impreso exitosamente
//
// ❌ DELAY MUY CORTO:
// 📄 Enviando ticket a Impresora Sopas
// ✅ Ticket impreso exitosamente
// 📄 Enviando ticket a Impresora Caja
// ❌ Error al imprimir: connection refused
//
// ❌ TIMEOUT MUY CORTO:
// 📄 Enviando ticket a Impresora Sopas
// ⚠️  Reintentando conexión (intento 1/3)
// ⚠️  Reintentando conexión (intento 2/3)
// ❌ Error: i/o timeout
//
// =====================================================================

// =====================================================================
// EJEMPLO DE AJUSTE PARA IMPRESORAS MUY LENTAS
// =====================================================================
//
// Si tienes una impresora WiFi económica que es lenta:
//
// const (
//     DELAY_AFTER_PRINT     = 800 * time.Millisecond  // ↑ Aumentado
//     DELAY_BETWEEN_PHASES  = 1500 * time.Millisecond // ↑ Aumentado
//     PRINTER_TIMEOUT       = 20 * time.Second        // ↑ Aumentado
//     RETRY_ATTEMPTS        = 5                       // ↑ Aumentado
//     RETRY_DELAY           = 1000 * time.Millisecond // ↑ Aumentado
// )
//
// =====================================================================

// =====================================================================
// EJEMPLO DE AJUSTE PARA IMPRESORAS INDUSTRIALES RÁPIDAS
// =====================================================================
//
// Si tienes impresoras Ethernet de gama alta:
//
// const (
//     DELAY_AFTER_PRINT     = 150 * time.Millisecond  // ↓ Reducido
//     DELAY_BETWEEN_PHASES  = 200 * time.Millisecond  // ↓ Reducido
//     PRINTER_TIMEOUT       = 5 * time.Second         // ↓ Reducido
//     RETRY_ATTEMPTS        = 2                       // ↓ Reducido
//     RETRY_DELAY           = 200 * time.Millisecond  // ↓ Reducido
// )
//
// =====================================================================

// =====================================================================
// VARIABLES DE ENTORNO (FUTURO)
// =====================================================================
//
// Para hacer esto más flexible, podrías leer desde variables de entorno:
//
// import (
//     "os"
//     "strconv"
// )
//
// func getDelayAfterPrint() time.Duration {
//     if val := os.Getenv("PRINTER_DELAY_AFTER_MS"); val != "" {
//         if ms, err := strconv.Atoi(val); err == nil {
//             return time.Duration(ms) * time.Millisecond
//         }
//     }
//     return 300 * time.Millisecond // valor por defecto
// }
//
// Uso en docker-compose.yml:
//   environment:
//     - PRINTER_DELAY_AFTER_MS=500
//     - PRINTER_DELAY_BETWEEN_MS=1000
//     - PRINTER_TIMEOUT_SEC=15
//
// =====================================================================
