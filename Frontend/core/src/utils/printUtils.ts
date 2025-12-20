// =================================================================
// ARCHIVO: /src/utils/printUtils.ts
// Utilidades para impresión de comandas de cocina
// =================================================================

import type { Order } from '../types/orders';

/**
 * Configuración de impresión guardada en localStorage
 */
export interface PrintSettings {
  autoPrint: boolean; // Si es true, imprime automáticamente; si es false, muestra confirmación
  includeLogo: boolean;
  copies: number;
  fontSize: 'small' | 'medium' | 'large';
}

const DEFAULT_SETTINGS: PrintSettings = {
  autoPrint: false, // Por defecto con confirmación
  includeLogo: true,
  copies: 1,
  fontSize: 'medium',
};

const STORAGE_KEY = 'turnychain_print_settings';

/**
 * Obtener configuración de impresión
 */
export const getPrintSettings = (): PrintSettings => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    }
  } catch (error) {
    console.error('Error al cargar configuración de impresión:', error);
  }
  return DEFAULT_SETTINGS;
};

/**
 * Guardar configuración de impresión
 */
export const savePrintSettings = (settings: Partial<PrintSettings>): void => {
  try {
    const current = getPrintSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error al guardar configuración de impresión:', error);
  }
};

/**
 * Generar HTML de la comanda para impresión
 */
export const generateCommandHTML = (order: Order, settings: PrintSettings): string => {
  const date = new Date(order.created_at);
  const dateStr = date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const timeStr = date.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Calcular subtotales
  const itemsHTML = order.items
    .map((item) => {
      const subtotal = item.price_at_order * item.quantity;
      let customizationsHTML = '';

      if (item.customizations) {
        const { active_ingredients, selected_accompaniments } = item.customizations;

        // Ingredientes activos
        if (active_ingredients && active_ingredients.length > 0) {
          customizationsHTML += `
            <div class="customization-section">
              <div class="customization-title">🥗 Ingredientes:</div>
              ${active_ingredients
                .map(
                  (ing) => `
                <div class="customization-item">✓ ${ing.name}</div>
              `
                )
                .join('')}
            </div>
          `;
        }

        // Acompañantes seleccionados
        if (selected_accompaniments && selected_accompaniments.length > 0) {
          customizationsHTML += `
            <div class="customization-section">
              <div class="customization-title">🍟 Acompañamientos:</div>
              ${selected_accompaniments
                .map(
                  (acc) => `
                <div class="customization-item">✓ ${acc.name}</div>
              `
                )
                .join('')}
            </div>
          `;
        }
      }

      // Notas especiales
      const notesHTML = item.notes
        ? `
        <div class="notes-section">
          <div class="notes-title">📝 Notas:</div>
          <div class="notes-content">${item.notes}</div>
        </div>
      `
        : '';

      return `
        <div class="order-item">
          <div class="item-header">
            <div class="item-quantity">${item.quantity}x</div>
            <div class="item-name">${item.menu_item_name}</div>
            <div class="item-price">$${subtotal.toFixed(2)}</div>
          </div>
          <div class="item-details">
            ${customizationsHTML}
            ${notesHTML}
          </div>
        </div>
      `;
    })
    .join('');

  // Logo opcional
  const logoHTML = settings.includeLogo
    ? `
    <div class="logo-section">
      <div class="logo">🍽️</div>
      <div class="restaurant-name">TURNY CHAIN</div>
    </div>
  `
    : '';

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Comanda - Mesa ${order.table_number}</title>
      <style>
        @page {
          size: 80mm auto;
          margin: 5mm;
        }

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Courier New', monospace;
          font-size: ${settings.fontSize === 'small' ? '10px' : settings.fontSize === 'large' ? '14px' : '12px'};
          line-height: 1.4;
          color: #000;
          background: #fff;
          width: 80mm;
          margin: 0 auto;
          padding: 5mm;
        }

        /* Logo y encabezado */
        .logo-section {
          text-align: center;
          margin-bottom: 10px;
          padding-bottom: 10px;
          border-bottom: 2px solid #000;
        }

        .logo {
          font-size: 32px;
          margin-bottom: 5px;
        }

        .restaurant-name {
          font-size: 18px;
          font-weight: bold;
          letter-spacing: 2px;
        }

        /* Título de comanda */
        .command-header {
          text-align: center;
          font-weight: bold;
          font-size: 16px;
          margin: 10px 0;
          padding: 8px 0;
          background: #000;
          color: #fff;
          text-transform: uppercase;
        }

        /* Información de la orden */
        .order-info {
          margin: 15px 0;
          padding: 10px 0;
          border-top: 1px dashed #000;
          border-bottom: 1px dashed #000;
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          margin: 5px 0;
          font-weight: bold;
        }

        .info-label {
          font-weight: bold;
        }

        /* ID de orden */
        .order-id {
          text-align: center;
          font-size: 11px;
          margin: 10px 0;
          padding: 5px;
          background: #f0f0f0;
          border: 1px solid #000;
        }

        /* Items de la orden */
        .order-items {
          margin: 15px 0;
        }

        .order-item {
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 1px solid #ccc;
        }

        .order-item:last-child {
          border-bottom: none;
        }

        .item-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          font-weight: bold;
          font-size: 14px;
        }

        .item-quantity {
          font-size: 16px;
          font-weight: bold;
          min-width: 35px;
          padding: 2px 6px;
          background: #000;
          color: #fff;
          border-radius: 3px;
          text-align: center;
        }

        .item-name {
          flex: 1;
          margin: 0 10px;
          text-transform: uppercase;
        }

        .item-price {
          font-weight: bold;
          white-space: nowrap;
        }

        .item-details {
          margin-left: 35px;
          margin-top: 8px;
        }

        /* Customizaciones */
        .customization-section {
          margin: 8px 0;
        }

        .customization-title {
          font-weight: bold;
          margin-bottom: 4px;
          font-size: 11px;
        }

        .customization-item {
          margin-left: 10px;
          padding: 2px 0;
          font-size: 11px;
        }

        /* Notas */
        .notes-section {
          margin: 8px 0;
          padding: 6px;
          background: #f9f9f9;
          border: 1px dashed #666;
          border-radius: 3px;
        }

        .notes-title {
          font-weight: bold;
          margin-bottom: 3px;
          font-size: 11px;
        }

        .notes-content {
          font-style: italic;
          font-size: 11px;
        }

        /* Total */
        .total-section {
          margin: 20px 0 10px 0;
          padding: 15px 0 10px 0;
          border-top: 2px solid #000;
          border-bottom: 2px solid #000;
        }

        .total-row {
          display: flex;
          justify-content: space-between;
          font-size: 16px;
          font-weight: bold;
        }

        .payment-info {
          margin-top: 8px;
          text-align: center;
          font-size: 12px;
          padding: 5px;
          background: #f0f0f0;
        }

        /* Footer */
        .footer {
          text-align: center;
          margin-top: 15px;
          padding-top: 10px;
          border-top: 1px dashed #000;
        }

        .priority-message {
          font-weight: bold;
          font-size: 13px;
          margin: 10px 0;
          padding: 8px;
          background: #000;
          color: #fff;
          text-align: center;
        }

        .cut-line {
          text-align: center;
          margin: 15px 0 5px 0;
          font-size: 14px;
          letter-spacing: 2px;
          color: #999;
        }

        @media print {
          body {
            width: 80mm;
          }

          .order-item {
            page-break-inside: avoid;
          }

          @page {
            margin: 5mm;
          }
        }
      </style>
    </head>
    <body>
      ${logoHTML}
      
      <div class="command-header">
        ⚡ COMANDA DE COCINA ⚡
      </div>

      <div class="order-info">
        <div class="info-row">
          <span class="info-label">📅 Fecha:</span>
          <span>${dateStr}</span>
        </div>
        <div class="info-row">
          <span class="info-label">⏰ Hora:</span>
          <span>${timeStr}</span>
        </div>
        <div class="info-row">
          <span class="info-label">🪑 Mesa:</span>
          <span>${order.table_number}</span>
        </div>
        <div class="info-row">
          <span class="info-label">👤 Mesero:</span>
          <span>${order.waiter_name || 'N/A'}</span>
        </div>
      </div>

      <div class="order-id">
        Pedido: #${order.id.slice(0, 8).toUpperCase()}
      </div>

      <div class="order-items">
        ${itemsHTML}
      </div>

      <div class="total-section">
        <div class="total-row">
          <span>💰 TOTAL:</span>
          <span>$${order.total.toFixed(2)}</span>
        </div>
        <div class="payment-info">
          💳 ${order.payment_method === 'efectivo' ? 'EFECTIVO' : 'TRANSFERENCIA'} - ✅ PAGADO
        </div>
      </div>

      <div class="priority-message">
        ⚠️ PREPARAR INMEDIATAMENTE ⚠️
      </div>

      <div class="footer">
        <div style="font-size: 11px; margin-bottom: 5px;">
          Impreso: ${new Date().toLocaleString('es-ES')}
        </div>
      </div>

      <div class="cut-line">
        - - - - - - - - - - - - - - - -
      </div>
    </body>
    </html>
  `;
};

/**
 * Imprimir comanda de cocina
 */
export const printKitchenCommand = async (order: Order): Promise<boolean> => {
  try {
    const settings = getPrintSettings();

    // Si está configurado para pedir confirmación
    if (!settings.autoPrint) {
      const confirmed = window.confirm(
        `¿Imprimir comanda para Mesa ${order.table_number}?\n\n` +
          `Pedido: ${order.items.length} item(s)\n` +
          `Total: $${order.total.toFixed(2)}`
      );

      if (!confirmed) {
        console.log('❌ Impresión cancelada por el usuario');
        return false;
      }
    }

    // Generar HTML de la comanda
    const commandHTML = generateCommandHTML(order, settings);

    // Crear ventana de impresión
    const printWindow = window.open('', '_blank', 'width=800,height=600');

    if (!printWindow) {
      throw new Error('No se pudo abrir la ventana de impresión. Verifica que los pop-ups estén permitidos.');
    }

    printWindow.document.write(commandHTML);
    printWindow.document.close();

    // Esperar a que cargue el contenido
    await new Promise((resolve) => {
      printWindow.onload = resolve;
      setTimeout(resolve, 500); // Timeout de seguridad
    });

    // Imprimir múltiples copias si es necesario
    for (let i = 0; i < settings.copies; i++) {
      printWindow.print();
      if (i < settings.copies - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Esperar entre copias
      }
    }

    // Cerrar ventana después de un delay
    setTimeout(() => {
      printWindow.close();
    }, 1000);

    console.log(`✅ Comanda impresa exitosamente (${settings.copies} copia(s))`);
    return true;
  } catch (error) {
    console.error('❌ Error al imprimir comanda:', error);
    alert(`Error al imprimir comanda: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    return false;
  }
};

