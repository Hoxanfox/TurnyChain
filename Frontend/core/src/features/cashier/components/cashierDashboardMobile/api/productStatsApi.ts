import axios from 'axios';
import type { ProductSalesStat } from '../types/metricsTypes';

const API_URL = '/api/orders/product-stats';

export const fetchProductStats = async (
  token: string,
  filter: { day?: string; month?: string; from?: string; to?: string }
): Promise<ProductSalesStat[]> => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`
    },
    params: filter
  };

  const response = await axios.get(API_URL, config);
  return response.data || [];
};
