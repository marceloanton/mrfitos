import api from './api';

function payload(data) {
  return data?.data ?? data;
}

export async function getPosSummary() {
  const { data } = await api.get('/pos/summary');
  return payload(data);
}

export async function listPosSales(params = {}) {
  const { data } = await api.get('/pos/sales', { params });
  return payload(data);
}

export async function getPosSaleReceipt(id) {
  const { data } = await api.get(`/pos/sales/${id}/receipt`);
  return payload(data);
}

export async function getPosConfig() {
  const { data } = await api.get('/pos/config');
  return payload(data);
}

export async function updatePosConfig(body = {}) {
  const { data } = await api.post('/pos/config', body);
  return payload(data);
}

export async function listPosProducts() {
  const { data } = await api.get('/pos/products');
  const p = payload(data);
  return Array.isArray(p?.items) ? p.items : [];
}

export async function createPosProduct(body) {
  const { data } = await api.post('/pos/products', body);
  return payload(data);
}

export async function createPosSale(body) {
  const { data } = await api.post('/pos/sales', body);
  return payload(data);
}

export async function listMemberAccountCharges(params = {}) {
  const { data } = await api.get('/pos/member-account/charges', { params });
  return payload(data);
}

export async function settleMemberAccountCharge(id, body = {}) {
  const { data } = await api.post(`/pos/member-account/charges/${id}/settle`, body);
  return payload(data);
}

export async function listStockMovements(params = {}) {
  const { data } = await api.get('/pos/stock/movements', { params });
  return payload(data);
}

export async function adjustStock(body = {}) {
  const { data } = await api.post('/pos/stock/adjust', body);
  return payload(data);
}

export async function openCashSession(body = {}) {
  const { data } = await api.post('/pos/cash-sessions/open', body);
  return payload(data);
}

export async function getOpenCashSessionSummary() {
  const { data } = await api.get('/pos/cash-sessions/open-summary');
  return payload(data);
}

export async function closeCashSession(body = {}) {
  const { data } = await api.post('/pos/cash-sessions/close', body);
  return payload(data);
}

export async function listCashSessions(params = {}) {
  const { data } = await api.get('/pos/cash-sessions', { params });
  return payload(data);
}

export async function getCashSessionReport(id) {
  const { data } = await api.get(`/pos/cash-sessions/${id}/report`);
  return payload(data);
}
