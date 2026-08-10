// =================================================================
// ARCHIVO: /src/utils/usbPrinterUtils.ts
// Utilidades para impresión USB mediante Web Serial API
// =================================================================

// Types para la Web Serial API
declare global {
  interface SerialPort {
    readable: ReadableStream | null;
    writable: WritableStream | null;
    open(options: { baudRate: number }): Promise<void>;
    close(): Promise<void>;
  }

  interface Navigator {
    serial: {
      requestPort(options?: { filters?: any[] }): Promise<SerialPort>;
      getPorts(): Promise<SerialPort[]>;
    };
  }
}

let cachedPort: SerialPort | null = null;

/**
 * Solicita permisos al usuario para conectarse a una impresora por USB/Serial
 */
export const requestUSBPrinter = async (): Promise<boolean> => {
  if (!('serial' in navigator)) {
    alert('Tu navegador no soporta la Web Serial API. Usa Google Chrome o Microsoft Edge.');
    return false;
  }

  try {
    const port = await navigator.serial.requestPort();
    cachedPort = port;
    return true;
  } catch (error) {
    console.error('Error solicitando puerto serial:', error);
    return false;
  }
};

/**
 * Imprime un contenido raw (ESC/POS) usando Web Serial API
 */
export const printViaWebSerial = async (rawContent: string): Promise<boolean> => {
  if (!('serial' in navigator)) {
    console.error('Web Serial API no soportada');
    return false;
  }

  // Si no tenemos un puerto cacheado, intentamos buscar entre los que ya tienen permiso
  if (!cachedPort) {
    try {
      const ports = await navigator.serial.getPorts();
      if (ports && ports.length > 0) {
        cachedPort = ports[0];
      } else {
        // Si no hay puertos con permiso, solicitamos uno nuevo
        const granted = await requestUSBPrinter();
        if (!granted) return false;
      }
    } catch (error) {
      console.error('Error obteniendo puertos seriales:', error);
      return false;
    }
  }

  if (!cachedPort) return false;

  try {
    // Abrimos la conexión si no está abierta
    if (!cachedPort.readable && !cachedPort.writable) {
        await cachedPort.open({ baudRate: 9600 });
    }

    const writer = cachedPort.writable?.getWriter();
    if (!writer) {
      throw new Error('No se pudo obtener el writer del puerto serial');
    }

    // Convertir el string raw (que tiene los comandos escape) a Uint8Array
    // Como el backend envía caracteres iso-8859-1 (Windows-1252) casteados a string,
    // usamos TextEncoder básico o convertimos caracter por caracter.
    const data = new Uint8Array(rawContent.length);
    for (let i = 0; i < rawContent.length; i++) {
      data[i] = rawContent.charCodeAt(i) & 0xff;
    }

    await writer.write(data);
    
    // Cerramos el writer para liberar
    writer.releaseLock();
    
    return true;
  } catch (error) {
    console.error('Error imprimiendo por USB:', error);
    // Si falla, limpiar el caché por si la impresora se desconectó
    cachedPort = null;
    return false;
  }
};
