export const EXPLORER_BASE_URL = 'https://arbiscan.io/tx';
export const DEFAULT_LIMIT = 50;

export const getTodayValue = () => {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

export const getMonthValue = () => getTodayValue().slice(0, 7);

export const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

export const formatMoney = (value: number) => `$${value.toFixed(2)}`;

export const shortText = (value: string, size = 10) => {
  if (value.length <= size * 2) return value;
  return `${value.slice(0, size)}...${value.slice(-size)}`;
};

interface CacheKeyInput {
  query: string;
  filterMode: 'day' | 'month';
  dayValue: string;
  monthValue: string;
}

export const buildInvoiceHistoryCacheKey = ({
  query,
  filterMode,
  dayValue,
  monthValue,
}: CacheKeyInput) => {
  const normalizedQuery = query.trim().toLowerCase();
  const range = filterMode === 'day' ? dayValue : monthValue;
  return `${filterMode}|${range}|${normalizedQuery}`;
};
