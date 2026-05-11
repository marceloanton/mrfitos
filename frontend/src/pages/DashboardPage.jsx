import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchDashboardMetrics } from '../services/dashboardService';
import { trackEvent } from '../services/trackingService';
import { useAuthStore } from '../stores/authStore';
import { inferHudRole } from '../utils/roleProfile';

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const hasPermission = useAuthStore((state) => state.hasPermission);
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
  const permissions = user?.permissions ?? [];
  const hudRole = inferHudRole(permissions);

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
    { label: 'Socios activos', value: metrics.active_members, tone: 'bg-emerald-500' },
    { label: 'Vencen hoy', value: metrics.expiring_today, tone: 'bg-amber-500' },
    { label: 'Ingresos del mes', value: `${metrics.currency} ${Number(metrics.revenue_month).toLocaleString('es-AR')}`, tone: 'bg-indigo-500' },
    { label: 'Asistencias hoy', value: metrics.attendance_today, tone: 'bg-sky-500' }
  ];
  const operationalWidgets = [
    {
      label: 'Check-ins en tiempo real',
      value: loading ? '...' : metrics.attendance_today,
      hint: 'Flujo actual de ingresos',
      tone: 'border-emerald-200 bg-emerald-50'
    },
    {
      label: 'Reservas próximas',
      value: loading ? '...' : Math.max(0, Math.round(Number(metrics.attendance_today || 0) * 0.6)),
      hint: 'Estimación operativa próxima hora',
      tone: 'border-sky-200 bg-sky-50'
    },
    {
      label: 'Alertas de capacidad',
      value: loading ? '...' : (Number(metrics.attendance_today || 0) > 120 ? 'Alta' : 'Normal'),
      hint: 'Monitoreo de aforo',
      tone: Number(metrics.attendance_today || 0) > 120 ? 'border-rose-200 bg-rose-50' : 'border-amber-200 bg-amber-50'
    },
    {
      label: 'Cobros del día',
      value: loading ? '...' : `${metrics.currency} ${Math.round(Number(metrics.revenue_month || 0) / 30).toLocaleString('es-AR')}`,
      hint: 'Caja estimada diaria',
      tone: 'border-violet-200 bg-violet-50'
    }
  ];

  const quickActions = [
    { label: 'Check-in rápido', to: '/attendance', show: hasPermission('attendance.write') },
    { label: 'Nueva membresía', to: '/memberships', show: hasPermission('memberships.write') },
    { label: 'Registrar pago', to: '/payments', show: hasPermission('payments.write') },
    { label: 'Ventas POS', to: '/pos', show: hasPermission('pos.read') || hasPermission('payments.read') },
    { label: 'WhatsApp vencimientos', to: '/reminders', show: hasPermission('whatsapp.read') },
    { label: 'Reportes rápidos', to: '/reports', show: hasPermission('reports.read') }
  ].filter((item) => item.show);

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
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-5 py-4 text-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-300">Panel Operativo</p>
              <h2 className="text-2xl font-semibold">Dashboard</h2>
              <p className="text-sm text-slate-300">Bienvenido {user?.name ?? 'Usuario'}</p>
            </div>
            <p className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-100 ring-1 ring-white/20">
              HUD {hudRole.label}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
          <p className="text-xs text-slate-500">Turno operativo activo. Revisá alertas y ejecutá acciones rápidas.</p>
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
      </div>

      {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <article key={card.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-slate-500">{card.label}</p>
              <span className={`h-2.5 w-2.5 rounded-full ${card.tone}`} />
            </div>
            <p className="mt-2 text-2xl font-semibold">{loading ? '...' : card.value}</p>
          </article>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Acciones rápidas</h3>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              to={action.to}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-100"
            >
              {action.label}
            </Link>
          ))}
          {quickActions.length === 0 && <p className="text-sm text-slate-500">Sin acciones disponibles para este rol.</p>}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Widgets diarios</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {operationalWidgets.map((widget) => (
            <article key={widget.label} className={`rounded-lg border p-3 ${widget.tone}`}>
              <p className="text-xs text-slate-600">{widget.label}</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{widget.value}</p>
              <p className="mt-1 text-xs text-slate-500">{widget.hint}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
