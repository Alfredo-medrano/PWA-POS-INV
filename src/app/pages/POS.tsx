import { useState, useRef, useEffect } from "react";
import {
  Search, Camera, Package, Plus, Minus, Check,
  AlertTriangle, Printer, MessageSquare, Mail, User,
  Building2, ShoppingCart, Trash2, XCircle, CheckCircle,
  CreditCard, Banknote, Smartphone, RefreshCw
} from "lucide-react";
import { usePOSStore } from "../store/usePOSStore";
import { Btn, Input, Badge, $, status, CATS } from "../components/Primitives";

export default function POS({ dteConnected }: { dteConnected: boolean }) {
  const {
    products,
    customers,
    cart,
    activeCustomer,
    payMethod,
    cashPaid,
    emitDTE,
    dteType,
    dteStatus,
    recentDteControl,
    fetchProducts,
    fetchCustomers,
    addProduct,
    setQty,
    removeItem,
    pickCustomer,
    setPayMethod,
    setCashPaid,
    setEmitDTE,
    setDteType,
    processSale,
    resetCart
  } = usePOSStore();

  const [q, setQ] = useState("");
  const [cat, setCat] = useState("Todos");
  const [custQ, setCustQ] = useState("");
  const [showDrop, setShowDrop] = useState(false);
  const [modal, setModal] = useState(false);
  const [mobTab, setMobTab] = useState<"productos" | "carrito">("productos");
  
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
  }, []);

  // Click outside to close customer dropdown
  useEffect(() => {
    function click(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setShowDrop(false);
      }
    }
    document.addEventListener("mousedown", click);
    return () => document.removeEventListener("mousedown", click);
  }, []);

  const filteredProducts = products.filter(p =>
    (cat === "Todos" || p.category === cat) &&
    (p.name.toLowerCase().includes(q.toLowerCase()) || p.sku.toLowerCase().includes(q.toLowerCase()))
  );

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(custQ.toLowerCase()) ||
    (c.phone && c.phone.includes(custQ)) ||
    (c.nit && c.nit.includes(custQ))
  );

  const sub = cart.reduce((s, i) => s + i.product.price * i.qty, 0);
  const iva = sub * 0.13;
  const total = sub + iva;
  const cashAmt = parseFloat(cashPaid || "0");
  const change = payMethod === "Efectivo" && cashAmt >= total ? cashAmt - total : 0;
  const count = cart.reduce((s, i) => s + i.qty, 0);

  async function handleCobrar() {
    if (!cart.length) return;
    setModal(true);
    await processSale();
  }

  function handleReset() {
    setModal(false);
    resetCart();
  }

  const ProductsView = (
    <div className="flex flex-col h-full bg-[#F8FAFC]">
      <div className="bg-white border-b border-[#E2E8F0] p-3 space-y-2.5">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#CBD5E1]" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar o escanear producto…"
            className="w-full pl-9 pr-9 py-2.5 bg-slate-50 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4FD8]/20 focus:border-[#1B4FD8] transition-all" />
          <button className="absolute right-3 top-1/2 -translate-y-1/2 text-[#CBD5E1] hover:text-[#64748B] transition-colors"><Camera size={14} /></button>
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-thin">
          {CATS.map(c => (
            <button key={c} onClick={() => setCat(c)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-bold transition-all ${cat === c ? "bg-[#1B4FD8] text-white shadow-sm" : "bg-slate-100 text-[#64748B] hover:bg-slate-200"}`}>
              {c}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {filteredProducts.length === 0
          ? <div className="flex flex-col items-center justify-center h-40"><Package size={28} className="text-slate-200 mb-2" /><p className="text-sm text-[#94A3B8]">Sin resultados para "{q}"</p></div>
          : <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {filteredProducts.map(p => {
              const s = status(p);
              const inCart = cart.find(i => i.product.id === p.id);
              return (
                <button key={p.id} onClick={() => addProduct(p)} disabled={s === "empty"}
                  className={`bg-white rounded-xl border text-left transition-all active:scale-95 overflow-hidden ${s === "empty" ? "opacity-40 cursor-not-allowed border-[#E2E8F0]" : "border-[#E2E8F0] hover:border-[#1B4FD8]/40 hover:shadow-md"} ${inCart ? "ring-2 ring-[#1B4FD8] border-[#1B4FD8]" : ""}`}>
                  <div className="relative aspect-square bg-slate-50">
                    {p.img ? <img src={p.img} alt={p.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Package size={20} className="text-slate-200" /></div>}
                    {inCart && <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#1B4FD8] text-white font-black text-[10px] flex items-center justify-center shadow-sm">{inCart.qty}</div>}
                    {s === "empty" && <span className="absolute top-1.5 left-1.5 bg-red-50 text-red-700 text-[9px] font-bold px-1.5 py-0.5 rounded ring-1 ring-red-200">Agotado</span>}
                    {s === "low" && <span className="absolute top-1.5 left-1.5 bg-amber-50 text-amber-700 text-[9px] font-bold px-1.5 py-0.5 rounded ring-1 ring-amber-200">Stock Bajo ({p.stock})</span>}
                  </div>
                  <div className="p-2">
                    <p className="text-xs font-bold text-[#0F172A] line-clamp-1">{p.name}</p>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-xs text-[#94A3B8] font-mono">{p.sku}</span>
                      <span className="text-xs font-black text-[#1B4FD8] tabular-nums">{$(p.price)}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        }
      </div>
    </div>
  );

  const CartView = (
    <div className="flex flex-col h-full bg-white border-l border-[#E2E8F0]">
      {/* Customer select */}
      <div className="p-3 border-b border-[#E2E8F0] relative" ref={dropRef}>
        <label className="text-[10px] font-black text-[#CBD5E1] uppercase tracking-wider block mb-1">Cliente</label>
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#CBD5E1]" />
            <input value={activeCustomer ? activeCustomer.name : custQ} onChange={e => { setCustQ(e.target.value); pickCustomer(null); setShowDrop(true); }} placeholder="Consumidor Final (DUI / NIT)"
              className={`w-full pl-8 pr-7 py-2 border text-xs rounded-xl focus:outline-none transition-all ${activeCustomer ? "border-[#1B4FD8] bg-[#EEF2FF]/20 text-[#1B4FD8] font-bold" : "border-[#E2E8F0] bg-slate-50 text-[#0F172A]"}`} />
            {activeCustomer && <button onClick={() => pickCustomer(null)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#1B4FD8] hover:text-red-600 transition-colors"><XCircle size={13} /></button>}
          </div>
        </div>
        {showDrop && (
          <div className="absolute top-[calc(100%-8px)] inset-x-3 bg-white border border-[#E2E8F0] rounded-xl shadow-2xl z-40 max-h-48 overflow-y-auto divide-y divide-slate-100 mt-2">
            {filteredCustomers.map(c => (
              <button key={c.id} onClick={() => { pickCustomer(c); setShowDrop(false); }} className="w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#0F172A]">{c.name}</div>
                  <div className="text-[10px] text-[#94A3B8]">{c.nit ? <span className="text-[#1B4FD8] font-medium">NIT — DTE auto ✓</span> : c.dui ? `DUI: ${c.dui}` : "Sin NIT"}</div>
                </div>
                {c.type === "juridica" ? <Building2 size={12} className="text-[#94A3B8]" /> : <User size={12} className="text-[#94A3B8]" />}
              </button>
            ))}
            {filteredCustomers.length === 0 && <div className="text-center py-4 text-xs text-[#94A3B8]">Sin resultados</div>}
          </div>
        )}
      </div>

      {/* Cart items list */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-3 space-y-1.5 scrollbar-thin">
        {cart.length === 0
          ? <div className="flex flex-col items-center justify-center h-40 text-[#CBD5E1]"><ShoppingCart size={32} className="mb-2" /><p className="text-xs font-semibold">Carrito vacío</p></div>
          : cart.map(item => (
            <div key={item.product.id} className="flex gap-2.5 py-2 items-center">
              <div className="w-8 h-8 rounded-lg bg-slate-50 overflow-hidden shrink-0">
                {item.product.img ? <img src={item.product.img} alt={item.product.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Package size={14} className="text-slate-300" /></div>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-[#0F172A] truncate leading-tight">{item.product.name}</p>
                <p className="text-[10px] text-[#94A3B8] font-semibold mt-0.5 tabular-nums">{$(item.product.price)} c/u</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setQty(item.product.id, -1)} className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-[#64748B] flex items-center justify-center"><Minus size={10} /></button>
                <span className="text-xs font-black w-6 text-center tabular-nums text-[#0F172A]">{item.qty}</span>
                <button onClick={() => setQty(item.product.id, 1)} className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-[#64748B] flex items-center justify-center"><Plus size={10} /></button>
              </div>
              <button onClick={() => removeItem(item.product.id)} className="text-[#94A3B8] hover:text-red-600 transition-colors shrink-0"><Trash2 size={12} /></button>
            </div>
          ))
        }
      </div>

      {/* Payment and DTE checkout */}
      <div className="p-3 border-t border-[#E2E8F0] space-y-3 bg-slate-50">
        <div className="space-y-1.5 text-xs text-[#64748B]">
          <div className="flex justify-between"><span>Subtotal</span><span className="tabular-nums font-semibold text-[#0F172A]">{$(sub)}</span></div>
          <div className="flex justify-between"><span>IVA (13%)</span><span className="tabular-nums font-semibold text-[#0F172A]">{$(iva)}</span></div>
          <div className="flex justify-between text-sm font-black text-[#0F172A] border-t border-slate-200/50 pt-1.5"><span>Total</span><span className="tabular-nums text-[#1B4FD8]">{$(total)}</span></div>
        </div>

        {/* Método de pago */}
        <div>
          <label className="text-[10px] font-black text-[#CBD5E1] uppercase tracking-wider block mb-1">Método de pago</label>
          <div className="grid grid-cols-3 gap-1">
            {(["Efectivo", "Tarjeta", "Transferencia"] as const).map(m => (
              <button key={m} onClick={() => { setPayMethod(m); setCashPaid(""); }}
                className={`py-1.5 rounded-lg text-[10px] font-bold border text-center transition-all ${payMethod === m ? "bg-[#1B4FD8] border-[#1B4FD8] text-white shadow-sm" : "bg-white border-[#E2E8F0] text-[#64748B] hover:border-[#1B4FD8]"}`}>
                {m}
              </button>
            ))}
          </div>
        </div>

        {payMethod === "Efectivo" && (
          <div className="flex items-center gap-2">
            <input type="number" step="any" placeholder="Monto entregado" value={cashPaid} onChange={e => setCashPaid(e.target.value)}
              className="flex-1 px-3 py-1.5 border border-[#E2E8F0] rounded-lg text-xs bg-white text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#1B4FD8]" />
            {cashAmt > total && (
              <div className="text-right">
                <p className="text-[9px] text-[#94A3B8] font-bold leading-none">Cambio</p>
                <p className="text-xs font-black text-emerald-600 mt-0.5 tabular-nums">{$(change)}</p>
              </div>
            )}
          </div>
        )}

        {/* DTE Toggle */}
        <div className={`rounded-xl p-2.5 border transition-all ${emitDTE ? "bg-[#EEF2FF] border-[#1B4FD8]/30" : "bg-white border-[#E2E8F0]"}`}>
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input type="checkbox" checked={emitDTE} onChange={e => setEmitDTE(e.target.checked)} className="w-3.5 h-3.5 accent-[#1B4FD8] rounded mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold text-[#0F172A]">Emitir factura electrónica</p>
              {emitDTE && (
                <div className="flex gap-1.5 mt-1.5">
                  {(["CF", "CCF"] as const).map(t => (
                    <button key={t} onClick={e => { e.preventDefault(); setDteType(t); }}
                      className={`px-2 py-0.5 rounded text-[9px] font-bold border transition-all ${dteType === t ? "bg-[#1B4FD8] text-white border-[#1B4FD8]" : "bg-white text-[#64748B] border-[#E2E8F0]"}`}>
                      {t === "CF" ? "Consumidor Final" : "Crédito Fiscal"}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </label>
        </div>

        <Btn v="primary" sz="md" full onClick={handleCobrar} disabled={!cart.length || (payMethod === "Efectivo" && cashAmt < total)}>
          Cobrar {$(total)}
        </Btn>
      </div>
    </div>
  );

  return (
    <div className="h-[calc(100vh-60px-64px)] md:h-[calc(100vh-60px)] -m-4 md:-m-6 flex overflow-hidden">
      {/* Desktop */}
      <div className="hidden md:flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-hidden">{ProductsView}</div>
        <div className="w-[296px] flex flex-col shrink-0">{CartView}</div>
      </div>
      {/* Mobile */}
      <div className="flex md:hidden flex-col flex-1 overflow-hidden">
        <div className="flex bg-white border-b border-[#E2E8F0]">
          {(["productos", "carrito"] as const).map(t => (
            <button key={t} onClick={() => setMobTab(t)}
              className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors border-b-2 -mb-px ${mobTab === t ? "text-[#1B4FD8] border-[#1B4FD8]" : "text-[#94A3B8] border-transparent"}`}>
              {t === "carrito" ? "Carrito" : "Productos"}
              {t === "carrito" && count > 0 && <span className="bg-[#1B4FD8] text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-black">{count}</span>}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-hidden">{mobTab === "productos" ? ProductsView : CartView}</div>
        {mobTab === "productos" && count > 0 && (
          <div className="absolute bottom-16 inset-x-3 z-10">
            <button onClick={() => setMobTab("carrito")}
              className="w-full bg-[#1B4FD8] text-white py-3.5 rounded-2xl text-sm font-black shadow-2xl flex items-center justify-between px-5">
              <ShoppingCart size={17} />
              <span>Ver carrito ({count} items)</span>
              <span className="tabular-nums">{$(total)}</span>
            </button>
          </div>
        )}
      </div>

      {/* Post-sale modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleReset} />
          <div className="relative bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Green strip */}
            <div className="bg-emerald-500 p-6 text-center text-white">
              <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-2"><CheckCircle size={28} className="text-white" /></div>
              <h3 className="text-lg font-black">Venta registrada</h3>
              <p className="text-emerald-100 text-sm mt-0.5">Transacción completada con éxito</p>
            </div>
            <div className="p-5 space-y-4">
              {/* Summary */}
              <div className="bg-slate-50 rounded-xl divide-y divide-slate-100 overflow-hidden ring-1 ring-[#E2E8F0]">
                {[
                  { label: "Total cobrado", val: $(total), bold: true },
                  { label: "Método de pago", val: payMethod },
                  ...(payMethod === "Efectivo" && cashPaid ? [{ label: "Cambio", val: $(change) }] : []),
                ].map(r => (
                  <div key={r.label} className="flex justify-between items-center px-4 py-2.5 text-sm">
                    <span className="text-[#64748B]">{r.label}</span>
                    <span className={`font-bold tabular-nums ${r.label === "Cambio" ? "text-emerald-600" : "text-[#0F172A]"}`}>{r.val}</span>
                  </div>
                ))}
              </div>
              {/* DTE status */}
              {emitDTE && (
                <div className={`rounded-xl p-3.5 text-sm font-semibold flex items-start gap-3 ring-1 ${dteStatus === "processing" ? "bg-blue-50 text-blue-700 ring-blue-200" : dteStatus === "success" ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-amber-50 text-amber-700 ring-amber-200"}`}>
                  {dteStatus === "processing" && <><RefreshCw size={15} className="animate-spin shrink-0 mt-0.5" /><div><p>Procesando factura electrónica…</p></div></>}
                  {dteStatus === "success" && <><CheckCircle size={15} className="shrink-0 mt-0.5 text-emerald-600" /><div><p>DTE procesado correctamente</p><p className="text-xs font-normal mt-0.5 text-emerald-600 font-mono">N° Control: {recentDteControl}</p></div></>}
                  {dteStatus === "contingencia" && <><AlertTriangle size={15} className="shrink-0 mt-0.5 text-amber-600" /><div><p>DTE en contingencia</p><p className="text-xs font-normal mt-0.5 text-amber-600">Se regularizará cuando el sistema DTE esté disponible</p></div></>}
                </div>
              )}
              {/* Actions */}
              <div className="grid grid-cols-3 gap-2">
                <Btn v="secondary" sz="sm" className="flex-col gap-1.5 py-3 h-auto" onClick={() => alert("Próximamente: La impresión de tickets estará disponible al conectar una impresora térmica.")}><Printer size={14} />Imprimir</Btn>
                <Btn v="secondary" sz="sm" className="flex-col gap-1.5 py-3 h-auto" onClick={() => alert("Próximamente: El envío por WhatsApp estará disponible en una actualización futura.")}><MessageSquare size={14} />WhatsApp</Btn>
                <Btn v="secondary" sz="sm" className="flex-col gap-1.5 py-3 h-auto" onClick={() => alert("Próximamente: El envío por correo electrónico estará disponible en una actualización futura.")}><Mail size={14} />Correo</Btn>
              </div>
              <Btn v="primary" full onClick={handleReset}>Nueva venta</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
