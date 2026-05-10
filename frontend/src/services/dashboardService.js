import api from './api';

export async function fetchDashboardMetrics() {
  const { data } = await api.get('/dashboard/metrics');
  return data.data;
}
