export default function PosSalesPanel({
  receiptNumber,
  setReceiptNumber,
  onReprintByReceiptNumber,
  sales,
  canReportRead,
  canVoid,
  onPrintSaleTicket,
  onVoidSale
}) {
  return (
    <div id="pos-ventas" className="rounded-xl bg-white p-4 shadow-sm">
      <h3 className="mb-2 text-lg font-semibold text-slate-900">Últimas ventas POS</h3>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          className="rounded border border-slate-300 p-2 text-sm"
          placeholder="N° comprobante (ej: POS-001-00000025)"
          value={receiptNumber}
          onChange={(e) => setReceiptNumber(e.target.value)}
        />
        <button className="rounded border border-slate-300 px-2 py-1 text-sm" onClick={() => onReprintByReceiptNumber('58')}>
          Reimprimir 58mm
        </button>
        <button className="rounded border border-slate-300 px-2 py-1 text-sm" onClick={() => onReprintByReceiptNumber('80')}>
          Reimprimir 80mm
        </button>
      </div>
      <div className="space-y-2">
        {sales.length === 0 ? (
          <p className="text-sm text-slate-500">Sin ventas.</p>
        ) : sales.map((sale) => (
          <div key={sale.id} className="flex items-center justify-between gap-2 rounded border border-slate-200 p-2 text-sm">
            <span>
              {sale.receipt_number ?? `#${sale.id}`} · {sale.total_amount} {sale.currency} · {sale.charge_mode} · {sale.member_code ? `${sale.member_code} ${sale.first_name} ${sale.last_name}` : 'sin socio'}
            </span>
            <div className="flex gap-1">
              <button className="rounded border border-slate-300 px-2 py-1 disabled:opacity-50" disabled={!canReportRead} onClick={() => onPrintSaleTicket(sale.id, '58')}>
                Ticket 58mm
              </button>
              <button className="rounded border border-slate-300 px-2 py-1 disabled:opacity-50" disabled={!canReportRead} onClick={() => onPrintSaleTicket(sale.id, '80')}>
                Ticket 80mm
              </button>
              <button className="rounded border border-red-300 px-2 py-1 text-red-700 disabled:opacity-50" disabled={!canVoid} onClick={() => onVoidSale(sale)}>
                Anular
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

