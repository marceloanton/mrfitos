import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchPublicPricingCatalog } from '../services/pricingService';

export default function PricingPage() {
  const [catalog, setCatalog] = useState({ plans: [], addons: [], source: 'api', todo: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadToken, setReloadToken] = useState(0);

  const loadCatalog = useCallback(async (mountedRef) => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchPublicPricingCatalog();
      if (mountedRef.current) setCatalog(data);
    } catch (loadError) {
      if (mountedRef.current) {
        const apiMessage = loadError?.response?.data?.message;
        setError(apiMessage || 'No se pudo cargar el catalogo desde /public/pricing.');
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const mountedRef = { current: true };
    let mounted = true;
    mountedRef.current = mounted;
    loadCatalog(mountedRef);
    return () => {
      mounted = false;
      mountedRef.current = false;
    };
  }, [loadCatalog, reloadToken]);

  return (
    <section className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">MRAnalytics GymSaaS</p>
          <h1 className="text-4xl font-bold">Planes y Add-ons</h1>
          <p className="max-w-2xl text-slate-300">Empezá con Starter y escalá por resultados: menos mora, más renovaciones y más control operativo.</p>
          <div className="flex gap-3">
            <Link className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950" to="/login">
              Ingresar
            </Link>
            <Link className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-100" to="/dashboard">
              Ir al panel
            </Link>
          </div>
        </header>

        {loading && <p className="rounded-lg border border-slate-800 bg-slate-900 p-4 text-sm">Cargando precios...</p>}
        {error && (
          <div className="rounded-lg border border-red-800 bg-red-950/40 p-4 text-sm text-red-200">
            <p>{error}</p>
            <button
              className="mt-3 rounded-lg border border-red-500 px-3 py-2 text-xs font-semibold text-red-100 transition hover:bg-red-900/40"
              onClick={() => setReloadToken((value) => value + 1)}
              type="button"
            >
              Reintentar
            </button>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {catalog.plans.map((plan) => (
            <article key={plan.code} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-sm uppercase tracking-wide text-cyan-300">{plan.code}</p>
              <h2 className="mt-1 text-2xl font-bold">{plan.name ?? plan.code}</h2>
              <p className="mt-1 text-lg font-semibold text-cyan-200">{plan.price_label ?? plan.price ?? 'Consultar'}</p>
              <p className="mt-3 text-sm text-slate-300">{plan.description ?? 'Sin descripcion.'}</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-200">
                {Object.entries(plan.features ?? {})
                  .filter(([, enabled]) => Boolean(enabled))
                  .map(([feature]) => (
                    <li key={`${plan.code}-${feature}`}>• {String(feature)}</li>
                  ))}
              </ul>
            </article>
          ))}
        </div>

        <div className="space-y-3">
          <h3 className="text-xl font-semibold">Add-ons</h3>
          <div className="grid gap-4 md:grid-cols-3">
            {catalog.addons.map((addon) => (
              <article key={addon.code} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-sm font-semibold">{addon.name ?? addon.code}</p>
                <p className="mt-1 text-sm text-cyan-200">{addon.price_label ?? addon.price ?? 'Consultar'}</p>
                <p className="mt-2 text-xs text-slate-300">{addon.description ?? 'Sin descripcion.'}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
