import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getOpenCashSessionSummary, getPosSummary } from '../services/posService';

export default function PosHomePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState({
    today_sales_count: 0,
    today_sales_total: 0,
    today_cash_collected: 0,
    pending_member_account_total: 0
  });
  const [openCash, setOpenCash] = useState(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError('');
      try {
        const [summaryData, openCashData] = await Promise.all([
          getPosSummary(),
          getOpenCashSessionSummary()
        ]);
        setSummary(summaryData ?? {});
        setOpenCash(openCashData?.session_id ? openCashData : null);
      } catch (err) {
        setError(err?.response?.data?.message ?? 'No se pudo cargar el inicio de POS');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  useEffect(() => {
    let timer = null;
    timer = window.setTimeout(() => {
      import('./PosPage');
    }, 300);
    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  const prefetchPosRuntime = () => {
    import('./PosPage');
  };

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-5 text-white shadow-sm">
        <p className="text-xs uppercase tracking-wide text-slate-300">POS Operativo</p>
        <h2 className="text-2xl font-semibold">Inicio de Recepción</h2>
        <p className="mt-1 text-sm text-slate-300">Acciones críticas del turno en un solo lugar.</p>
      </div>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Caja</p>
          <p className={`text-xl font-semibold ${openCash ? 'text-emerald-700' : 'text-rose-700'}`}>
            {loading ? '...' : openCash ? 'Abierta' : 'Cerrada'}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Ventas hoy</p>
          <p className="text-xl font-semibold text-slate-900">{loading ? '...' : summary.today_sales_count}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Facturación hoy</p>
          <p className="text-xl font-semibold text-slate-900">
            {loading ? '...' : `$${Number(summary.today_sales_total || 0).toFixed(2)}`}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Cuenta socio pendiente</p>
          <p className="text-xl font-semibold text-amber-700">
            {loading ? '...' : `$${Number(summary.pending_member_account_total || 0).toFixed(2)}`}
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Link
          to="/pos/caja"
          onMouseEnter={prefetchPosRuntime}
          onFocus={prefetchPosRuntime}
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
        >
          <p className="text-xs uppercase tracking-wide text-slate-500">Turno</p>
          <h3 className="text-xl font-semibold text-slate-900">Caja</h3>
          <p className="text-sm text-slate-600">Abrir/cerrar caja, cierre Z y resumen por operador.</p>
        </Link>
        <Link
          to="/pos/ventas"
          onMouseEnter={prefetchPosRuntime}
          onFocus={prefetchPosRuntime}
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
        >
          <p className="text-xs uppercase tracking-wide text-slate-500">Mostrador</p>
          <h3 className="text-xl font-semibold text-slate-900">Ventas</h3>
          <p className="text-sm text-slate-600">Crear venta, ticket, reimpresión y anulaciones.</p>
        </Link>
        <Link
          to="/pos/productos"
          onMouseEnter={prefetchPosRuntime}
          onFocus={prefetchPosRuntime}
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
        >
          <p className="text-xs uppercase tracking-wide text-slate-500">Inventario</p>
          <h3 className="text-xl font-semibold text-slate-900">Productos y Stock</h3>
          <p className="text-sm text-slate-600">Alta de productos, alertas de stock y movimientos.</p>
        </Link>
        <Link
          to="/pos/control"
          onMouseEnter={prefetchPosRuntime}
          onFocus={prefetchPosRuntime}
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
        >
          <p className="text-xs uppercase tracking-wide text-slate-500">Backoffice</p>
          <h3 className="text-xl font-semibold text-slate-900">Control y Riesgo</h3>
          <p className="text-sm text-slate-600">Auditoría, alertas críticas y seguimiento operativo.</p>
        </Link>
      </div>
    </section>
  );
}
