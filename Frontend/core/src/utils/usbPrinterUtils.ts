// =================================================================
// ARCHIVO: /src/utils/usbPrinterUtils.ts
// Utilidades para impresión USB mediante WebUSB API
// =================================================================

// Types para la WebUSB API
declare global {
  interface USBEndpoint {
    endpointNumber: number;
    direction: 'in' | 'out';
    type: 'bulk' | 'interrupt' | 'isochronous';
    packetSize: number;
  }

  interface USBAlternateInterface {
    alternateSetting: number;
    interfaceClass: number;
    interfaceSubclass: number;
    interfaceProtocol: number;
    interfaceName?: string;
    endpoints: USBEndpoint[];
  }

  interface USBInterface {
    interfaceNumber: number;
    alternate: USBAlternateInterface;
    alternates: USBAlternateInterface[];
    claimed: boolean;
  }

  interface USBConfiguration {
    configurationValue: number;
    configurationName?: string;
    interfaces: USBInterface[];
  }

  interface USBDevice {
    vendorId: number;
    productId: number;
    manufacturerName?: string;
    productName?: string;
    serialNumber?: string;
    configuration: USBConfiguration | null;
    configurations: USBConfiguration[];
    opened: boolean;
    open(): Promise<void>;
    close(): Promise<void>;
    selectConfiguration(configurationValue: number): Promise<void>;
    claimInterface(interfaceNumber: number): Promise<void>;
    releaseInterface(interfaceNumber: number): Promise<void>;
    transferOut(endpointNumber: number, data: BufferSource): Promise<USBOutTransferResult>;
  }

  interface USBOutTransferResult {
    bytesWritten: number;
    status: 'ok' | 'stall';
  }

  interface Navigator {
    usb: {
      requestDevice(options?: { filters?: any[] }): Promise<USBDevice>;
      getDevices(): Promise<USBDevice[]>;
    };
  }
}

let cachedDevice: USBDevice | null = null;

/**
 * Solicita permisos al usuario para conectarse a una impresora por USB
 */
export const requestUSBPrinter = async (): Promise<boolean> => {
  if (!('usb' in navigator)) {
    alert('Tu navegador no soporta la WebUSB API. Usa Google Chrome o Microsoft Edge.');
    return false;
  }

  try {
    // Solicitamos acceso a cualquier dispositivo USB
    const device = await navigator.usb.requestDevice({ filters: [] });
    cachedDevice = device;
    return true;
  } catch (error) {
    console.error('Error solicitando dispositivo USB:', error);
    return false;
  }
};

/**
 * Imprime un contenido raw (ESC/POS) usando WebUSB API
 */
export const printViaWebSerial = async (rawContent: string): Promise<boolean> => {
  if (!('usb' in navigator)) {
    console.error('WebUSB API no soportada');
    return false;
  }

  // Intentamos obtener un dispositivo que ya tenga permiso
  if (!cachedDevice) {
    try {
      const devices = await navigator.usb.getDevices();
      if (devices && devices.length > 0) {
        cachedDevice = devices[0];
      } else {
        const granted = await requestUSBPrinter();
        if (!granted) return false;
      }
    } catch (error) {
      console.error('Error obteniendo dispositivos USB:', error);
      return false;
    }
  }

  if (!cachedDevice) return false;

  try {
    if (!cachedDevice.opened) {
      await cachedDevice.open();
    }
    if (cachedDevice.configuration === null) {
      await cachedDevice.selectConfiguration(1);
    }

    if (cachedDevice.configuration === null) {
      throw new Error("No se pudo seleccionar la configuración del dispositivo USB");
    }

    const interfaces = cachedDevice.configuration.interfaces;
    // Buscamos la interfaz de clase 7 (Impresora) o tomamos la primera
    let printerInterface = interfaces.find(iface => 
      iface.alternates[0].interfaceClass === 7
    ) || interfaces[0];

    if (!printerInterface.claimed) {
      await cachedDevice.claimInterface(printerInterface.interfaceNumber);
    }

    // Buscamos el endpoint de salida (bulk out)
    const endpoint = printerInterface.alternates[0].endpoints.find(e => e.direction === 'out');
    if (!endpoint) throw new Error("No se encontró un endpoint de salida (OUT) en el dispositivo USB");

    // Convertimos el contenido a binario
    const data = new Uint8Array(rawContent.length);
    for (let i = 0; i < rawContent.length; i++) {
      data[i] = rawContent.charCodeAt(i) & 0xff;
    }

    await cachedDevice.transferOut(endpoint.endpointNumber, data);
    return true;
  } catch (error) {
    console.error('Error imprimiendo por USB:', error);
    cachedDevice = null;
    return false;
  }
};
