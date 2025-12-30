// =================================================================
// ARCHIVO: /src/utils/imageUtils.ts
// Utilidades para manejo de imágenes de comprobantes de pago
// =================================================================

/**
 * Comprimir imagen antes de enviar al servidor
 * Redimensiona imágenes grandes y reduce la calidad para optimizar el tamaño
 * @param file - Archivo de imagen a comprimir
 * @param maxSize - Tamaño máximo en píxeles (default: 1200)
 * @param quality - Calidad JPEG 0-1 (default: 0.8)
 * @returns Archivo comprimido
 */
export async function compressImage(file: File, maxSize: number = 1200, quality: number = 0.8): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('No se pudo obtener contexto del canvas'));
          return;
        }

        // Calcular nuevo tamaño manteniendo aspect ratio
        let width = img.width;
        let height = img.height;

        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = (height / width) * maxSize;
            width = maxSize;
          } else {
            width = (width / height) * maxSize;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Error al comprimir imagen'));
              return;
            }

            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });

            console.log('📊 Compresión de imagen:', {
              original: `${(file.size / 1024).toFixed(2)} KB`,
              comprimida: `${(compressedFile.size / 1024).toFixed(2)} KB`,
              reduccion: `${(((file.size - compressedFile.size) / file.size) * 100).toFixed(1)}%`
            });

            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => {
        reject(new Error('Error al cargar la imagen'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Error al leer el archivo'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Validar archivo de imagen
 * @param file - Archivo a validar
 * @returns Objeto con valid (boolean) y error opcional (string)
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'El archivo debe ser una imagen (JPEG, PNG, WEBP)'
    };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'El archivo no debe superar 5MB'
    };
  }

  return { valid: true };
}

/**
 * Crear preview de imagen para mostrar antes de subir
 * @param file - Archivo de imagen
 * @returns Promise con data URL para preview
 */
export function createImagePreview(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onloadend = () => {
      resolve(reader.result as string);
    };

    reader.onerror = () => {
      reject(new Error('Error al crear preview'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Obtener URL completa de la imagen de comprobante
 * @param paymentProofPath - Path relativo del comprobante (ej: /static/proofs/order_xxx.jpg o /api/static/proofs/order_xxx.jpg)
 * @returns URL completa para cargar la imagen
 */
export function getPaymentProofUrl(paymentProofPath: string): string {
  // Si el path comienza con /static/ (sin /api), agregamos /api
  // El backend puede devolver /static/proofs/... o /api/static/proofs/...
  if (paymentProofPath.startsWith('/static/')) {
    return `/api${paymentProofPath}`;
  }

  // Si ya tiene /api/static/, lo devolvemos tal cual
  // En desarrollo, Vite proxy redirige /api a localhost:8080
  // En producción, nginx maneja el proxy
  return paymentProofPath;
}

/**
 * Descargar imagen de comprobante
 * @param imageUrl - URL de la imagen
 * @param orderId - ID de la orden para nombrar el archivo
 */
export async function downloadPaymentProof(imageUrl: string, orderId: string): Promise<void> {
  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comprobante_orden_${orderId}.jpg`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error('Error al descargar comprobante:', error);
    throw new Error('No se pudo descargar el comprobante');
  }
}

