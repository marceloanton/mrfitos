import { useEffect, useState } from 'react';
import { adjustStock, closeCashSession, createPosProduct, createPosSale, getCashSessionReport, getOpenCashSessionSummary, getPosConfig, getPosSaleReceipt, getPosSaleReceiptByNumber, getPosSummary, getPosZCloseReport, listCashSessions, listMemberAccountCharges, listPosProducts, listPosSales, listStockMovements, openCashSession, settleMemberAccountCharge, updatePosConfig } from '../services/posService';

export default function PosPage() {
  const [requireOpenCash, setRequireOpenCash] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [memberId, setMemberId] = useState('');
  const [itemName, setItemName] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [qty, setQty] = useState('1');
  const [unitPrice, setUnitPrice] = useState('');
  const [chargeMode, setChargeMode] = useState('immediate');
  const [paymentMethod, setPaymentMethod] = useState('transfer');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [sales, setSales] = useState([]);
  const [charges, setCharges] = useState([]);
  const [products, setProducts] = useState([]);
  const [newProduct, setNewProduct] = useState({ code: '', name: '', price: '', stock_qty: '' });
  const [stockMovement, setStockMovement] = useState({ product_id: '', movement_type: 'in', qty: '', notes: '' });
  const [movements, setMovements] = useState([]);
  const [openCash, setOpenCash] = useState(null);
  const [cashSessions, setCashSessions] = useState([]);
  const [openingAmount, setOpeningAmount] = useState('');
  const [closingAmount, setClosingAmount] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [zCloseDate, setZCloseDate] = useState(new Date().toISOString().slice(0, 10));
  const [summary, setSummary] = useState({
    today_sales_count: 0,
    today_sales_total: 0,
    today_cash_collected: 0,
    pending_member_account_total: 0
  });

  const load = async () => {
    try {
      const [salesData, chargesData, productsData, movementsData, openCashData, cashSessionsData, posConfig, summaryData] = await Promise.all([
        listPosSales({ page: 1, per_page: 20 }),
        listMemberAccountCharges({ status: 'pending_auto_debit', page: 1, per_page: 20 }),
        listPosProducts(),
        listStockMovements({ page: 1, per_page: 20 }),
        getOpenCashSessionSummary(),
        listCashSessions({ page: 1, per_page: 10 }),
        getPosConfig(),
        getPosSummary()
      ]);
      setSales(Array.isArray(salesData?.items) ? salesData.items : []);
      setCharges(Array.isArray(chargesData?.items) ? chargesData.items : []);
      setProducts(productsData);
      setMovements(Array.isArray(movementsData?.items) ? movementsData.items : []);
      setOpenCash(openCashData?.open ? openCashData : null);
      setCashSessions(Array.isArray(cashSessionsData?.items) ? cashSessionsData.items : []);
      setRequireOpenCash(Boolean(posConfig?.require_open_cash));
      setSummary({
        today_sales_count: Number(summaryData?.today_sales_count ?? 0),
        today_sales_total: Number(summaryData?.today_sales_total ?? 0),
        today_cash_collected: Number(summaryData?.today_cash_collected ?? 0),
        pending_member_account_total: Number(summaryData?.pending_member_account_total ?? 0)
      });
    } catch {
      // no-op
    }
  };

  const onAdjustStock = async () => {
    setError('');
    setMessage('');
    try {
      await adjustStock({
        product_id: Number(stockMovement.product_id || 0),
        movement_type: stockMovement.movement_type,
        qty: Number(stockMovement.qty || 0),
        notes: stockMovement.notes || undefined
      });
      setMessage('Movimiento de stock registrado.');
      setStockMovement({ product_id: '', movement_type: 'in', qty: '', notes: '' });
      await load();
    } catch (err) {
      setError(err?.response?.data?.message ?? 'No se pudo registrar movimiento de stock.');
    }
  };

  const onOpenCash = async () => {
    setError('');
    setMessage('');
    try {
      await openCashSession({ opening_amount: Number(openingAmount || 0) });
      setMessage('Caja abierta.');
      setOpeningAmount('');
      await load();
    } catch (err) {
      setError(err?.response?.data?.message ?? 'No se pudo abrir caja.');
    }
  };

  const onToggleRequireOpenCash = async (nextValue) => {
    setSavingConfig(true);
    setError('');
    try {
      const data = await updatePosConfig({ require_open_cash: nextValue });
      setRequireOpenCash(Boolean(data?.require_open_cash));
      setMessage(`Política POS actualizada: ${nextValue ? 'requiere caja abierta' : 'permite vender sin caja'}.`);
    } catch (err) {
      setError(err?.response?.data?.message ?? 'No se pudo actualizar la política POS.');
    } finally {
      setSavingConfig(false);
    }
  };

  const onCloseCash = async () => {
    setError('');
    setMessage('');
    try {
      const data = await closeCashSession({ closing_amount: Number(closingAmount || 0) });
      setMessage(`Caja cerrada. Diferencia: ${data.difference_amount}`);
      setClosingAmount('');
      await load();
    } catch (err) {
      setError(err?.response?.data?.message ?? 'No se pudo cerrar caja.');
    }
  };

  const onPrintCashReport = async (sessionId) => {
    setError('');
    try {
      const report = await getCashSessionReport(sessionId);
      const openedAt = report?.cash_session?.opened_at ?? '-';
      const closedAt = report?.cash_session?.closed_at ?? '-';
      const methods = report?.payments?.by_method ?? {};
      const sales = report?.pos_sales ?? {};
      const memberAccount = report?.member_account_settlements ?? {};
      const html = `
        <html>
          <head>
            <title>Cierre de Caja #${sessionId}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
              h1 { margin: 0 0 8px 0; font-size: 24px; }
              h2 { margin: 20px 0 8px 0; font-size: 16px; }
              .muted { color: #475569; font-size: 12px; margin-bottom: 16px; }
              table { border-collapse: collapse; width: 100%; margin-top: 8px; }
              th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; font-size: 13px; }
            </style>
          </head>
          <body>
            <h1>MRAnalytics POS - Cierre de Caja #${sessionId}</h1>
            <div class="muted">Apertura: ${openedAt} | Cierre: ${closedAt}</div>
            <h2>Resumen de Caja</h2>
            <table>
              <tr><th>Estado</th><td>${report?.cash_session?.status ?? '-'}</td></tr>
              <tr><th>Monto apertura</th><td>${report?.cash_session?.opening_amount ?? 0}</td></tr>
              <tr><th>Monto esperado</th><td>${report?.cash_session?.expected_amount ?? 0}</td></tr>
              <tr><th>Monto cierre</th><td>${report?.cash_session?.closing_amount ?? 0}</td></tr>
              <tr><th>Diferencia</th><td>${report?.cash_session?.difference_amount ?? 0}</td></tr>
            </table>
            <h2>Cobros por método</h2>
            <table>
              <tr><th>Efectivo</th><td>${methods.cash ?? 0}</td></tr>
              <tr><th>Transferencia</th><td>${methods.transfer ?? 0}</td></tr>
              <tr><th>Mercado Pago</th><td>${methods.mercadopago ?? 0}</td></tr>
              <tr><th>Tarjeta</th><td>${methods.card ?? 0}</td></tr>
              <tr><th>Otros</th><td>${methods.other ?? 0}</td></tr>
            </table>
            <h2>Ventas POS</h2>
            <table>
              <tr><th>Cantidad ventas</th><td>${sales.count ?? 0}</td></tr>
              <tr><th>Total vendido</th><td>${sales.total ?? 0}</td></tr>
            </table>
            <h2>Cuenta socio liquidada</h2>
            <table>
              <tr><th>Cantidad liquidaciones</th><td>${memberAccount.count ?? 0}</td></tr>
              <tr><th>Total liquidado</th><td>${memberAccount.total_amount ?? 0}</td></tr>
            </table>
          </body>
        </html>
      `;
      const w = window.open('', '_blank', 'noopener,noreferrer');
      if (!w) {
        setError('El navegador bloqueó la ventana de impresión.');
        return;
      }
      w.document.write(html);
      w.document.close();
      w.focus();
      w.print();
    } catch (err) {
      setError(err?.response?.data?.message ?? 'No se pudo generar el cierre imprimible.');
    }
  };

  const onPrintSaleTicket = async (saleId, paper = '58') => {
    setError('');
    try {
      const receipt = await getPosSaleReceipt(saleId);
      const sale = receipt?.sale ?? {};
      const member = receipt?.member ?? null;
      const payment = receipt?.payment ?? null;
      const items = Array.isArray(receipt?.items) ? receipt.items : [];
      const line = '-'.repeat(paper === '80' ? 48 : 32);
      const money = (value) => Number(value || 0).toFixed(2);
      const qtyFmt = (value) => Number(value || 0).toFixed(2);
      const itemLines = items.map((item) => {
        const name = String(item.item_name ?? '-');
        const qty = qtyFmt(item.qty);
        const unit = money(item.unit_price);
        const total = money(item.line_total);
        return `${name}\n${qty} x ${unit} = ${total}`;
      }).join('\n' + line + '\n');
      const html = `
        <html>
          <head>
            <title>Ticket POS ${sale.receipt_number ?? `#${saleId}`}</title>
            <style>
              @page { size: ${paper}mm auto; margin: 4mm; }
              body { font-family: "Courier New", monospace; font-size: ${paper === '80' ? '13px' : '12px'}; color: #111; white-space: pre-wrap; }
            </style>
          </head>
          <body>
MRFitOS / MRAnalytics
${sale.receipt_number ?? `POS-${sale.id ?? saleId}`}
Fecha: ${sale.created_at ?? '-'}
${line}
Cliente: ${member ? `${member.member_code ?? ''} ${member.first_name ?? ''} ${member.last_name ?? ''}` : 'Consumidor final'}
${line}
${itemLines || 'Sin items'}
${line}
Modo: ${sale.charge_mode ?? '-'}
Pago: ${payment ? `${payment.method ?? '-'} ${money(payment.amount)}` : 'Pendiente / cuenta socio'}
TOTAL: ${money(sale.total_amount)} ${sale.currency ?? ''}
${sale.notes ? `Nota: ${sale.notes}` : ''}
          </body>
        </html>
      `;
      const w = window.open('', '_blank', 'noopener,noreferrer');
      if (!w) {
        setError('El navegador bloqueó la ventana de impresión.');
        return;
      }
      w.document.write(html);
      w.document.close();
      w.focus();
      w.print();
    } catch (err) {
      setError(err?.response?.data?.message ?? 'No se pudo generar el ticket de venta.');
    }
  };

  const onReprintByReceiptNumber = async (paper = '58') => {
    const number = receiptNumber.trim();
    if (!number) {
      setError('Ingresá un número de comprobante.');
      return;
    }
    setError('');
    try {
      const receipt = await getPosSaleReceiptByNumber(number);
      const saleId = receipt?.sale?.id;
      if (!saleId) {
        setError('Comprobante no encontrado.');
        return;
      }
      await onPrintSaleTicket(saleId, paper);
    } catch (err) {
      setError(err?.response?.data?.message ?? 'No se pudo reimprimir el comprobante.');
    }
  };

  const onPrintZClose = async () => {
    setError('');
    try {
      const report = await getPosZCloseReport({ date: zCloseDate });
      const methods = report?.payments?.by_method ?? {};
      const html = `
        <html>
          <head>
            <title>Cierre Z ${report?.date ?? zCloseDate}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
              h1 { margin: 0 0 8px 0; font-size: 24px; }
              h2 { margin: 20px 0 8px 0; font-size: 16px; }
              table { border-collapse: collapse; width: 100%; margin-top: 8px; }
              th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; font-size: 13px; }
            </style>
          </head>
          <body>
            <h1>MRFitOS - Cierre Z ${report?.date ?? zCloseDate}</h1>
            <h2>Sesiones de Caja</h2>
            <table>
              <tr><th>Aperturas</th><td>${report?.cash_sessions?.opened_count ?? 0}</td></tr>
              <tr><th>Cierres</th><td>${report?.cash_sessions?.closed_count ?? 0}</td></tr>
              <tr><th>Total aperturas</th><td>${report?.cash_sessions?.opening_total ?? 0}</td></tr>
              <tr><th>Total esperado</th><td>${report?.cash_sessions?.expected_total ?? 0}</td></tr>
              <tr><th>Total cierres</th><td>${report?.cash_sessions?.closing_total ?? 0}</td></tr>
              <tr><th>Diferencia total</th><td>${report?.cash_sessions?.difference_total ?? 0}</td></tr>
            </table>
            <h2>Cobros por método</h2>
            <table>
              <tr><th>Efectivo</th><td>${methods.cash ?? 0}</td></tr>
              <tr><th>Transferencia</th><td>${methods.transfer ?? 0}</td></tr>
              <tr><th>Mercado Pago</th><td>${methods.mercadopago ?? 0}</td></tr>
              <tr><th>Tarjeta</th><td>${methods.card ?? 0}</td></tr>
              <tr><th>Otros</th><td>${methods.other ?? 0}</td></tr>
              <tr><th>Total</th><td>${report?.payments?.total ?? 0}</td></tr>
            </table>
            <h2>Ventas POS</h2>
            <table>
              <tr><th>Cantidad</th><td>${report?.pos_sales?.count ?? 0}</td></tr>
              <tr><th>Total</th><td>${report?.pos_sales?.total ?? 0}</td></tr>
            </table>
            <h2>Cuenta socio liquidada</h2>
            <table>
              <tr><th>Cantidad</th><td>${report?.member_account_settlements?.count ?? 0}</td></tr>
              <tr><th>Total</th><td>${report?.member_account_settlements?.total ?? 0}</td></tr>
            </table>
          </body>
        </html>
      `;
      const w = window.open('', '_blank', 'noopener,noreferrer');
      if (!w) {
        setError('El navegador bloqueó la ventana de impresión.');
        return;
      }
      w.document.write(html);
      w.document.close();
      w.focus();
      w.print();
    } catch (err) {
      setError(err?.response?.data?.message ?? 'No se pudo generar el cierre Z.');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onCreateSale = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const payload = {
        member_id: memberId ? Number(memberId) : undefined,
        charge_mode: chargeMode,
        payment_method: paymentMethod,
        due_date: dueDate || undefined,
        items: [
          {
            product_id: selectedProductId ? Number(selectedProductId) : undefined,
            item_name: itemName,
            qty: Number(qty || 1),
            unit_price: Number(unitPrice || 0)
          }
        ]
      };
      const data = await createPosSale(payload);
      setMessage(`Venta creada #${data.sale_id} (${data.charge_mode}).`);
      setItemName('');
      setUnitPrice('');
      setSelectedProductId('');
      setQty('1');
      await load();
    } catch (err) {
      setError(err?.response?.data?.message ?? 'No se pudo crear la venta POS.');
    } finally {
      setLoading(false);
    }
  };

  const onSettle = async (id) => {
    setError('');
    setMessage('');
    try {
      await settleMemberAccountCharge(id, { method: 'mercadopago' });
      setMessage(`Cargo #${id} marcado como cobrado por débito automático.`);
      await load();
    } catch (err) {
      setError(err?.response?.data?.message ?? 'No se pudo liquidar el cargo.');
    }
  };

  const onCreateProduct = async () => {
    setError('');
    setMessage('');
    try {
      await createPosProduct({
        code: newProduct.code,
        name: newProduct.name,
        price: Number(newProduct.price || 0),
        currency: 'ARS',
        track_stock: true,
        stock_qty: Number(newProduct.stock_qty || 0),
        is_active: true
      });
      setMessage('Producto POS creado.');
      setNewProduct({ code: '', name: '', price: '', stock_qty: '' });
      await load();
    } catch (err) {
      setError(err?.response?.data?.message ?? 'No se pudo crear producto POS.');
    }
  };

  return (
    <section className="space-y-4">
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="text-2xl font-semibold text-slate-900">POS Gym</h2>
        <p className="text-sm text-slate-600">Venta en mostrador: cobro inmediato, efectivo o cuenta del socio para débito automático.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Ventas hoy</p>
          <p className="text-2xl font-semibold text-slate-900">{summary.today_sales_count}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Facturación hoy</p>
          <p className="text-2xl font-semibold text-slate-900">${summary.today_sales_total.toFixed(2)}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Efectivo hoy</p>
          <p className="text-2xl font-semibold text-slate-900">${summary.today_cash_collected.toFixed(2)}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Cuenta socio pendiente</p>
          <p className="text-2xl font-semibold text-slate-900">${summary.pending_member_account_total.toFixed(2)}</p>
        </div>
      </div>

      <div className="grid gap-3 rounded-xl bg-white p-4 shadow-sm md:grid-cols-3">
        <select
          className="rounded border border-slate-300 p-2"
          value={selectedProductId}
          onChange={(e) => {
            const value = e.target.value;
            setSelectedProductId(value);
            const product = products.find((p) => String(p.id) === String(value));
            if (product) {
              setItemName(product.name ?? '');
              setUnitPrice(String(product.price ?? ''));
            }
          }}
        >
          <option value="">Producto (opcional)</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.code} - {p.name} ({p.price} {p.currency}) stock:{p.stock_qty}
            </option>
          ))}
        </select>
        <input className="rounded border border-slate-300 p-2" placeholder="member_id (opcional según modo)" value={memberId} onChange={(e) => setMemberId(e.target.value)} />
        <input className="rounded border border-slate-300 p-2" placeholder="Item (ej: Proteína 1kg)" value={itemName} onChange={(e) => setItemName(e.target.value)} />
        <input className="rounded border border-slate-300 p-2" placeholder="Precio unitario" type="number" min="0" step="0.01" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} />
        <input className="rounded border border-slate-300 p-2" placeholder="Cantidad" type="number" min="0.001" step="0.001" value={qty} onChange={(e) => setQty(e.target.value)} />
        <select className="rounded border border-slate-300 p-2" value={chargeMode} onChange={(e) => setChargeMode(e.target.value)}>
          <option value="immediate">Cobro inmediato</option>
          <option value="cash">Efectivo</option>
          <option value="member_account">Cuenta socio (débito luego)</option>
        </select>
        <select className="rounded border border-slate-300 p-2" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
          <option value="transfer">Transferencia</option>
          <option value="mercadopago">Mercado Pago</option>
          <option value="card">Tarjeta</option>
          <option value="cash">Efectivo</option>
          <option value="other">Otro</option>
        </select>
        <input className="rounded border border-slate-300 p-2" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        <button
          className="rounded border border-slate-300 p-2 disabled:opacity-50"
          disabled={loading || (requireOpenCash && !openCash)}
          onClick={onCreateSale}
        >
          {loading ? 'Guardando...' : 'Crear venta POS'}
        </button>
      </div>

      {requireOpenCash && !openCash && (
        <p className="rounded bg-amber-50 p-3 text-sm text-amber-800">
          Caja cerrada: para vender en POS primero abrí una caja.
        </p>
      )}

      <div className="grid gap-3 rounded-xl bg-white p-4 shadow-sm md:grid-cols-5">
        <input className="rounded border border-slate-300 p-2" placeholder="Código producto" value={newProduct.code} onChange={(e) => setNewProduct((s) => ({ ...s, code: e.target.value }))} />
        <input className="rounded border border-slate-300 p-2" placeholder="Nombre producto" value={newProduct.name} onChange={(e) => setNewProduct((s) => ({ ...s, name: e.target.value }))} />
        <input className="rounded border border-slate-300 p-2" type="number" min="0" step="0.01" placeholder="Precio" value={newProduct.price} onChange={(e) => setNewProduct((s) => ({ ...s, price: e.target.value }))} />
        <input className="rounded border border-slate-300 p-2" type="number" min="0" step="0.001" placeholder="Stock inicial" value={newProduct.stock_qty} onChange={(e) => setNewProduct((s) => ({ ...s, stock_qty: e.target.value }))} />
        <button className="rounded border border-slate-300 p-2" onClick={onCreateProduct}>
          Crear producto POS
        </button>
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h3 className="mb-2 text-lg font-semibold text-slate-900">Caja POS</h3>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <input
            className="rounded border border-slate-300 p-2 text-sm"
            type="date"
            value={zCloseDate}
            onChange={(e) => setZCloseDate(e.target.value)}
          />
          <button className="rounded border border-slate-300 px-2 py-1 text-sm" onClick={onPrintZClose}>
            Imprimir Cierre Z
          </button>
        </div>
        <div className="mb-3 flex items-center gap-3 rounded border border-slate-200 p-2 text-sm">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={requireOpenCash}
              disabled={savingConfig}
              onChange={(e) => onToggleRequireOpenCash(e.target.checked)}
            />
            Requerir caja abierta para vender
          </label>
          {savingConfig && <span className="text-slate-500">Guardando...</span>}
        </div>
        {openCash ? (
          <div className="space-y-2">
            <p className="text-sm text-slate-700">
              Caja abierta #{openCash.session_id} · Apertura: {openCash.opening_amount} · Cobrado en efectivo: {openCash.cash_collected} · Esperado: {openCash.expected_amount}
            </p>
            <div className="flex gap-2">
              <input
                className="rounded border border-slate-300 p-2"
                type="number"
                min="0"
                step="0.01"
                placeholder="Monto real de cierre"
                value={closingAmount}
                onChange={(e) => setClosingAmount(e.target.value)}
              />
              <button className="rounded border border-slate-300 px-3 py-2" onClick={onCloseCash}>
                Cerrar caja
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              className="rounded border border-slate-300 p-2"
              type="number"
              min="0"
              step="0.01"
              placeholder="Monto de apertura"
              value={openingAmount}
              onChange={(e) => setOpeningAmount(e.target.value)}
            />
            <button className="rounded border border-slate-300 px-3 py-2" onClick={onOpenCash}>
              Abrir caja
            </button>
          </div>
        )}
      </div>

      <div className="grid gap-3 rounded-xl bg-white p-4 shadow-sm md:grid-cols-5">
        <select
          className="rounded border border-slate-300 p-2"
          value={stockMovement.product_id}
          onChange={(e) => setStockMovement((s) => ({ ...s, product_id: e.target.value }))}
        >
          <option value="">Producto</option>
          {products.map((p) => <option key={p.id} value={p.id}>{p.code} - {p.name}</option>)}
        </select>
        <select
          className="rounded border border-slate-300 p-2"
          value={stockMovement.movement_type}
          onChange={(e) => setStockMovement((s) => ({ ...s, movement_type: e.target.value }))}
        >
          <option value="in">Entrada</option>
          <option value="out">Salida</option>
          <option value="adjustment">Ajuste (seteo)</option>
        </select>
        <input
          className="rounded border border-slate-300 p-2"
          type="number"
          min="0"
          step="0.001"
          placeholder="Cantidad"
          value={stockMovement.qty}
          onChange={(e) => setStockMovement((s) => ({ ...s, qty: e.target.value }))}
        />
        <input
          className="rounded border border-slate-300 p-2"
          placeholder="Nota"
          value={stockMovement.notes}
          onChange={(e) => setStockMovement((s) => ({ ...s, notes: e.target.value }))}
        />
        <button className="rounded border border-slate-300 p-2" onClick={onAdjustStock}>
          Registrar movimiento
        </button>
      </div>

      {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {message && <p className="rounded bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h3 className="mb-2 text-lg font-semibold text-slate-900">Cargos pendientes (cuenta socio)</h3>
        <div className="space-y-2">
          {charges.length === 0 ? (
            <p className="text-sm text-slate-500">Sin cargos pendientes.</p>
          ) : charges.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded border border-slate-200 p-2 text-sm">
              <span>#{c.id} · Socio {c.member_code} · {c.amount} {c.currency}</span>
              <button className="rounded border border-slate-300 px-2 py-1" onClick={() => onSettle(c.id)}>
                Cobrar por débito automático
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm">
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
          ) : sales.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-2 rounded border border-slate-200 p-2 text-sm">
              <span>#{s.id} · {s.total_amount} {s.currency} · {s.charge_mode} · {s.member_code ? `${s.member_code} ${s.first_name} ${s.last_name}` : 'sin socio'}</span>
              <div className="flex gap-1">
                <button className="rounded border border-slate-300 px-2 py-1" onClick={() => onPrintSaleTicket(s.id, '58')}>
                  Ticket 58mm
                </button>
                <button className="rounded border border-slate-300 px-2 py-1" onClick={() => onPrintSaleTicket(s.id, '80')}>
                  Ticket 80mm
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h3 className="mb-2 text-lg font-semibold text-slate-900">Movimientos de stock</h3>
        <div className="space-y-2">
          {movements.length === 0 ? (
            <p className="text-sm text-slate-500">Sin movimientos.</p>
          ) : movements.map((m) => (
            <div key={m.id} className="rounded border border-slate-200 p-2 text-sm">
              #{m.id} · {m.product_code} {m.product_name} · {m.movement_type} {m.qty} · saldo {m.balance_after}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h3 className="mb-2 text-lg font-semibold text-slate-900">Últimos cierres de caja</h3>
        <div className="space-y-2">
          {cashSessions.length === 0 ? (
            <p className="text-sm text-slate-500">Sin sesiones de caja.</p>
          ) : cashSessions.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-2 rounded border border-slate-200 p-2 text-sm">
              <span>#{c.id} · {c.status} · apertura {c.opening_amount} · esperado {c.expected_amount ?? '-'} · cierre {c.closing_amount ?? '-'} · diferencia {c.difference_amount ?? '-'}</span>
              <button className="rounded border border-slate-300 px-2 py-1" onClick={() => onPrintCashReport(c.id)}>
                Imprimir cierre
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
