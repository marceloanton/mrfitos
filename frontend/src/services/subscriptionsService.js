import api from './api';

function extractPayload(data) {
  return data?.data ?? data;
}

async function postWithFallback(endpoints, body = {}) {
  let lastError;
  for (const endpoint of endpoints) {
    try {
      const { data } = await api.post(endpoint, body);
      return extractPayload(data);
    } catch (error) {
      const status = error?.response?.status;
      if (status === 404 || status === 405) {
        lastError = error;
        continue;
      }
      throw error;
    }
  }

  throw lastError ?? new Error('Billing endpoint not available');
}

export async function getTenantSubscription(tenantId) {
  const { data } = await api.get(`/admin/subscription/tenant/${tenantId}`);
  return extractPayload(data);
}

export async function updateTenantSubscription(tenantId, planCode) {
  const { data } = await api.put(`/admin/subscription/tenant/${tenantId}`, {
    plan_code: planCode
  });
  return extractPayload(data);
}

export async function startTenantTrial(tenantId, days = 14) {
  return postWithFallback([
    `/admin/subscription/tenant/${tenantId}/start-trial`,
    `/admin/subscription/tenant/${tenantId}/trial/start`,
    `/admin/billing/tenant/${tenantId}/trial/start`
  ], { days });
}

export async function createPlanCheckoutSession(tenantId, planCode = 'pro', context = null) {
  return postWithFallback([
    '/billing/self-service/checkout-session',
    '/admin/billing/checkout-session',
    `/admin/subscription/tenant/${tenantId}/checkout/plan`,
    `/admin/billing/checkout/plan`
  ], {
    tenant_id: Number(tenantId),
    plan_code: planCode,
    context
  });
}

export async function createAddonCheckoutSession(tenantId, addonCode, context = null) {
  return postWithFallback([
    '/billing/self-service/checkout-session',
    '/admin/billing/checkout-session',
    `/admin/subscription/tenant/${tenantId}/checkout/addon`,
    `/admin/billing/checkout/addon`
  ], {
    tenant_id: Number(tenantId),
    addon_code: addonCode,
    context
  });
}

export async function processExpiredTrials() {
  return postWithFallback([
    '/admin/subscription/process-expired-trials',
    '/admin/subscription/trials/process-expired',
    '/admin/billing/trials/process-expired'
  ]);
}
