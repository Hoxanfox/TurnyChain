import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { validateSession } from './authAPI';

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
    await validateSession(token);
    return {
      ok: true,
      message: 'Sesion valida',
      shouldLogout: false,
    };
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      // Compatibilidad: si el backend aún no tiene /api/auth/validate desplegado,
      // hacemos una verificación mínima contra otra ruta protegida existente.
      if (error.response?.status === 404) {
        try {
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
        } catch (fallbackError: unknown) {
          if (axios.isAxiosError(fallbackError) && (fallbackError.response?.status === 401 || fallbackError.response?.status === 403)) {
            return {
              ok: false,
              message: 'La sesion ya no es valida en el servidor. Inicia sesion nuevamente.',
              shouldLogout: true,
            };
          }

          return {
            ok: false,
            message: 'No se pudo validar la sesion. Intenta nuevamente.',
            shouldLogout: false,
          };
        }
      }

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
    const response = await axios.get('/api/printers/operational-check', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.data?.success !== true) {
      return {
        ok: false,
        message: response.data?.message || 'No hay impresoras operativas disponibles.',
        shouldLogout: false,
      };
    }

    return {
      ok: true,
      message: 'Impresora operativa',
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
