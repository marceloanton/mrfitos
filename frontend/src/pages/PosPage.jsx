import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { adjustStock, autoSettleMemberAccountCharges, bulkMarkPromiseAgendaContacted, closeCashSession, createPosAlertContact, createPosProduct, createPosSale, deletePosAlertContact, exportMemberAccountCollectorRankingCsv, exportMemberAccountContactEffectivenessCsv, exportMemberAccountPromiseAgendaCsv, exportOverduePromiseWhatsAppLinksCsv, exportPosAlertDispatchHistoryCsv, exportPosAuditCsv, exportPosAutosettleKpiCsv, exportPosZCloseCsv, getCashByOperatorReport, getCashSessionReport, getMemberAccountAging, getMemberAccountCollectorRanking, getMemberAccountCollectionsKpiToday, getMemberAccountContactEffectiveness, getMemberAccountFollowupFunnel, getMemberAccountOverdueWhatsAppLink, getMemberAccountPromiseAgenda, getOpenCashSessionSummary, getOverduePromiseWhatsAppLinks, getPosAlertNotifyLink, getPosAlerts, getPosAlertsStatus, getPosAutosettleKpi, getPosConfig, getPosSaleReceipt, getPosSaleReceiptByNumber, getPosSummary, getPosZCloseReport, listCashSessions, listLowStockProducts, listMemberAccountCharges, listPosAlertContacts, listPosAlertDispatchHistory, listPosAlertsCronHistory, listPosAudit, listPosProducts, listPosSales, listStockMovements, notifyCriticalPosAlert, openCashSession, settleMemberAccountCharge, updateMemberAccountFollowupContactResult, updatePosAlertContact, updatePosConfig, upsertMemberAccountFollowup, voidPosSale } from '../services/posService';
import { useAuthStore } from '../stores/authStore';
import PosCashPanel from '../components/pos/PosCashPanel';
import PosControlPanel from '../components/pos/PosControlPanel';
import PosProductsStockPanel from '../components/pos/PosProductsStockPanel';
import PosSalesPanel from '../components/pos/PosSalesPanel';

export default function PosPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const user = useAuthStore((s) => s.user);
  const canSaleCreate = hasPermission('pos.sale.create') || hasPermission('payments.write');
  const canProductManage = hasPermission('pos.product.manage') || hasPermission('payments.write');
  const canStockManage = hasPermission('pos.stock.manage') || hasPermission('payments.write');
  const canCashManage = hasPermission('pos.cash.manage') || hasPermission('payments.write');
  const canVoid = hasPermission('pos.void') || hasPermission('payments.write');
  const canReportRead = hasPermission('pos.report.read') || hasPermission('payments.read');
  const canReportExport = hasPermission('pos.report.export') || hasPermission('payments.read');
  const [requireOpenCash, setRequireOpenCash] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [memberId, setMemberId] = useState('');
  const [itemName, setItemName] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [qty, setQty] = useState('1');
  const [unitPrice, setUnitPrice] = useState('');
  const [chargeMode, setChargeMode] = useState('immediate');
  const [paymentMethod, setPaymentMethod] = useState('transfer');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showCollectionsHub, setShowCollectionsHub] = useState(false);
  const [showRiskHub, setShowRiskHub] = useState(false);
  const [receptionMode, setReceptionMode] = useState(true);
  const [sales, setSales] = useState([]);
  const [charges, setCharges] = useState([]);
  const [autoSettleMethod, setAutoSettleMethod] = useState('transfer');
  const [autoSettleLimit, setAutoSettleLimit] = useState('50');
  const [autoSettleLoading, setAutoSettleLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [newProduct, setNewProduct] = useState({ code: '', name: '', price: '', stock_qty: '' });
  const [stockMovement, setStockMovement] = useState({ product_id: '', movement_type: 'in', qty: '', notes: '' });
  const [movements, setMovements] = useState([]);
  const [openCash, setOpenCash] = useState(null);
  const [cashSessions, setCashSessions] = useState([]);
  const [openingAmount, setOpeningAmount] = useState('');
  const [closingAmount, setClosingAmount] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [zCloseDate, setZCloseDate] = useState(new Date().toISOString().slice(0, 10));
  const [lowStockThreshold, setLowStockThreshold] = useState('5');
  const [lowStockItems, setLowStockItems] = useState([]);
  const [cashOperatorUserId, setCashOperatorUserId] = useState('');
  const [cashByOperator, setCashByOperator] = useState({ summary: null, operators: [] });
  const [auditRows, setAuditRows] = useState([]);
  const [auditFilters, setAuditFilters] = useState({
    date_from: '',
    date_to: '',
    action: '',
    user_id: ''
  });
  const [alertFilters, setAlertFilters] = useState({
    date_from: '',
    date_to: '',
    difference_threshold: '0',
    voids_threshold: '3'
  });
  const [posAlerts, setPosAlerts] = useState({ summary: null, high_cash_differences: [], unusual_voids_by_operator: [] });
  const [alertNotifyInfo, setAlertNotifyInfo] = useState(null);
  const [alertContacts, setAlertContacts] = useState([]);
  const [selectedAlertContactId, setSelectedAlertContactId] = useState('');
  const [newAlertContact, setNewAlertContact] = useState({ label: '', phone: '' });
  const [dispatchHistoryFilters, setDispatchHistoryFilters] = useState({ date_from: '', date_to: '' });
  const [dispatchHistoryRows, setDispatchHistoryRows] = useState([]);
  const [alertsStatus, setAlertsStatus] = useState(null);
  const [alertsCronHistoryRows, setAlertsCronHistoryRows] = useState([]);
  const [autosettleDateFrom, setAutosettleDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d.toISOString().slice(0, 10);
  });
  const [autosettleDateTo, setAutosettleDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [autosettleKpi, setAutosettleKpi] = useState({
    runs_count: 0,
    processed_total: 0,
    settled_total: 0,
    failed_total: 0,
    settled_amount_total: 0
  });
  const [memberAccountAging, setMemberAccountAging] = useState({
    overdue_total_count: 0,
    overdue_total_amount: 0,
    buckets: [],
    top_overdue_members: []
  });
  const [collectionsKpiToday, setCollectionsKpiToday] = useState({
    contacted_today_count: 0,
    contacted_today_unique_members: 0,
    recovered_today_count: 0,
    recovered_today_amount: 0
  });
  const [contactEffectivenessToday, setContactEffectivenessToday] = useState({
    touched_today_count: 0,
    responded_count: 0,
    no_response_count: 0,
    wrong_number_count: 0,
    promise_confirmed_count: 0,
    response_rate: 0,
    promise_confirmation_rate: 0
  });
  const [followupDateFrom, setFollowupDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d.toISOString().slice(0, 10);
  });
  const [followupDateTo, setFollowupDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [followupFunnel, setFollowupFunnel] = useState({
    contacted_count: 0,
    promise_count: 0,
    paid_count: 0
  });
  const [promiseAgenda, setPromiseAgenda] = useState({
    due_today_count: 0,
    overdue_count: 0,
    items: []
  });
  const [collectorRanking, setCollectorRanking] = useState([]);
  const [collectorRankingLimit, setCollectorRankingLimit] = useState('25');
  const [collectorRankingSortBy, setCollectorRankingSortBy] = useState('recovered_amount');
  const [collectorRankingSortDir, setCollectorRankingSortDir] = useState('desc');
  const [collectorRankingSummary, setCollectorRankingSummary] = useState({
    collectors_count: 0,
    total_recovered_amount: 0,
    total_commission_amount: 0,
    avg_recovered_per_collector: 0,
    commission_over_recovered_rate: 0,
    total_contacts_count: 0,
    top_collector_name: '',
    top_collector_recovered_amount: 0,
    top_collector_sort_metric: 'recovered_amount',
    top_collector_sort_value: 0
  });
  const [collectorCommissionRules, setCollectorCommissionRules] = useState(null);
  const [followupLoading, setFollowupLoading] = useState(false);
  const [contactEffectivenessExportLoading, setContactEffectivenessExportLoading] = useState(false);
  const [collectorRankingExportLoading, setCollectorRankingExportLoading] = useState(false);
  const [summary, setSummary] = useState({
    today_sales_count: 0,
    today_sales_total: 0,
    today_cash_collected: 0,
    pending_member_account_total: 0
  });
  const rankingFiltersHydratedRef = useRef(false);
  const collectorPrefsStorageKey = user
    ? `pos-collector-ranking-prefs-v1:${user.id || user.email || 'user'}:${user.gym_id || 'gym'}`
    : null;
  const receptionModeStorageKey = user
    ? `pos-reception-mode-v1:${user.id || user.email || 'user'}:${user.gym_id || 'gym'}`
    : null;
  const toFriendlyApiError = (err, fallbackMessage) => {
    const apiMessage = err?.response?.data?.message;
    if (apiMessage === 'date range must be <= 92 days') {
      return 'El rango de fechas no puede superar 92 días.';
    }
    if (apiMessage === 'Monthly POS sales limit reached for current plan. Upgrade required.') {
      return 'Alcanzaste el límite mensual de ventas POS de tu plan. Actualizá el plan para seguir vendiendo.';
    }
    return apiMessage || fallbackMessage;
  };
  const isRangeWithin92Days = (from, to) => {
    if (!from || !to) return true;
    const fromTime = new Date(`${from}T00:00:00`).getTime();
    const toTime = new Date(`${to}T00:00:00`).getTime();
    if (Number.isNaN(fromTime) || Number.isNaN(toTime)) return true;
    const rangeDays = Math.floor((toTime - fromTime) / 86400000) + 1;
    return rangeDays <= 92;
  };
  const isFollowupRangeOrderValid = !followupDateFrom || !followupDateTo || followupDateFrom <= followupDateTo;
  const isFollowupRangeLengthValid = isRangeWithin92Days(followupDateFrom, followupDateTo);
  const isFollowupRangeValid = isFollowupRangeOrderValid && isFollowupRangeLengthValid;
  const followupRangeValidationMessage = !isFollowupRangeOrderValid
    ? 'La fecha desde no puede ser mayor a la fecha hasta.'
    : !isFollowupRangeLengthValid
      ? 'El rango de fechas no puede superar 92 días.'
      : '';
  const validateFollowupRange = () => {
    if (!isFollowupRangeOrderValid) {
      setError('La fecha desde no puede ser mayor a la fecha hasta.');
      return false;
    }
    if (!isFollowupRangeLengthValid) {
      setError('El rango de fechas no puede superar 92 días.');
      return false;
    }
    return true;
  };
  const applyFollowupRangePreset = (days) => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - Math.max(0, days - 1));
    setFollowupDateFrom(from.toISOString().slice(0, 10));
    setFollowupDateTo(to.toISOString().slice(0, 10));
    setError('');
  };
  const collectorLeadLabel = collectorRankingSortDir === 'asc' ? 'Primer cobrador' : 'Top cobrador';
  const collectorSortMetricLabel = collectorRankingSortBy === 'response_rate'
    ? 'tasa de respuesta'
    : collectorRankingSortBy === 'contacts_count'
      ? 'contactos'
      : 'monto recuperado';
  const collectorSortDirectionLabel = collectorRankingSortDir === 'asc' ? 'menor a mayor' : 'mayor a menor';

  const load = async () => {
    if (!validateFollowupRange()) {
      return;
    }
    setFollowupLoading(true);
    try {
      const [salesData, chargesData, productsData, movementsData, openCashData, cashSessionsData, posConfig, summaryData, lowStockData, cashByOperatorData, auditData, alertsData, contactsData, dispatchHistoryData, alertsStatusData, alertsCronHistoryData, autosettleKpiData, memberAccountAgingData, collectionsKpiData, followupFunnelData, promiseAgendaData, contactEffectivenessData, collectorRankingData] = await Promise.all([
        listPosSales({ page: 1, per_page: 20 }),
        listMemberAccountCharges({ status: 'pending_auto_debit', page: 1, per_page: 20 }),
        listPosProducts(),
        listStockMovements({ page: 1, per_page: 20 }),
        getOpenCashSessionSummary(),
        listCashSessions({ page: 1, per_page: 10, user_id: cashOperatorUserId ? Number(cashOperatorUserId) : undefined }),
        getPosConfig(),
        getPosSummary(),
        listLowStockProducts({ threshold: Number(lowStockThreshold || 5) }),
        getCashByOperatorReport({ user_id: cashOperatorUserId ? Number(cashOperatorUserId) : undefined }),
        listPosAudit({
          page: 1,
          per_page: 20,
          date_from: auditFilters.date_from || undefined,
          date_to: auditFilters.date_to || undefined,
          action: auditFilters.action || undefined,
          user_id: auditFilters.user_id ? Number(auditFilters.user_id) : undefined
        }),
        getPosAlerts({
          date_from: alertFilters.date_from || undefined,
          date_to: alertFilters.date_to || undefined,
          difference_threshold: Number(alertFilters.difference_threshold || 0),
          voids_threshold: Number(alertFilters.voids_threshold || 3)
        }),
        listPosAlertContacts(),
        listPosAlertDispatchHistory({
          page: 1,
          per_page: 20,
          date_from: dispatchHistoryFilters.date_from || undefined,
          date_to: dispatchHistoryFilters.date_to || undefined
        }),
        getPosAlertsStatus(),
        listPosAlertsCronHistory({ page: 1, per_page: 10 }),
        getPosAutosettleKpi({
          date_from: autosettleDateFrom || undefined,
          date_to: autosettleDateTo || undefined
        }),
        getMemberAccountAging(),
        getMemberAccountCollectionsKpiToday(),
        getMemberAccountFollowupFunnel({
          date_from: followupDateFrom || undefined,
          date_to: followupDateTo || undefined
        }),
        getMemberAccountPromiseAgenda({ limit: 20 }),
        getMemberAccountContactEffectiveness({
          date_from: followupDateFrom || undefined,
          date_to: followupDateTo || undefined
        }),
        getMemberAccountCollectorRanking({
          date_from: followupDateFrom || undefined,
          date_to: followupDateTo || undefined,
          limit: Number(collectorRankingLimit || 25),
          sort_by: collectorRankingSortBy,
          sort_dir: collectorRankingSortDir
        })
      ]);
      setSales(Array.isArray(salesData?.items) ? salesData.items : []);
      setCharges(Array.isArray(chargesData?.items) ? chargesData.items : []);
      setProducts(productsData);
      setMovements(Array.isArray(movementsData?.items) ? movementsData.items : []);
      setOpenCash(openCashData?.open ? openCashData : null);
      setCashSessions(Array.isArray(cashSessionsData?.items) ? cashSessionsData.items : []);
      setRequireOpenCash(Boolean(posConfig?.require_open_cash));
      setSummary({
        today_sales_count: Number(summaryData?.today_sales_count ?? 0),
        today_sales_total: Number(summaryData?.today_sales_total ?? 0),
        today_cash_collected: Number(summaryData?.today_cash_collected ?? 0),
        pending_member_account_total: Number(summaryData?.pending_member_account_total ?? 0)
      });
      setLowStockItems(Array.isArray(lowStockData?.items) ? lowStockData.items : []);
      setCashByOperator({
        summary: cashByOperatorData?.summary ?? null,
        operators: Array.isArray(cashByOperatorData?.operators) ? cashByOperatorData.operators : []
      });
      setAuditRows(Array.isArray(auditData?.items) ? auditData.items : []);
      setPosAlerts({
        summary: alertsData?.summary ?? null,
        high_cash_differences: Array.isArray(alertsData?.high_cash_differences) ? alertsData.high_cash_differences : [],
        unusual_voids_by_operator: Array.isArray(alertsData?.unusual_voids_by_operator) ? alertsData.unusual_voids_by_operator : []
      });
      setAlertContacts(Array.isArray(contactsData?.items) ? contactsData.items : []);
      setDispatchHistoryRows(Array.isArray(dispatchHistoryData?.items) ? dispatchHistoryData.items : []);
      setAlertsStatus(alertsStatusData ?? null);
      setAlertsCronHistoryRows(Array.isArray(alertsCronHistoryData?.items) ? alertsCronHistoryData.items : []);
      setAutosettleKpi({
        runs_count: Number(autosettleKpiData?.runs_count ?? 0),
        processed_total: Number(autosettleKpiData?.processed_total ?? 0),
        settled_total: Number(autosettleKpiData?.settled_total ?? 0),
        failed_total: Number(autosettleKpiData?.failed_total ?? 0),
        settled_amount_total: Number(autosettleKpiData?.settled_amount_total ?? 0)
      });
      setMemberAccountAging({
        overdue_total_count: Number(memberAccountAgingData?.overdue_total_count ?? 0),
        overdue_total_amount: Number(memberAccountAgingData?.overdue_total_amount ?? 0),
        buckets: Array.isArray(memberAccountAgingData?.buckets) ? memberAccountAgingData.buckets : [],
        top_overdue_members: Array.isArray(memberAccountAgingData?.top_overdue_members) ? memberAccountAgingData.top_overdue_members : []
      });
      setCollectionsKpiToday({
        contacted_today_count: Number(collectionsKpiData?.contacted_today_count ?? 0),
        contacted_today_unique_members: Number(collectionsKpiData?.contacted_today_unique_members ?? 0),
        recovered_today_count: Number(collectionsKpiData?.recovered_today_count ?? 0),
        recovered_today_amount: Number(collectionsKpiData?.recovered_today_amount ?? 0)
      });
      setFollowupFunnel({
        contacted_count: Number(followupFunnelData?.contacted_count ?? 0),
        promise_count: Number(followupFunnelData?.promise_count ?? 0),
        paid_count: Number(followupFunnelData?.paid_count ?? 0)
      });
      setPromiseAgenda({
        due_today_count: Number(promiseAgendaData?.due_today_count ?? 0),
        overdue_count: Number(promiseAgendaData?.overdue_count ?? 0),
        items: Array.isArray(promiseAgendaData?.items) ? promiseAgendaData.items : []
      });
      setContactEffectivenessToday({
        touched_today_count: Number(contactEffectivenessData?.touched_count ?? 0),
        responded_count: Number(contactEffectivenessData?.responded_count ?? 0),
        no_response_count: Number(contactEffectivenessData?.no_response_count ?? 0),
        wrong_number_count: Number(contactEffectivenessData?.wrong_number_count ?? 0),
        promise_confirmed_count: Number(contactEffectivenessData?.promise_confirmed_count ?? 0),
        response_rate: Number(contactEffectivenessData?.response_rate ?? 0),
        promise_confirmation_rate: Number(contactEffectivenessData?.promise_confirmation_rate ?? 0)
      });
      setCollectorRanking(Array.isArray(collectorRankingData?.items) ? collectorRankingData.items : []);
      setCollectorRankingSummary({
        collectors_count: Number(collectorRankingData?.summary?.collectors_count ?? 0),
        total_recovered_amount: Number(collectorRankingData?.summary?.total_recovered_amount ?? 0),
        total_commission_amount: Number(collectorRankingData?.summary?.total_commission_amount ?? 0),
        avg_recovered_per_collector: Number(collectorRankingData?.summary?.avg_recovered_per_collector ?? 0),
        commission_over_recovered_rate: Number(collectorRankingData?.summary?.commission_over_recovered_rate ?? 0),
        total_contacts_count: Number(collectorRankingData?.summary?.total_contacts_count ?? 0),
        top_collector_name: String(collectorRankingData?.summary?.top_collector_name ?? ''),
        top_collector_recovered_amount: Number(collectorRankingData?.summary?.top_collector_recovered_amount ?? 0),
        top_collector_sort_metric: String(collectorRankingData?.summary?.top_collector_sort_metric ?? 'recovered_amount'),
        top_collector_sort_value: Number(collectorRankingData?.summary?.top_collector_sort_value ?? 0)
      });
      setCollectorCommissionRules(collectorRankingData?.commission_rules ?? null);
    } catch (err) {
      setError(toFriendlyApiError(err, 'No se pudieron actualizar los indicadores de seguimiento.'));
    } finally {
      setFollowupLoading(false);
    }
  };

  useEffect(() => {
    if (!receptionModeStorageKey) return;
    try {
      const raw = localStorage.getItem(receptionModeStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (typeof parsed?.enabled === 'boolean') {
        setReceptionMode(parsed.enabled);
      }
    } catch {
      // ignore corrupted localStorage
    }
  }, [receptionModeStorageKey]);

  useEffect(() => {
    if (!receptionModeStorageKey) return;
    try {
      localStorage.setItem(receptionModeStorageKey, JSON.stringify({ enabled: receptionMode }));
    } catch {
      // ignore write failures
    }
  }, [receptionModeStorageKey, receptionMode]);

  useEffect(() => {
    const path = location.pathname;
    if (path === '/pos/control') {
      setShowCollectionsHub(!receptionMode);
      setShowRiskHub(true);
      window.setTimeout(() => {
        document.getElementById('pos-control')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 30);
      return;
    }
    if (path === '/pos/caja') {
      setShowCollectionsHub(!receptionMode);
      setShowRiskHub(false);
      window.setTimeout(() => {
        document.getElementById('pos-caja')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 30);
      return;
    }
    if (path === '/pos/ventas') {
      setShowCollectionsHub(!receptionMode);
      setShowRiskHub(false);
      window.setTimeout(() => {
        document.getElementById('pos-ventas')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 30);
      return;
    }
    if (path === '/pos/productos') {
      setShowCollectionsHub(!receptionMode);
      setShowRiskHub(false);
      window.setTimeout(() => {
        document.getElementById('pos-productos')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 30);
      return;
    }
    setShowCollectionsHub(!receptionMode);
    setShowRiskHub(false);
  }, [location.pathname, receptionMode]);

  useEffect(() => {
    const onKeyDown = (event) => {
      const targetTag = event.target?.tagName?.toLowerCase();
      const isTypingContext = targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select' || event.target?.isContentEditable;
      if (isTypingContext) return;

      if (event.key === 'F2') {
        event.preventDefault();
        navigate('/pos/caja');
      }
      if (event.key === 'F3') {
        event.preventDefault();
        navigate('/pos/ventas');
      }
      if (event.key === 'F4') {
        event.preventDefault();
        navigate('/pos/productos');
      }
      if (event.key === 'F8') {
        event.preventDefault();
        navigate('/pos/control');
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navigate]);

  useEffect(() => {
    if (!collectorPrefsStorageKey) return;
    try {
      const raw = localStorage.getItem(collectorPrefsStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && ['10', '25', '50'].includes(String(parsed.limit ?? ''))) {
        setCollectorRankingLimit(String(parsed.limit));
      }
      if (parsed && ['recovered_amount', 'response_rate', 'contacts_count'].includes(String(parsed.sort_by ?? ''))) {
        setCollectorRankingSortBy(String(parsed.sort_by));
      }
      if (parsed && ['desc', 'asc'].includes(String(parsed.sort_dir ?? ''))) {
        setCollectorRankingSortDir(String(parsed.sort_dir));
      }
    } catch {
      // ignore broken local preferences
    }
    rankingFiltersHydratedRef.current = true;
  }, [collectorPrefsStorageKey]);

  useEffect(() => {
    if (!collectorPrefsStorageKey) return;
    localStorage.setItem(collectorPrefsStorageKey, JSON.stringify({
      limit: collectorRankingLimit,
      sort_by: collectorRankingSortBy,
      sort_dir: collectorRankingSortDir
    }));
  }, [collectorPrefsStorageKey, collectorRankingLimit, collectorRankingSortBy, collectorRankingSortDir]);

  useEffect(() => {
    if (!rankingFiltersHydratedRef.current) return;
    const timer = window.setTimeout(() => {
      load();
    }, 200);
    return () => window.clearTimeout(timer);
  }, [collectorRankingLimit, collectorRankingSortBy, collectorRankingSortDir]);

  const onAdjustStock = async () => {
    setError('');
    setMessage('');
    try {
      await adjustStock({
        product_id: Number(stockMovement.product_id || 0),
        movement_type: stockMovement.movement_type,
        qty: Number(stockMovement.qty || 0),
        notes: stockMovement.notes || undefined
      });
      setMessage('Movimiento de stock registrado.');
      setStockMovement({ product_id: '', movement_type: 'in', qty: '', notes: '' });
      await load();
    } catch (err) {
      setError(err?.response?.data?.message ?? 'No se pudo registrar movimiento de stock.');
    }
  };

  const onOpenCash = async () => {
    setError('');
    setMessage('');
    try {
      await openCashSession({ opening_amount: Number(openingAmount || 0) });
      setMessage('Caja abierta.');
      setOpeningAmount('');
      await load();
    } catch (err) {
      setError(err?.response?.data?.message ?? 'No se pudo abrir caja.');
    }
  };

  const onToggleRequireOpenCash = async (nextValue) => {
    setSavingConfig(true);
    setError('');
    try {
      const data = await updatePosConfig({ require_open_cash: nextValue });
      setRequireOpenCash(Boolean(data?.require_open_cash));
      setMessage(`Política POS actualizada: ${nextValue ? 'requiere caja abierta' : 'permite vender sin caja'}.`);
    } catch (err) {
      setError(err?.response?.data?.message ?? 'No se pudo actualizar la política POS.');
    } finally {
      setSavingConfig(false);
    }
  };

  const onCloseCash = async () => {
    setError('');
    setMessage('');
    try {
      const data = await closeCashSession({ closing_amount: Number(closingAmount || 0) });
      setMessage(`Caja cerrada. Diferencia: ${data.difference_amount}`);
      setClosingAmount('');
      await load();
    } catch (err) {
      setError(err?.response?.data?.message ?? 'No se pudo cerrar caja.');
    }
  };

  const onPrintCashReport = async (sessionId) => {
    setError('');
    try {
      const report = await getCashSessionReport(sessionId);
      const openedAt = report?.cash_session?.opened_at ?? '-';
      const closedAt = report?.cash_session?.closed_at ?? '-';
      const methods = report?.payments?.by_method ?? {};
      const sales = report?.pos_sales ?? {};
      const memberAccount = report?.member_account_settlements ?? {};
      const html = `
        <html>
          <head>
            <title>Cierre de Caja #${sessionId}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
              h1 { margin: 0 0 8px 0; font-size: 24px; }
              h2 { margin: 20px 0 8px 0; font-size: 16px; }
              .muted { color: #475569; font-size: 12px; margin-bottom: 16px; }
              table { border-collapse: collapse; width: 100%; margin-top: 8px; }
              th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; font-size: 13px; }
            </style>
          </head>
          <body>
            <h1>MRAnalytics POS - Cierre de Caja #${sessionId}</h1>
            <div class="muted">Apertura: ${openedAt} | Cierre: ${closedAt}</div>
            <h2>Resumen de Caja</h2>
            <table>
              <tr><th>Estado</th><td>${report?.cash_session?.status ?? '-'}</td></tr>
              <tr><th>Monto apertura</th><td>${report?.cash_session?.opening_amount ?? 0}</td></tr>
              <tr><th>Monto esperado</th><td>${report?.cash_session?.expected_amount ?? 0}</td></tr>
              <tr><th>Monto cierre</th><td>${report?.cash_session?.closing_amount ?? 0}</td></tr>
              <tr><th>Diferencia</th><td>${report?.cash_session?.difference_amount ?? 0}</td></tr>
            </table>
            <h2>Cobros por método</h2>
            <table>
              <tr><th>Efectivo</th><td>${methods.cash ?? 0}</td></tr>
              <tr><th>Transferencia</th><td>${methods.transfer ?? 0}</td></tr>
              <tr><th>Mercado Pago</th><td>${methods.mercadopago ?? 0}</td></tr>
              <tr><th>Tarjeta</th><td>${methods.card ?? 0}</td></tr>
              <tr><th>Otros</th><td>${methods.other ?? 0}</td></tr>
            </table>
            <h2>Ventas POS</h2>
            <table>
              <tr><th>Cantidad ventas</th><td>${sales.count ?? 0}</td></tr>
              <tr><th>Total vendido</th><td>${sales.total ?? 0}</td></tr>
            </table>
            <h2>Cuenta socio liquidada</h2>
            <table>
              <tr><th>Cantidad liquidaciones</th><td>${memberAccount.count ?? 0}</td></tr>
              <tr><th>Total liquidado</th><td>${memberAccount.total_amount ?? 0}</td></tr>
            </table>
          </body>
        </html>
      `;
      const w = window.open('', '_blank', 'noopener,noreferrer');
      if (!w) {
        setError('El navegador bloqueó la ventana de impresión.');
        return;
      }
      w.document.write(html);
      w.document.close();
      w.focus();
      w.print();
    } catch (err) {
      setError(err?.response?.data?.message ?? 'No se pudo generar el cierre imprimible.');
    }
  };

  const onPrintSaleTicket = async (saleId, paper = '58') => {
    setError('');
    try {
      const receipt = await getPosSaleReceipt(saleId);
      const sale = receipt?.sale ?? {};
      const member = receipt?.member ?? null;
      const payment = receipt?.payment ?? null;
      const items = Array.isArray(receipt?.items) ? receipt.items : [];
      const line = '-'.repeat(paper === '80' ? 48 : 32);
      const money = (value) => Number(value || 0).toFixed(2);
      const qtyFmt = (value) => Number(value || 0).toFixed(2);
      const itemLines = items.map((item) => {
        const name = String(item.item_name ?? '-');
        const qty = qtyFmt(item.qty);
        const unit = money(item.unit_price);
        const total = money(item.line_total);
        return `${name}\n${qty} x ${unit} = ${total}`;
      }).join('\n' + line + '\n');
      const html = `
        <html>
          <head>
            <title>Ticket POS ${sale.receipt_number ?? `#${saleId}`}</title>
            <style>
              @page { size: ${paper}mm auto; margin: 4mm; }
              body { font-family: "Courier New", monospace; font-size: ${paper === '80' ? '13px' : '12px'}; color: #111; white-space: pre-wrap; }
            </style>
          </head>
          <body>
MRFitOS / MRAnalytics
${sale.receipt_number ?? `POS-${sale.id ?? saleId}`}
Fecha: ${sale.created_at ?? '-'}
${line}
Cliente: ${member ? `${member.member_code ?? ''} ${member.first_name ?? ''} ${member.last_name ?? ''}` : 'Consumidor final'}
${line}
${itemLines || 'Sin items'}
${line}
Modo: ${sale.charge_mode ?? '-'}
Pago: ${payment ? `${payment.method ?? '-'} ${money(payment.amount)}` : 'Pendiente / cuenta socio'}
TOTAL: ${money(sale.total_amount)} ${sale.currency ?? ''}
${sale.notes ? `Nota: ${sale.notes}` : ''}
          </body>
        </html>
      `;
      const w = window.open('', '_blank', 'noopener,noreferrer');
      if (!w) {
        setError('El navegador bloqueó la ventana de impresión.');
        return;
      }
      w.document.write(html);
      w.document.close();
      w.focus();
      w.print();
    } catch (err) {
      setError(err?.response?.data?.message ?? 'No se pudo generar el ticket de venta.');
    }
  };

  const onReprintByReceiptNumber = async (paper = '58') => {
    const number = receiptNumber.trim();
    if (!number) {
      setError('Ingresá un número de comprobante.');
      return;
    }
    setError('');
    try {
      const receipt = await getPosSaleReceiptByNumber(number);
      const saleId = receipt?.sale?.id;
      if (!saleId) {
        setError('Comprobante no encontrado.');
        return;
      }
      await onPrintSaleTicket(saleId, paper);
    } catch (err) {
      setError(err?.response?.data?.message ?? 'No se pudo reimprimir el comprobante.');
    }
  };

  const onPrintZClose = async () => {
    setError('');
    try {
      const report = await getPosZCloseReport({ date: zCloseDate });
      const methods = report?.payments?.by_method ?? {};
      const html = `
        <html>
          <head>
            <title>Cierre Z ${report?.date ?? zCloseDate}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
              h1 { margin: 0 0 8px 0; font-size: 24px; }
              h2 { margin: 20px 0 8px 0; font-size: 16px; }
              table { border-collapse: collapse; width: 100%; margin-top: 8px; }
              th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; font-size: 13px; }
            </style>
          </head>
          <body>
            <h1>MRFitOS - Cierre Z ${report?.date ?? zCloseDate}</h1>
            <h2>Sesiones de Caja</h2>
            <table>
              <tr><th>Aperturas</th><td>${report?.cash_sessions?.opened_count ?? 0}</td></tr>
              <tr><th>Cierres</th><td>${report?.cash_sessions?.closed_count ?? 0}</td></tr>
              <tr><th>Total aperturas</th><td>${report?.cash_sessions?.opening_total ?? 0}</td></tr>
              <tr><th>Total esperado</th><td>${report?.cash_sessions?.expected_total ?? 0}</td></tr>
              <tr><th>Total cierres</th><td>${report?.cash_sessions?.closing_total ?? 0}</td></tr>
              <tr><th>Diferencia total</th><td>${report?.cash_sessions?.difference_total ?? 0}</td></tr>
            </table>
            <h2>Cobros por método</h2>
            <table>
              <tr><th>Efectivo</th><td>${methods.cash ?? 0}</td></tr>
              <tr><th>Transferencia</th><td>${methods.transfer ?? 0}</td></tr>
              <tr><th>Mercado Pago</th><td>${methods.mercadopago ?? 0}</td></tr>
              <tr><th>Tarjeta</th><td>${methods.card ?? 0}</td></tr>
              <tr><th>Otros</th><td>${methods.other ?? 0}</td></tr>
              <tr><th>Total</th><td>${report?.payments?.total ?? 0}</td></tr>
            </table>
            <h2>Ventas POS</h2>
            <table>
              <tr><th>Cantidad</th><td>${report?.pos_sales?.count ?? 0}</td></tr>
              <tr><th>Total</th><td>${report?.pos_sales?.total ?? 0}</td></tr>
            </table>
            <h2>Cuenta socio liquidada</h2>
            <table>
              <tr><th>Cantidad</th><td>${report?.member_account_settlements?.count ?? 0}</td></tr>
              <tr><th>Total</th><td>${report?.member_account_settlements?.total ?? 0}</td></tr>
            </table>
          </body>
        </html>
      `;
      const w = window.open('', '_blank', 'noopener,noreferrer');
      if (!w) {
        setError('El navegador bloqueó la ventana de impresión.');
        return;
      }
      w.document.write(html);
      w.document.close();
      w.focus();
      w.print();
    } catch (err) {
      setError(err?.response?.data?.message ?? 'No se pudo generar el cierre Z.');
    }
  };

  const onExportZCloseCsv = async () => {
    setError('');
    try {
      const blob = await exportPosZCloseCsv({ date: zCloseDate });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `z-close-${zCloseDate}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err?.response?.data?.message ?? 'No se pudo exportar CSV de cierre Z.');
    }
  };

  const onRefreshLowStock = async () => {
    setError('');
    try {
      const data = await listLowStockProducts({ threshold: Number(lowStockThreshold || 5) });
      setLowStockItems(Array.isArray(data?.items) ? data.items : []);
    } catch (err) {
      setError(err?.response?.data?.message ?? 'No se pudo cargar stock bajo.');
    }
  };

  const onExportAuditCsv = async () => {
    setError('');
    try {
      const blob = await exportPosAuditCsv({
        date_from: auditFilters.date_from || undefined,
        date_to: auditFilters.date_to || undefined,
        action: auditFilters.action || undefined,
        user_id: auditFilters.user_id ? Number(auditFilters.user_id) : undefined
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pos-audit-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err?.response?.data?.message ?? 'No se pudo exportar auditoría POS.');
    }
  };

  const onNotifyAlertsWhatsapp = async () => {
    setError('');
    try {
      const data = await getPosAlertNotifyLink({
        date_from: alertFilters.date_from || undefined,
        date_to: alertFilters.date_to || undefined,
        difference_threshold: Number(alertFilters.difference_threshold || 0),
        voids_threshold: Number(alertFilters.voids_threshold || 3),
        contact_id: selectedAlertContactId ? Number(selectedAlertContactId) : undefined
      });
      setAlertNotifyInfo(data);
      if (data?.whatsapp_link) {
        window.open(data.whatsapp_link, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      setError(err?.response?.data?.message ?? 'No se pudo generar notificación WhatsApp.');
    }
  };

  const onDispatchCriticalAlert = async () => {
    setError('');
    setMessage('');
    try {
      const data = await notifyCriticalPosAlert({
        date_from: alertFilters.date_from || undefined,
        date_to: alertFilters.date_to || undefined,
        difference_threshold: Number(alertFilters.difference_threshold || 0),
        voids_threshold: Number(alertFilters.voids_threshold || 3),
        contact_id: selectedAlertContactId ? Number(selectedAlertContactId) : undefined
      });
      if (data?.dispatched) {
        setMessage('Alerta crítica registrada y link de WhatsApp generado.');
        if (data?.whatsapp_link) {
          window.open(data.whatsapp_link, '_blank', 'noopener,noreferrer');
        }
      } else {
        setMessage(`Dispatch no ejecutado: ${data?.reason ?? 'sin motivo'}.`);
      }
    } catch (err) {
      setError(err?.response?.data?.message ?? 'No se pudo ejecutar el dispatch crítico.');
    }
  };

  const onCreateAlertContact = async () => {
    setError('');
    try {
      await createPosAlertContact({ label: newAlertContact.label, phone: newAlertContact.phone, is_active: true });
      setNewAlertContact({ label: '', phone: '' });
      await load();
    } catch (err) {
      setError(err?.response?.data?.message ?? 'No se pudo crear contacto de alerta.');
    }
  };

  const onToggleAlertContact = async (contact) => {
    setError('');
    try {
      await updatePosAlertContact(contact.id, { is_active: !contact.is_active });
      await load();
    } catch (err) {
      setError(err?.response?.data?.message ?? 'No se pudo actualizar contacto.');
    }
  };

  const onDeleteAlertContact = async (contactId) => {
    setError('');
    try {
      await deletePosAlertContact(contactId);
      if (String(selectedAlertContactId) === String(contactId)) setSelectedAlertContactId('');
      await load();
    } catch (err) {
      setError(err?.response?.data?.message ?? 'No se pudo eliminar contacto.');
    }
  };

  const onExportDispatchHistoryCsv = async () => {
    setError('');
    try {
      const blob = await exportPosAlertDispatchHistoryCsv({
        date_from: dispatchHistoryFilters.date_from || undefined,
        date_to: dispatchHistoryFilters.date_to || undefined
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pos-alert-dispatch-history-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err?.response?.data?.message ?? 'No se pudo exportar historial de dispatch.');
    }
  };

  const onExportAutosettleKpiCsv = async () => {
    setError('');
    try {
      const blob = await exportPosAutosettleKpiCsv({
        date_from: autosettleDateFrom || undefined,
        date_to: autosettleDateTo || undefined
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pos-autosettle-kpi-${autosettleDateFrom || 'from'}-to-${autosettleDateTo || 'to'}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err?.response?.data?.message ?? 'No se pudo exportar KPI de auto-débito.');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onCreateSale = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const payload = {
        member_id: memberId ? Number(memberId) : undefined,
        charge_mode: chargeMode,
        payment_method: paymentMethod,
        due_date: dueDate || undefined,
        items: [
          {
            product_id: selectedProductId ? Number(selectedProductId) : undefined,
            item_name: itemName,
            qty: Number(qty || 1),
            unit_price: Number(unitPrice || 0)
          }
        ]
      };
      const data = await createPosSale(payload);
      setMessage(`Venta creada #${data.sale_id} (${data.charge_mode}).`);
      setItemName('');
      setUnitPrice('');
      setSelectedProductId('');
      setQty('1');
      await load();
    } catch (err) {
      setError(toFriendlyApiError(err, 'No se pudo crear la venta POS.'));
    } finally {
      setLoading(false);
    }
  };

  const onSettle = async (id) => {
    setError('');
    setMessage('');
    try {
      await settleMemberAccountCharge(id, { method: 'mercadopago' });
      setMessage(`Cargo #${id} marcado como cobrado por débito automático.`);
      await load();
    } catch (err) {
      setError(err?.response?.data?.message ?? 'No se pudo liquidar el cargo.');
    }
  };

  const onAutoSettleCharges = async () => {
    setError('');
    setMessage('');
    setAutoSettleLoading(true);
    try {
      const data = await autoSettleMemberAccountCharges({
        method: autoSettleMethod,
        limit: Number(autoSettleLimit || 50)
      });
      setMessage(`Auto-débito ejecutado: procesados ${data.processed}, cobrados ${data.settled}, fallidos ${data.failed}.`);
      await load();
    } catch (err) {
      setError(err?.response?.data?.message ?? 'No se pudo ejecutar el auto-débito por lote.');
    } finally {
      setAutoSettleLoading(false);
    }
  };

  const onOpenOverdueWhatsApp = async (memberId) => {
    setError('');
    try {
      const data = await getMemberAccountOverdueWhatsAppLink(memberId);
      if (data?.whatsapp_link) {
        window.open(data.whatsapp_link, '_blank', 'noopener,noreferrer');
      } else {
        setError('No se pudo generar el link de WhatsApp para ese socio.');
      }
    } catch (err) {
      setError(err?.response?.data?.message ?? 'No se pudo generar link de WhatsApp.');
    }
  };

  const onSetFollowupStatus = async (memberId, status) => {
    setError('');
    try {
      const payload = { member_id: memberId, status };
      if (status === 'promise') {
        const date = window.prompt('Fecha promesa (YYYY-MM-DD):', new Date().toISOString().slice(0, 10));
        if (!date) return;
        payload.promise_date = date;
      }
      await upsertMemberAccountFollowup(payload);
      await load();
    } catch (err) {
      setError(err?.response?.data?.message ?? 'No se pudo actualizar estado de seguimiento.');
    }
  };

  const onExportPromiseAgendaCsv = async () => {
    setError('');
    try {
      const blob = await exportMemberAccountPromiseAgendaCsv({ limit: 100 });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pos-promise-agenda-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err?.response?.data?.message ?? 'No se pudo exportar agenda de promesas.');
    }
  };

  const onBulkMarkPromiseContacted = async () => {
    if (!window.confirm('Marcar todas las promesas vencidas como contactadas?')) return;
    setError('');
    try {
      const data = await bulkMarkPromiseAgendaContacted();
      setMessage(`Promesas vencidas marcadas como contactadas: ${Number(data?.updated_count ?? 0)}.`);
      await load();
    } catch (err) {
      setError(err?.response?.data?.message ?? 'No se pudo ejecutar acción masiva de promesas.');
    }
  };

  const onExportOverduePromiseWhatsAppCsv = async () => {
    setError('');
    try {
      const blob = await exportOverduePromiseWhatsAppLinksCsv({ limit: 200 });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pos-overdue-promise-whatsapp-links-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err?.response?.data?.message ?? 'No se pudo exportar lote WhatsApp de promesas vencidas.');
    }
  };

  const onOpenFirstOverduePromiseWhatsApp = async () => {
    setError('');
    try {
      const data = await getOverduePromiseWhatsAppLinks({ limit: 1 });
      const first = Array.isArray(data?.items) ? data.items[0] : null;
      if (!first?.whatsapp_link) {
        setError('No hay links de WhatsApp disponibles para promesas vencidas.');
        return;
      }
      window.open(first.whatsapp_link, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(err?.response?.data?.message ?? 'No se pudo generar WhatsApp para promesas vencidas.');
    }
  };

  const onSetContactResult = async (memberId, result) => {
    setError('');
    try {
      await updateMemberAccountFollowupContactResult({ member_id: memberId, result });
      await load();
    } catch (err) {
      setError(err?.response?.data?.message ?? 'No se pudo registrar resultado de contacto.');
    }
  };

  const onExportContactEffectivenessCsv = async () => {
    setError('');
    if (!validateFollowupRange()) {
      return;
    }
    setContactEffectivenessExportLoading(true);
    try {
      const blob = await exportMemberAccountContactEffectivenessCsv({
        date_from: followupDateFrom || undefined,
        date_to: followupDateTo || undefined
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pos-contact-effectiveness-${followupDateFrom || 'from'}-to-${followupDateTo || 'to'}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(toFriendlyApiError(err, 'No se pudo exportar efectividad de contacto.'));
    } finally {
      setContactEffectivenessExportLoading(false);
    }
  };

  const onExportCollectorRankingCsv = async () => {
    setError('');
    if (!validateFollowupRange()) {
      return;
    }
    setCollectorRankingExportLoading(true);
    try {
      const blob = await exportMemberAccountCollectorRankingCsv({
        date_from: followupDateFrom || undefined,
        date_to: followupDateTo || undefined,
        limit: Number(collectorRankingLimit || 25),
        sort_by: collectorRankingSortBy,
        sort_dir: collectorRankingSortDir
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pos-collector-ranking-${followupDateFrom || 'from'}-to-${followupDateTo || 'to'}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(toFriendlyApiError(err, 'No se pudo exportar ranking de cobradores.'));
    } finally {
      setCollectorRankingExportLoading(false);
    }
  };

  const onCreateProduct = async () => {
    setError('');
    setMessage('');
    try {
      await createPosProduct({
        code: newProduct.code,
        name: newProduct.name,
        price: Number(newProduct.price || 0),
        currency: 'ARS',
        track_stock: true,
        stock_qty: Number(newProduct.stock_qty || 0),
        is_active: true
      });
      setMessage('Producto POS creado.');
      setNewProduct({ code: '', name: '', price: '', stock_qty: '' });
      await load();
    } catch (err) {
      setError(err?.response?.data?.message ?? 'No se pudo crear producto POS.');
    }
  };

  const onVoidSale = async (sale) => {
    const reason = window.prompt('Motivo de anulación (mínimo 5 caracteres):', '');
    if (reason === null) return;
    const trimmed = reason.trim();
    if (trimmed.length < 5) {
      setError('El motivo debe tener al menos 5 caracteres.');
      return;
    }
    setError('');
    setMessage('');
    try {
      await voidPosSale(sale.id, { reason: trimmed });
      setMessage(`Venta #${sale.id} anulada correctamente.`);
      await load();
    } catch (err) {
      setError(err?.response?.data?.message ?? 'No se pudo anular la venta POS.');
    }
  };

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-2xl font-semibold text-slate-900">POS Gym</h2>
        <p className="text-sm text-slate-600">Venta en mostrador: cobro inmediato, efectivo o cuenta del socio para débito automático.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            { to: '/pos', label: 'Inicio' },
            { to: '/pos/caja', label: 'Caja' },
            { to: '/pos/ventas', label: 'Ventas' },
            { to: '/pos/productos', label: 'Productos/Stock' },
            { to: '/pos/control', label: 'Control' }
          ].map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  isActive
                    ? 'bg-slate-900 text-white'
                    : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
                }`
              }
              end={item.to === '/pos'}
            >
              {item.label}
            </NavLink>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Atajos: F2 Caja · F3 Ventas · F4 Productos · F8 Control
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              receptionMode
                ? 'bg-emerald-600 text-white'
                : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
            onClick={() => setReceptionMode((v) => !v)}
          >
            {receptionMode ? 'Modo Recepción: ON' : 'Modo Recepción: OFF'}
          </button>
          <button
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            onClick={() => document.getElementById('pos-caja')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          >
            Ir a Caja
          </button>
          <button
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            onClick={() => document.getElementById('pos-ventas')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          >
            Ir a Ventas
          </button>
          <button
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            onClick={() => setShowCollectionsHub((v) => !v)}
            disabled={receptionMode}
          >
            {showCollectionsHub ? 'Ocultar cobranza avanzada' : 'Mostrar cobranza avanzada'}
          </button>
          <button
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            onClick={() => setShowRiskHub((v) => !v)}
            disabled={receptionMode && location.pathname !== '/pos/control'}
          >
            {showRiskHub ? 'Ocultar riesgo y auditoría' : 'Mostrar riesgo y auditoría'}
          </button>
        </div>
      </div>

      {showCollectionsHub && (
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-end gap-2">
          <input className="rounded border border-slate-300 p-2 text-sm" type="date" value={followupDateFrom} onChange={(e) => setFollowupDateFrom(e.target.value)} />
          <input className="rounded border border-slate-300 p-2 text-sm" type="date" value={followupDateTo} onChange={(e) => setFollowupDateTo(e.target.value)} />
          <select className="rounded border border-slate-300 p-2 text-sm" value={collectorRankingLimit} onChange={(e) => setCollectorRankingLimit(e.target.value)}>
            <option value="10">Top 10</option>
            <option value="25">Top 25</option>
            <option value="50">Top 50</option>
          </select>
          <select className="rounded border border-slate-300 p-2 text-sm" value={collectorRankingSortBy} onChange={(e) => setCollectorRankingSortBy(e.target.value)}>
            <option value="recovered_amount">Orden: Recuperado</option>
            <option value="response_rate">Orden: Tasa respuesta</option>
            <option value="contacts_count">Orden: Contactos</option>
          </select>
          <select className="rounded border border-slate-300 p-2 text-sm" value={collectorRankingSortDir} onChange={(e) => setCollectorRankingSortDir(e.target.value)}>
            <option value="desc">Dirección: Mayor a menor</option>
            <option value="asc">Dirección: Menor a mayor</option>
          </select>
          <button className="rounded border border-slate-300 px-2 py-2 text-xs" onClick={() => applyFollowupRangePreset(7)}>
            7d
          </button>
          <button className="rounded border border-slate-300 px-2 py-2 text-xs" onClick={() => applyFollowupRangePreset(30)}>
            30d
          </button>
          <button className="rounded border border-slate-300 px-2 py-2 text-xs" onClick={() => applyFollowupRangePreset(90)}>
            90d
          </button>
          <button className="rounded border border-slate-300 px-3 py-2 text-sm disabled:opacity-50" disabled={!isFollowupRangeValid || followupLoading} onClick={load}>
            {followupLoading ? 'Actualizando...' : 'Actualizar Embudo'}
          </button>
        </div>
        {followupRangeValidationMessage && (
          <p className="mb-2 text-xs text-red-600">{followupRangeValidationMessage}</p>
        )}
        <div className="mb-3 grid gap-2 md:grid-cols-3">
          <div className="rounded border border-slate-200 p-2">
            <p className="text-xs uppercase tracking-wide text-slate-500">Contactado</p>
            <p className="text-lg font-semibold text-slate-900">{followupFunnel.contacted_count}</p>
          </div>
          <div className="rounded border border-slate-200 p-2">
            <p className="text-xs uppercase tracking-wide text-slate-500">Promesa</p>
            <p className="text-lg font-semibold text-amber-700">{followupFunnel.promise_count}</p>
          </div>
          <div className="rounded border border-slate-200 p-2">
            <p className="text-xs uppercase tracking-wide text-slate-500">Cobrado</p>
            <p className="text-lg font-semibold text-emerald-700">{followupFunnel.paid_count}</p>
          </div>
        </div>
        <div className="mb-3 grid gap-2 md:grid-cols-2">
          <div className="rounded border border-slate-200 p-2">
            <p className="text-xs uppercase tracking-wide text-slate-500">Promesas para hoy</p>
            <p className="text-lg font-semibold text-slate-900">{promiseAgenda.due_today_count}</p>
          </div>
          <div className="rounded border border-red-200 p-2">
            <p className="text-xs uppercase tracking-wide text-red-600">Promesas vencidas</p>
            <p className="text-lg font-semibold text-red-700">{promiseAgenda.overdue_count}</p>
          </div>
        </div>
        <div className="mb-3 rounded border border-slate-200 p-2">
          <p className="mb-2 text-sm font-medium text-slate-700">Ranking de cobradores</p>
          <p className="mb-2 text-xs text-slate-500">
            Orden actual: {collectorSortMetricLabel} ({collectorSortDirectionLabel}).
          </p>
          <div className="mb-2 grid gap-2 md:grid-cols-6">
            <div className="rounded border border-slate-200 p-2">
              <p className="text-xs text-slate-500">Cobradores activos</p>
              <p className="text-lg font-semibold text-slate-900">{collectorRankingSummary.collectors_count}</p>
            </div>
            <div className="rounded border border-emerald-200 p-2">
              <p className="text-xs text-emerald-700">Recuperado total</p>
              <p className="text-lg font-semibold text-emerald-700">${collectorRankingSummary.total_recovered_amount.toFixed(2)}</p>
            </div>
            <div className="rounded border border-amber-200 p-2">
              <p className="text-xs text-amber-700">Comisión estimada</p>
              <p className="text-lg font-semibold text-amber-700">${collectorRankingSummary.total_commission_amount.toFixed(2)}</p>
            </div>
            <div className="rounded border border-slate-200 p-2">
              <p className="text-xs text-slate-500">Promedio por cobrador</p>
              <p className="text-lg font-semibold text-slate-900">${collectorRankingSummary.avg_recovered_per_collector.toFixed(2)}</p>
            </div>
            <div className="rounded border border-slate-200 p-2">
              <p className="text-xs text-slate-500">% comisión/recuperado</p>
              <p className="text-lg font-semibold text-slate-900">{collectorRankingSummary.commission_over_recovered_rate.toFixed(2)}%</p>
            </div>
            <div className="rounded border border-slate-200 p-2">
              <p className="text-xs text-slate-500">{collectorLeadLabel}</p>
              <p className="text-sm font-semibold text-slate-900">{collectorRankingSummary.top_collector_name || '-'}</p>
              <p className="text-xs text-slate-500">${collectorRankingSummary.top_collector_recovered_amount.toFixed(2)} · {collectorRankingSummary.total_contacts_count} contactos</p>
              <p className="text-xs text-slate-500">
                {collectorRankingSummary.top_collector_sort_metric === 'response_rate'
                  ? `${collectorRankingSummary.top_collector_sort_value.toFixed(2)}% resp.`
                  : collectorRankingSummary.top_collector_sort_metric === 'contacts_count'
                    ? `${collectorRankingSummary.top_collector_sort_value.toFixed(0)} contactos`
                    : `$${collectorRankingSummary.top_collector_sort_value.toFixed(2)} recuperado`}
              </p>
            </div>
          </div>
          {collectorCommissionRules && (
            <p className="mb-2 text-xs text-slate-500">
              Regla comisión: hasta ${Number(collectorCommissionRules.tier1_max || 0).toFixed(0)} {"=>"} {Number(collectorCommissionRules.tier1_rate || 0).toFixed(2)}%, hasta ${Number(collectorCommissionRules.tier2_max || 0).toFixed(0)} {"=>"} {Number(collectorCommissionRules.tier2_rate || 0).toFixed(2)}%, mayor {"=>"} {Number(collectorCommissionRules.tier3_rate || 0).toFixed(2)}%.
            </p>
          )}
          {collectorRanking.length === 0 ? (
            <p className="text-sm text-slate-500">Sin actividad en el rango.</p>
          ) : collectorRanking.map((r) => (
            <div key={r.user_id} className="flex items-center justify-between border-t border-slate-100 py-1 text-sm first:border-t-0">
              <span>{r.user_name || r.user_email || `user#${r.user_id}`}</span>
              <span className="font-semibold">${Number(r.recovered_amount || 0).toFixed(2)} · com. ${Number(r.commission_amount || 0).toFixed(2)} ({Number(r.commission_rate || 0).toFixed(2)}%) · resp {Number(r.response_rate || 0).toFixed(2)}%</span>
            </div>
          ))}
        </div>
        <div className="mb-3 flex justify-end">
          <button className="mr-2 rounded border border-amber-300 px-3 py-2 text-sm text-amber-700 disabled:opacity-50" disabled={!canSaleCreate} onClick={onBulkMarkPromiseContacted}>
            Marcar vencidas como contactadas
          </button>
          <button className="mr-2 rounded border border-emerald-300 px-3 py-2 text-sm text-emerald-700 disabled:opacity-50" disabled={!hasPermission('whatsapp.send')} onClick={onOpenFirstOverduePromiseWhatsApp}>
            WhatsApp 1er vencida
          </button>
          <button className="mr-2 rounded border border-emerald-300 px-3 py-2 text-sm text-emerald-700 disabled:opacity-50" disabled={!canReportExport} onClick={onExportOverduePromiseWhatsAppCsv}>
            Exportar Links WhatsApp
          </button>
          <button className="mr-2 rounded border border-slate-300 px-3 py-2 text-sm disabled:opacity-50" disabled={!canReportExport || !isFollowupRangeValid || contactEffectivenessExportLoading} onClick={onExportContactEffectivenessCsv}>
            {contactEffectivenessExportLoading ? 'Exportando...' : 'Exportar Efectividad CSV'}
          </button>
          <button className="mr-2 rounded border border-slate-300 px-3 py-2 text-sm disabled:opacity-50" disabled={!canReportExport || !isFollowupRangeValid || collectorRankingExportLoading} onClick={onExportCollectorRankingCsv}>
            {collectorRankingExportLoading ? 'Exportando...' : 'Exportar Ranking CSV'}
          </button>
          <button className="rounded border border-slate-300 px-3 py-2 text-sm disabled:opacity-50" disabled={!canReportExport} onClick={onExportPromiseAgendaCsv}>
            Exportar Agenda CSV
          </button>
        </div>
        <h3 className="mb-2 text-lg font-semibold text-slate-900">Morosidad cuenta socio</h3>
        <div className="mb-3 grid gap-2 md:grid-cols-4">
          <div className="rounded border border-slate-200 p-2">
            <p className="text-xs uppercase tracking-wide text-slate-500">Contactos hoy</p>
            <p className="text-lg font-semibold text-slate-900">{collectionsKpiToday.contacted_today_count}</p>
          </div>
          <div className="rounded border border-slate-200 p-2">
            <p className="text-xs uppercase tracking-wide text-slate-500">Socios contactados</p>
            <p className="text-lg font-semibold text-slate-900">{collectionsKpiToday.contacted_today_unique_members}</p>
          </div>
          <div className="rounded border border-slate-200 p-2">
            <p className="text-xs uppercase tracking-wide text-slate-500">Cargos recuperados</p>
            <p className="text-lg font-semibold text-emerald-700">{collectionsKpiToday.recovered_today_count}</p>
          </div>
          <div className="rounded border border-slate-200 p-2">
            <p className="text-xs uppercase tracking-wide text-slate-500">Recuperado hoy</p>
            <p className="text-lg font-semibold text-emerald-700">${collectionsKpiToday.recovered_today_amount.toFixed(2)}</p>
          </div>
        </div>
        <div className="mb-3 grid gap-2 md:grid-cols-5">
          <div className="rounded border border-slate-200 p-2"><p className="text-xs text-slate-500">Tocados hoy</p><p className="text-lg font-semibold">{contactEffectivenessToday.touched_today_count}</p></div>
          <div className="rounded border border-emerald-200 p-2"><p className="text-xs text-emerald-700">Respondió</p><p className="text-lg font-semibold text-emerald-700">{contactEffectivenessToday.responded_count}</p></div>
          <div className="rounded border border-slate-200 p-2"><p className="text-xs text-slate-500">No respondió</p><p className="text-lg font-semibold">{contactEffectivenessToday.no_response_count}</p></div>
          <div className="rounded border border-amber-200 p-2"><p className="text-xs text-amber-700">Promesa confirmada</p><p className="text-lg font-semibold text-amber-700">{contactEffectivenessToday.promise_confirmed_count}</p></div>
          <div className="rounded border border-red-200 p-2"><p className="text-xs text-red-700">Número incorrecto</p><p className="text-lg font-semibold text-red-700">{contactEffectivenessToday.wrong_number_count}</p></div>
        </div>
        <div className="mb-3 grid gap-2 md:grid-cols-2">
          <div className="rounded border border-slate-200 p-2"><p className="text-xs text-slate-500">Tasa respuesta</p><p className="text-lg font-semibold">{contactEffectivenessToday.response_rate.toFixed(2)}%</p></div>
          <div className="rounded border border-slate-200 p-2"><p className="text-xs text-slate-500">Tasa promesa confirmada</p><p className="text-lg font-semibold">{contactEffectivenessToday.promise_confirmation_rate.toFixed(2)}%</p></div>
        </div>
        <p className="mb-3 text-sm text-slate-600">
          Vencido total: <strong>{memberAccountAging.overdue_total_count}</strong> cargos · <strong>${memberAccountAging.overdue_total_amount.toFixed(2)}</strong>
        </p>
        <div className="grid gap-2 md:grid-cols-4">
          {memberAccountAging.buckets.map((b) => (
            <div key={b.code} className="rounded border border-slate-200 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">{b.label}</p>
              <p className="text-xl font-semibold text-slate-900">${Number(b.amount || 0).toFixed(2)}</p>
              <p className="text-xs text-slate-500">{Number(b.count || 0)} cargos</p>
            </div>
          ))}
        </div>
        <div className="mt-3 space-y-2">
          <p className="text-sm font-medium text-slate-700">Top socios deudores</p>
          {memberAccountAging.top_overdue_members.length === 0 ? (
            <p className="text-sm text-slate-500">Sin deudas vencidas.</p>
          ) : memberAccountAging.top_overdue_members.map((m) => (
            <div key={m.member_id} className="flex items-center justify-between rounded border border-slate-200 p-2 text-sm">
              <span>{m.member_code} · {m.first_name} {m.last_name} · {m.charges_count} cargos · {m.followup?.status || 'sin seguimiento'}</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900">${Number(m.total_amount || 0).toFixed(2)} · {m.max_days_overdue} días</span>
                <button className="rounded border border-slate-300 px-2 py-1 text-xs" onClick={() => onSetFollowupStatus(m.member_id, 'contacted')}>
                  Contactado
                </button>
                <button className="rounded border border-amber-300 px-2 py-1 text-xs text-amber-700" onClick={() => onSetFollowupStatus(m.member_id, 'promise')}>
                  Promesa
                </button>
                <button className="rounded border border-emerald-300 px-2 py-1 text-xs text-emerald-700" onClick={() => onSetFollowupStatus(m.member_id, 'paid')}>
                  Cobrado
                </button>
                <button
                  className="rounded border border-emerald-300 px-2 py-1 text-xs text-emerald-700 disabled:opacity-50"
                  disabled={!hasPermission('whatsapp.send')}
                  onClick={() => onOpenOverdueWhatsApp(m.member_id)}
                >
                  WhatsApp
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium text-slate-700">Agenda de promesas</p>
          {promiseAgenda.items.length === 0 ? (
            <p className="text-sm text-slate-500">Sin promesas registradas.</p>
          ) : promiseAgenda.items.map((item) => (
            <div key={`${item.member_id}-${item.promise_date}`} className={`flex items-center justify-between rounded border p-2 text-sm ${
              item.promise_date < promiseAgenda.today
                ? 'border-red-200 bg-red-50'
                : item.promise_date === promiseAgenda.today
                  ? 'border-amber-200 bg-amber-50'
                  : 'border-emerald-200 bg-emerald-50'
            }`}>
              <span>{item.member_code} · {item.first_name} {item.last_name} · promesa {item.promise_date}</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900">${Number(item.overdue_total_amount || 0).toFixed(2)}</span>
                <button className="rounded border border-emerald-300 px-2 py-1 text-xs text-emerald-700" onClick={() => onSetContactResult(item.member_id, 'responded')}>Respondió</button>
                <button className="rounded border border-slate-300 px-2 py-1 text-xs" onClick={() => onSetContactResult(item.member_id, 'no_response')}>No respondió</button>
                <button className="rounded border border-amber-300 px-2 py-1 text-xs text-amber-700" onClick={() => onSetContactResult(item.member_id, 'promise_confirmed')}>Promesa conf.</button>
                <button className="rounded border border-red-300 px-2 py-1 text-xs text-red-700" onClick={() => onSetContactResult(item.member_id, 'wrong_number')}>N° incorrecto</button>
              </div>
            </div>
          ))}
        </div>
      </div>
      )}

      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Ventas hoy</p>
          <p className="text-2xl font-semibold text-slate-900">{summary.today_sales_count}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Facturación hoy</p>
          <p className="text-2xl font-semibold text-slate-900">${summary.today_sales_total.toFixed(2)}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Efectivo hoy</p>
          <p className="text-2xl font-semibold text-slate-900">${summary.today_cash_collected.toFixed(2)}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Cuenta socio pendiente</p>
          <p className="text-2xl font-semibold text-slate-900">${summary.pending_member_account_total.toFixed(2)}</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Auto-débito hoy</p>
          <p className="text-2xl font-semibold text-slate-900">{autosettleKpi.runs_count}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Cargos procesados</p>
          <p className="text-2xl font-semibold text-slate-900">{autosettleKpi.processed_total}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Cargos cobrados</p>
          <p className="text-2xl font-semibold text-emerald-700">{autosettleKpi.settled_total}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Fallidos</p>
          <p className="text-2xl font-semibold text-red-700">{autosettleKpi.failed_total}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total cobrado</p>
          <p className="text-2xl font-semibold text-slate-900">${autosettleKpi.settled_amount_total.toFixed(2)}</p>
        </div>
      </div>
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-end gap-2">
          <input className="rounded border border-slate-300 p-2 text-sm" type="date" value={autosettleDateFrom} onChange={(e) => setAutosettleDateFrom(e.target.value)} />
          <input className="rounded border border-slate-300 p-2 text-sm" type="date" value={autosettleDateTo} onChange={(e) => setAutosettleDateTo(e.target.value)} />
          <button className="rounded border border-slate-300 px-3 py-2 text-sm" onClick={load}>
            Actualizar Auto-débito
          </button>
          <button className="rounded border border-slate-300 px-3 py-2 text-sm disabled:opacity-50" disabled={!canReportExport} onClick={onExportAutosettleKpiCsv}>
            Exportar CSV
          </button>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {(autosettleKpi.daily || []).map((d) => {
            const max = Math.max(1, ...((autosettleKpi.daily || []).map((x) => Number(x.settled_amount_total || 0))));
            const h = Math.max(8, Math.round((Number(d.settled_amount_total || 0) / max) * 64));
            return (
              <div key={d.date} className="flex flex-col items-center gap-1">
                <div className="flex h-16 w-full items-end justify-center rounded bg-slate-50">
                  <div className="w-6 rounded-t bg-emerald-500" style={{ height: `${h}px` }} />
                </div>
                <p className="text-[10px] text-slate-500">{String(d.date).slice(5)}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div id="pos-ventas" className="grid gap-3 rounded-xl bg-white p-4 shadow-sm md:grid-cols-3">
        <select
          className="rounded border border-slate-300 p-2"
          value={selectedProductId}
          onChange={(e) => {
            const value = e.target.value;
            setSelectedProductId(value);
            const product = products.find((p) => String(p.id) === String(value));
            if (product) {
              setItemName(product.name ?? '');
              setUnitPrice(String(product.price ?? ''));
            }
          }}
        >
          <option value="">Producto (opcional)</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.code} - {p.name} ({p.price} {p.currency}) stock:{p.stock_qty}
            </option>
          ))}
        </select>
        <input className="rounded border border-slate-300 p-2" placeholder="member_id (opcional según modo)" value={memberId} onChange={(e) => setMemberId(e.target.value)} />
        <input className="rounded border border-slate-300 p-2" placeholder="Item (ej: Proteína 1kg)" value={itemName} onChange={(e) => setItemName(e.target.value)} />
        <input className="rounded border border-slate-300 p-2" placeholder="Precio unitario" type="number" min="0" step="0.01" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} />
        <input className="rounded border border-slate-300 p-2" placeholder="Cantidad" type="number" min="0.001" step="0.001" value={qty} onChange={(e) => setQty(e.target.value)} />
        <select className="rounded border border-slate-300 p-2" value={chargeMode} onChange={(e) => setChargeMode(e.target.value)}>
          <option value="immediate">Cobro inmediato</option>
          <option value="cash">Efectivo</option>
          <option value="member_account">Cuenta socio (débito luego)</option>
        </select>
        <select className="rounded border border-slate-300 p-2" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
          <option value="transfer">Transferencia</option>
          <option value="mercadopago">Mercado Pago</option>
          <option value="card">Tarjeta</option>
          <option value="cash">Efectivo</option>
          <option value="other">Otro</option>
        </select>
        <input className="rounded border border-slate-300 p-2" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        <button
          className="rounded border border-slate-300 p-2 disabled:opacity-50"
          disabled={loading || !canSaleCreate || (requireOpenCash && !openCash)}
          onClick={onCreateSale}
        >
          {loading ? 'Guardando...' : 'Crear venta POS'}
        </button>
      </div>

      {requireOpenCash && !openCash && (
        <p className="rounded bg-amber-50 p-3 text-sm text-amber-800">
          Caja cerrada: para vender en POS primero abrí una caja.
        </p>
      )}

      <PosProductsStockPanel
        newProduct={newProduct}
        setNewProduct={setNewProduct}
        canProductManage={canProductManage}
        onCreateProduct={onCreateProduct}
        lowStockThreshold={lowStockThreshold}
        setLowStockThreshold={setLowStockThreshold}
        onRefreshLowStock={onRefreshLowStock}
        lowStockItems={lowStockItems}
        stockMovement={stockMovement}
        setStockMovement={setStockMovement}
        products={products}
        canStockManage={canStockManage}
        onAdjustStock={onAdjustStock}
        movements={movements}
      />

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h3 className="mb-2 text-lg font-semibold text-slate-900">Caja POS</h3>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <input
            className="rounded border border-slate-300 p-2 text-sm"
            type="date"
            value={zCloseDate}
            onChange={(e) => setZCloseDate(e.target.value)}
          />
          <button className="rounded border border-slate-300 px-2 py-1 text-sm disabled:opacity-50" disabled={!canReportRead} onClick={onPrintZClose}>
            Imprimir Cierre Z
          </button>
          <button className="rounded border border-slate-300 px-2 py-1 text-sm disabled:opacity-50" disabled={!canReportExport} onClick={onExportZCloseCsv}>
            Exportar CSV Z
          </button>
        </div>
        <div className="mb-3 flex items-center gap-3 rounded border border-slate-200 p-2 text-sm">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={requireOpenCash}
              aria-disabled={!canCashManage}
              disabled={savingConfig || !canCashManage}
              onChange={(e) => onToggleRequireOpenCash(e.target.checked)}
            />
            Requerir caja abierta para vender
          </label>
          {savingConfig && <span className="text-slate-500">Guardando...</span>}
        </div>
        {openCash ? (
          <div className="space-y-2">
            <p className="text-sm text-slate-700">
              Caja abierta #{openCash.session_id} · Apertura: {openCash.opening_amount} · Cobrado en efectivo: {openCash.cash_collected} · Esperado: {openCash.expected_amount}
            </p>
            <div className="flex gap-2">
              <input
                className="rounded border border-slate-300 p-2"
                type="number"
                min="0"
                step="0.01"
                placeholder="Monto real de cierre"
                value={closingAmount}
                onChange={(e) => setClosingAmount(e.target.value)}
              />
              <button className="rounded border border-slate-300 px-3 py-2 disabled:opacity-50" disabled={!canCashManage} onClick={onCloseCash}>
                Cerrar caja
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              className="rounded border border-slate-300 p-2"
              type="number"
              min="0"
              step="0.01"
              placeholder="Monto de apertura"
              value={openingAmount}
              onChange={(e) => setOpeningAmount(e.target.value)}
            />
            <button className="rounded border border-slate-300 px-3 py-2 disabled:opacity-50" disabled={!canCashManage} onClick={onOpenCash}>
              Abrir caja
            </button>
          </div>
        )}
      </div>

      {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {message && <p className="rounded bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h3 className="mb-2 text-lg font-semibold text-slate-900">Cargos pendientes (cuenta socio)</h3>
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded border border-slate-200 bg-slate-50 p-2">
          <select
            className="rounded border border-slate-300 p-2 text-sm"
            value={autoSettleMethod}
            onChange={(e) => setAutoSettleMethod(e.target.value)}
          >
            <option value="transfer">Transferencia</option>
            <option value="mercadopago">Mercado Pago</option>
            <option value="card">Tarjeta</option>
            <option value="cash">Efectivo</option>
            <option value="other">Otro</option>
          </select>
          <input
            className="w-28 rounded border border-slate-300 p-2 text-sm"
            type="number"
            min="1"
            max="500"
            value={autoSettleLimit}
            onChange={(e) => setAutoSettleLimit(e.target.value)}
            placeholder="Límite"
          />
          <button
            className="rounded border border-slate-300 px-3 py-2 text-sm disabled:opacity-50"
            disabled={!canSaleCreate || autoSettleLoading}
            onClick={onAutoSettleCharges}
          >
            {autoSettleLoading ? 'Procesando...' : 'Ejecutar auto-débito'}
          </button>
        </div>
        <div className="space-y-2">
          {charges.length === 0 ? (
            <p className="text-sm text-slate-500">Sin cargos pendientes.</p>
          ) : charges.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded border border-slate-200 p-2 text-sm">
              <span>#{c.id} · Socio {c.member_code} · {c.amount} {c.currency}</span>
              <button className="rounded border border-slate-300 px-2 py-1 disabled:opacity-50" disabled={!canSaleCreate} onClick={() => onSettle(c.id)}>
                Cobrar por débito automático
              </button>
            </div>
          ))}
        </div>
      </div>

      <PosSalesPanel
        receiptNumber={receiptNumber}
        setReceiptNumber={setReceiptNumber}
        onReprintByReceiptNumber={onReprintByReceiptNumber}
        sales={sales}
        canReportRead={canReportRead}
        canVoid={canVoid}
        onPrintSaleTicket={onPrintSaleTicket}
        onVoidSale={onVoidSale}
      />

      <PosCashPanel
        load={load}
        cashOperatorUserId={cashOperatorUserId}
        setCashOperatorUserId={setCashOperatorUserId}
        cashSessions={cashSessions}
        onPrintCashReport={onPrintCashReport}
        cashByOperator={cashByOperator}
      />

      {showRiskHub && (
        <PosControlPanel
          canReportRead={canReportRead}
          canReportExport={canReportExport}
          canCashManage={canCashManage}
          load={load}
          onNotifyAlertsWhatsapp={onNotifyAlertsWhatsapp}
          onDispatchCriticalAlert={onDispatchCriticalAlert}
          newAlertContact={newAlertContact}
          setNewAlertContact={setNewAlertContact}
          onCreateAlertContact={onCreateAlertContact}
          selectedAlertContactId={selectedAlertContactId}
          setSelectedAlertContactId={setSelectedAlertContactId}
          alertContacts={alertContacts}
          onToggleAlertContact={onToggleAlertContact}
          onDeleteAlertContact={onDeleteAlertContact}
          alertNotifyInfo={alertNotifyInfo}
          posAlerts={posAlerts}
          alertsStatus={alertsStatus}
          alertFilters={alertFilters}
          setAlertFilters={setAlertFilters}
          onExportAuditCsv={onExportAuditCsv}
          auditFilters={auditFilters}
          setAuditFilters={setAuditFilters}
          auditRows={auditRows}
          alertsCronHistoryRows={alertsCronHistoryRows}
          onExportDispatchHistoryCsv={onExportDispatchHistoryCsv}
          dispatchHistoryFilters={dispatchHistoryFilters}
          setDispatchHistoryFilters={setDispatchHistoryFilters}
          dispatchHistoryRows={dispatchHistoryRows}
        />
      )}
    </section>
  );
}
