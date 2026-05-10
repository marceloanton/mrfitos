import { useEffect, useMemo, useState } from 'react';
import {
  buildReminderBatch,
  fetchExpirations,
  fetchReminderBatchItems,
  fetchReminderBatches,
  updateReminderBatchItemStatus
} from '../services/remindersService';
import { useAuthStore } from '../stores/authStore';

const defaultTemplate = 'Hola {{name}}, te recordamos que tu plan {{plan_name}} vence el {{end_date}}. Si queres renovarlo, respondé este mensaje.';
function toFriendlyReminderError(err, fallback) {
  const apiMessage = err?.response?.data?.message;
  if (apiMessage === 'Monthly WhatsApp messages limit reached for current plan. Upgrade required.') {
    return 'Alcanzaste el límite mensual de mensajes WhatsApp de tu plan. Actualizá el plan para continuar.';
  }
  return apiMessage || fallback;
}

export default function RemindersPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canSend = hasPermission('whatsapp.send');

  const [days, setDays] = useState(3);
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState([]);
  const [template, setTemplate] = useState(defaultTemplate);
  const [batchItems, setBatchItems] = useState([]);
  const [batches, setBatches] = useState([]);
  const [activeBatchId, setActiveBatchId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState('');

  const selectedCount = useMemo(() => selected.length, [selected.length]);

  const load = async (nextDays = days) => {
    setLoading(true);
    setError('');
    setBatchItems([]);
    try {
      const data = await fetchExpirations(nextDays);
      setItems(data.items ?? []);
      setSelected([]);
    } catch (err) {
      setError(toFriendlyReminderError(err, 'No se pudieron cargar recordatorios'));
    } finally {
      setLoading(false);
    }
  };

  const loadBatches = async () => {
    try {
      const rows = await fetchReminderBatches();
      setBatches(rows ?? []);
    } catch {
      // silent
    }
  };

  useEffect(() => {
    load(3);
    loadBatches();
  }, []);

  const toggle = (membershipId) => {
    setSelected((prev) => (prev.includes(membershipId) ? prev.filter((x) => x !== membershipId) : [...prev, membershipId]));
  };

  const toggleAll = () => {
    if (selected.length === items.length) {
      setSelected([]);
      return;
    }
    setSelected(items.map((x) => x.membership_id));
  };

  const generateBatch = async () => {
    setError('');
    setBuilding(true);
    try {
      const data = await buildReminderBatch({ membership_ids: selected, template });
      setBatchItems(data.items ?? []);
      setActiveBatchId(data.batch_id ?? null);
      await loadBatches();
    } catch (err) {
      setError(toFriendlyReminderError(err, 'No se pudo generar el envío masivo'));
    } finally {
      setBuilding(false);
    }
  };

  const openBatch = async (batchId) => {
    setActiveBatchId(batchId);
    const rows = await fetchReminderBatchItems(batchId);
    setBatchItems(rows ?? []);
  };

  const markStatus = async (itemId, status) => {
    if (!activeBatchId) return;
    await updateReminderBatchItemStatus(activeBatchId, itemId, {
      send_status: status,
      error_message: status === 'error' ? 'Envío no realizado' : null
    });
    await openBatch(activeBatchId);
    await loadBatches();
  };

  return (
    <section className="space-y-4">
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="text-2xl font-semibold">WhatsApp Recordatorios</h2>
        <p className="text-sm text-slate-600">Seleccioná socios por vencer, personalizá plantilla y gestioná estado de envíos</p>
      </div>

      <div className="grid gap-3 rounded-xl bg-white p-4 shadow-sm md:grid-cols-4">
        <input className="rounded border p-2" type="number" min="0" max="30" value={days} onChange={(e) => setDays(Number(e.target.value))} />
        <button className="rounded border p-2" onClick={() => load(days)}>Buscar</button>
        <div className="md:col-span-2 text-sm text-slate-600">Seleccionados: {selectedCount}</div>
      </div>

      {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="p-3"><input type="checkbox" checked={items.length > 0 && selected.length === items.length} onChange={toggleAll} /></th>
              <th className="p-3">Socio</th><th className="p-3">Plan</th><th className="p-3">Vence</th><th className="p-3">Teléfono</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td className="p-4" colSpan={5}>Cargando...</td></tr> : items.length === 0 ? <tr><td className="p-4" colSpan={5}>No hay vencimientos en ese rango</td></tr> : items.map((r) => (
              <tr key={r.membership_id} className="border-t">
                <td className="p-3"><input type="checkbox" checked={selected.includes(r.membership_id)} onChange={() => toggle(r.membership_id)} /></td>
                <td className="p-3">{r.member_code} - {r.name}</td><td className="p-3">{r.plan_name}</td><td className="p-3">{r.end_date}</td><td className="p-3">{r.phone_normalized || r.phone || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canSend && (
        <div className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
          <h3 className="text-lg font-semibold">Plantilla y envío masivo</h3>
          <p className="text-sm text-slate-600">Variables: {'{{name}}'}, {'{{plan_name}}'}, {'{{end_date}}'}, {'{{member_code}}'}</p>
          <textarea className="w-full rounded border p-2" rows={4} value={template} onChange={(e) => setTemplate(e.target.value)} />
          <button className="rounded bg-brand-600 px-4 py-2 text-white disabled:opacity-50" disabled={selected.length === 0 || building} onClick={generateBatch}>{building ? 'Generando...' : 'Generar envíos'}</button>
        </div>
      )}

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h3 className="mb-2 text-lg font-semibold">Lotes</h3>
        <div className="flex flex-wrap gap-2">
          {batches.map((b) => (
            <button key={b.id} className="rounded border px-3 py-1 text-sm" onClick={() => openBatch(b.id)}>
              #{b.id} {b.status} ({b.sent_items}/{b.total_items})
            </button>
          ))}
          {batches.length === 0 && <span className="text-sm text-slate-500">Sin lotes aún</span>}
        </div>
      </div>

      {batchItems.length > 0 && (
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-lg font-semibold">Items del lote {activeBatchId}</h3>
          <div className="space-y-2">
            {batchItems.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded border p-2">
                <span className="text-sm">{item.membership_id} · {item.phone_normalized || 'sin teléfono'} · {item.send_status}</span>
                <div className="flex gap-2">
                  {item.whatsapp_link && <a className="rounded bg-emerald-600 px-3 py-1 text-white" href={item.whatsapp_link} target="_blank" rel="noreferrer">Abrir WhatsApp</a>}
                  {canSend && <button className="rounded border px-2 py-1 text-xs" onClick={() => markStatus(item.id, 'sent')}>Marcar enviado</button>}
                  {canSend && <button className="rounded border border-red-300 px-2 py-1 text-xs text-red-700" onClick={() => markStatus(item.id, 'error')}>Marcar error</button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
