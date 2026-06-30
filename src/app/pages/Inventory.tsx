import { useState, useEffect } from "react";
import {
  Search, Plus, Edit, Download, BoxIcon, ChevronLeft,
  ChevronRight, TrendingUp, TrendingDown, Sliders
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { usePOSStore } from "../store/usePOSStore";
import { Btn, Badge, $, status, CATS } from "../components/Primitives";

export default function Inventory({ onNav }: { onNav: (p: any) => void }) {
  const { products, fetchProducts } = usePOSStore();
  const [q, setQ] = useState("");
  const [sf, setSf] = useState("Todos");
  const [cf, setCf] = useState("Todos");
  const [sortKey, setSortKey] = useState<"name" | "stock" | "price">("name");
  const [sortAsc, setSortAsc] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const [showModal, setShowModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [delta, setDelta] = useState("");
  const [tipo, setTipo] = useState<"Ingreso" | "Egreso">("Ingreso");
  const [motivo, setMotivo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function openAdjustment(p?: any) {
    if (p) {
      setSelectedProduct(p);
    } else {
      setSelectedProduct(products[0] || null);
    }
    setDelta("");
    setTipo("Ingreso");
    setMotivo("");
    setShowModal(true);
  }

  async function handleAdjust(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProduct) {
      toast.error("Selecciona un producto.");
      return;
    }
    const val = parseInt(delta);
    if (isNaN(val) || val <= 0) {
      toast.error("La cantidad debe ser un número entero positivo.");
      return;
    }

    const actualDelta = tipo === "Ingreso" ? val : -val;
    setSubmitting(true);
    try {
      await axios.post(`/api/productos/${selectedProduct.id}/ajuste`, {
        delta: actualDelta,
        tipo,
        motivo
      });
      toast.success("Ajuste de inventario realizado con éxito.");
      setShowModal(false);
      fetchProducts();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || "Error al realizar ajuste de inventario.");
    } finally {
      setSubmitting(false);
    }
  }

  function toggleSort(k: typeof sortKey) {
    if (sortKey === k) setSortAsc(a => !a);
    else { setSortKey(k); setSortAsc(true); }
  }

  const list = products
    .filter(p => {
      const s = status(p);
      const sm = sf === "Todos" || (sf === "Normal" && s === "ok") || (sf === "Bajo" && s === "low") || (sf === "Sin stock" && s === "empty");
      const cm = cf === "Todos" || p.category === cf;
      const qm = p.name.toLowerCase().includes(q.toLowerCase()) || p.sku.toLowerCase().includes(q.toLowerCase());
      return sm && cm && qm;
    })
    .sort((a, b) => {
      const v = sortKey === "name" ? a.name.localeCompare(b.name) : sortKey === "stock" ? a.stock - b.stock : a.price - b.price;
      return sortAsc ? v : -v;
    });

  const totalVal = products.reduce((s, p) => s + p.cost * p.stock, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">Inventario</h1>
          <div className="flex flex-wrap gap-x-5 gap-y-1 mt-1.5 text-sm">
            <span className="text-[#64748B]">Total: <strong className="text-[#0F172A]">{products.length} productos</strong></span>
            <span className="text-[#64748B]">Valor: <strong className="text-[#0F172A] tabular-nums">{$(totalVal)}</strong></span>
            <span className="font-semibold text-amber-600">⚠ Stock bajo: {products.filter(p => status(p) === "low").length}</span>
            <span className="font-semibold text-red-600">✕ Sin stock: {products.filter(p => status(p) === "empty").length}</span>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Btn v="success" sz="sm" onClick={() => onNav("compras")}><Plus size={13} />Entrada de stock</Btn>
          <Btn v="secondary" sz="sm" onClick={() => openAdjustment()}><Sliders size={13} />Ajuste manual</Btn>
          <Btn v="secondary" sz="sm" onClick={() => toast.info("Próximamente: Exportación a Excel estará disponible en una actualización futura.")}><Download size={13} />Excel</Btn>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#E2E8F0] flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#CBD5E1]" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por nombre o SKU…"
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4FD8]/20 focus:border-[#1B4FD8] transition-all" />
          </div>
          <select value={cf} onChange={e => setCf(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1B4FD8]/20 focus:border-[#1B4FD8]">
            {CATS.map(c => <option key={c}>{c}</option>)}
          </select>
          <select value={sf} onChange={e => setSf(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1B4FD8]/20 focus:border-[#1B4FD8]">
            {["Todos", "Normal", "Bajo", "Sin stock"].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-[#E2E8F0]">
              <tr>
                {[["Producto", "name"], ["SKU", ""], ["Categoría", ""], ["Stock", "stock"], ["Mínimo", ""], ["Costo", ""], ["Precio venta", "price"], ["Estado", ""], ["", ""]].map(([h, k]) => (
                  <th key={h} onClick={k ? () => toggleSort(k as "name" | "stock" | "price") : undefined}
                    className={`text-left px-4 py-3 text-xs font-bold text-[#64748B] tracking-wide ${k ? "cursor-pointer hover:text-[#0F172A] select-none" : ""}`}>
                    <span className="flex items-center gap-1">{h}{k && sortKey === k && (sortAsc ? <TrendingUp size={10} /> : <TrendingDown size={10} />)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F8FAFC]">
              {list.map(p => {
                const s = status(p);
                return (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-[#0F172A]">{p.name}</td>
                    <td className="px-4 py-3 text-xs text-[#94A3B8] font-mono">{p.sku}</td>
                    <td className="px-4 py-3 text-[#64748B]">{p.category}</td>
                    <td className="px-4 py-3 font-black tabular-nums"><span className={s === "empty" ? "text-red-600" : s === "low" ? "text-amber-600" : "text-[#0F172A]"}>{p.stock}</span></td>
                    <td className="px-4 py-3 tabular-nums text-[#94A3B8]">{p.minStock}</td>
                    <td className="px-4 py-3 tabular-nums text-[#64748B]">{$(p.cost)}</td>
                    <td className="px-4 py-3 font-black tabular-nums text-[#1B4FD8]">{$(p.price)}</td>
                    <td className="px-4 py-3">
                      <Badge color={s === "ok" ? "green" : s === "low" ? "amber" : "red"}>
                        {s === "ok" ? "● Normal" : s === "low" ? "⚠ Bajo" : "✕ Sin stock"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => onNav("productos")} title="Editar producto" className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-[#64748B] transition-colors"><Edit size={13} /></button>
                        <button onClick={() => openAdjustment(p)} title="Ajuste manual" className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-[#64748B] transition-colors"><Sliders size={13} /></button>
                        <button onClick={() => onNav("compras")} title="Reabastecer" className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-[#64748B] transition-colors"><BoxIcon size={13} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-[#E2E8F0] flex items-center justify-between">
          <p className="text-xs text-[#94A3B8] font-medium">1–{list.length} de {products.length} productos</p>
          <div className="flex gap-1">
            <button className="w-7 h-7 rounded-lg border border-[#E2E8F0] flex items-center justify-center hover:bg-slate-50 text-[#94A3B8] transition-colors"><ChevronLeft size={13} /></button>
            <button className="w-7 h-7 rounded-lg bg-[#1B4FD8] text-white flex items-center justify-center text-xs font-bold">1</button>
            <button className="w-7 h-7 rounded-lg border border-[#E2E8F0] flex items-center justify-center hover:bg-slate-50 text-[#94A3B8] transition-colors"><ChevronRight size={13} /></button>
          </div>
        </div>
      </div>

    {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl w-full max-w-md p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-[#0F172A]">Ajuste Manual de Inventario</h3>
              <button onClick={() => setShowModal(false)} className="text-[#94A3B8] hover:text-[#0F172A] font-bold text-lg">×</button>
            </div>

            <form onSubmit={handleAdjust} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#0F172A] block mb-1">Producto</label>
                <select value={selectedProduct?.id || ""} onChange={e => setSelectedProduct(products.find(p => p.id === e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] focus:outline-none">
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (SKU: {p.sku}) - Stock actual: {p.stock}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#0F172A] block mb-1">Tipo de Ajuste</label>
                  <select value={tipo} onChange={e => setTipo(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] focus:outline-none">
                    <option value="Ingreso">Ingreso (+)</option>
                    <option value="Egreso">Egreso (-)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-[#0F172A] block mb-1">Cantidad</label>
                  <input type="number" min="1" step="1" value={delta} onChange={e => setDelta(e.target.value)} required placeholder="Ej. 10"
                    className="w-full px-3 py-2 bg-slate-50 border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] focus:outline-none" />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#0F172A] block mb-1">Motivo / Observación</label>
                <textarea value={motivo} onChange={e => setMotivo(e.target.value)} required placeholder="Ej. Ajuste por merma, Entrada por donación, Inventario inicial..." rows={3}
                  className="w-full px-3 py-2 bg-slate-50 border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] focus:outline-none resize-none" />
              </div>

              <div className="flex gap-2 pt-2">
                <Btn v="secondary" type="button" className="flex-1 justify-center" onClick={() => setShowModal(false)}>Cancelar</Btn>
                <Btn v="primary" type="submit" disabled={submitting} className="flex-1 justify-center">
                  {submitting ? "Procesando..." : "Aplicar Ajuste"}
                </Btn>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
