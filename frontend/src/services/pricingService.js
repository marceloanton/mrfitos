import api from './api';

function normalizeCatalog(payload) {
  const data = payload?.data ?? payload ?? {};
  const plans = Array.isArray(data.plans) ? data.plans : [];
  const addons = Array.isArray(data.addons) ? data.addons : [];
  return {
    source: 'api',
    plans,
    addons,
    todo: null
  };
}

export async function fetchPublicPricingCatalog() {
  const { data } = await api.get('/public/pricing');
  return normalizeCatalog(data);
}
