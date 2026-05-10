import { useMemo, useState } from 'react';
import {
  createAddonCheckoutSession,
  createPlanCheckoutSession,
  getTenantSubscription,
  processExpiredTrials,
  startTenantTrial,
  updateTenantSubscription
} from '../services/subscriptionsService';
import {
  getTenantAddons,
  updateTenantAddonStatus
} from '../services/adminAddonsService';
import { trackEvent } from '../services/trackingService';

const PLAN_OPTIONS = [
  { value: 'free', label: 'Starter' },
  { value: 'pro', label: 'Pro' },
  { value: 'scale', label: 'Scale' }
];

function statusBadgeClass(status) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'active') return 'bg-emerald-100 text-emerald-800';
  if (normalized === 'trial') return 'bg-amber-100 text-amber-800';
  if (normalized === 'past_due') return 'bg-red-100 text-red-800';
  return 'bg-slate-100 text-slate-700';
}

function readCheckoutUrl(payload) {
  return payload?.checkout_url ?? payload?.url ?? payload?.checkoutUrl ?? '';
}

function formatLimitLabel(key) {
  return String(key).replaceAll('_', ' ');
}

function getUsageItems(limits, usage) {
  const mapping = [
    { limitKey: 'max_members', usageKey: 'active_members', label: 'members' },
    { limitKey: 'max_staff_users', usageKey: 'active_staff_users', label: 'staff users' },
    { limitKey: 'max_gyms', usageKey: 'active_gyms', label: 'gyms' },
    { limitKey: 'max_monthly_payments', usageKey: 'monthly_payments', label: 'monthly payments' },
    { limitKey: 'max_monthly_checkins', usageKey: 'monthly_checkins', label: 'monthly check-ins' }
  ];

  return mapping
    .filter((item) => Number(limits?.[item.limitKey] ?? 0) > 0)
    .map((item) => {
      const limit = Number(limits?.[item.limitKey] ?? 0);
      const current = Number(usage?.[item.usageKey] ?? 0);
      const percent = limit > 0 ? Math.min(100, Math.round((current / limit) * 100)) : 0;
      return { ...item, current, limit, percent };
    });
}

export default function AdminSubscriptionPage() {
  const [tenantId, setTenantId] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('free');
  const [subscription, setSubscription] = useState(null);
  const [addons, setAddons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [addonsLoading, setAddonsLoading] = useState(false);
  const [updatingAddonCode, setUpdatingAddonCode] = useState('');
  const [billingAction, setBillingAction] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [addonsMessage, setAddonsMessage] = useState('');
  const [addonsError, setAddonsError] = useState('');
  const [billingError, setBillingError] = useState('');
  const [billingMessage, setBillingMessage] = useState('');
  const [checkoutUrl, setCheckoutUrl] = useState('');

  const canQuery = tenantId.trim().length > 0 && !loading;
  const canUpdate = tenantId.trim().length > 0 && !updating && !loading;

  const limits = useMemo(() => subscription?.limits ?? {}, [subscription]);
  const usage = useMemo(() => subscription?.usage ?? {}, [subscription]);
  const usageItems = useMemo(() => getUsageItems(limits, usage), [limits, usage]);

  const resetBillingFeedback = () => {
    setBillingError('');
    setBillingMessage('');
  };

  const onQuery = async () => {
    if (!tenantId.trim()) return;
    setLoading(true);
    setError('');
    setSuccess('');
    setAddonsError('');
    setAddonsMessage('');
    resetBillingFeedback();
    setCheckoutUrl('');
    try {
      const normalizedTenantId = tenantId.trim();
      const [subscriptionData, addonsData] = await Promise.all([
        getTenantSubscription(normalizedTenantId),
        getTenantAddons(normalizedTenantId)
      ]);
      setSubscription(subscriptionData);
      setAddons(addonsData);
      if (subscriptionData?.plan_code) setSelectedPlan(String(subscriptionData.plan_code).toLowerCase());
    } catch (err) {
      setSubscription(null);
      setAddons([]);
      setError(err?.response?.data?.message ?? 'No se pudo consultar la suscripción del tenant.');
    } finally {
      setLoading(false);
    }
  };

  const onUpdate = async () => {
    if (!tenantId.trim()) return;
    setUpdating(true);
    setError('');
    setSuccess('');
    try {
      const data = await updateTenantSubscription(tenantId.trim(), selectedPlan);
      setSubscription(data);
      setSuccess('Plan actualizado correctamente.');
    } catch (err) {
      setError(err?.response?.data?.message ?? 'No se pudo actualizar el plan del tenant.');
    } finally {
      setUpdating(false);
    }
  };

  const onRefreshAddons = async () => {
    if (!tenantId.trim()) return;
    setAddonsLoading(true);
    setAddonsError('');
    setAddonsMessage('');
    try {
      const data = await getTenantAddons(tenantId.trim());
      setAddons(data);
      setAddonsMessage('Add-ons actualizados.');
    } catch (err) {
      setAddonsError(err?.response?.data?.message ?? 'No se pudieron cargar los add-ons del tenant.');
    } finally {
      setAddonsLoading(false);
    }
  };

  const onToggleAddon = async (addon) => {
    if (!tenantId.trim() || !addon?.code) return;
    setUpdatingAddonCode(addon.code);
    setAddonsError('');
    setAddonsMessage('');
    try {
      await updateTenantAddonStatus(tenantId.trim(), addon.code, !addon.active);
      const updated = await getTenantAddons(tenantId.trim());
      setAddons(updated);
      setAddonsMessage(`Add-on ${addon.name ?? addon.code} actualizado.`);
    } catch (err) {
      setAddonsError(err?.response?.data?.message ?? 'No se pudo actualizar el add-on.');
    } finally {
      setUpdatingAddonCode('');
    }
  };

  const onStartTrial = async () => {
    if (!tenantId.trim()) return;
    setBillingAction('start-trial');
    resetBillingFeedback();
    setCheckoutUrl('');
    try {
      await startTenantTrial(tenantId.trim(), 14);
      setBillingMessage('Trial de 14 dias iniciado correctamente.');
      await onQuery();
    } catch (err) {
      setBillingError(err?.response?.data?.message ?? 'No se pudo iniciar el trial.');
    } finally {
      setBillingAction('');
    }
  };

  const onCreatePlanCheckout = async () => {
    if (!tenantId.trim()) return;
    setBillingAction('checkout-plan');
    resetBillingFeedback();
    try {
      const data = await createPlanCheckoutSession(tenantId.trim(), 'pro', 'admin_subscription');
      const url = readCheckoutUrl(data);
      trackEvent('checkout_created', 'admin_subscription', {
        scope: 'plan',
        plan_code: 'pro',
        tenant_id: Number(tenantId.trim() || 0),
        has_url: Boolean(url)
      });
      setCheckoutUrl(url);
      setBillingMessage(url ? 'Checkout de upgrade generado.' : 'Checkout generado sin URL visible en la respuesta.');
    } catch (err) {
      setBillingError(err?.response?.data?.message ?? 'No se pudo crear checkout para upgrade.');
    } finally {
      setBillingAction('');
    }
  };

  const onCreateAddonCheckout = async (addonCode) => {
    if (!tenantId.trim() || !addonCode) return;
    setBillingAction(`checkout-addon-${addonCode}`);
    resetBillingFeedback();
    try {
      const data = await createAddonCheckoutSession(tenantId.trim(), addonCode, 'admin_subscription');
      const url = readCheckoutUrl(data);
      trackEvent('checkout_created', 'admin_subscription', {
        scope: 'addon',
        addon_code: addonCode,
        tenant_id: Number(tenantId.trim() || 0),
        has_url: Boolean(url)
      });
      setCheckoutUrl(url);
      setBillingMessage(url ? `Checkout de add-on ${addonCode} generado.` : 'Checkout generado sin URL visible en la respuesta.');
    } catch (err) {
      setBillingError(err?.response?.data?.message ?? 'No se pudo crear checkout del add-on.');
    } finally {
      setBillingAction('');
    }
  };

  const onProcessExpiredTrials = async () => {
    setBillingAction('process-expired-trials');
    resetBillingFeedback();
    try {
      const data = await processExpiredTrials();
      const processed = data?.processed ?? data?.total_processed ?? 0;
      setBillingMessage(`Proceso de trials expirados ejecutado. Registros procesados: ${processed}.`);
      if (tenantId.trim()) await onQuery();
    } catch (err) {
      setBillingError(err?.response?.data?.message ?? 'No se pudo ejecutar el proceso de trials expirados.');
    } finally {
      setBillingAction('');
    }
  };

  return (
    <section className="space-y-4">
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="text-2xl font-semibold text-slate-900">Suscripcion por tenant</h2>
        <p className="text-sm text-slate-600">Consultar, facturar y gestionar trial en tenants multi-sede.</p>
      </div>

      <div className="grid gap-3 rounded-xl bg-white p-4 shadow-sm md:grid-cols-4">
        <input
          className="rounded-lg border border-slate-300 p-2 md:col-span-2"
          placeholder="tenant_id"
          value={tenantId}
          onChange={(e) => setTenantId(e.target.value)}
        />
        <button
          className="rounded-lg border border-slate-300 p-2 disabled:opacity-50"
          disabled={!canQuery}
          onClick={onQuery}
        >
          {loading ? 'Consultando...' : 'Consultar'}
        </button>
      </div>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {success && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{success}</p>}
      {addonsError && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{addonsError}</p>}
      {addonsMessage && <p className="rounded-lg bg-sky-50 p-3 text-sm text-sky-700">{addonsMessage}</p>}
      {billingError && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{billingError}</p>}
      {billingMessage && <p className="rounded-lg bg-violet-50 p-3 text-sm text-violet-700">{billingMessage}</p>}

      {subscription && (
        <article className="space-y-4 rounded-xl bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-slate-500">Plan actual</p>
              <p className="text-xl font-semibold text-slate-900">{subscription.plan_name ?? subscription.plan_code ?? '-'}</p>
            </div>
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(subscription.status)}`}>
              {subscription.status ?? 'unknown'}
            </span>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-slate-200 p-3">
              <h3 className="mb-2 text-sm font-semibold text-slate-700">Limites</h3>
              <ul className="space-y-1 text-sm text-slate-600">
                {Object.keys(limits).length === 0 && <li>Sin limites reportados.</li>}
                {Object.entries(limits).map(([key, value]) => (
                  <li key={key} className="flex justify-between gap-2">
                    <span>{key}</span>
                    <span className="font-medium text-slate-900">{String(value)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg border border-slate-200 p-3">
              <h3 className="mb-2 text-sm font-semibold text-slate-700">Consumo</h3>
              {usageItems.length > 0 && (
                <div className="mb-3 space-y-2">
                  {usageItems.map((item) => (
                    <div key={item.usageKey}>
                      <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
                        <span className="capitalize">{item.label}</span>
                        <span className="font-semibold text-slate-800">
                          {item.current}/{item.limit} ({item.percent}%)
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-200">
                        <div
                          className={`h-2 rounded-full ${
                            item.percent >= 90 ? 'bg-rose-500' : item.percent >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${item.percent}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <ul className="space-y-1 text-sm text-slate-600">
                {Object.keys(usage).length === 0 && <li>Sin consumo reportado.</li>}
                {Object.entries(usage).map(([key, value]) => (
                  <li key={key} className="flex justify-between gap-2">
                    <span className="capitalize">{formatLimitLabel(key)}</span>
                    <span className="font-medium text-slate-900">{String(value)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="grid gap-3 border-t border-slate-200 pt-4 md:grid-cols-3">
            <select
              className="rounded-lg border border-slate-300 p-2"
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value)}
            >
              {PLAN_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              className="rounded-lg bg-brand-600 p-2 font-medium text-white disabled:opacity-50"
              disabled={!canUpdate}
              onClick={onUpdate}
            >
              {updating ? 'Actualizando...' : 'Actualizar plan'}
            </button>
            <button
              className="rounded-lg border border-indigo-300 p-2 text-indigo-700 disabled:opacity-50"
              disabled={!tenantId.trim() || billingAction === 'checkout-plan'}
              onClick={onCreatePlanCheckout}
            >
              {billingAction === 'checkout-plan' ? 'Generando checkout...' : 'Checkout upgrade Pro'}
            </button>
          </div>

          <div className="grid gap-3 border-t border-slate-200 pt-4 md:grid-cols-3">
            <button
              className="rounded-lg border border-amber-300 p-2 text-amber-700 disabled:opacity-50"
              disabled={!tenantId.trim() || billingAction === 'start-trial'}
              onClick={onStartTrial}
            >
              {billingAction === 'start-trial' ? 'Iniciando...' : 'Iniciar trial 14 dias'}
            </button>
            <button
              className="rounded-lg border border-rose-300 p-2 text-rose-700 disabled:opacity-50"
              disabled={billingAction === 'process-expired-trials'}
              onClick={onProcessExpiredTrials}
            >
              {billingAction === 'process-expired-trials' ? 'Procesando...' : 'Procesar trials expirados'}
            </button>
            <div className="rounded-lg border border-slate-200 p-2 text-xs text-slate-600">
              Tool admin para forzar vencimientos de trial y aplicar downgrade.
            </div>
          </div>

          {checkoutUrl && (
            <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3">
              <p className="text-xs font-semibold uppercase text-indigo-700">Checkout URL</p>
              <p className="mt-1 break-all text-sm text-indigo-900">{checkoutUrl}</p>
              <button
                className="mt-2 rounded-lg bg-indigo-600 px-3 py-1 text-sm font-medium text-white"
                onClick={() => window.open(checkoutUrl, '_blank', 'noopener,noreferrer')}
              >
                Abrir checkout
              </button>
            </div>
          )}

          <div className="space-y-3 border-t border-slate-200 pt-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-700">Add-ons del tenant</h3>
              <button
                className="rounded-lg border border-slate-300 px-3 py-1 text-sm disabled:opacity-50"
                disabled={!tenantId.trim() || addonsLoading}
                onClick={onRefreshAddons}
              >
                {addonsLoading ? 'Actualizando...' : 'Refrescar add-ons'}
              </button>
            </div>
            {addons.length === 0 ? (
              <p className="text-sm text-slate-500">No hay add-ons configurados para este tenant.</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {addons.map((addon) => (
                  <div key={addon.code} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900">{addon.name ?? addon.code}</p>
                        <p className="text-xs text-slate-500">{addon.description ?? 'Sin descripcion.'}</p>
                      </div>
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${addon.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        {addon.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <p className="text-sm text-slate-700">
                        Precio:{' '}
                        <span className="font-semibold text-slate-900">
                          {addon.price_label ?? addon.price ?? addon.monthly_price ?? 'N/D'}
                        </span>
                      </p>
                      <div className="flex gap-2">
                        <button
                          className="rounded-lg border border-slate-300 px-3 py-1 text-sm disabled:opacity-50"
                          disabled={updatingAddonCode === addon.code}
                          onClick={() => onToggleAddon(addon)}
                        >
                          {updatingAddonCode === addon.code
                            ? 'Guardando...'
                            : addon.active
                              ? 'Desactivar'
                              : 'Activar'}
                        </button>
                        {!addon.active && (
                          <button
                            className="rounded-lg border border-indigo-300 px-3 py-1 text-sm text-indigo-700 disabled:opacity-50"
                            disabled={billingAction === `checkout-addon-${addon.code}`}
                            onClick={() => onCreateAddonCheckout(addon.code)}
                          >
                            {billingAction === `checkout-addon-${addon.code}` ? 'Generando...' : 'Checkout'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </article>
      )}
    </section>
  );
}
