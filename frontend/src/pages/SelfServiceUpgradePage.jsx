import { useEffect, useMemo, useState } from 'react';
import { createAddonCheckoutSession, createPlanCheckoutSession, getTenantSubscription } from '../services/subscriptionsService';
import { getSelfServiceAddons } from '../services/adminAddonsService';
import { trackEvent } from '../services/trackingService';
import { useAuthStore } from '../stores/authStore';

function readCheckoutUrl(payload) {
  return payload?.checkout_url ?? payload?.url ?? payload?.checkoutUrl ?? '';
}

function normalizeActionSuffix(actionKey = '') {
  return String(actionKey).trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
}

function statusBadgeClass(status) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'active') return 'bg-emerald-100 text-emerald-800';
  if (normalized === 'trial') return 'bg-amber-100 text-amber-800';
  if (normalized === 'past_due') return 'bg-red-100 text-red-800';
  return 'bg-slate-100 text-slate-700';
}

function getUsageItems(limits, usage) {
  const mapping = [
    { limitKey: 'max_members', usageKey: 'active_members', label: 'Socios activos' },
    { limitKey: 'max_staff_users', usageKey: 'active_staff_users', label: 'Usuarios staff' },
    { limitKey: 'max_gyms', usageKey: 'active_gyms', label: 'Sedes activas' },
    { limitKey: 'max_monthly_payments', usageKey: 'monthly_payments', label: 'Pagos mensuales' },
    { limitKey: 'max_monthly_checkins', usageKey: 'monthly_checkins', label: 'Check-ins mensuales' },
    { limitKey: 'max_monthly_pos_sales', usageKey: 'monthly_pos_sales', label: 'Ventas POS mensuales' },
    { limitKey: 'max_monthly_whatsapp_messages', usageKey: 'monthly_whatsapp_messages', label: 'Mensajes WhatsApp mensuales' },
    { limitKey: 'max_monthly_reports_queries', usageKey: 'monthly_reports_queries', label: 'Consultas de reportes mensuales' }
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
  const limits = useMemo(() => subscription?.limits ?? {}, [subscription]);
  const usageItems = useMemo(() => getUsageItems(limits, usage), [limits, usage]);
  const highestUsagePercent = useMemo(
    () => usageItems.reduce((acc, item) => (item.percent > acc ? item.percent : acc), 0),
    [usageItems]
  );
  const topUsageItem = useMemo(
    () => usageItems.reduce((acc, item) => (!acc || item.percent > acc.percent ? item : acc), null),
    [usageItems]
  );
  const whatsappAddon = useMemo(
    () => (Array.isArray(addons) ? addons.find((addon) => String(addon.code || '').toLowerCase() === 'whatsapp') : null),
    [addons]
  );
  const currentPlanCode = String(subscription?.plan_code ?? '').toLowerCase();
  const recommendedAction = useMemo(() => {
    if (!topUsageItem || topUsageItem.percent < 75) return null;
    if (topUsageItem.limitKey === 'max_monthly_whatsapp_messages' && whatsappAddon && !whatsappAddon.active) {
      return {
        type: 'addon',
        label: 'Activar add-on WhatsApp',
        description: `Tu uso de ${topUsageItem.label.toLowerCase()} está al ${topUsageItem.percent}%.`,
        actionKey: `addon-${whatsappAddon.code}`,
        addonCode: whatsappAddon.code
      };
    }
    if (currentPlanCode === 'free') {
      return {
        type: 'plan',
        label: 'Upgrade a Pro',
        description: `Tu uso de ${topUsageItem.label.toLowerCase()} está al ${topUsageItem.percent}%.`,
        actionKey: 'plan-pro'
      };
    }
    if (currentPlanCode === 'pro') {
      return {
        type: 'plan',
        label: 'Upgrade a Scale',
        description: `Tu uso de ${topUsageItem.label.toLowerCase()} está al ${topUsageItem.percent}%.`,
        actionKey: 'plan-scale'
      };
    }
    return null;
  }, [topUsageItem, whatsappAddon, currentPlanCode]);

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

  const onUpgradePlan = async (source = 'standard') => {
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
        source,
        tenant_id: Number(tenantId || 0),
        has_url: Boolean(url)
      });
      if (source === 'recommended') {
        trackEvent('checkout_created_recommended_plan_pro', 'self_service_upgrade', {
          action_key: 'plan-pro',
          tenant_id: Number(tenantId || 0),
          has_url: Boolean(url)
        });
      }
      setCheckoutUrl(url);
      setMessage(url ? 'Checkout Pro generado. Completa el pago para activar.' : 'Checkout generado sin URL visible.');
    } catch (err) {
      setError(err?.response?.data?.message ?? 'No se pudo generar checkout de Pro.');
    } finally {
      setBillingAction('');
    }
  };

  const onUpgradeScale = async (source = 'standard') => {
    if (!tenantId) return;
    setBillingAction('plan-scale');
    setError('');
    setMessage('');
    setCheckoutUrl('');
    try {
      const data = await createPlanCheckoutSession(tenantId, 'scale', 'self_service_upgrade');
      const url = readCheckoutUrl(data);
      trackEvent('checkout_created', 'self_service_upgrade', {
        scope: 'plan',
        plan_code: 'scale',
        source,
        tenant_id: Number(tenantId || 0),
        has_url: Boolean(url)
      });
      if (source === 'recommended') {
        trackEvent('checkout_created_recommended_plan_scale', 'self_service_upgrade', {
          action_key: 'plan-scale',
          tenant_id: Number(tenantId || 0),
          has_url: Boolean(url)
        });
      }
      setCheckoutUrl(url);
      setMessage(url ? 'Checkout Scale generado. Completa el pago para activar.' : 'Checkout generado sin URL visible.');
    } catch (err) {
      setError(err?.response?.data?.message ?? 'No se pudo generar checkout de Scale.');
    } finally {
      setBillingAction('');
    }
  };

  const onUpgradeAddon = async (addonCode, source = 'standard') => {
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
        source,
        tenant_id: Number(tenantId || 0),
        has_url: Boolean(url)
      });
      if (source === 'recommended') {
        trackEvent(`checkout_created_recommended_addon_${normalizeActionSuffix(addonCode)}`, 'self_service_upgrade', {
          action_key: `addon-${addonCode}`,
          addon_code: addonCode,
          tenant_id: Number(tenantId || 0),
          has_url: Boolean(url)
        });
      }
      setCheckoutUrl(url);
      setMessage(url ? `Checkout para add-on ${addonCode} generado.` : 'Checkout generado sin URL visible.');
    } catch (err) {
      setError(err?.response?.data?.message ?? 'No se pudo generar checkout de add-on.');
    } finally {
      setBillingAction('');
    }
  };

  const onRecommendedActionClick = () => {
    if (!recommendedAction) return;
    const actionKey = String(recommendedAction.actionKey || '');
    const actionSuffix = normalizeActionSuffix(actionKey);
    trackEvent('upgrade_recommended_cta_click', 'self_service_upgrade', {
      action_key: actionKey,
      action_type: recommendedAction.type,
      top_limit_key: topUsageItem?.limitKey ?? null,
      top_usage_percent: Number(topUsageItem?.percent ?? 0),
      tenant_id: Number(tenantId || 0)
    });
    trackEvent(`upgrade_recommended_cta_click_${actionSuffix}`, 'self_service_upgrade', {
      action_key: actionKey,
      action_type: recommendedAction.type,
      tenant_id: Number(tenantId || 0)
    });
    if (recommendedAction.type === 'addon' && recommendedAction.addonCode) {
      onUpgradeAddon(recommendedAction.addonCode, 'recommended');
      return;
    }
    if (recommendedAction.actionKey === 'plan-scale') {
      onUpgradeScale('recommended');
      return;
    }
    onUpgradePlan('recommended');
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
            <div className="space-y-2">
              {usageItems.length === 0 && <p className="text-sm text-slate-500">Sin límites configurados para este plan.</p>}
              {usageItems.map((item) => (
                <div key={item.limitKey} className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>{item.label}</span>
                    <span className="font-semibold text-slate-900">{item.current}/{item.limit} ({item.percent}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div
                      className={`h-2 rounded-full ${item.percent >= 90 ? 'bg-red-500' : item.percent >= 75 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {highestUsagePercent >= 75 && String(subscription.plan_code ?? '').toLowerCase() !== 'scale' && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
              <p className="text-sm font-semibold text-amber-800">
                Estás usando {highestUsagePercent}% de tu plan. Recomendado: upgrade preventivo.
              </p>
            </div>
          )}

          {recommendedAction && (
            <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3">
              <p className="text-sm font-semibold text-indigo-900">Acción recomendada</p>
              <p className="text-sm text-indigo-800">{recommendedAction.description}</p>
              <button
                className="mt-2 rounded-lg bg-indigo-600 px-3 py-1 text-sm font-semibold text-white disabled:opacity-50"
                disabled={billingAction === recommendedAction.actionKey}
                onClick={onRecommendedActionClick}
              >
                {billingAction === recommendedAction.actionKey ? 'Generando checkout...' : recommendedAction.label}
              </button>
            </div>
          )}

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
