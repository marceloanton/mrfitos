import { useEffect, useMemo, useState } from 'react';
import { createPlan, deletePlan, fetchPlans, updatePlan } from '../services/plansService';
import { useAuthStore } from '../stores/authStore';

const emptyForm = {
  code: '',
  name: '',
  description: '',
  duration_days: 30,
  price: 0,
  currency: 'ARS',
  billing_cycle: 'monthly',
  is_active: 1
};

export default function PlansPage() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canWrite = hasPermission('plans.write');
  const canDelete = hasPermission('plans.delete');
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ page: 1, per_page: 10, total: 0, total_pages: 1 });
  const [q, setQ] = useState('');
  const [isActive, setIsActive] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = async (page = meta.page) => {
    setLoading(true);
    setError('');
    try {
      const result = await fetchPlans({
        page,
        per_page: meta.per_page,
        q: q || undefined,
        is_active: isActive === '' ? undefined : isActive
      });
      setItems(result.items);
      setMeta(result.meta);
    } catch (err) {
      setError(err?.response?.data?.message ?? 'No se pudo cargar planes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
  }, []);

  const totalLabel = useMemo(() => `${meta.total} planes`, [meta.total]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editing?.id) {
        await updatePlan(editing.id, form);
      } else {
        await createPlan(form);
      }
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
      await load(1);
    } catch (err) {
      setError(err?.response?.data?.message ?? 'No se pudo guardar plan');
    } finally {
      setSaving(false);
    }
  };

  const onEdit = (plan) => {
    setEditing(plan);
    setForm({
      code: plan.code,
      name: plan.name,
      description: plan.description ?? '',
      duration_days: Number(plan.duration_days),
      price: Number(plan.price),
      currency: plan.currency,
      billing_cycle: plan.billing_cycle,
      is_active: Number(plan.is_active)
    });
    setOpen(true);
  };

  const onDelete = async (plan) => {
    if (!window.confirm(`Eliminar plan ${plan.name}?`)) return;
    try {
      await deletePlan(plan.id);
      await load(meta.page);
    } catch (err) {
      setError(err?.response?.data?.message ?? 'No se pudo eliminar plan');
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Planes</h2>
          <p className="text-sm text-slate-600">{totalLabel}</p>
        </div>
        {canWrite && (
          <button
            className="rounded-lg bg-brand-600 px-4 py-2 text-white"
            onClick={() => {
              setEditing(null);
              setForm(emptyForm);
              setOpen(true);
            }}
          >
            Nuevo plan
          </button>
        )}
      </div>

      <div className="grid gap-3 rounded-xl bg-white p-4 shadow-sm md:grid-cols-4">
        <input className="rounded-lg border border-slate-300 p-2 md:col-span-2" placeholder="Buscar por nombre o código" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="rounded-lg border border-slate-300 p-2" value={isActive} onChange={(e) => setIsActive(e.target.value)}>
          <option value="">Todos</option>
          <option value="1">Activos</option>
          <option value="0">Inactivos</option>
        </select>
        <button className="rounded-lg border border-slate-300 p-2" onClick={() => load(1)}>Filtrar</button>
      </div>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="p-3">Código</th>
              <th className="p-3">Plan</th>
              <th className="p-3">Duración</th>
              <th className="p-3">Precio</th>
              <th className="p-3">Estado</th>
              <th className="p-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="p-4" colSpan={6}>Cargando...</td></tr>
            ) : items.length === 0 ? (
              <tr><td className="p-4" colSpan={6}>Sin resultados</td></tr>
            ) : (
              items.map((plan) => (
                <tr key={plan.id} className="border-t border-slate-100">
                  <td className="p-3">{plan.code}</td>
                  <td className="p-3">{plan.name}</td>
                  <td className="p-3">{plan.duration_days} días</td>
                  <td className="p-3">{plan.currency} {plan.price}</td>
                  <td className="p-3">{Number(plan.is_active) ? 'Activo' : 'Inactivo'}</td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      {canWrite && <button className="rounded border border-slate-300 px-2 py-1" onClick={() => onEdit(plan)}>Editar</button>}
                      {canDelete && <button className="rounded border border-red-300 px-2 py-1 text-red-700" onClick={() => onDelete(plan)}>Eliminar</button>}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-end gap-2">
        <button disabled={meta.page <= 1} className="rounded border border-slate-300 px-3 py-1 disabled:opacity-50" onClick={() => load(meta.page - 1)}>Anterior</button>
        <span className="text-sm text-slate-600">Página {meta.page} de {meta.total_pages}</span>
        <button disabled={meta.page >= meta.total_pages} className="rounded border border-slate-300 px-3 py-1 disabled:opacity-50" onClick={() => load(meta.page + 1)}>Siguiente</button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={onSubmit} className="grid w-full max-w-2xl gap-3 rounded-xl bg-white p-5 shadow-xl md:grid-cols-2">
            <h3 className="md:col-span-2 text-xl font-semibold">{editing ? 'Editar plan' : 'Nuevo plan'}</h3>
            <input className="rounded border p-2" placeholder="Código" value={form.code} disabled={Boolean(editing)} onChange={(e) => setForm((s) => ({ ...s, code: e.target.value }))} required />
            <input className="rounded border p-2" placeholder="Nombre" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} required />
            <input className="rounded border p-2" type="number" min="1" placeholder="Duración en días" value={form.duration_days} onChange={(e) => setForm((s) => ({ ...s, duration_days: Number(e.target.value) }))} required />
            <input className="rounded border p-2" type="number" step="0.01" min="0" placeholder="Precio" value={form.price} onChange={(e) => setForm((s) => ({ ...s, price: Number(e.target.value) }))} required />
            <input className="rounded border p-2" placeholder="Moneda" value={form.currency} onChange={(e) => setForm((s) => ({ ...s, currency: e.target.value.toUpperCase() }))} required />
            <select className="rounded border p-2" value={form.billing_cycle} onChange={(e) => setForm((s) => ({ ...s, billing_cycle: e.target.value }))}>
              <option value="one_time">Único</option>
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensual</option>
              <option value="yearly">Anual</option>
            </select>
            <select className="rounded border p-2" value={form.is_active} onChange={(e) => setForm((s) => ({ ...s, is_active: Number(e.target.value) }))}>
              <option value={1}>Activo</option>
              <option value={0}>Inactivo</option>
            </select>
            <textarea className="rounded border p-2 md:col-span-2" rows={3} placeholder="Descripción" value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} />
            <div className="md:col-span-2 flex justify-end gap-2">
              <button type="button" className="rounded border px-4 py-2" onClick={() => setOpen(false)}>Cancelar</button>
              <button type="submit" className="rounded bg-brand-600 px-4 py-2 text-white" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
