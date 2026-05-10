import api from './api';

function extractPayload(data) {
  return data?.data ?? data;
}

async function getWithFallback(endpoints, params = {}) {
  let lastError;
  for (const endpoint of endpoints) {
    try {
      const { data } = await api.get(endpoint, { params });
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

  throw lastError ?? new Error('Billing analytics endpoint not available');
}

export async function getBillingFunnel(params = {}) {
  return getWithFallback([
    '/admin/billing/analytics/funnel',
    '/admin/billing/analytics',
    '/admin/billing/funnel'
  ], params);
}

export async function getBillingSessions(params = {}) {
  return getWithFallback([
    '/admin/billing/analytics/sessions',
    '/admin/billing/sessions',
    '/admin/billing/checkout-sessions'
  ], params);
}

export async function getTenantConversionRanking(params = {}) {
  return getWithFallback([
    '/admin/billing/tenant-ranking',
    '/admin/billing/ranking/tenants'
  ], params);
}

export async function exportTenantRankingCsv(params = {}) {
  return downloadBlobWithFallback(
    [
      '/admin/billing/tenant-ranking/export',
      '/admin/billing/tenant-ranking/export.csv'
    ],
    params
  );
}

export function buildBillingSessionsExportUrl(params = {}) {
  const url = new URL('/admin/billing/checkout-sessions/export', window.location.origin);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value) !== '') {
      url.searchParams.set(key, String(value));
    }
  });
  return url.pathname + url.search;
}

export function buildBillingFunnelExportUrl(params = {}) {
  const url = new URL('/admin/billing/funnel/export', window.location.origin);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value) !== '') {
      url.searchParams.set(key, String(value));
    }
  });
  return url.pathname + url.search;
}

function toQueryString(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    search.set(key, String(value));
  });
  return search.toString();
}

function escapeCsvValue(value) {
  const raw = value === null || value === undefined ? '' : String(value);
  if (raw.includes('"') || raw.includes(',') || raw.includes('\n')) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

function rowsToCsv(headers, rows) {
  const headerRow = headers.join(',');
  const bodyRows = rows.map((row) =>
    headers.map((header) => escapeCsvValue(row[header])).join(',')
  );
  return [headerRow, ...bodyRows].join('\n');
}

export function getBillingSessionsExportUrl(params = {}) {
  const query = toQueryString(params);
  return `/admin/billing/checkout-sessions/export${query ? `?${query}` : ''}`;
}

export function getBillingFunnelExportUrl(params = {}) {
  const query = toQueryString(params);
  return `/admin/billing/funnel/export${query ? `?${query}` : ''}`;
}

async function parseBlobJson(blob) {
  if (!(blob instanceof Blob)) return null;
  const text = await blob.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function isCsvLikeContentType(typeHeader) {
  const type = String(typeHeader || '').toLowerCase();
  return (
    type.includes('text/csv') ||
    type.includes('application/csv') ||
    type.includes('application/octet-stream') ||
    type.includes('text/plain')
  );
}

async function downloadBlobWithFallback(endpoints, params = {}) {
  let lastError;
  for (const endpoint of endpoints) {
    try {
      const response = await api.get(endpoint, { params, responseType: 'blob' });
      const type = response?.headers?.['content-type'] ?? '';
      if (isCsvLikeContentType(type)) {
        return response.data;
      }
      lastError = new Error('CSV content-type not returned');
    } catch (error) {
      const status = error?.response?.status;
      if (error?.response?.data instanceof Blob) {
        const payload = await parseBlobJson(error.response.data);
        if (payload?.message) {
          error.message = payload.message;
        }
      }
      if (status === 404 || status === 405) {
        lastError = error;
        continue;
      }
      throw error;
    }
  }
  throw lastError ?? new Error('CSV export endpoint not available');
}

export async function exportBillingSessionsCsv(params = {}) {
  try {
    return await downloadBlobWithFallback(
      [
        '/admin/billing/checkout-sessions/export',
        '/admin/billing/checkout-sessions/export.csv',
        '/admin/billing/analytics/sessions/export.csv',
        '/admin/billing/sessions/export.csv'
      ],
      params
    );
  } catch {
    const payload = await getBillingSessions(params);
    const rows = Array.isArray(payload?.items)
      ? payload.items
      : Array.isArray(payload?.sessions)
        ? payload.sessions
        : Array.isArray(payload?.data)
          ? payload.data
          : [];
    const csv = rowsToCsv(
      ['id', 'tenant_id', 'provider_reference', 'status', 'amount', 'currency', 'plan_code', 'addon_code', 'created_at', 'processed_at'],
      rows
    );
    return new Blob([csv], { type: 'text/csv;charset=utf-8' });
  }
}

export async function exportBillingFunnelCsv(params = {}) {
  try {
    return await downloadBlobWithFallback(
      [
        '/admin/billing/funnel/export',
        '/admin/billing/funnel/export.csv',
        '/admin/billing/analytics/funnel/export.csv',
        '/admin/billing/analytics/export.csv'
      ],
      params
    );
  } catch {
    const payload = await getBillingFunnel(params);
    const row = {
      total_sessions: payload?.total_sessions ?? payload?.sessions_total ?? 0,
      approved: payload?.approved ?? payload?.approved_sessions ?? 0,
      pending: payload?.pending ?? payload?.pending_sessions ?? 0,
      rejected: payload?.rejected ?? 0,
      expired: payload?.expired ?? 0,
      approval_rate: payload?.approval_rate ?? payload?.conversion_rate ?? payload?.approved_rate ?? 0
    };
    const csv = rowsToCsv(['total_sessions', 'approved', 'pending', 'rejected', 'expired', 'approval_rate'], [row]);
    return new Blob([csv], { type: 'text/csv;charset=utf-8' });
  }
}

export async function exportTenantRankingCsvWithLocalFallback(params = {}) {
  try {
    return await exportTenantRankingCsv(params);
  } catch {
    const payload = await getTenantConversionRanking(params);
    const rows = Array.isArray(payload?.items) ? payload.items : [];
    const csv = rowsToCsv(
      [
        'tenant_id',
        'tenant_name',
        'clicks',
        'checkout_sessions',
        'approved_sessions',
        'checkout_to_approved_rate',
        'click_to_approved_rate',
        'partial_historical_data'
      ],
      rows
    );
    return new Blob([csv], { type: 'text/csv;charset=utf-8' });
  }
}
