import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getCheckoutSession } from '../services/billingService';

const STATUS_CONFIG = {
  success: {
    title: 'Pago acreditado',
    fallbackStatus: 'approved',
    badgeClass: 'bg-emerald-100 text-emerald-800',
    boxClass: 'border-emerald-200 bg-emerald-50',
    description: 'Tu suscripción se procesó correctamente.'
  },
  failure: {
    title: 'Pago rechazado',
    fallbackStatus: 'rejected',
    badgeClass: 'bg-red-100 text-red-800',
    boxClass: 'border-red-200 bg-red-50',
    description: 'No pudimos confirmar el pago. Podés reintentar desde el checkout.'
  },
  pending: {
    title: 'Pago pendiente',
    fallbackStatus: 'pending',
    badgeClass: 'bg-amber-100 text-amber-800',
    boxClass: 'border-amber-200 bg-amber-50',
    description: 'Estamos esperando la confirmación del proveedor de pago.'
  }
};

function readProviderReference(searchParams) {
  return (
    searchParams.get('provider_reference') ||
    searchParams.get('external_reference') ||
    searchParams.get('pref_id') ||
    searchParams.get('id') ||
    ''
  ).trim();
}

function normalizeSession(raw, fallbackStatus) {
  if (!raw) {
    return {
      status: fallbackStatus,
      amount: null,
      checkoutUrl: '',
      providerReference: ''
    };
  }

  return {
    status: raw.status ?? fallbackStatus,
    amount: raw.amount ?? raw.total_amount ?? raw.price ?? null,
    checkoutUrl: raw.checkout_url ?? raw.url ?? '',
    providerReference: raw.provider_reference ?? raw.external_reference ?? raw.provider_preference_id ?? ''
  };
}

function amountLabel(amount) {
  if (amount === null || amount === undefined || amount === '') return 'No informado';
  const parsed = Number(amount);
  if (!Number.isFinite(parsed)) return String(amount);
  return `USD ${parsed.toFixed(2)}`;
}

export default function BillingReturnPage({ type }) {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState(null);
  const [error, setError] = useState('');
  const providerReference = useMemo(() => readProviderReference(searchParams), [searchParams]);
  const config = STATUS_CONFIG[type] ?? STATUS_CONFIG.pending;
  const hasToken = Boolean(localStorage.getItem('token'));

  useEffect(() => {
    let mounted = true;
    const fetchSession = async () => {
      if (!providerReference) {
        setSession(normalizeSession(null, config.fallbackStatus));
        return;
      }
      setLoading(true);
      setError('');
      try {
        const data = await getCheckoutSession(providerReference);
        if (mounted) setSession(normalizeSession(data, config.fallbackStatus));
      } catch (err) {
        if (mounted) {
          setError(err?.response?.data?.message ?? 'No se pudo consultar el estado actualizado del checkout.');
          setSession(normalizeSession({ provider_reference: providerReference }, config.fallbackStatus));
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchSession();
    return () => {
      mounted = false;
    };
  }, [config.fallbackStatus, providerReference]);

  const statusText = String(session?.status ?? config.fallbackStatus).toUpperCase();
  const canRetry = (type === 'failure' || type === 'pending') && Boolean(session?.checkoutUrl);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <article className={`w-full max-w-xl rounded-xl border p-6 shadow-sm ${config.boxClass}`}>
        <h1 className="text-2xl font-semibold text-slate-900">{config.title}</h1>
        <p className="mt-1 text-sm text-slate-700">{config.description}</p>

        <div className="mt-4 space-y-3 rounded-lg bg-white p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">Estado</span>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${config.badgeClass}`}>{statusText}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">Monto</span>
            <span className="text-sm font-semibold text-slate-900">{amountLabel(session?.amount)}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-slate-500">Referencia</span>
            <span className="truncate text-sm text-slate-700">{session?.providerReference || providerReference || 'Sin referencia'}</span>
          </div>
          {loading && <p className="text-xs text-slate-500">Consultando estado actualizado...</p>}
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white" to={hasToken ? '/dashboard' : '/login'}>
            {hasToken ? 'Ir al dashboard' : 'Volver al login'}
          </Link>
          <Link className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700" to="/pricing">
            Ver planes
          </Link>
          {canRetry && (
            <button
              className="rounded-lg border border-indigo-300 px-4 py-2 text-sm text-indigo-700"
              onClick={() => window.open(session.checkoutUrl, '_blank', 'noopener,noreferrer')}
            >
              Reintentar / abrir checkout
            </button>
          )}
        </div>
      </article>
    </div>
  );
}
