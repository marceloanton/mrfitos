import api from './api';

function extractPayload(data) {
  return data?.data ?? data;
}

export async function getAdminTrackingSummary(params = {}) {
  const { data } = await api.get('/admin/tracking/summary', { params });
  return extractPayload(data);
}
