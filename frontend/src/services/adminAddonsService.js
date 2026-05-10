import api from './api';

function normalizeAddonsResponse(data) {
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.addons)) return data.data.addons;
  if (Array.isArray(data?.addons)) return data.addons;
  return [];
}

export async function getTenantAddons(tenantId) {
  const { data } = await api.get(`/admin/addons/tenant/${tenantId}`);
  return normalizeAddonsResponse(data);
}

export async function getSelfServiceAddons(tenantId) {
  try {
    const { data } = await api.get('/billing/self-service/addons');
    return normalizeAddonsResponse(data);
  } catch (error) {
    if (!tenantId) throw error;
    const status = error?.response?.status;
    if (status === 404 || status === 405 || status === 401 || status === 403) {
      return getTenantAddons(tenantId);
    }
    throw error;
  }
}

export async function updateTenantAddonStatus(tenantId, addonCode, active) {
  const { data } = await api.put(`/admin/addons/tenant/${tenantId}/${addonCode}`, {
    active
  });
  return data.data ?? data;
}

export async function getAddonCatalog() {
  const { data } = await api.get('/admin/addons/catalog');
  const payload = data?.data ?? data;
  return {
    items: Array.isArray(payload?.items) ? payload.items : [],
    total: Number(payload?.total ?? 0)
  };
}

export async function updateAddonCatalogItem(addonCode, payload) {
  const { data } = await api.put(`/admin/addons/catalog/${addonCode}`, payload);
  const body = data?.data ?? data;
  return {
    items: Array.isArray(body?.items) ? body.items : [],
    total: Number(body?.total ?? 0)
  };
}

export async function getAddonCatalogAudit(params = {}) {
  const { data } = await api.get('/admin/addons/catalog/audit', { params });
  const payload = data?.data ?? data;
  const pagination = payload?.pagination ?? {};
  return {
    items: Array.isArray(payload?.items) ? payload.items : [],
    pagination: {
      page: Number(pagination?.page ?? 1),
      per_page: Number(pagination?.per_page ?? 20),
      total: Number(pagination?.total ?? 0),
      total_pages: Number(pagination?.total_pages ?? 1),
    }
  };
}

export async function exportAddonCatalogAuditCsv(params = {}) {
  const response = await api.get('/admin/addons/catalog/audit/export', {
    params,
    responseType: 'blob'
  });
  return response.data;
}
