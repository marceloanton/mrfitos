import { useEffect, useMemo, useState } from 'react';
import {
  exportBillingFunnelCsv,
  exportBillingSessionsCsv,
  exportTenantRankingCsvWithLocalFallback,
  getBillingFunnel,
  getBillingFunnelExportUrl,
  getBillingSessions,
  getBillingSessionsExportUrl,
  getTenantConversionRanking
} from '../services/adminBillingService';
import { getAdminTrackingSummary } from '../services/adminTrackingService';

function statusBadgeClass(status) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'approved') return 'bg-emerald-100 text-emerald-700';
  if (normalized === 'pending') return 'bg-amber-100 text-amber-700';
  if (normalized === 'rejected' || normalized === 'failed') return 'bg-rose-100 text-rose-700';
  if (normalized === 'expired') return 'bg-slate-200 text-slate-700';
  return 'bg-slate-100 text-slate-600';
}

function toInt(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeSessionsResponse(payload) {
  const rows = payload?.items ?? payload?.sessions ?? payload?.data ?? [];
  const meta = payload?.meta ?? payload?.pagination ?? {};
  return {
    rows: Array.isArray(rows) ? rows : [],
    total: toInt(meta.total ?? payload?.total ?? 0),
    page: toInt(meta.page ?? payload?.page ?? 1, 1),
    perPage: toInt(meta.per_page ?? meta.perPage ?? payload?.per_page ?? payload?.perPage ?? 10, 10),
    totalPages: toInt(meta.total_pages ?? meta.totalPages ?? payload?.total_pages ?? 1, 1)
  };
}

function normalizeFunnel(payload) {
  return {
    total_sessions: toInt(payload?.total_sessions ?? payload?.sessions_total ?? 0),
    approved_sessions: toInt(payload?.approved_sessions ?? payload?.approved ?? 0),
    pending_sessions: toInt(payload?.pending_sessions ?? payload?.pending ?? 0),
    approval_rate: Number(payload?.approval_rate ?? payload?.conversion_rate ?? payload?.approved_rate ?? 0)
  };
}

function toMoney(amount, currency = 'USD') {
  const num = Number(amount ?? 0);
  if (!Number.isFinite(num)) return '-';
  return `${currency} ${num.toFixed(2)}`;
}

function csvSafe(value) {
  const raw = String(value ?? '');
  const escaped = raw.replace(/"/g, '""');
  return `"${escaped}"`;
}

const TRACKING_EVENTS = [
  { key: 'upgrade_banner_click', label: 'Banner click' },
  { key: 'upgrade_badge_click', label: 'Badge click' },
  { key: 'upgrade_pay_now_click', label: 'Pay now click' },
  { key: 'upgrade_recommended_cta_click', label: 'Recommended CTA click' }
];
const MIN_SAMPLE_CHECKOUTS = 10;
const RECOMMENDED_CTA_FLOWS = [
  { key: 'plan_pro', label: 'Plan Pro' },
  { key: 'plan_scale', label: 'Plan Scale' },
  { key: 'addon_whatsapp', label: 'Add-on WhatsApp' }
];
const OPPORTUNITY_PREFS_KEY = 'admin-billing-opportunity-prefs-v1';

function normalizeTrackingSummary(payload) {
  const totals = payload?.event_totals ?? payload?.totals ?? payload?.events ?? {};
  const dailySource = payload?.daily ?? payload?.daily_events ?? payload?.items ?? [];
  const daily = Array.isArray(dailySource)
    ? dailySource.map((row) => ({
        date: String(row?.date ?? row?.day ?? row?.event_date ?? '-'),
        event: String(row?.event_name ?? row?.event ?? '-'),
        count: toInt(row?.count ?? row?.total ?? row?.qty ?? 0)
      }))
    : [];

  return {
    totals: {
      upgrade_banner_click: toInt(totals?.upgrade_banner_click ?? 0),
      upgrade_badge_click: toInt(totals?.upgrade_badge_click ?? 0),
      upgrade_pay_now_click: toInt(totals?.upgrade_pay_now_click ?? 0),
      upgrade_recommended_cta_click: toInt(totals?.upgrade_recommended_cta_click ?? 0)
    },
    daily,
    byContext: payload?.by_context ?? {},
    rawTotals: totals
  };
}

function buildCompositeKpi(funnelData, trackingData) {
  const clicks =
    toInt(trackingData?.totals?.upgrade_banner_click) +
    toInt(trackingData?.totals?.upgrade_badge_click) +
    toInt(trackingData?.totals?.upgrade_pay_now_click) +
    toInt(trackingData?.totals?.upgrade_recommended_cta_click);
  const checkoutSessions = toInt(funnelData?.total_sessions);
  const approved = toInt(funnelData?.approved_sessions);
  const ctrUpgrade = checkoutSessions > 0 ? (clicks / checkoutSessions) * 100 : 0;

  return {
    clicks,
    checkoutSessions,
    approved,
    ctrUpgrade
  };
}

function buildContextKpi(contextTotals = {}) {
  const clicks =
    toInt(contextTotals?.upgrade_banner_click) +
    toInt(contextTotals?.upgrade_badge_click) +
    toInt(contextTotals?.upgrade_pay_now_click) +
    toInt(contextTotals?.upgrade_recommended_cta_click);
  const checkoutSessions = toInt(contextTotals?.checkout_created);
  const approved = toInt(contextTotals?.approved);
  const ctrUpgrade = checkoutSessions > 0 ? (clicks / checkoutSessions) * 100 : 0;
  const checkoutToApproved = checkoutSessions > 0 ? (approved / checkoutSessions) * 100 : 0;
  const clickToApproved = clicks > 0 ? (approved / clicks) * 100 : 0;
  const lowSample = checkoutSessions < MIN_SAMPLE_CHECKOUTS;
  return { clicks, checkoutSessions, approved, ctrUpgrade, checkoutToApproved, clickToApproved, lowSample };
}

function buildOpportunityScore(row) {
  const checkouts = toInt(row?.checkout_sessions);
  const approvedRate = Number(row?.checkout_to_approved_rate ?? 0);
  const pendingGap = Math.max(0, 100 - approvedRate);
  const weightedVolume = Math.min(100, checkouts * 5);
  const score = Math.round((pendingGap * 0.7) + (weightedVolume * 0.3));
  return Math.max(0, Math.min(100, score));
}

function buildCommercialRecommendation(row) {
  const score = buildOpportunityScore(row);
  const checkouts = toInt(row?.checkout_sessions);
  const approvedRate = Number(row?.checkout_to_approved_rate ?? 0);
  if (score >= 75 && checkouts >= 8) {
    return { code: 'plan_scale', label: 'Ofrecer Plan Scale', tone: 'bg-violet-100 text-violet-800' };
  }
  if (score >= 60 && approvedRate >= 25) {
    return { code: 'plan_pro', label: 'Ofrecer Plan Pro', tone: 'bg-indigo-100 text-indigo-800' };
  }
  return { code: 'addon_whatsapp', label: 'Ofrecer Add-on WhatsApp', tone: 'bg-emerald-100 text-emerald-800' };
}

export default function AdminBillingPage() {
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

  const [filters, setFilters] = useState({
    tenant_id: '',
    status: '',
    from: monthStart,
    to: today,
    page: 1,
    per_page: 10
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [exportError, setExportError] = useState('');
  const [funnel, setFunnel] = useState(normalizeFunnel({}));
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, perPage: 10, totalPages: 1 });
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState('');
  const [trackingSummary, setTrackingSummary] = useState(
    normalizeTrackingSummary({})
  );
  const [globalComposite, setGlobalComposite] = useState(
    buildCompositeKpi(normalizeFunnel({}), normalizeTrackingSummary({}))
  );
  const [rankingLoading, setRankingLoading] = useState(false);
  const [rankingError, setRankingError] = useState('');
  const [tenantRanking, setTenantRanking] = useState([]);
  const [showOnlyHighOpportunity, setShowOnlyHighOpportunity] = useState(false);
  const [campaignMessage, setCampaignMessage] = useState('');
  const [opportunityThreshold, setOpportunityThreshold] = useState(60);
  const [rankingSortBy, setRankingSortBy] = useState('score');
  const [rankingSortDir, setRankingSortDir] = useState('desc');

  const applyQuickRange = (days) => {
    const safeDays = Math.max(1, Number(days || 1));
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (safeDays - 1));
    const next = {
      ...filters,
      from: start.toISOString().slice(0, 10),
      to: end.toISOString().slice(0, 10),
      page: 1
    };
    setFilters(next);
    void Promise.all([loadData(next), loadTrackingSummary(next), loadGlobalComposite(next), loadTenantRanking(next)]);
  };

  const cards = useMemo(() => {
    const conversion = Number.isFinite(funnel.approval_rate) ? funnel.approval_rate : 0;
    return [
      { label: 'Sesiones totales', value: funnel.total_sessions },
      { label: 'Aprobadas', value: funnel.approved_sessions },
      { label: 'Pendientes', value: funnel.pending_sessions },
      { label: 'Conversión', value: `${conversion.toFixed(1)}%` }
    ];
  }, [funnel]);

  const alertConfig = useMemo(() => {
    const rate = Number.isFinite(funnel.approval_rate) ? funnel.approval_rate : 0;
    if (rate < 35) {
      return {
        className: 'bg-rose-50 border-rose-200 text-rose-800',
        text: `Alerta crítica: conversión baja (${rate.toFixed(1)}%). Revisá rechazos en checkout, método de pago y UX del upgrade.`
      };
    }
    if (rate >= 35 && rate < 55) {
      return {
        className: 'bg-amber-50 border-amber-200 text-amber-800',
        text: `Alerta moderada: conversión en zona de riesgo (${rate.toFixed(1)}%). Probá optimizar oferta, pricing y seguimiento de pendientes.`
      };
    }
    return null;
  }, [funnel.approval_rate]);

  const buildExportParams = () => ({
    tenant_id: filters.tenant_id || undefined,
    status: filters.status || undefined,
    from: filters.from || undefined,
    to: filters.to || undefined,
    page: filters.page,
    per_page: filters.per_page
  });

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const onExportHighOpportunityCsv = () => {
    if (highOpportunityRows.length === 0) return;
    const sorted = [...highOpportunityRows].sort((a, b) => buildOpportunityScore(b) - buildOpportunityScore(a));
    const headers = [
      'tenant_id',
      'tenant_name',
      'score',
      'clicks',
      'checkout_sessions',
      'approved_sessions',
      'checkout_to_approved_rate',
      'click_to_approved_rate',
      'partial_historical_data'
    ];
    const rowsCsv = sorted.map((row) => [
      row.tenant_id,
      row.tenant_name ?? `Tenant ${row.tenant_id}`,
      buildOpportunityScore(row),
      row.clicks ?? 0,
      row.checkout_sessions ?? 0,
      row.approved_sessions ?? 0,
      Number(row.checkout_to_approved_rate ?? 0).toFixed(2),
      Number(row.click_to_approved_rate ?? 0).toFixed(2),
      row.partial_historical_data ? 'yes' : 'no'
    ]);
    const content = [
      headers.map(csvSafe).join(','),
      ...rowsCsv.map((line) => line.map(csvSafe).join(','))
    ].join('\n');
    downloadBlob(new Blob([content], { type: 'text/csv;charset=utf-8;' }), `billing_high_opportunity_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const onExportSessions = async () => {
    setExportError('');
    try {
      const params = buildExportParams();
      const blob = await exportBillingSessionsCsv(params);
      downloadBlob(blob, 'billing_sessions.csv');
    } catch (err) {
      setExportError(err?.response?.data?.message ?? 'No se pudo exportar sesiones CSV');
    }
  };

  const onExportFunnel = async () => {
    setExportError('');
    try {
      const params = buildExportParams();
      const blob = await exportBillingFunnelCsv(params);
      downloadBlob(blob, 'billing_funnel.csv');
    } catch (err) {
      setExportError(err?.response?.data?.message ?? 'No se pudo exportar funnel CSV');
    }
  };

  const onExportTenantRanking = async () => {
    setExportError('');
    try {
      const blob = await exportTenantRankingCsvWithLocalFallback({
        from: filters.from || undefined,
        to: filters.to || undefined,
        limit: 100
      });
      downloadBlob(blob, 'billing_tenant_ranking.csv');
    } catch (err) {
      setExportError(err?.message ?? err?.response?.data?.message ?? 'No se pudo exportar ranking de tenants CSV');
    }
  };

  const loadTrackingSummary = async (nextFilters = filters) => {
    setTrackingLoading(true);
    setTrackingError('');
    try {
      const payload = await getAdminTrackingSummary({
        tenant_id: nextFilters.tenant_id || undefined,
        from: nextFilters.from || undefined,
        to: nextFilters.to || undefined
      });
      setTrackingSummary(normalizeTrackingSummary(payload));
    } catch (err) {
      setTrackingSummary(normalizeTrackingSummary({}));
      setTrackingError(err?.response?.data?.message ?? 'No se pudo cargar tracking upgrade');
    } finally {
      setTrackingLoading(false);
    }
  };

  const loadGlobalComposite = async (nextFilters = filters) => {
    try {
      const baseParams = {
        status: nextFilters.status || undefined,
        from: nextFilters.from || undefined,
        to: nextFilters.to || undefined
      };
      const [globalFunnelData, globalTrackingData] = await Promise.all([
        getBillingFunnel(baseParams),
        getAdminTrackingSummary(baseParams)
      ]);
      setGlobalComposite(
        buildCompositeKpi(
          normalizeFunnel(globalFunnelData),
          normalizeTrackingSummary(globalTrackingData)
        )
      );
    } catch (_err) {
      setGlobalComposite(buildCompositeKpi(normalizeFunnel({}), normalizeTrackingSummary({})));
    }
  };

  const loadData = async (nextFilters = filters) => {
    setLoading(true);
    setError('');
    try {
      const params = {
        tenant_id: nextFilters.tenant_id || undefined,
        status: nextFilters.status || undefined,
        from: nextFilters.from || undefined,
        to: nextFilters.to || undefined,
        page: nextFilters.page,
        per_page: nextFilters.per_page
      };

      const [funnelData, sessionsData] = await Promise.all([
        getBillingFunnel(params),
        getBillingSessions(params)
      ]);

      setFunnel(normalizeFunnel(funnelData));
      const parsed = normalizeSessionsResponse(sessionsData);
      setRows(parsed.rows);
      setMeta({
        total: parsed.total,
        page: parsed.page,
        perPage: parsed.perPage,
        totalPages: parsed.totalPages || 1
      });
    } catch (err) {
      setRows([]);
      setMeta({ total: 0, page: 1, perPage: filters.per_page, totalPages: 1 });
      setError(err?.response?.data?.message ?? 'No se pudo cargar analítica de billing');
    } finally {
      setLoading(false);
    }
  };

  const loadTenantRanking = async (nextFilters = filters) => {
    setRankingLoading(true);
    setRankingError('');
    try {
      const data = await getTenantConversionRanking({
        from: nextFilters.from || undefined,
        to: nextFilters.to || undefined,
        limit: 20
      });
      setTenantRanking(Array.isArray(data?.items) ? data.items : []);
    } catch (err) {
      setTenantRanking([]);
      setRankingError(err?.response?.data?.message ?? 'No se pudo cargar ranking de tenants');
    } finally {
      setRankingLoading(false);
    }
  };

  const onSubmitFilters = async () => {
    const next = { ...filters, page: 1 };
    setFilters(next);
    await Promise.all([loadData(next), loadTrackingSummary(next), loadGlobalComposite(next), loadTenantRanking(next)]);
  };

  const changePage = async (page) => {
    if (page < 1 || page > meta.totalPages || page === filters.page) return;
    const next = { ...filters, page };
    setFilters(next);
    await loadData(next);
  };

  const focusTenant = async (tenantId) => {
    const parsedTenantId = String(tenantId ?? '').trim();
    if (!parsedTenantId) return;
    const next = { ...filters, tenant_id: parsedTenantId, page: 1 };
    setFilters(next);
    await Promise.all([loadData(next), loadTrackingSummary(next), loadGlobalComposite(next)]);
  };

  const clearTenantFocus = async () => {
    const next = { ...filters, tenant_id: '', page: 1 };
    setFilters(next);
    await Promise.all([loadData(next), loadTrackingSummary(next), loadGlobalComposite(next)]);
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem(OPPORTUNITY_PREFS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const threshold = Number(parsed?.opportunityThreshold ?? 60);
        if (Number.isFinite(threshold) && threshold >= 40 && threshold <= 90) {
          setOpportunityThreshold(threshold);
        }
        setShowOnlyHighOpportunity(Boolean(parsed?.showOnlyHighOpportunity));
      }
    } catch {
      // ignore invalid persisted prefs
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        OPPORTUNITY_PREFS_KEY,
        JSON.stringify({ opportunityThreshold, showOnlyHighOpportunity })
      );
    } catch {
      // non-blocking persistence
    }
  }, [opportunityThreshold, showOnlyHighOpportunity]);

  useEffect(() => {
    loadData(filters);
    loadTrackingSummary(filters);
    loadGlobalComposite(filters);
    loadTenantRanking(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tenantComposite = useMemo(
    () => buildCompositeKpi(funnel, trackingSummary),
    [funnel, trackingSummary]
  );

  const hasTenantFilter = String(filters.tenant_id || '').trim().length > 0;
  const adminContextKpi = useMemo(
    () => buildContextKpi(trackingSummary.byContext?.admin_subscription ?? {}),
    [trackingSummary.byContext]
  );
  const selfServiceContextKpi = useMemo(
    () => buildContextKpi(trackingSummary.byContext?.self_service_upgrade ?? {}),
    [trackingSummary.byContext]
  );
  const recommendedCtaKpis = useMemo(
    () =>
      RECOMMENDED_CTA_FLOWS.map((flow) => {
        const clickKey = `upgrade_recommended_cta_click_${flow.key}`;
        const checkoutKey = `checkout_created_recommended_${flow.key}`;
        const clicks = toInt(trackingSummary.rawTotals?.[clickKey] ?? 0);
        const checkouts = toInt(trackingSummary.rawTotals?.[checkoutKey] ?? 0);
        const conversion = clicks > 0 ? (checkouts / clicks) * 100 : 0;
        return { ...flow, clicks, checkouts, conversion };
      }),
    [trackingSummary.rawTotals]
  );
  const rankingRows = useMemo(() => {
    const sorted = [...tenantRanking].sort((a, b) => {
      const scoreA = buildOpportunityScore(a);
      const scoreB = buildOpportunityScore(b);
      const mapValue = (row, score) => {
        if (rankingSortBy === 'clicks') return Number(row.clicks ?? 0);
        if (rankingSortBy === 'checkouts') return Number(row.checkout_sessions ?? 0);
        if (rankingSortBy === 'approved') return Number(row.approved_sessions ?? 0);
        if (rankingSortBy === 'checkout_to_approved_rate') return Number(row.checkout_to_approved_rate ?? 0);
        return score;
      };
      const valueA = mapValue(a, scoreA);
      const valueB = mapValue(b, scoreB);
      return rankingSortDir === 'asc' ? valueA - valueB : valueB - valueA;
    });
    if (!showOnlyHighOpportunity) return sorted;
    return sorted.filter((row) => buildOpportunityScore(row) >= opportunityThreshold);
  }, [tenantRanking, showOnlyHighOpportunity, opportunityThreshold, rankingSortBy, rankingSortDir]);
  const highOpportunityRows = useMemo(
    () => tenantRanking.filter((row) => buildOpportunityScore(row) >= opportunityThreshold),
    [tenantRanking, opportunityThreshold]
  );
  const recommendationSummary = useMemo(() => {
    const base = { plan_scale: 0, plan_pro: 0, addon_whatsapp: 0 };
    for (const row of highOpportunityRows) {
      const recommendation = buildCommercialRecommendation(row);
      if (base[recommendation.code] != null) base[recommendation.code] += 1;
    }
    return base;
  }, [highOpportunityRows]);
  const highOpportunitySummary = useMemo(() => {
    if (highOpportunityRows.length === 0) return null;
    const top = [...highOpportunityRows]
      .sort((a, b) => buildOpportunityScore(b) - buildOpportunityScore(a))
      .slice(0, 10);
    const lines = top.map((row) => {
      const score = buildOpportunityScore(row);
      const rate = Number(row.checkout_to_approved_rate ?? 0).toFixed(2);
      return `- Tenant ${row.tenant_id} (${row.tenant_name ?? 'Sin nombre'}) | Score ${score} | Checkout->Approved ${rate}%`;
    });
    return [
      `Campana comercial Billing MRAnalytics`,
      `Periodo: ${filters.from || '-'} a ${filters.to || '-'}`,
      `Tenants prioritarios (${top.length} de ${highOpportunityRows.length}):`,
      ...lines,
      'Accion sugerida: contacto comercial + oferta de upgrade plan/add-on segun uso.'
    ].join('\n');
  }, [highOpportunityRows, filters.from, filters.to]);

  return (
    <section className="space-y-4">
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="text-2xl font-semibold text-slate-900">Admin Billing Analytics</h2>
        <p className="text-sm text-slate-600">Embudo de checkout y sesiones por tenant para control comercial.</p>
      </div>

      <div className="grid gap-3 rounded-xl bg-white p-4 shadow-sm md:grid-cols-6">
        <input
          className="rounded border border-slate-300 p-2"
          placeholder="tenant_id"
          value={filters.tenant_id}
          onChange={(e) => setFilters((s) => ({ ...s, tenant_id: e.target.value }))}
        />
        <select
          className="rounded border border-slate-300 p-2"
          value={filters.status}
          onChange={(e) => setFilters((s) => ({ ...s, status: e.target.value }))}
        >
          <option value="">Todos los estados</option>
          <option value="pending">pending</option>
          <option value="approved">approved</option>
          <option value="rejected">rejected</option>
          <option value="expired">expired</option>
        </select>
        <input
          className="rounded border border-slate-300 p-2"
          type="date"
          value={filters.from}
          onChange={(e) => setFilters((s) => ({ ...s, from: e.target.value }))}
        />
        <input
          className="rounded border border-slate-300 p-2"
          type="date"
          value={filters.to}
          onChange={(e) => setFilters((s) => ({ ...s, to: e.target.value }))}
        />
        <select
          className="rounded border border-slate-300 p-2"
          value={filters.per_page}
          onChange={(e) => setFilters((s) => ({ ...s, per_page: Number(e.target.value), page: 1 }))}
        >
          <option value={10}>10 por página</option>
          <option value={25}>25 por página</option>
          <option value={50}>50 por página</option>
        </select>
        <button className="rounded border border-slate-300 p-2 disabled:opacity-50" disabled={loading} onClick={onSubmitFilters}>
          {loading ? 'Consultando...' : 'Consultar'}
        </button>
      </div>
      <div className="flex flex-wrap gap-2 rounded-xl bg-white p-3 shadow-sm">
        <button
          className="rounded border border-slate-300 px-3 py-1 text-xs disabled:opacity-50"
          disabled={loading || trackingLoading || !hasTenantFilter}
          onClick={clearTenantFocus}
        >
          Limpiar foco tenant
        </button>
      </div>
      <div className="flex flex-wrap gap-2 rounded-xl bg-white p-3 shadow-sm">
        <button className="rounded border border-slate-300 px-3 py-1 text-xs disabled:opacity-50" disabled={loading} onClick={() => applyQuickRange(7)}>
          Ultimos 7 dias
        </button>
        <button className="rounded border border-slate-300 px-3 py-1 text-xs disabled:opacity-50" disabled={loading} onClick={() => applyQuickRange(30)}>
          Ultimos 30 dias
        </button>
        <button className="rounded border border-slate-300 px-3 py-1 text-xs disabled:opacity-50" disabled={loading} onClick={() => applyQuickRange(90)}>
          Ultimos 90 dias
        </button>
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl bg-white p-4 shadow-sm">
        <button className="rounded border border-slate-300 px-3 py-2 text-sm disabled:opacity-50" onClick={onExportSessions} disabled={loading}>
          Export Sessions CSV
        </button>
        <button className="rounded border border-slate-300 px-3 py-2 text-sm disabled:opacity-50" onClick={onExportFunnel} disabled={loading}>
          Export Funnel CSV
        </button>
        <button className="rounded border border-slate-300 px-3 py-2 text-sm disabled:opacity-50" onClick={onExportTenantRanking} disabled={loading}>
          Export Ranking CSV
        </button>
        <p className="text-xs text-slate-500">
          URLs: {getBillingSessionsExportUrl(buildExportParams())} · {getBillingFunnelExportUrl(buildExportParams())}
        </p>
      </div>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {exportError && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{exportError}</p>}
      {alertConfig && <p className={`rounded-lg border p-3 text-sm ${alertConfig.className}`}>{alertConfig.text}</p>}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <article key={card.label} className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{card.value}</p>
          </article>
        ))}
      </div>

      <div className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Tracking Upgrade</h3>
        {trackingError && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{trackingError}</p>}
        <div className="grid gap-3 md:grid-cols-3">
          {TRACKING_EVENTS.map((item) => (
            <article key={item.key} className="rounded-lg border border-slate-200 p-3">
              <p className="text-sm text-slate-500">{item.label}</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">
                {trackingLoading ? '...' : trackingSummary.totals[item.key]}
              </p>
            </article>
          ))}
        </div>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="p-3">Fecha</th>
                <th className="p-3">Evento</th>
                <th className="p-3">Cantidad</th>
              </tr>
            </thead>
            <tbody>
              {trackingLoading ? (
                <tr>
                  <td className="p-3 text-slate-500" colSpan={3}>Cargando tracking...</td>
                </tr>
              ) : trackingSummary.daily.length === 0 ? (
                <tr>
                  <td className="p-3 text-slate-500" colSpan={3}>Sin eventos</td>
                </tr>
              ) : (
                trackingSummary.daily.map((row, index) => (
                  <tr key={`${row.date}-${row.event}-${index}`} className="border-t border-slate-100">
                    <td className="p-3">{row.date}</td>
                    <td className="p-3">{row.event}</td>
                    <td className="p-3">{row.count}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">KPI compuesto: funnel + tracking</h3>
        <div className={`grid gap-3 ${hasTenantFilter ? 'md:grid-cols-2' : 'md:grid-cols-1'}`}>
          <article className="rounded-lg border border-slate-200 p-3">
            <p className="text-sm text-slate-500">Global</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">
              CTR upgrade: {globalComposite.ctrUpgrade.toFixed(2)}%
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Embudo: {globalComposite.clicks} clicks → {globalComposite.checkoutSessions} checkout sessions → {globalComposite.approved} approved
            </p>
          </article>
          {hasTenantFilter && (
            <article className="rounded-lg border border-slate-200 p-3">
              <p className="text-sm text-slate-500">Tenant {filters.tenant_id}</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">
                CTR upgrade: {tenantComposite.ctrUpgrade.toFixed(2)}%
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Embudo: {tenantComposite.clicks} clicks → {tenantComposite.checkoutSessions} checkout sessions → {tenantComposite.approved} approved
              </p>
            </article>
          )}
        </div>
      </div>

      <div className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Comparativa por canal</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <article className="rounded-lg border border-slate-200 p-3">
            <p className="text-sm text-slate-500">admin_subscription</p>
            <p className="mt-1 text-sm text-slate-700">
              Clicks: <span className="font-semibold">{adminContextKpi.clicks}</span> · Checkout: <span className="font-semibold">{adminContextKpi.checkoutSessions}</span> · Approved: <span className="font-semibold">{adminContextKpi.approved}</span>
            </p>
            <p className="mt-2 text-sm text-slate-600">
              CTR: {adminContextKpi.ctrUpgrade.toFixed(2)}% · Checkout→Approved: {adminContextKpi.checkoutToApproved.toFixed(2)}% · Click→Approved: {adminContextKpi.clickToApproved.toFixed(2)}%
            </p>
            {adminContextKpi.lowSample && (
              <p className="mt-2 rounded bg-amber-50 px-2 py-1 text-xs text-amber-800">
                Muestra insuficiente ({adminContextKpi.checkoutSessions} checkouts). Tomar decisiones con cautela.
              </p>
            )}
          </article>
          <article className="rounded-lg border border-slate-200 p-3">
            <p className="text-sm text-slate-500">self_service_upgrade</p>
            <p className="mt-1 text-sm text-slate-700">
              Clicks: <span className="font-semibold">{selfServiceContextKpi.clicks}</span> · Checkout: <span className="font-semibold">{selfServiceContextKpi.checkoutSessions}</span> · Approved: <span className="font-semibold">{selfServiceContextKpi.approved}</span>
            </p>
            <p className="mt-2 text-sm text-slate-600">
              CTR: {selfServiceContextKpi.ctrUpgrade.toFixed(2)}% · Checkout→Approved: {selfServiceContextKpi.checkoutToApproved.toFixed(2)}% · Click→Approved: {selfServiceContextKpi.clickToApproved.toFixed(2)}%
            </p>
            {selfServiceContextKpi.lowSample && (
              <p className="mt-2 rounded bg-amber-50 px-2 py-1 text-xs text-amber-800">
                Muestra insuficiente ({selfServiceContextKpi.checkoutSessions} checkouts). Tomar decisiones con cautela.
              </p>
            )}
          </article>
        </div>
      </div>

      <div className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Conversión CTA recomendado</h3>
        <div className="grid gap-3 md:grid-cols-3">
          {recommendedCtaKpis.map((item) => (
            <article key={item.key} className="rounded-lg border border-slate-200 p-3">
              <p className="text-sm text-slate-500">{item.label}</p>
              <p className="mt-1 text-sm text-slate-700">
                Clicks: <span className="font-semibold">{item.clicks}</span> · Checkouts: <span className="font-semibold">{item.checkouts}</span>
              </p>
              <p className="mt-2 text-xl font-semibold text-slate-900">{item.conversion.toFixed(2)}%</p>
              <p className="text-xs text-slate-500">Checkout / Click</p>
            </article>
          ))}
        </div>
      </div>

      <div className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Ranking de tenants por conversión</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <article className="rounded-lg border border-slate-200 p-3">
            <p className="text-xs text-slate-500">Recomendación Plan Scale</p>
            <p className="text-2xl font-semibold text-slate-900">{recommendationSummary.plan_scale}</p>
          </article>
          <article className="rounded-lg border border-slate-200 p-3">
            <p className="text-xs text-slate-500">Recomendación Plan Pro</p>
            <p className="text-2xl font-semibold text-slate-900">{recommendationSummary.plan_pro}</p>
          </article>
          <article className="rounded-lg border border-slate-200 p-3">
            <p className="text-xs text-slate-500">Recomendación Add-on WhatsApp</p>
            <p className="text-2xl font-semibold text-slate-900">{recommendationSummary.addon_whatsapp}</p>
          </article>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            id="only-high-opportunity"
            type="checkbox"
            checked={showOnlyHighOpportunity}
            onChange={(e) => setShowOnlyHighOpportunity(e.target.checked)}
          />
          <label htmlFor="only-high-opportunity" className="text-sm text-slate-700">
            Mostrar solo alta oportunidad (score ≥ {opportunityThreshold})
          </label>
          <label htmlFor="opportunity-threshold" className="text-xs text-slate-600">
            Umbral
          </label>
          <input
            id="opportunity-threshold"
            type="range"
            min={40}
            max={90}
            step={5}
            value={opportunityThreshold}
            onChange={(e) => setOpportunityThreshold(Number(e.target.value))}
          />
          <span className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">{opportunityThreshold}</span>
          <select
            className="rounded border border-slate-300 px-2 py-1 text-xs"
            value={rankingSortBy}
            onChange={(e) => setRankingSortBy(e.target.value)}
          >
            <option value="score">Orden: Score</option>
            <option value="clicks">Orden: Clicks</option>
            <option value="checkouts">Orden: Checkouts</option>
            <option value="approved">Orden: Approved</option>
            <option value="checkout_to_approved_rate">Orden: Conv Checkout→Approved</option>
          </select>
          <select
            className="rounded border border-slate-300 px-2 py-1 text-xs"
            value={rankingSortDir}
            onChange={(e) => setRankingSortDir(e.target.value)}
          >
            <option value="desc">DESC</option>
            <option value="asc">ASC</option>
          </select>
          <button
            className="rounded border border-slate-300 px-3 py-1 text-xs disabled:opacity-50"
            disabled={highOpportunityRows.length === 0}
            onClick={async () => {
              const ids = highOpportunityRows.map((row) => row.tenant_id).join(',');
              try {
                await navigator.clipboard.writeText(ids);
              } catch {
                // non-blocking
              }
            }}
          >
            Copiar IDs prioritarios ({highOpportunityRows.length})
          </button>
          <button
            className="rounded border border-emerald-300 px-3 py-1 text-xs text-emerald-700 disabled:opacity-50"
            disabled={!highOpportunitySummary}
            onClick={async () => {
              if (!highOpportunitySummary) return;
              setCampaignMessage(highOpportunitySummary);
              try {
                await navigator.clipboard.writeText(highOpportunitySummary);
              } catch {
                // non-blocking
              }
            }}
          >
            Copiar plan comercial
          </button>
          <button
            className="rounded border border-sky-300 px-3 py-1 text-xs text-sky-700 disabled:opacity-50"
            disabled={highOpportunityRows.length === 0}
            onClick={onExportHighOpportunityCsv}
          >
            Exportar alta oportunidad CSV
          </button>
          {highOpportunityRows.slice(0, 3).map((row) => (
            <button
              key={`quick-focus-${row.tenant_id}`}
              className="rounded border border-indigo-300 px-3 py-1 text-xs text-indigo-700 disabled:opacity-50"
              disabled={loading || trackingLoading}
              onClick={() => focusTenant(row.tenant_id)}
            >
              Ver tenant {row.tenant_id}
            </button>
          ))}
        </div>
        {campaignMessage && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <p className="text-xs font-semibold uppercase text-emerald-800">Plan Comercial Generado</p>
            <pre className="mt-2 whitespace-pre-wrap text-xs text-emerald-900">{campaignMessage}</pre>
          </div>
        )}
        {rankingError && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{rankingError}</p>}
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="p-3">Tenant</th>
                <th className="p-3">Nombre</th>
                <th className="p-3">Clicks</th>
                <th className="p-3">Checkouts</th>
                <th className="p-3">Approved</th>
                <th className="p-3">Checkout→Approved</th>
                <th className="p-3">Click→Approved</th>
                <th className="p-3">Oportunidad</th>
                <th className="p-3">Oferta sugerida</th>
                <th className="p-3">Acción</th>
              </tr>
            </thead>
            <tbody>
              {rankingLoading ? (
                <tr><td className="p-3 text-slate-500" colSpan={10}>Cargando ranking...</td></tr>
              ) : rankingRows.length === 0 ? (
                <tr><td className="p-3 text-slate-500" colSpan={10}>Sin datos</td></tr>
              ) : (
                rankingRows.map((row) => {
                  const score = buildOpportunityScore(row);
                  const highOpportunity = score >= opportunityThreshold;
                  const recommendation = buildCommercialRecommendation(row);
                  return (
                  <tr key={row.tenant_id} className={`border-t border-slate-100 ${highOpportunity ? 'bg-amber-50/50' : ''}`}>
                    <td className="p-3">{row.tenant_id}</td>
                    <td className="p-3">{row.tenant_name ?? `Tenant ${row.tenant_id}`}</td>
                    <td className="p-3">{row.clicks}</td>
                    <td className="p-3">{row.checkout_sessions}</td>
                    <td className="p-3">{row.approved_sessions}</td>
                    <td className="p-3">{Number(row.checkout_to_approved_rate ?? 0).toFixed(2)}%</td>
                    <td className="p-3">
                      {Number(row.click_to_approved_rate ?? 0).toFixed(2)}%
                      {row.partial_historical_data && (
                        <span className="ml-2 rounded bg-amber-50 px-2 py-0.5 text-xs text-amber-800">
                          historial parcial
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <span className={`rounded px-2 py-1 text-xs font-semibold ${highOpportunity ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'}`}>
                        {score}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`rounded px-2 py-1 text-xs font-semibold ${recommendation.tone}`}>
                        {recommendation.label}
                      </span>
                    </td>
                    <td className="p-3">
                      <button
                        className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 disabled:opacity-50"
                        disabled={loading || trackingLoading}
                        onClick={() => focusTenant(row.tenant_id)}
                      >
                        Ver detalle
                      </button>
                    </td>
                  </tr>
                )})
              )}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-500">
          Oportunidad: score 0-100 basado en volumen de checkouts y gap de aprobación. Mayor score = mayor prioridad comercial.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="p-3">Fecha</th>
              <th className="p-3">Tenant</th>
              <th className="p-3">Estado</th>
              <th className="p-3">Monto</th>
              <th className="p-3">Plan</th>
              <th className="p-3">Add-on</th>
              <th className="p-3">Referencia</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="p-4 text-slate-500" colSpan={7}>Cargando sesiones...</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="p-4 text-slate-500" colSpan={7}>Sin resultados</td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id ?? row.provider_reference} className="border-t border-slate-100">
                  <td className="p-3">{String(row.created_at ?? '').replace('T', ' ').slice(0, 19) || '-'}</td>
                  <td className="p-3">{row.tenant_id ?? '-'}</td>
                  <td className="p-3">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusBadgeClass(row.status)}`}>
                      {row.status ?? 'unknown'}
                    </span>
                  </td>
                  <td className="p-3">{toMoney(row.amount, row.currency ?? 'USD')}</td>
                  <td className="p-3">{row.plan_code ?? '-'}</td>
                  <td className="p-3">{row.addon_code ?? '-'}</td>
                  <td className="max-w-[280px] truncate p-3" title={row.provider_reference}>
                    {row.provider_reference ?? '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm">
        <p className="text-sm text-slate-600">
          Página {meta.page} de {meta.totalPages} · Total sesiones: {meta.total}
        </p>
        <div className="flex gap-2">
          <button
            className="rounded border border-slate-300 px-3 py-1 text-sm disabled:opacity-50"
            onClick={() => changePage(meta.page - 1)}
            disabled={loading || meta.page <= 1}
          >
            Anterior
          </button>
          <button
            className="rounded border border-slate-300 px-3 py-1 text-sm disabled:opacity-50"
            onClick={() => changePage(meta.page + 1)}
            disabled={loading || meta.page >= meta.totalPages}
          >
            Siguiente
          </button>
        </div>
      </div>
    </section>
  );
}
