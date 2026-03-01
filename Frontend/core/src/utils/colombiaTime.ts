// Utilidad para formatear fechas en horario de Colombia
export function formatColombiaTime(dateInput: string | Date, options?: Intl.DateTimeFormatOptions): string {
  let date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  // Opciones por defecto: hora:minuto en formato 24h
  const defaultOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Bogota',
  };
  // Prueba si el navegador respeta la zona horaria
  const test = date.toLocaleString('es-CO', { ...defaultOptions, ...options });
  // Si la hora local coincide con la UTC, ajusta manualmente
  const utcHour = date.getUTCHours();
  const localHour = date.getHours();
  // Si la diferencia es 0, el navegador ignora la zona horaria
  if (utcHour === localHour) {
    // Restar 5 horas manualmente (Colombia UTC-5)
    date = new Date(date.getTime() - 5 * 60 * 60 * 1000);
    return date.toLocaleString('es-CO', { ...defaultOptions, ...options, timeZone: undefined });
  }
  return test;
}
