import { useState } from 'react';

export const useDashboardMetrics = () => {
  const [metrics, setMetrics] = useState({ total: 16444, frp: 439350, alerts: 223 });
  const [aiData, setAiData] = useState({ prob: 92, status: 'CRÍTICO' });
  return { metrics, aiData, setAiData };
};