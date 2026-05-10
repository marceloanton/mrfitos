import api from './api';

function payload(data) {
  return data?.data ?? data;
}

export async function getPosSummary() {
  const { data } = await api.get('/pos/summary');
  return payload(data);
}

export async function getPosAutosettleKpi(params = {}) {
  const { data } = await api.get('/pos/member-account/autosettle-kpi', { params });
  return payload(data);
}

export async function exportPosAutosettleKpiCsv(params = {}) {
  const { data } = await api.get('/pos/member-account/autosettle-kpi/export', {
    params,
    responseType: 'blob'
  });
  return data;
}

export async function listPosSales(params = {}) {
  const { data } = await api.get('/pos/sales', { params });
  return payload(data);
}

export async function getPosSaleReceipt(id) {
  const { data } = await api.get(`/pos/sales/${id}/receipt`);
  return payload(data);
}

export async function getPosSaleReceiptByNumber(number) {
  const { data } = await api.get('/pos/sales/receipt', { params: { number } });
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

export async function listLowStockProducts(params = {}) {
  const { data } = await api.get('/pos/products/low-stock', { params });
  return payload(data);
}

export async function createPosProduct(body) {
  const { data } = await api.post('/pos/products', body);
  return payload(data);
}

export async function createPosSale(body) {
  const { data } = await api.post('/pos/sales', body);
  return payload(data);
}

export async function voidPosSale(id, body = {}) {
  const { data } = await api.post(`/pos/sales/${id}/void`, body);
  return payload(data);
}

export async function listMemberAccountCharges(params = {}) {
  const { data } = await api.get('/pos/member-account/charges', { params });
  return payload(data);
}

export async function getMemberAccountAging() {
  const { data } = await api.get('/pos/member-account/aging');
  return payload(data);
}

export async function getMemberAccountOverdueWhatsAppLink(memberId) {
  const { data } = await api.get('/pos/member-account/aging/whatsapp-link', {
    params: { member_id: memberId }
  });
  return payload(data);
}

export async function getMemberAccountCollectionsKpiToday() {
  const { data } = await api.get('/pos/member-account/collections-kpi-today');
  return payload(data);
}

export async function getMemberAccountContactEffectivenessToday() {
  const { data } = await api.get('/pos/member-account/contact-effectiveness-today');
  return payload(data);
}

export async function getMemberAccountContactEffectiveness(params = {}) {
  const { data } = await api.get('/pos/member-account/contact-effectiveness', { params });
  return payload(data);
}

export async function exportMemberAccountContactEffectivenessCsv(params = {}) {
  const { data } = await api.get('/pos/member-account/contact-effectiveness/export', {
    params,
    responseType: 'blob'
  });
  return data;
}

export async function getMemberAccountCollectorRanking(params = {}) {
  const { data } = await api.get('/pos/member-account/collector-ranking', { params });
  return payload(data);
}

export async function getMemberAccountFollowupFunnel(params = {}) {
  const { data } = await api.get('/pos/member-account/followup-funnel', { params });
  return payload(data);
}

export async function upsertMemberAccountFollowup(body = {}) {
  const { data } = await api.post('/pos/member-account/followup', body);
  return payload(data);
}

export async function updateMemberAccountFollowupContactResult(body = {}) {
  const { data } = await api.post('/pos/member-account/followup/contact-result', body);
  return payload(data);
}

export async function getMemberAccountPromiseAgenda(params = {}) {
  const { data } = await api.get('/pos/member-account/promise-agenda', { params });
  return payload(data);
}

export async function exportMemberAccountPromiseAgendaCsv(params = {}) {
  const { data } = await api.get('/pos/member-account/promise-agenda/export', {
    params,
    responseType: 'blob'
  });
  return data;
}

export async function bulkMarkPromiseAgendaContacted() {
  const { data } = await api.post('/pos/member-account/promise-agenda/bulk-contacted');
  return payload(data);
}

export async function getOverduePromiseWhatsAppLinks(params = {}) {
  const { data } = await api.get('/pos/member-account/promise-agenda/overdue-whatsapp-links', { params });
  return payload(data);
}

export async function exportOverduePromiseWhatsAppLinksCsv(params = {}) {
  const { data } = await api.get('/pos/member-account/promise-agenda/overdue-whatsapp-links/export', {
    params,
    responseType: 'blob'
  });
  return data;
}

export async function settleMemberAccountCharge(id, body = {}) {
  const { data } = await api.post(`/pos/member-account/charges/${id}/settle`, body);
  return payload(data);
}

export async function autoSettleMemberAccountCharges(body = {}) {
  const { data } = await api.post('/pos/member-account/auto-settle', body);
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

export async function getCashByOperatorReport(params = {}) {
  const { data } = await api.get('/pos/reports/cash-by-operator', { params });
  return payload(data);
}

export async function listPosAudit(params = {}) {
  const { data } = await api.get('/pos/audit', { params });
  return payload(data);
}

export async function exportPosAuditCsv(params = {}) {
  const { data } = await api.get('/pos/audit/export', {
    params,
    responseType: 'blob'
  });
  return data;
}

export async function getPosAlerts(params = {}) {
  const { data } = await api.get('/pos/alerts', { params });
  return payload(data);
}

export async function getPosAlertNotifyLink(params = {}) {
  const { data } = await api.get('/pos/alerts/notify-link', { params });
  return payload(data);
}

export async function notifyCriticalPosAlert(body = {}) {
  const { data } = await api.post('/pos/alerts/notify-critical', body);
  return payload(data);
}

export async function listPosAlertDispatchHistory(params = {}) {
  const { data } = await api.get('/pos/alerts/dispatch-history', { params });
  return payload(data);
}

export async function exportPosAlertDispatchHistoryCsv(params = {}) {
  const { data } = await api.get('/pos/alerts/dispatch-history/export', {
    params,
    responseType: 'blob'
  });
  return data;
}

export async function getPosAlertsStatus(params = {}) {
  const { data } = await api.get('/pos/alerts/status', { params });
  return payload(data);
}

export async function listPosAlertsCronHistory(params = {}) {
  const { data } = await api.get('/pos/alerts/cron-history', { params });
  return payload(data);
}

export async function listPosAlertContacts() {
  const { data } = await api.get('/pos/alerts/contacts');
  return payload(data);
}

export async function createPosAlertContact(body = {}) {
  const { data } = await api.post('/pos/alerts/contacts', body);
  return payload(data);
}

export async function updatePosAlertContact(id, body = {}) {
  const { data } = await api.patch(`/pos/alerts/contacts/${id}`, body);
  return payload(data);
}

export async function deletePosAlertContact(id) {
  const { data } = await api.delete(`/pos/alerts/contacts/${id}`);
  return payload(data);
}

export async function getCashSessionReport(id) {
  const { data } = await api.get(`/pos/cash-sessions/${id}/report`);
  return payload(data);
}

export async function getPosZCloseReport(params = {}) {
  const { data } = await api.get('/pos/reports/z-close', { params });
  return payload(data);
}

export async function exportPosZCloseCsv(params = {}) {
  const { data } = await api.get('/pos/reports/z-close/export', {
    params,
    responseType: 'blob'
  });
  return data;
}
