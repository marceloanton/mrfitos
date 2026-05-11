export default function PosCashPanel({
  load,
  cashOperatorUserId,
  setCashOperatorUserId,
  cashSessions,
  onPrintCashReport,
  cashByOperator
}) {
  return (
    <>
      <div id="pos-caja" className="rounded-xl bg-white p-4 shadow-sm">
        <h3 className="mb-2 text-lg font-semibold text-slate-900">Últimos cierres de caja</h3>
        <div className="mb-3 flex items-center gap-2">
          <input
            className="w-32 rounded border border-slate-300 p-2 text-sm"
            placeholder="user_id"
            value={cashOperatorUserId}
            onChange={(e) => setCashOperatorUserId(e.target.value)}
          />
          <button className="rounded border border-slate-300 px-2 py-1 text-sm" onClick={load}>
            Filtrar operador
          </button>
        </div>
        <div className="space-y-2">
          {cashSessions.length === 0 ? (
            <p className="text-sm text-slate-500">Sin sesiones de caja.</p>
          ) : cashSessions.map((session) => (
            <div key={session.id} className="flex items-center justify-between gap-2 rounded border border-slate-200 p-2 text-sm">
              <span>
                #{session.id} · {session.status} · apertura {session.opening_amount} · esperado {session.expected_amount ?? '-'} · cierre {session.closing_amount ?? '-'} · diferencia {session.difference_amount ?? '-'}
              </span>
              <button className="rounded border border-slate-300 px-2 py-1" onClick={() => onPrintCashReport(session.id)}>
                Imprimir cierre
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h3 className="mb-2 text-lg font-semibold text-slate-900">Resumen caja por operador</h3>
        {cashByOperator?.summary ? (
          <div className="mb-3 text-sm text-slate-700">
            Sesiones: {cashByOperator.summary.sessions_count ?? 0} · Apertura: {cashByOperator.summary.opening_total ?? 0} · Esperado: {cashByOperator.summary.expected_total ?? 0} · Cierre: {cashByOperator.summary.closing_total ?? 0} · Diferencia: {cashByOperator.summary.difference_total ?? 0}
          </div>
        ) : (
          <p className="mb-3 text-sm text-slate-500">Sin resumen.</p>
        )}
        <div className="space-y-2">
          {Array.isArray(cashByOperator?.operators) && cashByOperator.operators.length > 0 ? cashByOperator.operators.map((row) => (
            <div key={String(row.user_id)} className="rounded border border-slate-200 p-2 text-sm">
              Usuario {row.user_id} · sesiones {row.sessions_count} · apertura {row.opening_total} · esperado {row.expected_total} · cierre {row.closing_total} · diferencia {row.difference_total}
            </div>
          )) : (
            <p className="text-sm text-slate-500">Sin datos por operador.</p>
          )}
        </div>
      </div>
    </>
  );
}

