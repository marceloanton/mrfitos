import { useEffect, useState } from 'react';
import { exportAddonCatalogAuditCsv, getAddonCatalog, getAddonCatalogAudit, updateAddonCatalogItem } from '../services/adminAddonsService';

export default function AdminModulesPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [rows, setRows] = useState([]);
  const [savingCode, setSavingCode] = useState('');
  const [exportingAudit, setExportingAudit] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditRows, setAuditRows] = useState([]);
  const [auditFilters, setAuditFilters] = useState({
    from: '',
    to: '',
    addon_code: '',
    page: 1,
    per_page: 10
  });
  const [auditMeta, setAuditMeta] = useState({ page: 1, total_pages: 1, total: 0 });
  const [historyActionKey, setHistoryActionKey] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const data = await getAddonCatalog();
      setRows(data.items);
    } catch (err) {
      setRows([]);
      setError(err?.response?.data?.message ?? 'No se pudo cargar catalogo de modulos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    loadAudit({ ...auditFilters });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAudit = async (nextFilters = auditFilters) => {
    setAuditLoading(true);
    try {
      const data = await getAddonCatalogAudit(nextFilters);
      setAuditRows(data.items);
      setAuditMeta(data.pagination);
    } catch (err) {
      setAuditRows([]);
      setError(err?.response?.data?.message ?? 'No se pudo cargar historial comercial.');
    } finally {
      setAuditLoading(false);
    }
  };

  const onFieldChange = (code, key, value) => {
    setRows((prev) =>
      prev.map((row) => (row.code === code ? { ...row, [key]: value } : row))
    );
  };

  const onSave = async (row) => {
    setSavingCode(row.code);
    setError('');
    setMessage('');
    try {
      const data = await updateAddonCatalogItem(row.code, {
        name: String(row.name ?? ''),
        description: String(row.description ?? ''),
        price_monthly: Number(row.price_monthly ?? 0),
        is_active: Boolean(row.is_active)
      });
      setRows(data.items);
      setMessage(`Módulo ${row.code} actualizado.`);
      await loadAudit({ ...auditFilters, page: 1 });
    } catch (err) {
      setError(err?.response?.data?.message ?? 'No se pudo actualizar el módulo.');
    } finally {
      setSavingCode('');
    }
  };

  const onExportAudit = async () => {
    setExportingAudit(true);
    setError('');
    try {
      const blob = await exportAddonCatalogAuditCsv({
        from: auditFilters.from || undefined,
        to: auditFilters.to || undefined,
        addon_code: auditFilters.addon_code || undefined,
        page: auditFilters.page,
        per_page: Math.max(auditFilters.per_page, 1000)
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'addon_catalog_audit.csv';
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err?.response?.data?.message ?? 'No se pudo exportar historial comercial CSV.');
    } finally {
      setExportingAudit(false);
    }
  };

  const applyQuickAction = async (row, mode) => {
    const catalogItem = rows.find((item) => item.code === row.addon_code);
    if (!catalogItem) {
      setError('No se encontró el módulo actual para aplicar la acción rápida.');
      return;
    }

    const actionKey = `${row.id}-${mode}`;
    setHistoryActionKey(actionKey);
    setError('');
    setMessage('');
    try {
      const payload = {
        name: String(catalogItem.name ?? ''),
        description: String(catalogItem.description ?? ''),
        price_monthly: Number(catalogItem.price_monthly ?? 0),
        is_active: Boolean(catalogItem.is_active)
      };

      if (mode === 'price') {
        payload.price_monthly = Number(row.before?.price_monthly ?? payload.price_monthly);
      }
      if (mode === 'status') {
        payload.is_active = Boolean(row.before?.is_active);
      }

      const data = await updateAddonCatalogItem(row.addon_code, payload);
      setRows(data.items);
      setMessage(`Acción aplicada sobre ${row.addon_code}.`);
      await loadAudit({ ...auditFilters, page: 1 });
    } catch (err) {
      setError(err?.response?.data?.message ?? 'No se pudo aplicar la acción rápida.');
    } finally {
      setHistoryActionKey('');
    }
  };

  const requestQuickAction = (row, mode) => {
    setConfirmAction({
      row,
      mode,
      label: mode === 'price' ? 'Revertir precio' : 'Revertir estado'
    });
  };

  const auditKpis = auditRows.reduce(
    (acc, row) => {
      const beforePrice = Number(row.before?.price_monthly ?? 0);
      const afterPrice = Number(row.after?.price_monthly ?? 0);
      const beforeActive = Boolean(row.before?.is_active);
      const afterActive = Boolean(row.after?.is_active);

      acc.total += 1;
      if (afterPrice > beforePrice) acc.priceUps += 1;
      if (afterPrice < beforePrice) acc.priceDowns += 1;
      if (!beforeActive && afterActive) acc.activations += 1;
      if (beforeActive && !afterActive) acc.deactivations += 1;
      return acc;
    },
    { total: 0, priceUps: 0, priceDowns: 0, activations: 0, deactivations: 0 }
  );

  return (
    <section className="space-y-4">
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="text-2xl font-semibold text-slate-900">Admin Modulos de Pago</h2>
        <p className="text-sm text-slate-600">Catalogo comercial de add-ons con adopcion por tenants.</p>
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <button className="rounded border border-slate-300 px-3 py-2 text-sm" onClick={load} disabled={loading}>
          {loading ? 'Actualizando...' : 'Refrescar'}
        </button>
      </div>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {message && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="p-3">Modulo</th>
              <th className="p-3">Codigo</th>
              <th className="p-3">Precio</th>
              <th className="p-3">Estado</th>
              <th className="p-3">Tenants activos</th>
              <th className="p-3">Features</th>
              <th className="p-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="p-3 text-slate-500" colSpan={7}>Cargando...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td className="p-3 text-slate-500" colSpan={7}>Sin modulos configurados</td></tr>
            ) : (
              rows.map((row) => (
                <tr key={row.code} className="border-t border-slate-100">
                  <td className="p-3">
                    <input
                      className="w-full rounded border border-slate-300 px-2 py-1 font-medium text-slate-900"
                      value={row.name ?? ''}
                      onChange={(e) => onFieldChange(row.code, 'name', e.target.value)}
                    />
                    <textarea
                      className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-xs text-slate-700"
                      rows={2}
                      value={row.description ?? ''}
                      onChange={(e) => onFieldChange(row.code, 'description', e.target.value)}
                    />
                  </td>
                  <td className="p-3">{row.code}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span>{row.currency}</span>
                      <input
                        className="w-28 rounded border border-slate-300 px-2 py-1"
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.price_monthly ?? 0}
                        onChange={(e) => onFieldChange(row.code, 'price_monthly', e.target.value)}
                      />
                    </div>
                  </td>
                  <td className="p-3">
                    <label className="inline-flex items-center gap-2 text-xs text-slate-700">
                      <input
                        type="checkbox"
                        checked={Boolean(row.is_active)}
                        onChange={(e) => onFieldChange(row.code, 'is_active', e.target.checked)}
                      />
                      {row.is_active ? 'Activo' : 'Inactivo'}
                    </label>
                  </td>
                  <td className="p-3">
                    <span className="rounded bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                      {Number(row.active_tenants ?? 0)}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(row.features ?? {}).map(([key, value]) => (
                        <span key={key} className={`rounded px-2 py-0.5 text-xs ${value ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                          {key}:{String(value)}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-3">
                    <button
                      className="rounded border border-slate-300 px-3 py-1 text-xs font-medium disabled:opacity-50"
                      onClick={() => onSave(row)}
                      disabled={savingCode === row.code}
                    >
                      {savingCode === row.code ? 'Guardando...' : 'Guardar'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Historial comercial</h3>
        <div className="grid gap-2 md:grid-cols-5">
          <input className="rounded border border-slate-300 p-2 text-sm" type="date" value={auditFilters.from} onChange={(e) => setAuditFilters((s) => ({ ...s, from: e.target.value }))} />
          <input className="rounded border border-slate-300 p-2 text-sm" type="date" value={auditFilters.to} onChange={(e) => setAuditFilters((s) => ({ ...s, to: e.target.value }))} />
          <input className="rounded border border-slate-300 p-2 text-sm" placeholder="addon_code" value={auditFilters.addon_code} onChange={(e) => setAuditFilters((s) => ({ ...s, addon_code: e.target.value }))} />
          <button className="rounded border border-slate-300 p-2 text-sm" onClick={() => { const next = { ...auditFilters, page: 1 }; setAuditFilters(next); loadAudit(next); }} disabled={auditLoading}>
            {auditLoading ? 'Consultando...' : 'Filtrar'}
          </button>
          <button className="rounded border border-slate-300 p-2 text-sm disabled:opacity-50" onClick={onExportAudit} disabled={exportingAudit}>
            {exportingAudit ? 'Exportando...' : 'Exportar CSV'}
          </button>
        </div>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <div className="grid gap-2 border-b border-slate-200 bg-slate-50 p-3 md:grid-cols-5">
            <article className="rounded bg-white p-2 text-sm">
              <p className="text-slate-500">Cambios</p>
              <p className="text-lg font-semibold text-slate-900">{auditKpis.total}</p>
            </article>
            <article className="rounded bg-white p-2 text-sm">
              <p className="text-slate-500">Subas precio</p>
              <p className="text-lg font-semibold text-emerald-700">{auditKpis.priceUps}</p>
            </article>
            <article className="rounded bg-white p-2 text-sm">
              <p className="text-slate-500">Bajas precio</p>
              <p className="text-lg font-semibold text-amber-700">{auditKpis.priceDowns}</p>
            </article>
            <article className="rounded bg-white p-2 text-sm">
              <p className="text-slate-500">Activaciones</p>
              <p className="text-lg font-semibold text-indigo-700">{auditKpis.activations}</p>
            </article>
            <article className="rounded bg-white p-2 text-sm">
              <p className="text-slate-500">Desactivaciones</p>
              <p className="text-lg font-semibold text-rose-700">{auditKpis.deactivations}</p>
            </article>
          </div>
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="p-2">Fecha</th>
                <th className="p-2">Módulo</th>
                <th className="p-2">Usuario</th>
                <th className="p-2">Precio</th>
                <th className="p-2">Estado</th>
                <th className="p-2">Acciones rápidas</th>
              </tr>
            </thead>
            <tbody>
              {auditLoading ? (
                <tr><td className="p-2 text-slate-500" colSpan={6}>Cargando...</td></tr>
              ) : auditRows.length === 0 ? (
                <tr><td className="p-2 text-slate-500" colSpan={6}>Sin movimientos</td></tr>
              ) : (
                auditRows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="p-2">{String(row.created_at || '').replace('T', ' ').slice(0, 19)}</td>
                    <td className="p-2">{row.addon_code || '-'}</td>
                    <td className="p-2">{row.user?.email || row.user?.name || '-'}</td>
                    <td className="p-2">{Number(row.before?.price_monthly ?? 0).toFixed(2)} → {Number(row.after?.price_monthly ?? 0).toFixed(2)}</td>
                    <td className="p-2">{String(row.before?.is_active)} → {String(row.after?.is_active)}</td>
                    <td className="p-2">
                      <div className="flex gap-2">
                        <button
                          className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-50"
                          onClick={() => requestQuickAction(row, 'price')}
                          disabled={historyActionKey === `${row.id}-price` || historyActionKey !== ''}
                        >
                          {historyActionKey === `${row.id}-price` ? 'Aplicando...' : 'Revertir precio'}
                        </button>
                        <button
                          className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-50"
                          onClick={() => requestQuickAction(row, 'status')}
                          disabled={historyActionKey === `${row.id}-status` || historyActionKey !== ''}
                        >
                          {historyActionKey === `${row.id}-status` ? 'Aplicando...' : 'Revertir estado'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>Página {auditMeta.page} de {auditMeta.total_pages} · Total {auditMeta.total}</span>
          <div className="flex gap-2">
            <button
              className="rounded border border-slate-300 px-3 py-1 disabled:opacity-50"
              disabled={auditLoading || auditMeta.page <= 1}
              onClick={() => {
                const next = { ...auditFilters, page: Math.max(1, auditMeta.page - 1) };
                setAuditFilters(next);
                loadAudit(next);
              }}
            >
              Anterior
            </button>
            <button
              className="rounded border border-slate-300 px-3 py-1 disabled:opacity-50"
              disabled={auditLoading || auditMeta.page >= auditMeta.total_pages}
              onClick={() => {
                const next = { ...auditFilters, page: Math.min(auditMeta.total_pages || 1, auditMeta.page + 1) };
                setAuditFilters(next);
                loadAudit(next);
              }}
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-4 shadow-xl">
            <h4 className="text-lg font-semibold text-slate-900">Confirmar acción</h4>
            <p className="mt-2 text-sm text-slate-600">
              Vas a aplicar <strong>{confirmAction.label}</strong> sobre <strong>{confirmAction.row?.addon_code}</strong>.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="rounded border border-slate-300 px-3 py-1 text-sm"
                onClick={() => setConfirmAction(null)}
              >
                Cancelar
              </button>
              <button
                className="rounded bg-slate-900 px-3 py-1 text-sm text-white"
                onClick={async () => {
                  const { row, mode } = confirmAction;
                  setConfirmAction(null);
                  await applyQuickAction(row, mode);
                }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
