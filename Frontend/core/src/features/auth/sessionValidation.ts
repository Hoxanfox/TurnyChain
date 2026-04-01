import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

type SessionValidationResult = {
  ok: boolean;
  message: string;
  shouldLogout: boolean;
};

type DecodedToken = {
  exp?: number;
};

function isExpiredJwt(token: string): boolean {
  try {
    const decoded = jwtDecode<DecodedToken>(token);
    if (!decoded.exp) {
      return true;
    }
    return decoded.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

export async function validatePaymentSession(token: string | null): Promise<SessionValidationResult> {
  if (!navigator.onLine) {
    return {
      ok: false,
      message: 'Sin conexion a internet. Verifica la red antes de cobrar.',
      shouldLogout: false,
    };
  }

  if (!token) {
    return {
      ok: false,
      message: 'Sesion expirada. Inicia sesion nuevamente.',
      shouldLogout: true,
    };
  }

  if (isExpiredJwt(token)) {
    return {
      ok: false,
      message: 'Tu sesion expiro. Inicia sesion nuevamente.',
      shouldLogout: true,
    };
  }

  try {
    // Usamos una ruta protegida estable para evitar 404 en despliegues antiguos
    // que no exponen /api/auth/validate.
    await axios.get('/api/tables', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return {
      ok: true,
      message: 'Sesion valida',
      shouldLogout: false,
    };
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        return {
          ok: false,
          message: 'La sesion ya no es valida en el servidor. Inicia sesion nuevamente.',
          shouldLogout: true,
        };
      }

      if (!error.response) {
        return {
          ok: false,
          message: 'No se pudo validar la sesion por un problema de red.',
          shouldLogout: false,
        };
      }
    }

    return {
      ok: false,
      message: 'No se pudo validar la sesion. Intenta nuevamente.',
      shouldLogout: false,
    };
  }
}

export async function validatePrinterOperational(token: string | null): Promise<SessionValidationResult> {
  if (!token) {
    return {
      ok: false,
      message: 'Sesion expirada. Inicia sesion nuevamente.',
      shouldLogout: true,
    };
  }

  try {
    const response = await axios.get('/api/printers/active', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const activePrinters = Array.isArray(response.data)
      ? response.data
      : [];

    if (activePrinters.length === 0) {
      return {
        ok: false,
        message: 'No hay impresoras activas configuradas.',
        shouldLogout: false,
      };
    }

    return {
      ok: true,
      message: 'Impresora activa disponible',
      shouldLogout: false,
    };
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        return {
          ok: false,
          message: 'La sesion ya no es valida en el servidor. Inicia sesion nuevamente.',
          shouldLogout: true,
        };
      }

      const printers = Array.isArray(error.response?.data?.printers)
        ? error.response?.data?.printers
        : [];

      const firstFailedPrinter = printers.find((printer: { ok?: boolean; name?: string; error?: string }) => printer?.ok === false);

      if (firstFailedPrinter?.name || firstFailedPrinter?.error) {
        const printerLabel = firstFailedPrinter?.name ? ` (${firstFailedPrinter.name})` : '';
        const printerReason = firstFailedPrinter?.error ? ` Motivo: ${firstFailedPrinter.error}.` : '';

        return {
          ok: false,
          message: `No hay impresoras operativas${printerLabel}.${printerReason}`,
          shouldLogout: false,
        };
      }

      return {
        ok: false,
        message: error.response?.data?.message || 'No hay impresoras operativas en este momento.',
        shouldLogout: false,
      };
    }

    return {
      ok: false,
      message: 'No se pudo validar el estado de impresoras.',
      shouldLogout: false,
    };
  }
}
