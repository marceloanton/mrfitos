import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchDashboardMetrics } from '../services/dashboardService';
import { trackEvent } from '../services/trackingService';
import { useAuthStore } from '../stores/authStore';

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [metrics, setMetrics] = useState({
    active_members: 0,
    expiring_today: 0,
    revenue_month: 0,
    attendance_today: 0,
    currency: 'ARS',
    subscription: {
      plan_code: 'free',
      plan_name: 'Free',
      status: 'active',
      limits_health: { max_percent: 0, risk: 'low', items: [] }
    }
  });

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await fetchDashboardMetrics();
        setMetrics(data);
      } catch (err) {
        setError(err?.response?.data?.message ?? 'No se pudo cargar el dashboard');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const cards = [
    { label: 'Socios activos', value: metrics.active_members },
    { label: 'Vencen hoy', value: metrics.expiring_today },
    { label: 'Ingresos del mes', value: `${metrics.currency} ${Number(metrics.revenue_month).toLocaleString('es-AR')}` },
    { label: 'Asistencias hoy', value: metrics.attendance_today }
  ];

  const plan = metrics.subscription ?? {};
  const health = plan.limits_health ?? { max_percent: 0, risk: 'low', items: [] };
  const riskClass =
    health.risk === 'high'
      ? 'border-rose-300 bg-rose-50 text-rose-800'
      : health.risk === 'medium'
        ? 'border-amber-300 bg-amber-50 text-amber-800'
        : 'border-emerald-300 bg-emerald-50 text-emerald-800';

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Dashboard</h2>
          <p className="text-slate-600">Bienvenido {user?.name ?? 'Usuario'}</p>
        </div>
        <Link
          to="/billing/self-service"
          className={`rounded-lg border px-3 py-2 text-sm ${riskClass}`}
          onClick={() => {
            trackEvent('upgrade_badge_click', 'dashboard', {
              risk: health.risk ?? 'low',
              max_percent: Number(health.max_percent ?? 0)
            });
          }}
        >
          <p className="font-semibold">
            Plan {String(plan.plan_name ?? plan.plan_code ?? 'Free')} · Uso {Number(health.max_percent ?? 0)}%
          </p>
          <p className="text-xs">
            {health.risk === 'high'
              ? 'Riesgo alto de límite alcanzado. Recomendado: upgrade.'
              : health.risk === 'medium'
                ? 'Uso en zona de alerta. Revisar capacidad.'
                : 'Uso saludable del plan actual.'}
          </p>
        </Link>
      </div>

      {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <article key={card.label} className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold">{loading ? '...' : card.value}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
