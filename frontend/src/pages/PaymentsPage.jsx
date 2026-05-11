import { useEffect, useState } from 'react';
import { createPayment, deletePayment, fetchPayments, updatePayment } from '../services/paymentsService';
import PlanUpgradeAlert from '../components/PlanUpgradeAlert';
import PlanUpgradeModal from '../components/PlanUpgradeModal';
import { getPlanUpgradeInfo } from '../utils/planUpgrade';
import { useAuthStore } from '../stores/authStore';

const emptyForm = {
  member_id: '',
  membership_id: '',
  amount: '',
  currency: 'ARS',
  method: 'cash',
  status: 'paid',
  paid_at: '',
  external_reference: '',
  notes: ''
};

export default function PaymentsPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canWrite = hasPermission('payments.write');
  const canDelete = hasPermission('payments.delete');

  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ page: 1, per_page: 10, total: 0, total_pages: 1 });
  const [method, setMethod] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [planUpgrade, setPlanUpgrade] = useState(null);
  const [isPlanUpgradeModalOpen, setIsPlanUpgradeModalOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const statusClass = (status) => {
    if (status === 'paid') return 'bg-emerald-100 text-emerald-700';
    if (status === 'pending') return 'bg-amber-100 text-amber-800';
    if (status === 'failed') return 'bg-rose-100 text-rose-700';
    return 'bg-slate-100 text-slate-700';
  };
  const methodLabel = (method) => {
    if (method === 'cash') return 'Efectivo';
    if (method === 'card') return 'Tarjeta';
    if (method === 'transfer') return 'Transferencia';
    if (method === 'mercadopago') return 'Mercado Pago';
    return 'Otro';
  };

  const load = async (page = 1) => {
    setLoading(true);
    setError('');
    setPlanUpgrade(null);
    try {
      const data = await fetchPayments({ page, per_page: meta.per_page, method: method || undefined });
      setItems(data.items);
      setMeta(data.meta);
    } catch (err) {
      const upgradeInfo = getPlanUpgradeInfo(err);
      if (upgradeInfo) {
        setPlanUpgrade(upgradeInfo);
        setIsPlanUpgradeModalOpen(true);
        return;
      }
      setError(err?.response?.data?.message ?? 'No se pudo cargar pagos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setPlanUpgrade(null);
    try {
      if (editing?.id) await updatePayment(editing.id, form);
      else await createPayment(form);
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
      load(1);
    } catch (err) {
      const upgradeInfo = getPlanUpgradeInfo(err);
      if (upgradeInfo) {
        setPlanUpgrade(upgradeInfo);
        setIsPlanUpgradeModalOpen(true);
        return;
      }
      setError(err?.response?.data?.message ?? 'No se pudo guardar pago');
    }
  };

  const onDelete = async (id) => {
    if (!window.confirm('Eliminar pago?')) return;
    setPlanUpgrade(null);
    try {
      await deletePayment(id);
      load(meta.page);
    } catch (err) {
      const upgradeInfo = getPlanUpgradeInfo(err);
      if (upgradeInfo) {
        setPlanUpgrade(upgradeInfo);
        setIsPlanUpgradeModalOpen(true);
        return;
      }
      setError(err?.response?.data?.message ?? 'No se pudo eliminar pago');
    }
  };

  return (
    <section className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-4 py-4 text-slate-100">
          <p className="text-xs uppercase tracking-wide text-slate-300">Caja y Cobros</p>
          <h2 className="text-2xl font-semibold">Pagos</h2>
          <p className="text-sm text-slate-300">Registro operativo de cobros con filtros rápidos por método.</p>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <p className="text-xs text-slate-600">Total registros: <span className="font-semibold text-slate-800">{meta.total}</span></p>
          {canWrite && (
            <button
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
              onClick={() => {
                setForm(emptyForm);
                setEditing(null);
                setOpen(true);
              }}
            >
              Nuevo pago
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-3">
        <select className="rounded-lg border border-slate-300 p-2.5 text-sm" value={method} onChange={(e) => setMethod(e.target.value)}>
          <option value="">Todos los métodos</option>
          <option value="cash">Efectivo</option>
          <option value="card">Tarjeta</option>
          <option value="transfer">Transferencia</option>
          <option value="mercadopago">Mercado Pago</option>
          <option value="other">Otro</option>
        </select>
        <button className="rounded-lg border border-slate-300 p-2.5 text-sm font-medium text-slate-700" onClick={() => load(1)}>
          Filtrar
        </button>
      </div>

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
              <th className="p-3">Socio</th>
              <th className="p-3">Monto</th>
              <th className="p-3">Método</th>
              <th className="p-3">Estado</th>
              <th className="p-3">Fecha</th>
              <th className="p-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="p-4" colSpan={6}>Cargando...</td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td className="p-4" colSpan={6}>Sin resultados</td>
              </tr>
            ) : (
              items.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="p-3">{p.member_code} - {p.first_name} {p.last_name}</td>
                  <td className="p-3 font-semibold text-slate-900">{p.currency} {p.amount}</td>
                  <td className="p-3">
                    <span className="rounded bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-700">
                      {methodLabel(p.method)}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`rounded px-2 py-1 text-xs font-semibold ${statusClass(p.status)}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="p-3">{p.paid_at}</td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      {canWrite && (
                        <button
                          className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700"
                          onClick={() => {
                            setEditing(p);
                            setForm({
                              member_id: p.member_id,
                              membership_id: p.membership_id ?? '',
                              amount: p.amount,
                              currency: p.currency,
                              method: p.method,
                              status: p.status,
                              paid_at: (p.paid_at ?? '').replace(' ', 'T').slice(0, 16),
                              external_reference: p.external_reference ?? '',
                              notes: p.notes ?? ''
                            });
                            setOpen(true);
                          }}
                        >
                          Editar
                        </button>
                      )}
                      {canDelete && (
                        <button className="rounded-lg border border-red-300 px-2 py-1 text-xs font-semibold text-red-700" onClick={() => onDelete(p.id)}>
                          Eliminar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={submit} className="grid w-full max-w-2xl gap-3 rounded-xl border border-slate-200 bg-white p-5 md:grid-cols-2">
            <input className="rounded-lg border border-slate-300 p-2.5 text-sm" type="number" placeholder="Member ID" value={form.member_id} onChange={(e) => setForm((s) => ({ ...s, member_id: Number(e.target.value) }))} required />
            <input className="rounded-lg border border-slate-300 p-2.5 text-sm" type="number" placeholder="Membership ID (opcional)" value={form.membership_id} onChange={(e) => setForm((s) => ({ ...s, membership_id: e.target.value === '' ? '' : Number(e.target.value) }))} />
            <input className="rounded-lg border border-slate-300 p-2.5 text-sm" type="number" min="0.01" step="0.01" placeholder="Monto" value={form.amount} onChange={(e) => setForm((s) => ({ ...s, amount: Number(e.target.value) }))} required />
            <input className="rounded-lg border border-slate-300 p-2.5 text-sm" placeholder="Moneda" value={form.currency} onChange={(e) => setForm((s) => ({ ...s, currency: e.target.value.toUpperCase() }))} required />
            <select className="rounded-lg border border-slate-300 p-2.5 text-sm" value={form.method} onChange={(e) => setForm((s) => ({ ...s, method: e.target.value }))}><option value="cash">Efectivo</option><option value="card">Tarjeta</option><option value="transfer">Transferencia</option><option value="mercadopago">Mercado Pago</option><option value="other">Otro</option></select>
            <select className="rounded-lg border border-slate-300 p-2.5 text-sm" value={form.status} onChange={(e) => setForm((s) => ({ ...s, status: e.target.value }))}><option value="pending">Pendiente</option><option value="paid">Pagado</option><option value="failed">Fallido</option><option value="refunded">Reembolsado</option></select>
            <input className="rounded-lg border border-slate-300 p-2.5 text-sm" type="datetime-local" value={form.paid_at} onChange={(e) => setForm((s) => ({ ...s, paid_at: e.target.value }))} />
            <input className="rounded-lg border border-slate-300 p-2.5 text-sm" placeholder="Referencia externa" value={form.external_reference} onChange={(e) => setForm((s) => ({ ...s, external_reference: e.target.value }))} />
            <textarea className="rounded-lg border border-slate-300 p-2.5 text-sm md:col-span-2" rows={3} placeholder="Notas" value={form.notes} onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))} />
            <div className="md:col-span-2 flex justify-end gap-2">
              <button type="button" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700" onClick={() => setOpen(false)}>Cancelar</button>
              <button type="submit" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white">Guardar</button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
