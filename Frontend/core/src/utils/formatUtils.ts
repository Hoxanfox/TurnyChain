/**
 * Formatea un valor numérico como moneda colombiana (COP).
 * Ejemplo: 1500000 → "$ 1.500.000"
 */
export const formatMoney = (amount: number): string =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(amount);
