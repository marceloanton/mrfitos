import api from './api';

export async function fetchRenewalsReport(params) {
  const { data } = await api.get('/reports/renewals', { params });
  return data.data;
}
