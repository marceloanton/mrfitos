import { useEffect, useState } from 'react';
import { adjustStock, autoSettleMemberAccountCharges, bulkMarkPromiseAgendaContacted, closeCashSession, createPosAlertContact, createPosProduct, createPosSale, deletePosAlertContact, exportMemberAccountCollectorRankingCsv, exportMemberAccountContactEffectivenessCsv, exportMemberAccountPromiseAgendaCsv, exportOverduePromiseWhatsAppLinksCsv, exportPosAlertDispatchHistoryCsv, exportPosAuditCsv, exportPosAutosettleKpiCsv, exportPosZCloseCsv, getCashByOperatorReport, getCashSessionReport, getMemberAccountAging, getMemberAccountCollectorRanking, getMemberAccountCollectionsKpiToday, getMemberAccountContactEffectiveness, getMemberAccountFollowupFunnel, getMemberAccountOverdueWhatsAppLink, getMemberAccountPromiseAgenda, getOpenCashSessionSummary, getOverduePromiseWhatsAppLinks, getPosAlertNotifyLink, getPosAlerts, getPosAlertsStatus, getPosAutosettleKpi, getPosConfig, getPosSaleReceipt, getPosSaleReceiptByNumber, getPosSummary, getPosZCloseReport, listCashSessions, listLowStockProducts, listMemberAccountCharges, listPosAlertContacts, listPosAlertDispatchHistory, listPosAlertsCronHistory, listPosAudit, listPosProducts, listPosSales, listStockMovements, notifyCriticalPosAlert, openCashSession, settleMemberAccountCharge, updateMemberAccountFollowupContactResult, updatePosAlertContact, updatePosConfig, upsertMemberAccountFollowup, voidPosSale } from '../services/posService';
import { useAuthStore } from '../stores/authStore';

export default function PosPage() {
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
  const [collectorCommissionRules, setCollectorCommissionRules] = useState(null);
  const [summary, setSummary] = useState({
    today_sales_count: 0,
    today_sales_total: 0,
    today_cash_collected: 0,
    pending_member_account_total: 0
  });
  const collectorPrefsStorageKey = user
    ? `pos-collector-ranking-prefs-v1:${user.id || user.email || 'user'}:${user.gym_id || 'gym'}`
    : null;
  const toFriendlyApiError = (err, fallbackMessage) => {
    const apiMessage = err?.response?.data?.message;
    if (apiMessage === 'date range must be <= 92 days') {
      return 'El rango de fechas no puede superar 92 días.';
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
  const validateFollowupRange = () => {
    if (followupDateFrom && followupDateTo && followupDateFrom > followupDateTo) {
      setError('La fecha desde no puede ser mayor a la fecha hasta.');
      return false;
    }
    if (!isRangeWithin92Days(followupDateFrom, followupDateTo)) {
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

  const load = async () => {
    if (!validateFollowupRange()) {
      return;
    }
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
          sort_dir: 'desc'
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
      setCollectorCommissionRules(collectorRankingData?.commission_rules ?? null);
    } catch (err) {
      setError(toFriendlyApiError(err, 'No se pudieron actualizar los indicadores de seguimiento.'));
    }
  };

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
    } catch {
      // ignore broken local preferences
    }
  }, [collectorPrefsStorageKey]);

  useEffect(() => {
    if (!collectorPrefsStorageKey) return;
    localStorage.setItem(collectorPrefsStorageKey, JSON.stringify({
      limit: collectorRankingLimit,
      sort_by: collectorRankingSortBy
    }));
  }, [collectorPrefsStorageKey, collectorRankingLimit, collectorRankingSortBy]);

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
      setError(err?.response?.data?.message ?? 'No se pudo crear la venta POS.');
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
    }
  };

  const onExportCollectorRankingCsv = async () => {
    setError('');
    if (!validateFollowupRange()) {
      return;
    }
    try {
      const blob = await exportMemberAccountCollectorRankingCsv({
        date_from: followupDateFrom || undefined,
        date_to: followupDateTo || undefined,
        limit: Number(collectorRankingLimit || 25),
        sort_by: collectorRankingSortBy,
        sort_dir: 'desc'
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pos-collector-ranking-${followupDateFrom || 'from'}-to-${followupDateTo || 'to'}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(toFriendlyApiError(err, 'No se pudo exportar ranking de cobradores.'));
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
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="text-2xl font-semibold text-slate-900">POS Gym</h2>
        <p className="text-sm text-slate-600">Venta en mostrador: cobro inmediato, efectivo o cuenta del socio para débito automático.</p>
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm">
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
          <button className="rounded border border-slate-300 px-2 py-2 text-xs" onClick={() => applyFollowupRangePreset(7)}>
            7d
          </button>
          <button className="rounded border border-slate-300 px-2 py-2 text-xs" onClick={() => applyFollowupRangePreset(30)}>
            30d
          </button>
          <button className="rounded border border-slate-300 px-2 py-2 text-xs" onClick={() => applyFollowupRangePreset(90)}>
            90d
          </button>
          <button className="rounded border border-slate-300 px-3 py-2 text-sm" onClick={load}>
            Actualizar Embudo
          </button>
        </div>
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
          <button className="mr-2 rounded border border-slate-300 px-3 py-2 text-sm disabled:opacity-50" disabled={!canReportExport} onClick={onExportContactEffectivenessCsv}>
            Exportar Efectividad CSV
          </button>
          <button className="mr-2 rounded border border-slate-300 px-3 py-2 text-sm disabled:opacity-50" disabled={!canReportExport} onClick={onExportCollectorRankingCsv}>
            Exportar Ranking CSV
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

      <div className="grid gap-3 rounded-xl bg-white p-4 shadow-sm md:grid-cols-3">
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

      <div className="grid gap-3 rounded-xl bg-white p-4 shadow-sm md:grid-cols-5">
        <input className="rounded border border-slate-300 p-2" placeholder="Código producto" value={newProduct.code} onChange={(e) => setNewProduct((s) => ({ ...s, code: e.target.value }))} />
        <input className="rounded border border-slate-300 p-2" placeholder="Nombre producto" value={newProduct.name} onChange={(e) => setNewProduct((s) => ({ ...s, name: e.target.value }))} />
        <input className="rounded border border-slate-300 p-2" type="number" min="0" step="0.01" placeholder="Precio" value={newProduct.price} onChange={(e) => setNewProduct((s) => ({ ...s, price: e.target.value }))} />
        <input className="rounded border border-slate-300 p-2" type="number" min="0" step="0.001" placeholder="Stock inicial" value={newProduct.stock_qty} onChange={(e) => setNewProduct((s) => ({ ...s, stock_qty: e.target.value }))} />
        <button className="rounded border border-slate-300 p-2 disabled:opacity-50" disabled={!canProductManage} onClick={onCreateProduct}>
          Crear producto POS
        </button>
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-slate-900">Alertas de stock bajo</h3>
          <div className="flex items-center gap-2">
            <input
              className="w-24 rounded border border-slate-300 p-2 text-sm"
              type="number"
              min="0.001"
              step="0.001"
              value={lowStockThreshold}
              onChange={(e) => setLowStockThreshold(e.target.value)}
            />
            <button className="rounded border border-slate-300 px-2 py-1 text-sm" onClick={onRefreshLowStock}>
              Refrescar
            </button>
          </div>
        </div>
        <div className="space-y-2">
          {lowStockItems.length === 0 ? (
            <p className="text-sm text-slate-500">Sin alertas para ese umbral.</p>
          ) : lowStockItems.map((p) => (
            <div key={p.id} className="rounded border border-amber-200 bg-amber-50 p-2 text-sm text-amber-900">
              {p.code} · {p.name} · stock {p.stock_qty} · precio {p.price} {p.currency}
            </div>
          ))}
        </div>
      </div>

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

      <div className="grid gap-3 rounded-xl bg-white p-4 shadow-sm md:grid-cols-5">
        <select
          className="rounded border border-slate-300 p-2"
          value={stockMovement.product_id}
          onChange={(e) => setStockMovement((s) => ({ ...s, product_id: e.target.value }))}
        >
          <option value="">Producto</option>
          {products.map((p) => <option key={p.id} value={p.id}>{p.code} - {p.name}</option>)}
        </select>
        <select
          className="rounded border border-slate-300 p-2"
          value={stockMovement.movement_type}
          onChange={(e) => setStockMovement((s) => ({ ...s, movement_type: e.target.value }))}
        >
          <option value="in">Entrada</option>
          <option value="out">Salida</option>
          <option value="adjustment">Ajuste (seteo)</option>
        </select>
        <input
          className="rounded border border-slate-300 p-2"
          type="number"
          min="0"
          step="0.001"
          placeholder="Cantidad"
          value={stockMovement.qty}
          onChange={(e) => setStockMovement((s) => ({ ...s, qty: e.target.value }))}
        />
        <input
          className="rounded border border-slate-300 p-2"
          placeholder="Nota"
          value={stockMovement.notes}
          onChange={(e) => setStockMovement((s) => ({ ...s, notes: e.target.value }))}
        />
        <button className="rounded border border-slate-300 p-2 disabled:opacity-50" disabled={!canStockManage} onClick={onAdjustStock}>
          Registrar movimiento
        </button>
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

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h3 className="mb-2 text-lg font-semibold text-slate-900">Últimas ventas POS</h3>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <input
            className="rounded border border-slate-300 p-2 text-sm"
            placeholder="N° comprobante (ej: POS-001-00000025)"
            value={receiptNumber}
            onChange={(e) => setReceiptNumber(e.target.value)}
          />
          <button className="rounded border border-slate-300 px-2 py-1 text-sm" onClick={() => onReprintByReceiptNumber('58')}>
            Reimprimir 58mm
          </button>
          <button className="rounded border border-slate-300 px-2 py-1 text-sm" onClick={() => onReprintByReceiptNumber('80')}>
            Reimprimir 80mm
          </button>
        </div>
        <div className="space-y-2">
          {sales.length === 0 ? (
            <p className="text-sm text-slate-500">Sin ventas.</p>
          ) : sales.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-2 rounded border border-slate-200 p-2 text-sm">
              <span>{s.receipt_number ?? `#${s.id}`} · {s.total_amount} {s.currency} · {s.charge_mode} · {s.member_code ? `${s.member_code} ${s.first_name} ${s.last_name}` : 'sin socio'}</span>
              <div className="flex gap-1">
                <button className="rounded border border-slate-300 px-2 py-1 disabled:opacity-50" disabled={!canReportRead} onClick={() => onPrintSaleTicket(s.id, '58')}>
                  Ticket 58mm
                </button>
                <button className="rounded border border-slate-300 px-2 py-1 disabled:opacity-50" disabled={!canReportRead} onClick={() => onPrintSaleTicket(s.id, '80')}>
                  Ticket 80mm
                </button>
                <button className="rounded border border-red-300 px-2 py-1 text-red-700 disabled:opacity-50" disabled={!canVoid} onClick={() => onVoidSale(s)}>
                  Anular
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h3 className="mb-2 text-lg font-semibold text-slate-900">Movimientos de stock</h3>
        <div className="space-y-2">
          {movements.length === 0 ? (
            <p className="text-sm text-slate-500">Sin movimientos.</p>
          ) : movements.map((m) => (
            <div key={m.id} className="rounded border border-slate-200 p-2 text-sm">
              #{m.id} · {m.product_code} {m.product_name} · {m.movement_type} {m.qty} · saldo {m.balance_after}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h3 className="mb-2 text-lg font-semibold text-slate-900">Últimos cierres de caja</h3>
        <div className="mb-3 flex items-center gap-2">
          <input
            className="w-32 rounded border border-slate-300 p-2 text-sm"
            placeholder="user_id"
            value={cashOperatorUserId}
            onChange={(e) => setCashOperatorUserId(e.target.value)}
          />
          <button className="rounded border border-slate-300 px-2 py-1 text-sm" onClick={load}>
            Filtrar operador
          </button>
        </div>
        <div className="space-y-2">
          {cashSessions.length === 0 ? (
            <p className="text-sm text-slate-500">Sin sesiones de caja.</p>
          ) : cashSessions.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-2 rounded border border-slate-200 p-2 text-sm">
              <span>#{c.id} · {c.status} · apertura {c.opening_amount} · esperado {c.expected_amount ?? '-'} · cierre {c.closing_amount ?? '-'} · diferencia {c.difference_amount ?? '-'}</span>
              <button className="rounded border border-slate-300 px-2 py-1" onClick={() => onPrintCashReport(c.id)}>
                Imprimir cierre
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h3 className="mb-2 text-lg font-semibold text-slate-900">Resumen caja por operador</h3>
        {cashByOperator?.summary ? (
          <div className="mb-3 text-sm text-slate-700">
            Sesiones: {cashByOperator.summary.sessions_count ?? 0} · Apertura: {cashByOperator.summary.opening_total ?? 0} · Esperado: {cashByOperator.summary.expected_total ?? 0} · Cierre: {cashByOperator.summary.closing_total ?? 0} · Diferencia: {cashByOperator.summary.difference_total ?? 0}
          </div>
        ) : (
          <p className="mb-3 text-sm text-slate-500">Sin resumen.</p>
        )}
        <div className="space-y-2">
          {Array.isArray(cashByOperator?.operators) && cashByOperator.operators.length > 0 ? cashByOperator.operators.map((r) => (
            <div key={String(r.user_id)} className="rounded border border-slate-200 p-2 text-sm">
              Usuario {r.user_id} · sesiones {r.sessions_count} · apertura {r.opening_total} · esperado {r.expected_total} · cierre {r.closing_total} · diferencia {r.difference_total}
            </div>
          )) : (
            <p className="text-sm text-slate-500">Sin datos por operador.</p>
          )}
        </div>
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-slate-900">Alertas de Riesgo POS</h3>
          <div className="flex gap-2">
            <button className="rounded border border-slate-300 px-2 py-1 text-sm disabled:opacity-50" disabled={!canReportRead} onClick={load}>
              Actualizar alertas
            </button>
            <button className="rounded border border-slate-300 px-2 py-1 text-sm disabled:opacity-50" disabled={!canReportRead} onClick={onNotifyAlertsWhatsapp}>
              Notificar WhatsApp
            </button>
            <button className="rounded border border-rose-300 px-2 py-1 text-sm text-rose-700 disabled:opacity-50" disabled={!canReportRead} onClick={onDispatchCriticalAlert}>
              Enviar crítica ahora
            </button>
          </div>
        </div>
        <div className="mb-3 grid gap-2 md:grid-cols-4">
          <input className="rounded border border-slate-300 p-2 text-sm" placeholder="Etiqueta contacto" value={newAlertContact.label} onChange={(e) => setNewAlertContact((s) => ({ ...s, label: e.target.value }))} />
          <input className="rounded border border-slate-300 p-2 text-sm" placeholder="Telefono (+549...)" value={newAlertContact.phone} onChange={(e) => setNewAlertContact((s) => ({ ...s, phone: e.target.value }))} />
          <button className="rounded border border-slate-300 p-2 text-sm disabled:opacity-50" disabled={!canCashManage} onClick={onCreateAlertContact}>
            Agregar contacto
          </button>
          <select className="rounded border border-slate-300 p-2 text-sm" value={selectedAlertContactId} onChange={(e) => setSelectedAlertContactId(e.target.value)}>
            <option value="">Destino default (gym.phone)</option>
            {alertContacts.filter((c) => c.is_active).map((c) => (
              <option key={c.id} value={c.id}>{c.label} · {c.phone}</option>
            ))}
          </select>
        </div>
        <div className="mb-3 space-y-2">
          {alertContacts.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded border border-slate-200 p-2 text-xs">
              <span>{c.label} · {c.phone} · {c.is_active ? 'activo' : 'inactivo'}</span>
              <div className="flex gap-2">
                <button className="rounded border border-slate-300 px-2 py-1 disabled:opacity-50" disabled={!canCashManage} onClick={() => onToggleAlertContact(c)}>
                  {c.is_active ? 'Desactivar' : 'Activar'}
                </button>
                <button className="rounded border border-rose-300 px-2 py-1 text-rose-700 disabled:opacity-50" disabled={!canCashManage} onClick={() => onDeleteAlertContact(c.id)}>
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
        {alertNotifyInfo && !alertNotifyInfo.whatsapp_link && (
          <p className="mb-2 rounded border border-slate-300 bg-slate-50 p-2 text-xs text-slate-700">
            {alertNotifyInfo.message}
          </p>
        )}
        {posAlerts?.summary && (
          <div
            className={
              posAlerts.summary.level === 'critical'
                ? 'mb-3 rounded border border-rose-300 bg-rose-50 p-2 text-sm text-rose-900'
                : posAlerts.summary.level === 'warn'
                  ? 'mb-3 rounded border border-amber-300 bg-amber-50 p-2 text-sm text-amber-900'
                  : 'mb-3 rounded border border-emerald-300 bg-emerald-50 p-2 text-sm text-emerald-900'
            }
          >
            <strong>{String(posAlerts.summary.level || 'ok').toUpperCase()}</strong> · {posAlerts.summary.message}
          </div>
        )}
        {alertsStatus && (
          <div className="mb-3 rounded border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700">
            Último dispatch: {alertsStatus.last_dispatch_at ?? 'nunca'} · nivel: {alertsStatus.last_dispatch_level ?? '-'} · cooldown: {alertsStatus.cooldown_active ? `activo hasta ${alertsStatus.next_dispatch_allowed_at}` : 'inactivo'}
          </div>
        )}
        <div className="mb-3 grid gap-2 md:grid-cols-4">
          <input className="rounded border border-slate-300 p-2 text-sm" type="date" value={alertFilters.date_from} onChange={(e) => setAlertFilters((s) => ({ ...s, date_from: e.target.value }))} />
          <input className="rounded border border-slate-300 p-2 text-sm" type="date" value={alertFilters.date_to} onChange={(e) => setAlertFilters((s) => ({ ...s, date_to: e.target.value }))} />
          <input className="rounded border border-slate-300 p-2 text-sm" placeholder="Umbral diferencia" value={alertFilters.difference_threshold} onChange={(e) => setAlertFilters((s) => ({ ...s, difference_threshold: e.target.value }))} />
          <input className="rounded border border-slate-300 p-2 text-sm" placeholder="Umbral anulaciones" value={alertFilters.voids_threshold} onChange={(e) => setAlertFilters((s) => ({ ...s, voids_threshold: e.target.value }))} />
        </div>
        <div className="mb-3">
          <p className="mb-1 text-sm font-medium text-slate-800">Diferencias de caja altas</p>
          <div className="space-y-2">
            {posAlerts.high_cash_differences.length === 0 ? (
              <p className="rounded border border-emerald-200 bg-emerald-50 p-2 text-sm text-emerald-800">Sin alertas de diferencia alta.</p>
            ) : posAlerts.high_cash_differences.map((a) => (
                <div key={a.cash_session_id} className="rounded border border-rose-200 bg-rose-50 p-2 text-sm text-rose-900">
                  Caja #{a.cash_session_id} · user {a.user_id ?? '-'} · diferencia {a.difference_amount} · {a.opened_at} {'->'} {a.closed_at ?? '-'}
                </div>
              ))}
          </div>
        </div>
        <div>
          <p className="mb-1 text-sm font-medium text-slate-800">Anulaciones inusuales por operador</p>
          <div className="space-y-2">
            {posAlerts.unusual_voids_by_operator.length === 0 ? (
              <p className="rounded border border-emerald-200 bg-emerald-50 p-2 text-sm text-emerald-800">Sin anulaciones inusuales.</p>
            ) : posAlerts.unusual_voids_by_operator.map((a) => (
              <div key={String(a.user_id)} className="rounded border border-amber-200 bg-amber-50 p-2 text-sm text-amber-900">
                user {a.user_id ?? '-'} · anulaciones {a.void_count}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-slate-900">Auditoría POS</h3>
          <button className="rounded border border-slate-300 px-2 py-1 text-sm disabled:opacity-50" disabled={!canReportExport} onClick={onExportAuditCsv}>
            Exportar CSV Auditoría
          </button>
        </div>
        <div className="mb-3 grid gap-2 md:grid-cols-5">
          <input className="rounded border border-slate-300 p-2 text-sm" type="date" value={auditFilters.date_from} onChange={(e) => setAuditFilters((s) => ({ ...s, date_from: e.target.value }))} />
          <input className="rounded border border-slate-300 p-2 text-sm" type="date" value={auditFilters.date_to} onChange={(e) => setAuditFilters((s) => ({ ...s, date_to: e.target.value }))} />
          <input className="rounded border border-slate-300 p-2 text-sm" placeholder="action (ej: void)" value={auditFilters.action} onChange={(e) => setAuditFilters((s) => ({ ...s, action: e.target.value }))} />
          <input className="rounded border border-slate-300 p-2 text-sm" placeholder="user_id" value={auditFilters.user_id} onChange={(e) => setAuditFilters((s) => ({ ...s, user_id: e.target.value }))} />
          <button className="rounded border border-slate-300 p-2 text-sm disabled:opacity-50" disabled={!canReportRead} onClick={load}>
            Filtrar auditoría
          </button>
        </div>
        <div className="space-y-2">
          {auditRows.length === 0 ? (
            <p className="text-sm text-slate-500">Sin eventos de auditoría POS.</p>
          ) : auditRows.map((row) => (
            <div key={row.id} className="rounded border border-slate-200 p-2 text-sm">
              #{row.id} · {row.created_at} · {row.entity_type} · {row.action} · user {row.user_id ?? '-'}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-slate-900">Historial Cron Alerts</h3>
          <button className="rounded border border-slate-300 px-2 py-1 text-sm disabled:opacity-50" disabled={!canReportRead} onClick={load}>
            Refrescar
          </button>
        </div>
        <div className="space-y-2">
          {alertsCronHistoryRows.length === 0 ? (
            <p className="text-sm text-slate-500">Sin corridas de cron registradas.</p>
          ) : alertsCronHistoryRows.map((r) => (
            <div key={r.id} className="rounded border border-slate-200 p-2 text-xs">
              #{r.id} · {r.created_at} · mode {r.mode ?? '-'} · processed {r.processed ?? 0} · dispatched {r.dispatched ?? 0} · skipped {r.skipped ?? 0}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-slate-900">Historial Dispatch Crítico</h3>
          <div className="flex gap-2">
            <button className="rounded border border-slate-300 px-2 py-1 text-sm disabled:opacity-50" disabled={!canReportRead} onClick={load}>
              Refrescar historial
            </button>
            <button className="rounded border border-slate-300 px-2 py-1 text-sm disabled:opacity-50" disabled={!canReportExport} onClick={onExportDispatchHistoryCsv}>
              Exportar CSV
            </button>
          </div>
        </div>
        <div className="mb-3 grid gap-2 md:grid-cols-3">
          <input className="rounded border border-slate-300 p-2 text-sm" type="date" value={dispatchHistoryFilters.date_from} onChange={(e) => setDispatchHistoryFilters((s) => ({ ...s, date_from: e.target.value }))} />
          <input className="rounded border border-slate-300 p-2 text-sm" type="date" value={dispatchHistoryFilters.date_to} onChange={(e) => setDispatchHistoryFilters((s) => ({ ...s, date_to: e.target.value }))} />
          <button className="rounded border border-slate-300 p-2 text-sm disabled:opacity-50" disabled={!canReportRead} onClick={load}>
            Aplicar filtros
          </button>
        </div>
        <div className="space-y-2">
          {dispatchHistoryRows.length === 0 ? (
            <p className="text-sm text-slate-500">Sin dispatch crítico registrado.</p>
          ) : dispatchHistoryRows.map((r) => (
            <div key={r.id} className="rounded border border-slate-200 p-2 text-xs">
              #{r.id} · {r.created_at} · level {r.level ?? '-'} · reason {r.reason ?? '-'} · source {r.target_source ?? '-'} · target {r.target_label ?? '-'}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
