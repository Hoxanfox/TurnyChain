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
  paperSize: '58mm' | '80mm' | 'A4'; // Nuevo: tamaño de papel
  ticketPrintMethod: 'backend' | 'frontend'; // Nuevo: dónde imprimir tickets de cocina
}

const DEFAULT_SETTINGS: PrintSettings = {
  autoPrint: false, // Por defecto con confirmación
  includeLogo: true,
  copies: 1,
  fontSize: 'medium',
  paperSize: '80mm', // Por defecto papel térmico 80mm
  ticketPrintMethod: 'backend', // Por defecto usar backend
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
/**
 * Generar HTML de la comanda completa para impresión local (LEGACY)
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

  // Determinar icono y etiqueta según tipo de orden
  const orderTypeInfo = order.order_type === 'llevar'
    ? { icon: '🥡', label: 'PARA LLEVAR', color: '#10b981' }
    : order.order_type === 'domicilio'
    ? { icon: '🏍️', label: 'DOMICILIO', color: '#8b5cf6' }
    : { icon: '🍽️', label: 'EN MESA', color: '#6366f1' };

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

      // Badge de Para Llevar / Comer Aquí
      const takeoutBadge = item.is_takeout !== undefined
        ? `
        <div class="takeout-badge ${item.is_takeout ? 'takeout' : 'dine-in'}">
          ${item.is_takeout ? '🥡 PARA LLEVAR' : '🍽️ COMER AQUÍ'}
        </div>
      `
        : '';

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
          ${takeoutBadge}
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

  // Sección de datos de domicilio (si aplica)
  const deliveryInfoHTML = order.order_type === 'domicilio' && order.delivery_address
    ? `
    <div class="delivery-info">
      <div class="delivery-header">
        🏍️ DATOS DE ENTREGA 🏍️
      </div>
      <div class="delivery-item">
        <span class="delivery-label">📍 Dirección:</span>
        <span class="delivery-value">${order.delivery_address}</span>
      </div>
      <div class="delivery-item">
        <span class="delivery-label">📞 Teléfono:</span>
        <span class="delivery-value">${order.delivery_phone}</span>
      </div>
      ${order.delivery_notes ? `
      <div class="delivery-item">
        <span class="delivery-label">💬 Notas:</span>
        <span class="delivery-value">${order.delivery_notes}</span>
      </div>
      ` : ''}
    </div>
  `
    : '';

  // Determinar tamaño de papel dinámicamente
  const paperWidth = settings.paperSize === '58mm' ? '58mm' : settings.paperSize === 'A4' ? '210mm' : '80mm';

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Comanda - Mesa ${order.table_number}</title>
      <style>
        @page {
          size: ${paperWidth} auto;
          margin: ${settings.paperSize === 'A4' ? '10mm' : '5mm'};
        }

        * { 
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        html, body {
          width: 100%;
          height: auto;
        }

        body {
          font-family: 'Courier New', monospace;
          font-size: ${settings.fontSize === 'small' ? '10px' : settings.fontSize === 'large' ? '14px' : '12px'};
          line-height: 1.4;
          color: #000;
          background: #fff;
          width: ${paperWidth};
          max-width: ${paperWidth};
          margin: 0 auto;
          padding: ${settings.paperSize === 'A4' ? '10mm' : '5mm'};
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

        /* Tipo de Orden */
        .order-type-badge {
          text-align: center;
          font-weight: bold;
          font-size: 14px;
          margin: 10px 0;
          padding: 8px;
          border: 2px solid #000;
          border-radius: 5px;
        }

        /* Datos de Entrega */
        .delivery-info {
          margin: 15px 0;
          padding: 10px;
          border: 2px solid #8b5cf6;
          border-radius: 5px;
          background: #f3f0ff;
        }

        .delivery-header {
          text-align: center;
          font-weight: bold;
          font-size: 14px;
          margin-bottom: 8px;
          padding-bottom: 5px;
          border-bottom: 1px dashed #8b5cf6;
        }

        .delivery-item {
          margin: 5px 0;
          font-size: 11px;
        }

        .delivery-label {
          font-weight: bold;
          display: inline-block;
          min-width: 80px;
        }

        .delivery-value {
          word-wrap: break-word;
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

        /* Badge de Para Llevar / Comer Aquí */
        .takeout-badge {
          margin: 8px 0 8px 35px;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: bold;
          text-align: center;
          display: inline-block;
        }

        .takeout-badge.takeout {
          background: #10b981;
          color: white;
          border: 2px solid #059669;
        }

        .takeout-badge.dine-in {
          background: #6366f1;
          color: white;
          border: 2px solid #4f46e5;
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

        /* Prevenir saltos de página */
        .logo-section, .command-header, .order-type-badge, 
        .delivery-info, .order-item, .total-section, .footer {
          page-break-inside: avoid;
          break-inside: avoid;
        }

        @media print {
          body {
            width: ${paperWidth};
            max-width: ${paperWidth};
            height: auto;
          }

          /* Asegurar que todo se imprima en una sola página continua */
          html, body {
            height: auto;
            overflow: visible;
          }

          .logo-section, .command-header, .order-info, 
          .order-type-badge, .delivery-info, .order-item, 
          .total-section, .footer, .cut-line {
            page-break-inside: avoid;
            break-inside: avoid;
          }

          @page {
            margin: ${settings.paperSize === 'A4' ? '10mm' : '5mm'};
          }
        }
      </style>
    </head>
    <body>
      ${logoHTML}
      
      <div class="command-header">
        ⚡ COMANDA DE COCINA ⚡
      </div>

      <!-- Badge de Tipo de Orden -->
      <div class="order-type-badge" style="background-color: ${orderTypeInfo.color}; color: white;">
        ${orderTypeInfo.icon} ${orderTypeInfo.label} ${orderTypeInfo.icon}
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
          <span>${order.table_number}${order.table_number >= 9998 ? ' (Virtual)' : ''}</span>
        </div>
        <div class="info-row">
          <span class="info-label">👤 Mesero:</span>
          <span>${order.waiter_name || 'N/A'}</span>
        </div>
      </div>

      <div class="order-id">
        Pedido: #${order.id.slice(0, 8).toUpperCase()}
      </div>

      ${deliveryInfoHTML}

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
 * Detectar si el dispositivo es móvil
 */
const isMobileDevice = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

/**
 * Imprimir usando iframe (mejor para móviles)
 */
const printWithIframe = async (commandHTML: string, settings: PrintSettings): Promise<void> => {
  // Crear iframe oculto
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.top = '-10000px';
  iframe.style.left = '-10000px';
  iframe.style.width = '80mm';
  iframe.style.height = 'auto';
  document.body.appendChild(iframe);

  // Escribir contenido en el iframe
  const iframeDoc = iframe.contentWindow?.document;
  if (!iframeDoc) {
    throw new Error('No se pudo acceder al documento del iframe');
  }

  iframeDoc.open();
  iframeDoc.write(commandHTML);
  iframeDoc.close();

  // Esperar a que cargue el contenido
  await new Promise((resolve) => {
    iframe.onload = resolve;
    setTimeout(resolve, 500); // Timeout de seguridad
  });

  // Imprimir desde el iframe
  try {
    for (let i = 0; i < settings.copies; i++) {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      if (i < settings.copies - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Esperar entre copias
      }
    }
  } finally {
    // Limpiar iframe después de imprimir
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  }
};

/**
 * Imprimir usando window.open (método tradicional para desktop)
 */
const printWithWindow = async (commandHTML: string, settings: PrintSettings): Promise<void> => {
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
};

/**
 * Imprimir comanda de cocina
 */
export const printKitchenCommand = async (order: Order): Promise<boolean> => {
  try {
    const settings = getPrintSettings();
    const isMobile = isMobileDevice();

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

    // Usar método apropiado según el dispositivo
    if (isMobile) {
      console.log('📱 Imprimiendo desde dispositivo móvil usando iframe...');
      await printWithIframe(commandHTML, settings);
    } else {
      console.log('🖥️ Imprimiendo desde desktop usando window.open...');
      await printWithWindow(commandHTML, settings);
    }

    console.log(`✅ Comanda impresa exitosamente (${settings.copies} copia(s))`);
    return true;
  } catch (error) {
    console.error('❌ Error al imprimir comanda:', error);

    // Mensaje de error más específico para móviles
    const isMobile = isMobileDevice();
    const errorMsg = isMobile
      ? `Error al imprimir desde móvil: ${error instanceof Error ? error.message : 'Error desconocido'}\n\nConsejo: Asegúrate de permitir el acceso a la impresión en tu navegador.`
      : `Error al imprimir comanda: ${error instanceof Error ? error.message : 'Error desconocido'}`;

    alert(errorMsg);
    return false;
  }
};

/**
 * Generar HTML de un ticket de cocina por estación (formato compacto)
 */
const generateKitchenTicketHTML = (
  ticket: {
    station_name: string;
    table_number?: number;
    waiter_name: string;
    order_id: string;
    order_type: string;
    created_at: string;
    items: Array<{
      menu_item_name: string;
      quantity: number;
      notes?: string;
      customizations?: {
        active_ingredients?: Array<{ name: string }>;
        selected_accompaniments?: Array<{ name: string }>;
      };
      is_takeout: boolean;
    }>;
  },
  settings: PrintSettings
): string => {
  const date = new Date(ticket.created_at);
  const timeStr = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

  // Determinar tamaño de papel dinámicamente
  const paperWidth = settings.paperSize === '58mm' ? '58mm' : settings.paperSize === 'A4' ? '210mm' : '80mm';

  const itemsHTML = ticket.items.map((item) => {
    let customizationsHTML = '';

    if (item.customizations) {
      const { active_ingredients, selected_accompaniments } = item.customizations;

      if (active_ingredients && active_ingredients.length > 0) {
        customizationsHTML += `
          <div class="customization">
            <strong>🥗 Ingredientes:</strong> ${active_ingredients.map(ing => ing.name).join(', ')}
          </div>
        `;
      }

      if (selected_accompaniments && selected_accompaniments.length > 0) {
        customizationsHTML += `
          <div class="customization">
            <strong>🍟 Acompañamientos:</strong> ${selected_accompaniments.map(acc => acc.name).join(', ')}
          </div>
        `;
      }
    }

    const takeoutBadge = item.is_takeout ? '<div class="takeout-badge">🥡 PARA LLEVAR</div>' : '';
    const notesHTML = item.notes ? `<div class="notes">📝 ${item.notes}</div>` : '';

    return `
      <div class="item">
        <div class="item-header">
          <span class="qty">${item.quantity}x</span>
          <span class="name">${item.menu_item_name}</span>
        </div>
        ${takeoutBadge}
        ${customizationsHTML}
        ${notesHTML}
      </div>
    `;
  }).join('');

  const orderTypeInfo = ticket.order_type === 'llevar'
    ? { icon: '🥡', label: 'PARA LLEVAR' }
    : ticket.order_type === 'domicilio'
    ? { icon: '🏍️', label: 'DOMICILIO' }
    : { icon: '🍽️', label: 'EN MESA' };

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Ticket - ${ticket.station_name}</title>
      <style>
        @page {
          size: ${paperWidth} auto;
          margin: 3mm;
        }

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        html, body {
          width: 100%;
          height: auto;
        }

        body {
          font-family: 'Courier New', monospace;
          font-size: ${settings.fontSize === 'small' ? '9px' : settings.fontSize === 'large' ? '13px' : '11px'};
          line-height: 1.3;
          color: #000;
          background: #fff;
          width: ${paperWidth};
          max-width: ${paperWidth};
          margin: 0 auto;
          padding: 3mm;
        }

        .header {
          text-align: center;
          border-bottom: 2px dashed #000;
          padding-bottom: 5px;
          margin-bottom: 8px;
        }

        .station-name {
          font-size: 18px;
          font-weight: bold;
          text-transform: uppercase;
          margin: 3px 0;
        }

        .info-line {
          font-size: 10px;
          margin: 2px 0;
        }

        .order-type {
          text-align: center;
          font-weight: bold;
          padding: 4px;
          margin: 5px 0;
          border: 2px solid #000;
          font-size: 11px;
        }

        .item {
          border-bottom: 1px solid #ddd;
          padding: 5px 0;
          margin: 5px 0;
        }

        .item:last-child {
          border-bottom: none;
        }

        .item-header {
          font-weight: bold;
          margin-bottom: 3px;
        }

        .qty {
          display: inline-block;
          background: #000;
          color: #fff;
          padding: 2px 5px;
          border-radius: 2px;
          font-size: 12px;
          margin-right: 5px;
        }

        .name {
          text-transform: uppercase;
          font-size: 12px;
        }

        .takeout-badge {
          background: #10b981;
          color: white;
          padding: 2px 5px;
          margin: 3px 0;
          font-size: 9px;
          font-weight: bold;
          display: inline-block;
          border-radius: 2px;
        }

        .customization {
          font-size: 9px;
          margin: 2px 0;
          padding-left: 5px;
        }

        .notes {
          background: #fff3cd;
          border: 1px dashed #856404;
          padding: 3px;
          margin: 3px 0;
          font-size: 9px;
          font-style: italic;
        }

        .footer {
          text-align: center;
          margin-top: 10px;
          padding-top: 5px;
          border-top: 2px dashed #000;
          font-size: 9px;
        }

        .cut-line {
          text-align: center;
          margin: 10px 0 5px 0;
          font-size: 12px;
          letter-spacing: 2px;
          color: #999;
        }

        /* Prevenir saltos de página */
        .header, .order-type, .item, .footer {
          page-break-inside: avoid;
          break-inside: avoid;
        }

        @media print {
          body {
            width: ${paperWidth};
            max-width: ${paperWidth};
            height: auto;
          }

          /* Asegurar que todo se imprima en una sola página continua */
          html, body {
            height: auto;
            overflow: visible;
          }

          .header, .order-type, .item, .footer, .cut-line {
            page-break-inside: avoid;
            break-inside: avoid;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="station-name">🍳 ${ticket.station_name}</div>
        <div class="info-line">⏰ ${timeStr} | 🪑 Mesa ${ticket.table_number || 'N/A'}</div>
        <div class="info-line">👤 ${ticket.waiter_name || 'N/A'}</div>
        <div class="info-line">📋 ${ticket.order_id.slice(0, 8).toUpperCase()}</div>
      </div>

      <div class="order-type">${orderTypeInfo.icon} ${orderTypeInfo.label}</div>

      ${itemsHTML}

      <div class="footer">
        <div>Impreso: ${new Date().toLocaleTimeString('es-ES')}</div>
      </div>

      <div class="cut-line">- - - - - - - - - - - - - -</div>
    </body>
    </html>
  `;
};

/**
 * Imprimir tickets de cocina por estación desde el frontend
 * Usa la API de preview para obtener la agrupación correcta por estación
 */
export const printKitchenTicketsFrontend = async (order: Order): Promise<boolean> => {
  try {
    const settings = getPrintSettings();

    // Si está configurado para pedir confirmación
    if (!settings.autoPrint) {
      const confirmed = window.confirm(
        `¿Imprimir tickets de cocina para Mesa ${order.table_number}?\n\n` +
          `Pedido: ${order.items.length} item(s)\n` +
          `Se generarán tickets por estación`
      );

      if (!confirmed) {
        console.log('❌ Impresión cancelada por el usuario');
        return false;
      }
    }

    // Importar la API de tickets
    const { kitchenTicketsAPI } = await import('../features/shared/orders/api/kitchenTicketsAPI');

    // Obtener preview de tickets del backend para saber cómo agrupar
    console.log('🔍 Obteniendo agrupación de tickets del backend...');
    const ticketsPreview = await kitchenTicketsAPI.preview(order.id);

    if (!ticketsPreview.tickets || ticketsPreview.tickets.length === 0) {
      console.warn('⚠️ No hay tickets para imprimir');
      alert('No hay tickets para imprimir. Los items no tienen estaciones asignadas.');
      return false;
    }

    console.log(`🖨️ Generando ${ticketsPreview.tickets.length} ticket(s) para estaciones`);

    // Imprimir cada ticket
    const isMobile = isMobileDevice();
    let successCount = 0;

    for (const ticket of ticketsPreview.tickets) {
      try {
        const ticketHTML = generateKitchenTicketHTML(ticket, settings);

        if (isMobile) {
          await printWithIframe(ticketHTML, settings);
        } else {
          await printWithWindow(ticketHTML, settings);
        }

        successCount++;

        // Pequeña pausa entre tickets
        if (successCount < ticketsPreview.tickets.length) {
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      } catch (error) {
        console.error(`❌ Error al imprimir ticket de ${ticket.station_name}:`, error);
      }
    }

    if (successCount === ticketsPreview.tickets.length) {
      console.log(`✅ Todos los tickets impresos exitosamente (${successCount}/${ticketsPreview.tickets.length})`);
      return true;
    } else if (successCount > 0) {
      console.warn(`⚠️ Algunos tickets fallaron (${successCount}/${ticketsPreview.tickets.length})`);
      return true;
    } else {
      throw new Error('No se pudo imprimir ningún ticket');
    }
  } catch (error) {
    console.error('❌ Error al imprimir tickets de cocina:', error);
    alert(`Error al imprimir tickets: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    return false;
  }
};

/**
 * Función auxiliar para imprimir localmente usando el navegador (LEGACY - para emergencias o sin backend)
 * Esta función imprime la comanda completa sin separar por estaciones
 * NOTA: Comentada por no estar en uso. Descomentar si se necesita para fallback.
 */
/*
export const printKitchenCommandLocal = async (order: Order): Promise<boolean> => {
  try {
    const settings = getPrintSettings();
    const isMobile = isMobileDevice();

    // Si está configurado para pedir confirmación
    if (!settings.autoPrint) {
      const confirmed = window.confirm(
        `¿Imprimir comanda completa (local) para Mesa ${order.table_number}?\n\n` +
          `Pedido: ${order.items.length} item(s)\n` +
          `Total: $${order.total.toFixed(2)}\n\n` +
          `⚠️ Esto imprimirá la comanda completa, sin separar por estaciones.`
      );

      if (!confirmed) {
        console.log('❌ Impresión cancelada por el usuario');
        return false;
      }
    }

    // Generar HTML de la comanda
    const commandHTML = generateCommandHTML(order, settings);

    // Usar método apropiado según el dispositivo
    if (isMobile) {
      console.log('📱 Imprimiendo desde dispositivo móvil usando iframe...');
      await printWithIframe(commandHTML, settings);
    } else {
      console.log('🖥️ Imprimiendo desde desktop usando window.open...');
      await printWithWindow(commandHTML, settings);
    }

    console.log(`✅ Comanda impresa exitosamente localmente (${settings.copies} copia(s))`);
    return true;
  } catch (error) {
    console.error('❌ Error al imprimir comanda localmente:', error);

    const isMobile = isMobileDevice();
    const errorMsg = isMobile
      ? `Error al imprimir desde móvil: ${error instanceof Error ? error.message : 'Error desconocido'}\n\nConsejo: Asegúrate de permitir el acceso a la impresión en tu navegador.`
      : `Error al imprimir comanda: ${error instanceof Error ? error.message : 'Error desconocido'}`;

    alert(errorMsg);
    return false;
  }
};
*/



