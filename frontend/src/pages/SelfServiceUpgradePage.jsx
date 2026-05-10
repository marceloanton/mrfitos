import { useEffect, useMemo, useState } from 'react';
import { createAddonCheckoutSession, createPlanCheckoutSession, getTenantSubscription } from '../services/subscriptionsService';
import { getSelfServiceAddons } from '../services/adminAddonsService';
import { trackEvent } from '../services/trackingService';
import { useAuthStore } from '../stores/authStore';

function readCheckoutUrl(payload) {
  return payload?.checkout_url ?? payload?.url ?? payload?.checkoutUrl ?? '';
}

function statusBadgeClass(status) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'active') return 'bg-emerald-100 text-emerald-800';
  if (normalized === 'trial') return 'bg-amber-100 text-amber-800';
  if (normalized === 'past_due') return 'bg-red-100 text-red-800';
  return 'bg-slate-100 text-slate-700';
}

export default function SelfServiceUpgradePage() {
  const user = useAuthStore((state) => state.user);
  const tenantId = String(user?.tenant_id ?? localStorage.getItem('tenant_id') ?? '');
  const [subscription, setSubscription] = useState(null);
  const [addons, setAddons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [checkoutUrl, setCheckoutUrl] = useState('');
  const [billingAction, setBillingAction] = useState('');

  const usage = useMemo(() => subscription?.usage ?? {}, [subscription]);

  const loadData = async () => {
    if (!tenantId) return;
    setLoading(true);
    setError('');
    try {
      const [subscriptionData, addonsData] = await Promise.all([
        getTenantSubscription(tenantId),
        getSelfServiceAddons(tenantId)
      ]);
      setSubscription(subscriptionData);
      setAddons(addonsData);
    } catch (err) {
      setError(err?.response?.data?.message ?? 'No se pudo cargar tu suscripción actual.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [tenantId]);

  const onUpgradePlan = async () => {
    if (!tenantId) return;
    setBillingAction('plan-pro');
    setError('');
    setMessage('');
    setCheckoutUrl('');
    try {
      const data = await createPlanCheckoutSession(tenantId, 'pro', 'self_service_upgrade');
      const url = readCheckoutUrl(data);
      trackEvent('checkout_created', 'self_service_upgrade', {
        scope: 'plan',
        plan_code: 'pro',
        tenant_id: Number(tenantId || 0),
        has_url: Boolean(url)
      });
      setCheckoutUrl(url);
      setMessage(url ? 'Checkout Pro generado. Completa el pago para activar.' : 'Checkout generado sin URL visible.');
    } catch (err) {
      setError(err?.response?.data?.message ?? 'No se pudo generar checkout de Pro.');
    } finally {
      setBillingAction('');
    }
  };

  const onUpgradeAddon = async (addonCode) => {
    if (!tenantId || !addonCode) return;
    setBillingAction(`addon-${addonCode}`);
    setError('');
    setMessage('');
    setCheckoutUrl('');
    try {
      const data = await createAddonCheckoutSession(tenantId, addonCode, 'self_service_upgrade');
      const url = readCheckoutUrl(data);
      trackEvent('checkout_created', 'self_service_upgrade', {
        scope: 'addon',
        addon_code: addonCode,
        tenant_id: Number(tenantId || 0),
        has_url: Boolean(url)
      });
      setCheckoutUrl(url);
      setMessage(url ? `Checkout para add-on ${addonCode} generado.` : 'Checkout generado sin URL visible.');
    } catch (err) {
      setError(err?.response?.data?.message ?? 'No se pudo generar checkout de add-on.');
    } finally {
      setBillingAction('');
    }
  };

  return (
    <section className="space-y-4">
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="text-2xl font-semibold text-slate-900">Mi plan y upgrades</h2>
        <p className="text-sm text-slate-600">Autogestión de upgrade a Pro y activación de add-ons.</p>
      </div>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {message && <p className="rounded-lg bg-indigo-50 p-3 text-sm text-indigo-700">{message}</p>}

      {loading && <p className="rounded-xl bg-white p-4 text-sm text-slate-600 shadow-sm">Cargando suscripción...</p>}

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

          <div className="rounded-lg border border-slate-200 p-3">
            <h3 className="mb-2 text-sm font-semibold text-slate-700">Uso actual</h3>
            <ul className="space-y-1 text-sm text-slate-600">
              {Object.entries(usage).length === 0 && <li>Sin datos de uso.</li>}
              {Object.entries(usage).map(([key, value]) => (
                <li key={key} className="flex justify-between gap-2">
                  <span>{key}</span>
                  <span className="font-medium text-slate-900">{String(value)}</span>
                </li>
              ))}
            </ul>
          </div>

          {String(subscription.plan_code ?? '').toLowerCase() !== 'pro' && (
            <button
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              disabled={billingAction === 'plan-pro'}
              onClick={onUpgradePlan}
            >
              {billingAction === 'plan-pro' ? 'Generando checkout...' : 'Upgrade a Pro'}
            </button>
          )}

          <div className="space-y-3 border-t border-slate-200 pt-4">
            <h3 className="text-sm font-semibold text-slate-700">Add-ons disponibles</h3>
            {addons.length === 0 ? (
              <p className="text-sm text-slate-500">Sin add-ons configurados.</p>
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
                      <p className="text-sm text-slate-700">{addon.price_label ?? addon.price ?? addon.monthly_price ?? 'N/D'}</p>
                      {!addon.active && (
                        <button
                          className="rounded-lg border border-indigo-300 px-3 py-1 text-sm text-indigo-700 disabled:opacity-50"
                          disabled={billingAction === `addon-${addon.code}`}
                          onClick={() => onUpgradeAddon(addon.code)}
                        >
                          {billingAction === `addon-${addon.code}` ? 'Generando...' : 'Activar add-on'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
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
        </article>
      )}
    </section>
  );
}
