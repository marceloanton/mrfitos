import api from './api';

function extractPayload(data) {
  return data?.data ?? data;
}

export async function getCheckoutSession(providerReference) {
  const { data } = await api.get(`/billing/checkout-session/${encodeURIComponent(providerReference)}`);
  return extractPayload(data);
}
