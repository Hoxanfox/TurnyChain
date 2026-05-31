export type WaiterApprovedStat = {
  period: string;
  waiter_id: string;
  waiter_name: string;
  approved_count: number;
};

export type WaiterStatsFilterMode = 'day' | 'month' | 'range';
