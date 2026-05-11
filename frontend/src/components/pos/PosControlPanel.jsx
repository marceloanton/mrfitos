export default function PosControlPanel({
  canReportRead,
  canReportExport,
  canCashManage,
  load,
  onNotifyAlertsWhatsapp,
  onDispatchCriticalAlert,
  newAlertContact,
  setNewAlertContact,
  onCreateAlertContact,
  selectedAlertContactId,
  setSelectedAlertContactId,
  alertContacts,
  onToggleAlertContact,
  onDeleteAlertContact,
  alertNotifyInfo,
  posAlerts,
  alertsStatus,
  alertFilters,
  setAlertFilters,
  onExportAuditCsv,
  auditFilters,
  setAuditFilters,
  auditRows,
  alertsCronHistoryRows,
  onExportDispatchHistoryCsv,
  dispatchHistoryFilters,
  setDispatchHistoryFilters,
  dispatchHistoryRows
}) {
  return (
    <>
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
    </>
  );
}

