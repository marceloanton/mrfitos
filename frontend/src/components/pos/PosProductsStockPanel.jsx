export default function PosProductsStockPanel({
  newProduct,
  setNewProduct,
  canProductManage,
  onCreateProduct,
  lowStockThreshold,
  setLowStockThreshold,
  onRefreshLowStock,
  lowStockItems,
  stockMovement,
  setStockMovement,
  products,
  canStockManage,
  onAdjustStock,
  movements
}) {
  return (
    <>
      <div id="pos-productos" className="grid gap-3 rounded-xl bg-white p-4 shadow-sm md:grid-cols-5">
        <input className="rounded border border-slate-300 p-2" placeholder="Código producto" value={newProduct.code} onChange={(e) => setNewProduct((s) => ({ ...s, code: e.target.value }))} />
        <input className="rounded border border-slate-300 p-2" placeholder="Nombre producto" value={newProduct.name} onChange={(e) => setNewProduct((s) => ({ ...s, name: e.target.value }))} />
        <input className="rounded border border-slate-300 p-2" type="number" min="0" step="0.01" placeholder="Precio" value={newProduct.price} onChange={(e) => setNewProduct((s) => ({ ...s, price: e.target.value }))} />
        <input className="rounded border border-slate-300 p-2" type="number" min="0" step="0.001" placeholder="Stock inicial" value={newProduct.stock_qty} onChange={(e) => setNewProduct((s) => ({ ...s, stock_qty: e.target.value }))} />
        <button className="rounded border border-slate-300 p-2 disabled:opacity-50" disabled={!canProductManage} onClick={onCreateProduct}>
          Crear producto POS
        </button>
      </div>

      <div id="pos-control" className="rounded-xl bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-slate-900">Alertas de stock bajo</h3>
          <div className="flex items-center gap-2">
            <input
              className="w-24 rounded border border-slate-300 p-2 text-sm"
              type="number"
              min="0.001"
              step="0.001"
              value={lowStockThreshold}
              onChange={(e) => setLowStockThreshold(e.target.value)}
            />
            <button className="rounded border border-slate-300 px-2 py-1 text-sm" onClick={onRefreshLowStock}>
              Refrescar
            </button>
          </div>
        </div>
        <div className="space-y-2">
          {lowStockItems.length === 0 ? (
            <p className="text-sm text-slate-500">Sin alertas para ese umbral.</p>
          ) : lowStockItems.map((p) => (
            <div key={p.id} className="rounded border border-amber-200 bg-amber-50 p-2 text-sm text-amber-900">
              {p.code} · {p.name} · stock {p.stock_qty} · precio {p.price} {p.currency}
            </div>
          ))}
        </div>
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
        <button className="rounded border border-slate-300 p-2 disabled:opacity-50" disabled={!canStockManage} onClick={onAdjustStock}>
          Registrar movimiento
        </button>
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
    </>
  );
}

