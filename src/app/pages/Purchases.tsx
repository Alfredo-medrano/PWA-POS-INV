import { useEffect, useState } from "react";
import { Plus, Truck, Edit, CheckCircle2, ChevronRight, X, Trash2, Banknote } from "lucide-react";
import { usePOSStore } from "../store/usePOSStore";
import { Btn, Badge, Input, $ } from "../components/Primitives";

export default function Purchases() {
  const {
    suppliers,
    purchases,
    products,
    fetchSuppliers,
    fetchPurchases,
    fetchProducts,
    createSupplier,
    createPurchase,
    receivePurchase
  } = usePOSStore();

  const [tab, setTab] = useState<"ordenes" | "proveedores">("ordenes");

  // Modals visibility
  const [supOpen, setSupOpen] = useState(false);
  const [purOpen, setPurOpen] = useState(false);

  // New Supplier Form
  const [newSup, setNewSup] = useState({ name: "", phone: "", nrc: "", email: "" });

  // New Purchase Form
  const [selectedSupId, setSelectedSupId] = useState("");
  const [purchaseItems, setPurchaseItems] = useState<Array<{ productId: string, name: string, qty: number, cost: number }>>([]);
  const [purchaseStatus, setPurchaseStatus] = useState<"Pendiente" | "Recibida">("Pendiente");

  // Temporary Item add state
  const [addProdId, setAddProdId] = useState("");
  const [addQty, setAddQty] = useState("10");
  const [addCost, setAddCost] = useState("1.00");

  useEffect(() => {
    fetchSuppliers();
    fetchPurchases();
    fetchProducts();
  }, []);

  async function handleSaveSupplier() {
    if (!newSup.name) return;
    const ok = await createSupplier(newSup);
    if (ok) {
      setSupOpen(false);
      setNewSup({ name: "", phone: "", nrc: "", email: "" });
    } else {
      alert("Error al registrar proveedor.");
    }
  }

  function handleAddItem() {
    if (!addProdId) return;
    const prod = products.find(p => p.id === addProdId);
    if (!prod) return;

    const existingIndex = purchaseItems.findIndex(i => i.productId === addProdId);
    if (existingIndex > -1) {
      const updated = [...purchaseItems];
      updated[existingIndex].qty += parseInt(addQty) || 0;
      updated[existingIndex].cost = parseFloat(addCost) || 0;
      setPurchaseItems(updated);
    } else {
      setPurchaseItems([...purchaseItems, {
        productId: addProdId,
        name: prod.name,
        qty: parseInt(addQty) || 1,
        cost: parseFloat(addCost) || 0
      }]);
    }

    setAddProdId("");
    setAddQty("10");
    setAddCost("1.00");
  }

  function handleRemoveItem(productId: string) {
    setPurchaseItems(purchaseItems.filter(i => i.productId !== productId));
  }

  async function handleSavePurchase() {
    if (!selectedSupId || purchaseItems.length === 0) {
      alert("Por favor selecciona un proveedor y agrega al menos un producto.");
      return;
    }
    const supplier = suppliers.find(s => s.id === selectedSupId);
    if (!supplier) return;

    const total = purchaseItems.reduce((sum, item) => sum + item.cost * item.qty, 0);

    const ok = await createPurchase({
      supplierId: supplier.id,
      supplierName: supplier.name,
      items: purchaseItems,
      status: purchaseStatus,
      total
    });

    if (ok) {
      setPurOpen(false);
      setSelectedSupId("");
      setPurchaseItems([]);
      setPurchaseStatus("Pendiente");
    } else {
      alert("Error al registrar orden de compra.");
    }
  }

  async function handleReceivePurchase(id: string) {
    if (confirm("¿Confirmas la recepción de mercadería? El stock de los productos se actualizará automáticamente.")) {
      const ok = await receivePurchase(id);
      if (!ok) {
        alert("Ocurrió un error al actualizar la orden de compra.");
      }
    }
  }

  const purTotal = purchaseItems.reduce((sum, item) => sum + item.cost * item.qty, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">Compras e Inventario</h1>
        {tab === "ordenes" ? (
          <Btn v="primary" sz="sm" onClick={() => setPurOpen(true)}><Plus size={14} />Nueva orden</Btn>
        ) : (
          <Btn v="primary" sz="sm" onClick={() => setSupOpen(true)}><Plus size={14} />Nuevo proveedor</Btn>
        )}
      </div>

      <div className="flex border-b border-[#E2E8F0]">
        {[["ordenes", "Órdenes de compra"], ["proveedores", "Proveedores"]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id as "ordenes" | "proveedores")}
            className={`px-5 py-3 text-sm font-bold border-b-2 transition-colors -mb-px ${tab === id ? "text-[#1B4FD8] border-[#1B4FD8]" : "text-[#94A3B8] border-transparent hover:text-[#64748B]"}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "ordenes" ? (
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-[#E2E8F0]">
                <tr>
                  {["# Orden", "Proveedor", "Fecha", "Productos", "Total", "Estado", "Acciones"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-bold text-[#94A3B8] tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F8FAFC]">
                {purchases.map(o => (
                  <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-[#1B4FD8]">{o.id}</td>
                    <td className="px-4 py-3 font-semibold text-[#0F172A]">{o.sup}</td>
                    <td className="px-4 py-3 text-[#64748B]">{o.date}</td>
                    <td className="px-4 py-3 tabular-nums text-left font-semibold text-[#0F172A]">{o.n}</td>
                    <td className="px-4 py-3 font-black tabular-nums text-[#0F172A]">{$(o.total)}</td>
                    <td className="px-4 py-3">
                      <Badge color={o.s === "Recibida" ? "green" : o.s === "Pendiente" ? "amber" : "red"}>
                        {o.s}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {o.s === "Pendiente" && (
                        <Btn v="success" sz="xs" onClick={() => handleReceivePurchase(o.id)}>
                          <CheckCircle2 size={11} /> Recibir
                        </Btn>
                      )}
                    </td>
                  </tr>
                ))}
                {purchases.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-sm text-[#94A3B8]">No hay órdenes de compra registradas.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-[#E2E8F0]">
                <tr>
                  {["Nombre", "Teléfono", "NRC", "Correo", "Última compra"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-bold text-[#94A3B8] tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F8FAFC]">
                {suppliers.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-[#0F172A]">{s.name}</td>
                    <td className="px-4 py-3 font-mono text-[#64748B]">{s.phone || "—"}</td>
                    <td className="px-4 py-3 font-mono text-[#64748B]">{s.nrc || "—"}</td>
                    <td className="px-4 py-3 text-[#64748B]">{s.email || "—"}</td>
                    <td className="px-4 py-3 text-[#64748B]">{s.last_buy || "—"}</td>
                  </tr>
                ))}
                {suppliers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-sm text-[#94A3B8]">No hay proveedores registrados.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* NEW SUPPLIER MODAL */}
      {supOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSupOpen(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-[#0F172A] text-base">Nuevo Proveedor</h3>
              <button onClick={() => setSupOpen(false)} className="text-[#94A3B8] hover:text-[#64748B]"><X size={16} /></button>
            </div>
            <div className="space-y-4">
              <Input label="Razón Social / Nombre *" placeholder="Distribuidora Central" value={newSup.name} onChange={v => setNewSup(f => ({ ...f, name: v }))} />
              <Input label="Teléfono" placeholder="2222-4455" value={newSup.phone} onChange={v => setNewSup(f => ({ ...f, phone: v }))} />
              <Input label="NRC" placeholder="12345-6" value={newSup.nrc} onChange={v => setNewSup(f => ({ ...f, nrc: v }))} />
              <Input label="Correo electrónico" placeholder="ventas@proveedor.com" value={newSup.email} onChange={v => setNewSup(f => ({ ...f, email: v }))} />
            </div>
            <div className="flex gap-2">
              <Btn v="secondary" className="flex-1" onClick={() => setSupOpen(false)}>Cancelar</Btn>
              <Btn v="primary" className="flex-1" onClick={handleSaveSupplier} disabled={!newSup.name}>Registrar</Btn>
            </div>
          </div>
        </div>
      )}

      {/* NEW PURCHASE MODAL */}
      {purOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setPurOpen(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-[#0F172A] text-base">Nueva Orden de Compra</h3>
              <button onClick={() => setPurOpen(false)} className="text-[#94A3B8] hover:text-[#64748B]"><X size={16} /></button>
            </div>
            <div className="space-y-4 overflow-y-auto pr-1 flex-1 scrollbar-thin">
              {/* Proveedor select */}
              <div>
                <label className="text-xs font-bold text-[#0F172A] block mb-1">Proveedor *</label>
                <select value={selectedSupId} onChange={e => setSelectedSupId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1B4FD8]/20 focus:border-[#1B4FD8]">
                  <option value="">Selecciona un proveedor...</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              {/* Items agregados */}
              <div>
                <label className="text-xs font-bold text-[#0F172A] block mb-1.5">Detalle de Compra</label>
                <div className="border border-[#E2E8F0] rounded-xl overflow-hidden divide-y divide-slate-100 bg-slate-50">
                  {purchaseItems.map(item => (
                    <div key={item.productId} className="flex justify-between items-center p-3 text-xs">
                      <div className="flex-1">
                        <p className="font-semibold text-[#0F172A]">{item.name}</p>
                        <p className="text-[10px] text-[#94A3B8] font-mono">{item.qty} units x {$(item.cost)} c/u</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-black text-[#0F172A] tabular-nums">{$(item.cost * item.qty)}</span>
                        <button className="text-red-500 hover:text-red-700" onClick={() => handleRemoveItem(item.productId)}><Trash2 size={12} /></button>
                      </div>
                    </div>
                  ))}
                  {purchaseItems.length === 0 && (
                    <div className="p-4 text-center text-[#94A3B8] text-xs">Agrega productos abajo para conformar la compra.</div>
                  )}
                </div>
              </div>

              {/* Agregar item form */}
              <div className="bg-slate-50 border border-[#E2E8F0] rounded-xl p-3.5 space-y-3">
                <p className="text-xs font-bold text-[#0F172A]">Agregar Producto</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-3">
                    <select value={addProdId} onChange={e => setAddProdId(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A]">
                      <option value="">Selecciona producto...</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-[#94A3B8] block mb-1">Cantidad</label>
                    <input type="number" value={addQty} onChange={e => setAddQty(e.target.value)} className="w-full px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A]" />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-[#94A3B8] block mb-1">Costo Unitario ($)</label>
                    <input type="number" step="any" value={addCost} onChange={e => setAddCost(e.target.value)} className="w-full px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A]" />
                  </div>
                  <div className="flex items-end">
                    <Btn v="secondary" sz="sm" className="w-full" onClick={handleAddItem} disabled={!addProdId}><Plus size={11} /> Agregar</Btn>
                  </div>
                </div>
              </div>

              {/* Estado e Info Final */}
              <div className="flex justify-between items-center pt-2">
                <div className="flex gap-2">
                  <button onClick={() => setPurchaseStatus("Pendiente")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${purchaseStatus === "Pendiente" ? "bg-[#EEF2FF] border-[#1B4FD8] text-[#1B4FD8]" : "bg-white border-[#E2E8F0] text-[#64748B]"}`}>
                    Pendiente
                  </button>
                  <button onClick={() => setPurchaseStatus("Recibida")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${purchaseStatus === "Recibida" ? "bg-emerald-50 border-emerald-500 text-emerald-700" : "bg-white border-[#E2E8F0] text-[#64748B]"}`}>
                    Recibida (Ingresa Stock)
                  </button>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-[#94A3B8] font-bold uppercase leading-none">Total Compra</p>
                  <p className="text-lg font-black text-[#1B4FD8] tabular-nums mt-0.5">{$(purTotal)}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-[#E2E8F0]">
              <Btn v="secondary" className="flex-1" onClick={() => setPurOpen(false)}>Cancelar</Btn>
              <Btn v="primary" className="flex-1" onClick={handleSavePurchase} disabled={!selectedSupId || purchaseItems.length === 0}>
                Registrar OC
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
