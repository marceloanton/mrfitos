import { useEffect, useState } from 'react';
import { checkInAttendance, checkOutAttendance, fetchAttendance } from '../services/attendanceService';
import { useAuthStore } from '../stores/authStore';
import PlanUpgradeAlert from '../components/PlanUpgradeAlert';
import PlanUpgradeModal from '../components/PlanUpgradeModal';
import { getPlanUpgradeInfo } from '../utils/planUpgrade';

export default function AttendancePage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canWrite = hasPermission('attendance.write');

  const [memberCode, setMemberCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [planUpgrade, setPlanUpgrade] = useState(null);
  const [isPlanUpgradeModalOpen, setIsPlanUpgradeModalOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ page: 1, per_page: 20, total: 0, total_pages: 1 });

  const today = new Date().toISOString().slice(0, 10);

  const load = async (page = 1) => {
    setLoading(true);
    setPlanUpgrade(null);
    try {
      const data = await fetchAttendance({ date: today, page, per_page: meta.per_page });
      setItems(data.items);
      setMeta(data.meta);
    } catch (err) {
      const upgradeInfo = getPlanUpgradeInfo(err);
      if (upgradeInfo) {
        setPlanUpgrade(upgradeInfo);
        setIsPlanUpgradeModalOpen(true);
        setError('');
        return;
      }
      setError(err?.response?.data?.message ?? 'No se pudo cargar asistencia');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
  }, []);

  const runCheckIn = async () => {
    setError('');
    setPlanUpgrade(null);
    setMessage('');
    if (!memberCode.trim()) {
      setError('Ingresá un código de socio');
      return;
    }
    setSubmitting(true);
    try {
      const res = await checkInAttendance({ member_code: memberCode, source: 'qr' });
      setMessage(`Check-in OK: ${res.member.name}`);
      setMemberCode('');
      load(1);
    } catch (err) {
      const upgradeInfo = getPlanUpgradeInfo(err);
      if (upgradeInfo) {
        setPlanUpgrade(upgradeInfo);
        setIsPlanUpgradeModalOpen(true);
        return;
      }
      setError(err?.response?.data?.message ?? 'Error en check-in');
    } finally {
      setSubmitting(false);
    }
  };

  const runCheckOut = async () => {
    setError('');
    setPlanUpgrade(null);
    setMessage('');
    if (!memberCode.trim()) {
      setError('Ingresá un código de socio');
      return;
    }
    setSubmitting(true);
    try {
      const res = await checkOutAttendance({ member_code: memberCode });
      setMessage(`Check-out OK: ${res.member.name}`);
      setMemberCode('');
      load(1);
    } catch (err) {
      const upgradeInfo = getPlanUpgradeInfo(err);
      if (upgradeInfo) {
        setPlanUpgrade(upgradeInfo);
        setIsPlanUpgradeModalOpen(true);
        return;
      }
      setError(err?.response?.data?.message ?? 'Error en check-out');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-4 py-4 text-slate-100">
          <p className="text-xs uppercase tracking-wide text-slate-300">Recepción</p>
          <h2 className="text-2xl font-semibold">Asistencia</h2>
          <p className="text-sm text-slate-300">Check-in / check-out rápido por código (base QR)</p>
        </div>
        <div className="px-4 py-3 text-xs text-slate-600">
          Fecha operativa: <span className="font-semibold text-slate-800">{today}</span>
        </div>
      </div>

      {canWrite && (
        <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-4">
          <input
            className="rounded-lg border border-slate-300 p-2.5 text-sm md:col-span-2"
            placeholder="Código de socio (Enter = Check-in)"
            value={memberCode}
            onChange={(e) => setMemberCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !submitting) {
                runCheckIn();
              }
            }}
          />
          <button
            disabled={submitting}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            onClick={runCheckIn}
          >
            {submitting ? 'Procesando...' : 'Check-in'}
          </button>
          <button
            disabled={submitting}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
            onClick={runCheckOut}
          >
            {submitting ? 'Procesando...' : 'Check-out'}
          </button>
        </div>
      )}

      {message && <p className="rounded bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
      <PlanUpgradeAlert info={planUpgrade} />
      <PlanUpgradeModal
        info={planUpgrade}
        isOpen={isPlanUpgradeModalOpen}
        onClose={() => setIsPlanUpgradeModalOpen(false)}
      />
      {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="p-3">Hora entrada</th>
              <th className="p-3">Hora salida</th>
              <th className="p-3">Estado</th>
              <th className="p-3">Socio</th>
              <th className="p-3">Código</th>
              <th className="p-3">Origen</th>
              <th className="p-3">Acceso</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="p-4" colSpan={7}>Cargando...</td></tr>
            ) : items.length === 0 ? (
              <tr><td className="p-4" colSpan={7}>Sin movimientos hoy</td></tr>
            ) : (
              items.map((a) => (
                <tr key={a.id} className="border-t">
                  <td className="p-3">{a.check_in_at}</td>
                  <td className="p-3">{a.check_out_at ?? '-'}</td>
                  <td className="p-3">
                    <span className={`rounded px-2 py-1 text-xs font-semibold ${a.check_out_at ? 'bg-slate-100 text-slate-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {a.check_out_at ? 'Finalizado' : 'En gimnasio'}
                    </span>
                  </td>
                  <td className="p-3">{a.first_name} {a.last_name}</td>
                  <td className="p-3">{a.member_code}</td>
                  <td className="p-3">
                    <span className="rounded bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-700">
                      {a.source}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`rounded px-2 py-1 text-xs font-semibold ${Number(a.access_granted) ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {Number(a.access_granted) ? 'Permitido' : 'Denegado'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-end gap-2">
        <button disabled={meta.page <= 1} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-50" onClick={() => load(meta.page - 1)}>Anterior</button>
        <span className="text-sm text-slate-600">Página {meta.page} de {meta.total_pages}</span>
        <button disabled={meta.page >= meta.total_pages} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-50" onClick={() => load(meta.page + 1)}>Siguiente</button>
      </div>
    </section>
  );
}
