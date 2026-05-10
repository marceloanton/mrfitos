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
      <div className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm">
        <h2 className="text-2xl font-semibold">Pagos</h2>
        {canWrite && (
          <button
            className="rounded bg-brand-600 px-4 py-2 text-white"
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

      <div className="grid gap-3 rounded-xl bg-white p-4 shadow-sm md:grid-cols-3">
        <select className="rounded border p-2" value={method} onChange={(e) => setMethod(e.target.value)}>
          <option value="">Todos los métodos</option>
          <option value="cash">Efectivo</option>
          <option value="card">Tarjeta</option>
          <option value="transfer">Transferencia</option>
          <option value="mercadopago">Mercado Pago</option>
          <option value="other">Otro</option>
        </select>
        <button className="rounded border p-2" onClick={() => load(1)}>
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

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
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
                  <td className="p-3">{p.currency} {p.amount}</td>
                  <td className="p-3">{p.method}</td>
                  <td className="p-3">{p.status}</td>
                  <td className="p-3">{p.paid_at}</td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      {canWrite && (
                        <button
                          className="rounded border px-2 py-1"
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
                        <button className="rounded border border-red-300 px-2 py-1 text-red-700" onClick={() => onDelete(p.id)}>
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
          <form onSubmit={submit} className="grid w-full max-w-2xl gap-3 rounded-xl bg-white p-5 md:grid-cols-2">
            <input className="rounded border p-2" type="number" placeholder="Member ID" value={form.member_id} onChange={(e) => setForm((s) => ({ ...s, member_id: Number(e.target.value) }))} required />
            <input className="rounded border p-2" type="number" placeholder="Membership ID (opcional)" value={form.membership_id} onChange={(e) => setForm((s) => ({ ...s, membership_id: e.target.value === '' ? '' : Number(e.target.value) }))} />
            <input className="rounded border p-2" type="number" min="0.01" step="0.01" placeholder="Monto" value={form.amount} onChange={(e) => setForm((s) => ({ ...s, amount: Number(e.target.value) }))} required />
            <input className="rounded border p-2" placeholder="Moneda" value={form.currency} onChange={(e) => setForm((s) => ({ ...s, currency: e.target.value.toUpperCase() }))} required />
            <select className="rounded border p-2" value={form.method} onChange={(e) => setForm((s) => ({ ...s, method: e.target.value }))}><option value="cash">Efectivo</option><option value="card">Tarjeta</option><option value="transfer">Transferencia</option><option value="mercadopago">Mercado Pago</option><option value="other">Otro</option></select>
            <select className="rounded border p-2" value={form.status} onChange={(e) => setForm((s) => ({ ...s, status: e.target.value }))}><option value="pending">Pendiente</option><option value="paid">Pagado</option><option value="failed">Fallido</option><option value="refunded">Reembolsado</option></select>
            <input className="rounded border p-2" type="datetime-local" value={form.paid_at} onChange={(e) => setForm((s) => ({ ...s, paid_at: e.target.value }))} />
            <input className="rounded border p-2" placeholder="Referencia externa" value={form.external_reference} onChange={(e) => setForm((s) => ({ ...s, external_reference: e.target.value }))} />
            <textarea className="rounded border p-2 md:col-span-2" rows={3} placeholder="Notas" value={form.notes} onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))} />
            <div className="md:col-span-2 flex justify-end gap-2"><button type="button" className="rounded border px-4 py-2" onClick={() => setOpen(false)}>Cancelar</button><button type="submit" className="rounded bg-brand-600 px-4 py-2 text-white">Guardar</button></div>
          </form>
        </div>
      )}
    </section>
  );
}
