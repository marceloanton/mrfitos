import { useMemo, useState } from 'react';
import { fetchRenewalsReport } from '../services/reportsService';

function downloadCsv(rows) {
  const headers = ['membership_id', 'end_date', 'member_code', 'name', 'phone', 'plan_name', 'reminder_status'];
  const csv = [headers.join(',')]
    .concat(rows.map((r) => headers.map((h) => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(',')))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `renewals_report_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);

  const [from, setFrom] = useState(firstDay);
  const [to, setTo] = useState(lastDay);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState(null);
  const [items, setItems] = useState([]);

  const cards = useMemo(() => {
    if (!summary) return [];
    return [
      { label: 'Renovaciones esperadas', value: summary.expected_renewals },
      { label: 'Enviados', value: summary.sent },
      { label: 'Pendientes', value: summary.pending + summary.not_sent },
      { label: 'Errores', value: summary.error }
    ];
  }, [summary]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchRenewalsReport({ from, to });
      setSummary(data.summary);
      setItems(data.items || []);
    } catch (err) {
      setError(err?.response?.data?.message ?? 'No se pudo cargar reporte');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-4">
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="text-2xl font-semibold">Reporte Comercial</h2>
        <p className="text-sm text-slate-600">Renovaciones esperadas y estado de recordatorios por período</p>
      </div>

      <div className="grid gap-3 rounded-xl bg-white p-4 shadow-sm md:grid-cols-5">
        <input className="rounded border p-2" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input className="rounded border p-2" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        <button className="rounded border p-2" onClick={load}>Consultar</button>
        <button className="rounded border p-2" onClick={() => downloadCsv(items)} disabled={items.length === 0}>Exportar CSV</button>
      </div>

      {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {cards.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <article key={card.label} className="rounded-xl bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">{card.label}</p>
              <p className="mt-2 text-2xl font-semibold">{card.value}</p>
            </article>
          ))}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="p-3">Vence</th><th className="p-3">Socio</th><th className="p-3">Plan</th><th className="p-3">Teléfono</th><th className="p-3">Estado recordatorio</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td className="p-4" colSpan={5}>Cargando...</td></tr> : items.length === 0 ? <tr><td className="p-4" colSpan={5}>Sin resultados</td></tr> : items.map((r) => (
              <tr key={r.membership_id} className="border-t">
                <td className="p-3">{r.end_date}</td>
                <td className="p-3">{r.member_code} - {r.name}</td>
                <td className="p-3">{r.plan_name}</td>
                <td className="p-3">{r.phone || '-'}</td>
                <td className="p-3">{r.reminder_status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
