import axios from 'axios';
import type { WaiterApprovedStat } from '../types/waiterStatsTypes';

const API_URL = '/api/orders/waiter-approved-stats';

interface WaiterStatsParams {
  token: string;
  day?: string;
  month?: string;
  from?: string;
  to?: string;
}

export const fetchWaiterApprovedStats = async ({
  token,
  day,
  month,
  from,
  to,
}: WaiterStatsParams): Promise<WaiterApprovedStat[]> => {
  const config = {
    headers: { Authorization: `Bearer ${token}` },
    params: {
      day: day || undefined,
      month: month || undefined,
      from: from || undefined,
      to: to || undefined,
    },
  };

  const response = await axios.get(API_URL, config);
  return response.data as WaiterApprovedStat[];
};
