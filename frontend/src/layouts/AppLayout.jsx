import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { fetchDashboardMetrics } from '../services/dashboardService';
import { trackEvent } from '../services/trackingService';
import { useAuthStore } from '../stores/authStore';

export default function AppLayout() {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const switchGym = useAuthStore((state) => state.switchGym);
  const switchingGym = useAuthStore((state) => state.switchingGym);
  const user = useAuthStore((state) => state.user);
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canPosRead = hasPermission('pos.read') || hasPermission('payments.read');
  const token = useAuthStore((state) => state.token);
  const availableGyms = Array.isArray(user?.available_gyms) ? user.available_gyms : [];
  const [riskBanner, setRiskBanner] = useState(null);
  const [receptionNavMode, setReceptionNavMode] = useState(true);
  const receptionLegacyLayoutStorageKey = user
    ? `layout-reception-nav-v1:${user.id || user.email || 'user'}:${user.gym_id || 'gym'}`
    : null;
  const receptionLegacyPosStorageKey = user
    ? `pos-reception-mode-v1:${user.id || user.email || 'user'}:${user.gym_id || 'gym'}`
    : null;
  const receptionNavStorageKey = user
    ? `reception-mode-v1:${user.id || user.email || 'user'}:${user.gym_id || 'gym'}`
    : null;

  useEffect(() => {
    if (!receptionNavStorageKey) return;
    try {
      const raw = localStorage.getItem(receptionNavStorageKey)
        ?? localStorage.getItem(receptionLegacyLayoutStorageKey)
        ?? localStorage.getItem(receptionLegacyPosStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (typeof parsed?.enabled === 'boolean') {
        setReceptionNavMode(parsed.enabled);
      }
    } catch {
      // ignore corrupted localStorage
    }
  }, [receptionNavStorageKey, receptionLegacyLayoutStorageKey, receptionLegacyPosStorageKey]);

  useEffect(() => {
    if (!receptionNavStorageKey) return;
    try {
      localStorage.setItem(receptionNavStorageKey, JSON.stringify({ enabled: receptionNavMode }));
    } catch {
      // ignore write failure
    }
  }, [receptionNavStorageKey, receptionNavMode]);

  useEffect(() => {
    const onKeyDown = (event) => {
      const targetTag = event.target?.tagName?.toLowerCase();
      const isTypingContext = targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select' || event.target?.isContentEditable;
      if (isTypingContext) return;
      if (event.altKey && (event.key === 'r' || event.key === 'R')) {
        event.preventDefault();
        setReceptionNavMode((v) => !v);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    let alive = true;
    const loadRisk = async () => {
      if (!token || !hasPermission('dashboard.read')) return;
      try {
        const data = await fetchDashboardMetrics();
        const plan = data?.subscription ?? {};
        const health = plan?.limits_health ?? {};
        if (!alive) return;
        if (health?.risk === 'high') {
          setRiskBanner({
            planName: String(plan?.plan_name ?? plan?.plan_code ?? 'Free'),
            percent: Number(health?.max_percent ?? 0)
          });
        } else {
          setRiskBanner(null);
        }
      } catch {
        if (alive) setRiskBanner(null);
      }
    };

    loadRisk();
    return () => {
      alive = false;
    };
  }, [token, hasPermission, user?.tenant_id, user?.gym_id]);

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white px-6 py-4 print:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <h1 className="text-xl font-semibold text-slate-900">GymSaaS MVP</h1>
          <div className="flex items-center gap-2">
            <NavLink to="/dashboard" className="rounded px-3 py-2 text-sm hover:bg-slate-100">Dashboard</NavLink>
            {!receptionNavMode && <NavLink to="/pricing" className="rounded px-3 py-2 text-sm hover:bg-slate-100">Precios</NavLink>}
            {hasPermission('members.read') && <NavLink to="/members" className="rounded px-3 py-2 text-sm hover:bg-slate-100">Socios</NavLink>}
            {!receptionNavMode && hasPermission('plans.read') && <NavLink to="/plans" className="rounded px-3 py-2 text-sm hover:bg-slate-100">Planes</NavLink>}
            {!receptionNavMode && hasPermission('memberships.read') && <NavLink to="/memberships" className="rounded px-3 py-2 text-sm hover:bg-slate-100">Membresias</NavLink>}
            {hasPermission('payments.read') && <NavLink to="/payments" className="rounded px-3 py-2 text-sm hover:bg-slate-100">Pagos</NavLink>}
            {canPosRead && <NavLink to="/pos" className="rounded px-3 py-2 text-sm hover:bg-slate-100">POS</NavLink>}
            {hasPermission('attendance.read') && <NavLink to="/attendance" className="rounded px-3 py-2 text-sm hover:bg-slate-100">Asistencia</NavLink>}
            {hasPermission('whatsapp.read') && <NavLink to="/reminders" className="rounded px-3 py-2 text-sm hover:bg-slate-100">WhatsApp</NavLink>}
            {!receptionNavMode && hasPermission('reports.read') && <NavLink to="/reports" className="rounded px-3 py-2 text-sm hover:bg-slate-100">Reportes</NavLink>}
            {!receptionNavMode && <NavLink to="/operational-guide" className="rounded px-3 py-2 text-sm hover:bg-slate-100">Guía Operativa</NavLink>}
            {!receptionNavMode && hasPermission('subscriptions.manage') && <NavLink to="/admin/subscriptions" className="rounded px-3 py-2 text-sm hover:bg-slate-100">Admin Suscripción</NavLink>}
            {!receptionNavMode && hasPermission('subscriptions.manage') && <NavLink to="/admin/billing" className="rounded px-3 py-2 text-sm hover:bg-slate-100">Admin Billing</NavLink>}
            {!receptionNavMode && hasPermission('subscriptions.manage.catalog') && <NavLink to="/admin/modules" className="rounded px-3 py-2 text-sm hover:bg-slate-100">Admin Módulos</NavLink>}
            {!receptionNavMode && <NavLink to="/billing/self-service" className="rounded px-3 py-2 text-sm hover:bg-slate-100">Mi Plan</NavLink>}
            {availableGyms.length > 1 && (
              <select
                className="rounded border border-slate-300 px-2 py-2 text-sm"
                value={user?.gym_id ?? ''}
                disabled={switchingGym}
                onChange={async (e) => {
                  const ok = await switchGym(Number(e.target.value));
                  if (ok) navigate('/dashboard');
                }}
              >
                {availableGyms.map((gym) => (
                  <option key={gym.gym_id} value={gym.gym_id}>{gym.gym_name}</option>
                ))}
              </select>
            )}
            <button
              className={`rounded px-3 py-2 text-xs font-semibold ${
                receptionNavMode ? 'bg-emerald-600 text-white' : 'border border-slate-300 text-slate-700'
              }`}
              title="Atajo Alt+R"
              onClick={() => setReceptionNavMode((v) => !v)}
            >
              {receptionNavMode ? 'Modo Recepción ON' : 'Modo Recepción OFF'} · Alt+R
            </button>
            <button
              className="rounded border border-slate-300 px-3 py-2 text-sm"
              onClick={() => {
                logout();
                navigate('/login');
              }}
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      {switchingGym && <div className="border-b border-sky-200 bg-sky-50 px-6 py-2 text-sm text-sky-800 print:hidden">Cambiando sede...</div>}

      {riskBanner && (
        <div className="border-b border-rose-300 bg-rose-50 px-6 py-3 text-sm text-rose-900 print:hidden">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
            <p>Limite critico del plan {riskBanner.planName}: {riskBanner.percent}% de uso. Recomendado: upgrade inmediato.</p>
            <div className="flex gap-2">
              <NavLink
                to="/billing/self-service"
                className="rounded bg-rose-600 px-3 py-1 text-white"
                onClick={() => trackEvent('upgrade_banner_click', 'global_layout', { cta: 'mejorar_plan', percent: Number(riskBanner.percent ?? 0) })}
              >
                Mejorar plan
              </NavLink>
              <NavLink
                to="/pricing"
                className="rounded border border-rose-400 px-3 py-1"
                onClick={() => trackEvent('upgrade_banner_click', 'global_layout', { cta: 'ver_precios', percent: Number(riskBanner.percent ?? 0) })}
              >
                Ver precios
              </NavLink>
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-7xl p-6">
        <Outlet />
      </main>
    </div>
  );
}
