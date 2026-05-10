import { useEffect, useState } from 'react';
import { createMembership, deleteMembership, fetchMemberships, updateMembership } from '../services/membershipsService';
import { useAuthStore } from '../stores/authStore';

const emptyForm = {
  member_id: '',
  plan_id: '',
  start_date: '',
  end_date: '',
  status: 'active',
  auto_renew: 0
};

export default function MembershipsPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canWrite = hasPermission('memberships.write');
  const canDelete = hasPermission('memberships.delete');

  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ page: 1, per_page: 10, total: 0, total_pages: 1 });
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const load = async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchMemberships({ page, per_page: meta.per_page, status: status || undefined });
      setItems(data.items);
      setMeta(data.meta);
    } catch (err) {
      setError(err?.response?.data?.message ?? 'No se pudo cargar membresías');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(1); }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (editing?.id) await updateMembership(editing.id, form);
      else await createMembership(form);
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
      load(1);
    } catch (err) {
      setError(err?.response?.data?.message ?? 'No se pudo guardar membresía');
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm">
        <h2 className="text-2xl font-semibold">Membresías</h2>
        {canWrite && <button className="rounded bg-brand-600 px-4 py-2 text-white" onClick={() => { setForm(emptyForm); setEditing(null); setOpen(true); }}>Nueva membresía</button>}
      </div>

      <div className="grid gap-3 rounded-xl bg-white p-4 shadow-sm md:grid-cols-3">
        <select className="rounded border p-2" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Todos</option>
          <option value="active">Activa</option>
          <option value="expired">Vencida</option>
          <option value="cancelled">Cancelada</option>
          <option value="paused">Pausada</option>
        </select>
        <button className="rounded border p-2" onClick={() => load(1)}>Filtrar</button>
      </div>

      {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="p-3">Socio</th><th className="p-3">Plan</th><th className="p-3">Inicio</th><th className="p-3">Fin</th><th className="p-3">Estado</th><th className="p-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td className="p-4" colSpan={6}>Cargando...</td></tr> : items.length === 0 ? <tr><td className="p-4" colSpan={6}>Sin resultados</td></tr> : items.map((m) => (
              <tr key={m.id} className="border-t">
                <td className="p-3">{m.member_code} - {m.first_name} {m.last_name}</td>
                <td className="p-3">{m.plan_name}</td>
                <td className="p-3">{m.start_date}</td>
                <td className="p-3">{m.end_date}</td>
                <td className="p-3">{m.status}</td>
                <td className="p-3"><div className="flex gap-2">{canWrite && <button className="rounded border px-2 py-1" onClick={() => { setEditing(m); setForm({ member_id: m.member_id, plan_id: m.plan_id, start_date: m.start_date, end_date: m.end_date, status: m.status, auto_renew: Number(m.auto_renew) }); setOpen(true); }}>Editar</button>}{canDelete && <button className="rounded border border-red-300 px-2 py-1 text-red-700" onClick={async () => { if (!window.confirm('Eliminar membresía?')) return; await deleteMembership(m.id); load(meta.page); }}>Eliminar</button>}</div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={submit} className="grid w-full max-w-2xl gap-3 rounded-xl bg-white p-5 md:grid-cols-2">
            <input className="rounded border p-2" type="number" placeholder="Member ID" value={form.member_id} onChange={(e) => setForm((s) => ({ ...s, member_id: Number(e.target.value) }))} required />
            <input className="rounded border p-2" type="number" placeholder="Plan ID" value={form.plan_id} onChange={(e) => setForm((s) => ({ ...s, plan_id: Number(e.target.value) }))} required />
            <input className="rounded border p-2" type="date" value={form.start_date} onChange={(e) => setForm((s) => ({ ...s, start_date: e.target.value }))} required />
            <input className="rounded border p-2" type="date" value={form.end_date} onChange={(e) => setForm((s) => ({ ...s, end_date: e.target.value }))} required />
            <select className="rounded border p-2" value={form.status} onChange={(e) => setForm((s) => ({ ...s, status: e.target.value }))}>
              <option value="active">Activa</option><option value="expired">Vencida</option><option value="cancelled">Cancelada</option><option value="paused">Pausada</option>
            </select>
            <select className="rounded border p-2" value={form.auto_renew} onChange={(e) => setForm((s) => ({ ...s, auto_renew: Number(e.target.value) }))}>
              <option value={0}>Sin renovación automática</option><option value={1}>Renovación automática</option>
            </select>
            <div className="md:col-span-2 flex justify-end gap-2"><button type="button" className="rounded border px-4 py-2" onClick={() => setOpen(false)}>Cancelar</button><button type="submit" className="rounded bg-brand-600 px-4 py-2 text-white">Guardar</button></div>
          </form>
        </div>
      )}
    </section>
  );
}
