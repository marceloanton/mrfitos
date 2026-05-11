import { useEffect, useMemo, useState } from 'react';
import {
  createMember,
  deleteMember,
  fetchMembers,
  updateMember
} from '../services/membersService';
import PlanUpgradeAlert from '../components/PlanUpgradeAlert';
import PlanUpgradeModal from '../components/PlanUpgradeModal';
import { getPlanUpgradeInfo } from '../utils/planUpgrade';

const emptyForm = {
  member_code: '',
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  birth_date: '',
  emergency_contact: '',
  notes: '',
  status: 'active'
};

const statusClass = (memberStatus) => {
  switch (memberStatus) {
    case 'active':
      return 'bg-emerald-100 text-emerald-700';
    case 'inactive':
      return 'bg-slate-200 text-slate-700';
    case 'frozen':
      return 'bg-amber-100 text-amber-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
};

const statusLabel = (memberStatus) => {
  if (memberStatus === 'active') return 'Activo';
  if (memberStatus === 'inactive') return 'Inactivo';
  if (memberStatus === 'frozen') return 'Congelado';
  return memberStatus;
};

export default function MembersPage() {
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ page: 1, per_page: 10, total: 0, total_pages: 1 });
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [planUpgrade, setPlanUpgrade] = useState(null);
  const [isPlanUpgradeModalOpen, setIsPlanUpgradeModalOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const canPrev = meta.page > 1;
  const canNext = meta.page < meta.total_pages;

  const load = async (page = meta.page) => {
    setLoading(true);
    setError('');
    setPlanUpgrade(null);
    try {
      const result = await fetchMembers({
        page,
        per_page: meta.per_page,
        q: q || undefined,
        status: status || undefined
      });
      setItems(result.items);
      setMeta(result.meta);
    } catch (err) {
      const upgradeInfo = getPlanUpgradeInfo(err);
      if (upgradeInfo) {
        setPlanUpgrade(upgradeInfo);
        setIsPlanUpgradeModalOpen(true);
        return;
      }
      setError(err?.response?.data?.message ?? 'No se pudo cargar socios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalLabel = useMemo(() => `${meta.total} socios`, [meta.total]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setPlanUpgrade(null);
    try {
      if (editing?.id) {
        await updateMember(editing.id, form);
      } else {
        await createMember(form);
      }
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
      await load(editing?.id ? meta.page : 1);
    } catch (err) {
      const upgradeInfo = getPlanUpgradeInfo(err);
      if (upgradeInfo) {
        setPlanUpgrade(upgradeInfo);
        setIsPlanUpgradeModalOpen(true);
        return;
      }
      setError(err?.response?.data?.message ?? 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const onEdit = (member) => {
    setEditing(member);
    setForm({
      member_code: member.member_code ?? '',
      first_name: member.first_name ?? '',
      last_name: member.last_name ?? '',
      email: member.email ?? '',
      phone: member.phone ?? '',
      birth_date: member.birth_date ?? '',
      emergency_contact: member.emergency_contact ?? '',
      notes: member.notes ?? '',
      status: member.status ?? 'active'
    });
    setOpen(true);
  };

  const onDelete = async (member) => {
    if (!window.confirm(`Eliminar socio ${member.first_name} ${member.last_name}?`)) return;
    try {
      await deleteMember(member.id);
      await load(meta.page);
    } catch (err) {
      const upgradeInfo = getPlanUpgradeInfo(err);
      if (upgradeInfo) {
        setPlanUpgrade(upgradeInfo);
        setIsPlanUpgradeModalOpen(true);
        return;
      }
      setError(err?.response?.data?.message ?? 'No se pudo eliminar');
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-gradient-to-r from-cyan-50 via-sky-50 to-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Socios</h2>
          <p className="text-sm text-slate-600">Gestión diaria de altas, estado y contacto</p>
          <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">
            {totalLabel}
          </p>
        </div>
        <button
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
          onClick={() => {
            setEditing(null);
            setForm(emptyForm);
            setOpen(true);
          }}
        >
          Nuevo socio
        </button>
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-4">
        <input
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2"
          placeholder="Buscar por nombre, código, email o teléfono"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Todos los estados</option>
          <option value="active">Activo</option>
          <option value="inactive">Inactivo</option>
          <option value="frozen">Congelado</option>
        </select>
        <button
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium transition hover:bg-slate-50"
          onClick={() => load(1)}
        >
          Filtrar
        </button>
      </div>

      <PlanUpgradeAlert info={planUpgrade} />
      <PlanUpgradeModal
        info={planUpgrade}
        isOpen={isPlanUpgradeModalOpen}
        onClose={() => setIsPlanUpgradeModalOpen(false)}
      />
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="p-3">Código</th>
              <th className="p-3">Nombre</th>
              <th className="p-3">Estado</th>
              <th className="p-3">Contacto</th>
              <th className="p-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="p-4" colSpan={5}>Cargando...</td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td className="p-4" colSpan={5}>Sin resultados</td>
              </tr>
            ) : (
              items.map((member) => (
                <tr key={member.id} className="border-t border-slate-100">
                  <td className="p-3 font-medium text-slate-700">{member.member_code}</td>
                  <td className="p-3">
                    <span className="font-medium text-slate-900">
                      {member.first_name} {member.last_name}
                    </span>
                  </td>
                  <td className="p-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusClass(member.status)}`}
                    >
                      {statusLabel(member.status)}
                    </span>
                  </td>
                  <td className="p-3">{member.email || member.phone || '-'}</td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium transition hover:bg-slate-50"
                        onClick={() => onEdit(member)}
                      >
                        Editar
                      </button>
                      <button
                        className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50"
                        onClick={() => onDelete(member)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          disabled={!canPrev}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium disabled:opacity-50"
          onClick={() => load(meta.page - 1)}
        >
          Anterior
        </button>
        <span className="text-sm text-slate-600">Página {meta.page} de {meta.total_pages}</span>
        <button
          disabled={!canNext}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium disabled:opacity-50"
          onClick={() => load(meta.page + 1)}
        >
          Siguiente
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={onSubmit}
            className="grid w-full max-w-2xl gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xl md:grid-cols-2"
          >
            <h3 className="text-xl font-semibold text-slate-900 md:col-span-2">
              {editing ? 'Editar socio' : 'Nuevo socio'}
            </h3>
            <input
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Código"
              value={form.member_code}
              disabled={Boolean(editing)}
              onChange={(e) => setForm((s) => ({ ...s, member_code: e.target.value }))}
              required
            />
            <select
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={form.status}
              onChange={(e) => setForm((s) => ({ ...s, status: e.target.value }))}
            >
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
              <option value="frozen">Congelado</option>
            </select>
            <input
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Nombre"
              value={form.first_name}
              onChange={(e) => setForm((s) => ({ ...s, first_name: e.target.value }))}
              required
            />
            <input
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Apellido"
              value={form.last_name}
              onChange={(e) => setForm((s) => ({ ...s, last_name: e.target.value }))}
              required
            />
            <input
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
            />
            <input
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Teléfono"
              value={form.phone}
              onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
            />
            <input
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Fecha nacimiento"
              type="date"
              value={form.birth_date}
              onChange={(e) => setForm((s) => ({ ...s, birth_date: e.target.value }))}
            />
            <input
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Contacto emergencia"
              value={form.emergency_contact}
              onChange={(e) => setForm((s) => ({ ...s, emergency_contact: e.target.value }))}
            />
            <textarea
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2"
              rows={3}
              placeholder="Observaciones"
              value={form.notes}
              onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
            />
            <div className="flex justify-end gap-2 md:col-span-2">
              <button
                type="button"
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
                disabled={saving}
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
