// =================================================================
// ARCHIVO: /src/utils/usbPrinterUtils.ts
// Utilidades para impresión térmica vía USB (WebUSB API)
// =================================================================

export interface UsbPrinterInfo {
  vendorId: number;
  productId: number;
  productName?: string;
}

/**
 * Solicita al usuario seleccionar una impresora USB mediante WebUSB
 * Filtra por Class 7 (Impresoras) para asegurar que no se muestren otros dispositivos.
 */
export const requestUsbPrinter = async (): Promise<UsbPrinterInfo> => {
  if (!navigator.usb) {
    throw new Error('WebUSB no está soportado en este navegador.');
  }

  try {
    const device = await navigator.usb.requestDevice({
      filters: [{ classCode: 7 }], // Class 7 = Printer
    });

    return {
      vendorId: device.vendorId,
      productId: device.productId,
      productName: device.productName || 'Impresora USB Desconocida',
    };
  } catch (error: any) {
    throw new Error(error.message || 'Error al seleccionar impresora USB');
  }
};

/**
 * Realiza una impresión de prueba hacia una impresora USB usando ESC/POS
 */
export const testUsbPrinter = async (vendorId: number, productId: number): Promise<boolean> => {
  if (!navigator.usb) {
    throw new Error('WebUSB no está soportado en este navegador.');
  }

  try {
    const devices = await navigator.usb.getDevices();
    let device = devices.find((d: USBDevice) => d.vendorId === vendorId && d.productId === productId);

    if (!device) {
      // Si el navegador no lo tiene recordado, solicitamos permiso de nuevo
      device = await navigator.usb.requestDevice({
        filters: [{ vendorId, productId }],
      });
    }

    await device.open();
    if (device.configuration === null) {
      await device.selectConfiguration(1);
    }
    await device.claimInterface(0);

    // Buscar endpoint de salida masiva (Bulk Out)
    let outEndpoint = null;
    for (const alt of device.configuration!.interfaces[0].alternates) {
      for (const ep of alt.endpoints) {
        if (ep.direction === 'out' && ep.type === 'bulk') {
          outEndpoint = ep;
          break;
        }
      }
      if (outEndpoint) break;
    }

    if (!outEndpoint) {
      throw new Error('No se encontró el endpoint de escritura (Bulk Out) en el dispositivo.');
    }

    const encoder = new TextEncoder();
    
    // Comandos ESC/POS básicos: Initialize, Print Text, Line Feeds, Cut
    const data = new Uint8Array([
      0x1b, 0x40, // Initialize printer (ESC @)
      0x1b, 0x61, 0x01, // Align center (ESC a 1)
      ...encoder.encode("==========================\n"),
      ...encoder.encode("   PRUEBA DE IMPRESION\n"),
      ...encoder.encode("    CONEXION USB OK!\n"),
      ...encoder.encode("==========================\n\n\n\n\n"),
      0x1d, 0x56, 0x00, // Full Cut (GS V 0)
    ]);

    await device.transferOut(outEndpoint.endpointNumber, data);
    await device.close();

    return true;
  } catch (error: any) {
    console.error('Error al probar impresora USB:', error);
    throw new Error(error.message || 'Error al imprimir en dispositivo USB');
  }
};
