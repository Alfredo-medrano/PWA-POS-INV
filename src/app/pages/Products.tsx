import { useState, useEffect } from "react";
import {
  List, Grid3x3, Plus, Search, Edit, Package, X, Camera, Hash, Percent, Trash2
} from "lucide-react";
import { usePOSStore, Product } from "../store/usePOSStore";
import { Btn, Input, Badge, $, status, CATS } from "../components/Primitives";

export default function Products() {
  const { products, fetchProducts, createProduct, updateProduct, deleteProduct, suppliers, fetchSuppliers } = usePOSStore();
  const [view, setView] = useState<"list" | "grid">("list");
  const [drawer, setDrawer] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const [form, setForm] = useState({
    name: "",
    sku: "",
    cost: "",
    price: "",
    stock: "",
    minStock: "",
    cat: "Bebidas",
    img: "",
    barcode: "",
    unit: "Unidad",
    supplierId: ""
  });

  useEffect(() => {
    fetchProducts();
    fetchSuppliers();
  }, []);

  function handleEditClick(p: Product) {
    setEditingId(p.id);
    setForm({
      name: p.name,
      sku: p.sku,
      cat: p.category,
      cost: String(p.cost),
      price: String(p.price),
      stock: String(p.stock),
      minStock: String(p.minStock),
      img: p.img || "",
      barcode: p.barcode || "",
      unit: (p as any).unit || "Unidad",
      supplierId: (p as any).supplierId || ""
    });
    setDrawer(true);
  }

  function handleAddClick() {
    setEditingId(null);
    setForm({
      name: "",
      sku: "",
      cat: "Bebidas",
      cost: "",
      price: "",
      stock: "",
      minStock: "",
      img: "",
      barcode: "",
      unit: "Unidad",
      supplierId: ""
    });
    setDrawer(true);
  }

  async function handleSave() {
    if (!form.name || !form.sku) return;

    const payload = {
      name: form.name,
      sku: form.sku,
      category: form.cat,
      cost: parseFloat(form.cost) || 0,
      price: parseFloat(form.price) || 0,
      stock: parseInt(form.stock) || 0,
      minStock: parseInt(form.minStock) || 0,
      img: form.img || undefined,
      barcode: form.barcode || undefined,
      unit: form.unit || undefined,
      supplierId: form.supplierId || undefined
    };

    let success = false;
    if (editingId) {
      success = await updateProduct(editingId, payload);
    } else {
      success = await createProduct(payload);
    }

    if (success) {
      setDrawer(false);
    }
  }

  async function handleDelete(id: string) {
    if (confirm("¿Estás seguro de que deseas eliminar este producto?")) {
      await deleteProduct(id);
      setDrawer(false);
    }
  }

  const margin = form.cost && form.price ? ((parseFloat(form.price) - parseFloat(form.cost)) / parseFloat(form.price) * 100).toFixed(0) : null;
  const list = products.filter(p => p.name.toLowerCase().includes(q.toLowerCase()) || p.sku.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">Productos</h1>
        <div className="flex items-center gap-2.5">
          <div className="flex rounded-lg overflow-hidden border border-[#E2E8F0]">
            <button onClick={() => setView("list")} className={`px-3 py-2 transition-colors ${view === "list" ? "bg-[#1B4FD8] text-white" : "bg-white text-[#64748B] hover:bg-slate-50"}`}><List size={14} /></button>
            <button onClick={() => setView("grid")} className={`px-3 py-2 border-l border-[#E2E8F0] transition-colors ${view === "grid" ? "bg-[#1B4FD8] text-white" : "bg-white text-[#64748B] hover:bg-slate-50"}`}><Grid3x3 size={14} /></button>
          </div>
          <Btn v="primary" sz="sm" onClick={handleAddClick}><Plus size={14} />Nuevo producto</Btn>
        </div>
      </div>
      <div className="relative max-w-xs">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#CBD5E1]" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar productos…"
          className="w-full pl-9 pr-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4FD8]/20 focus:border-[#1B4FD8] transition-all" />
      </div>
      {view === "list" ? (
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-[#E2E8F0]">
              <tr>{["Producto", "SKU", "Categoría", "Precio", "Margen", "Stock", ""].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-bold text-[#94A3B8] tracking-wide">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-[#F8FAFC]">
              {list.map(p => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 overflow-hidden shrink-0">{p.img ? <img src={p.img} alt={p.name} className="w-full h-full object-cover" /> : <Package size={16} className="text-slate-300 m-auto mt-2" />}</div>
                      <span className="font-semibold text-[#0F172A]">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#94A3B8] font-mono">{p.sku}</td>
                  <td className="px-4 py-3 text-[#64748B]">{p.category}</td>
                  <td className="px-4 py-3 font-black tabular-nums text-[#1B4FD8]">{$(p.price)}</td>
                  <td className="px-4 py-3"><Badge color="green">{p.price > 0 ? ((p.price - p.cost) / p.price * 100).toFixed(0) : "0"}%</Badge></td>
                  <td className="px-4 py-3 tabular-nums font-semibold">{p.stock}</td>
                  <td className="px-4 py-3"><button onClick={() => handleEditClick(p)} className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-[#64748B] transition-colors"><Edit size={13} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {list.map(p => (
            <div key={p.id} className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm hover:border-[#1B4FD8]/40 hover:shadow-md transition-all overflow-hidden">
              <div className="aspect-square bg-slate-100">{p.img ? <img src={p.img} alt={p.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Package size={28} className="text-slate-200" /></div>}</div>
              <div className="p-3">
                <p className="text-xs font-bold text-[#0F172A] mb-2 line-clamp-2">{p.name}</p>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="font-black text-[#1B4FD8] tabular-nums">{$(p.price)}</span>
                  <Badge color={status(p) === "ok" ? "green" : status(p) === "low" ? "amber" : "red"}>{p.stock}</Badge>
                </div>
                <button onClick={() => handleEditClick(p)} className="w-full py-1.5 text-xs font-bold text-[#64748B] border border-[#E2E8F0] rounded-lg hover:bg-slate-50 flex items-center justify-center gap-1 transition-colors"><Edit size={11} />Editar</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDrawer(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0]">
              <h2 className="font-black text-[#0F172A] text-lg">{editingId ? "Editar producto" : "Nuevo producto"}</h2>
              <button onClick={() => setDrawer(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#94A3B8] hover:bg-slate-100 transition-colors"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin">
              {[
                { title: "Información básica", content: (
                  <div className="space-y-4">
                    <Input label="Nombre del producto *" placeholder="ej. Coca-Cola 2L" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} />
                    <div className="grid grid-cols-2 gap-3">
                      <Input label="SKU / Código" placeholder="CC2L" value={form.sku} onChange={v => setForm(f => ({ ...f, sku: v }))} />
                      <Input label="Código de barras" placeholder="7501055300227" value={form.barcode} onChange={v => setForm(f => ({ ...f, barcode: v }))} icon={Hash} />
                    </div>
                    <div className="border-2 border-dashed border-[#E2E8F0] rounded-xl p-5 text-center hover:border-[#1B4FD8]/40 hover:bg-[#EEF2FF]/20 transition-all cursor-pointer" onClick={() => { const el = document.getElementById('product-img-url'); if (el) el.focus(); }}><Camera size={20} className="text-[#CBD5E1] mx-auto mb-1.5" /><p className="text-xs text-[#94A3B8] font-medium">Clic para pegar URL de imagen</p></div>
                    <Input id="product-img-url" label="URL de la imagen" placeholder="https://..." value={form.img} onChange={v => setForm(f => ({ ...f, img: v }))} />
                  </div>
                )},
                { title: "Precios", content: (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <Input label="Precio de costo $" type="number" placeholder="0.00" value={form.cost} onChange={v => setForm(f => ({ ...f, cost: v }))} />
                      <Input label="Precio de venta $" type="number" placeholder="0.00" value={form.price} onChange={v => setForm(f => ({ ...f, price: v }))} />
                    </div>
                    {margin && <div className="flex items-center gap-2 bg-emerald-50 px-3 py-2 rounded-xl text-sm font-bold text-emerald-700 ring-1 ring-emerald-200"><Percent size={13} />Margen calculado: {margin}%</div>}
                  </div>
                )},
                { title: "Inventario", content: (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <Input label="Stock inicial" type="number" placeholder="0" value={form.stock} onChange={v => setForm(f => ({ ...f, stock: v }))} />
                      <Input label="Stock mínimo (alerta)" type="number" placeholder="0" value={form.minStock} onChange={v => setForm(f => ({ ...f, minStock: v }))} />
                    </div>
                    <div><label className="text-sm font-semibold text-[#0F172A] block mb-1">Unidad de medida</label><select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} className="w-full px-3 py-2 bg-slate-50 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4FD8]/20 focus:border-[#1B4FD8]">{["Unidad", "Caja", "Libra", "Litro", "Docena", "Paquete"].map(u => <option key={u}>{u}</option>)}</select></div>
                  </div>
                )},
                { title: "Clasificación", content: (
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-sm font-semibold text-[#0F172A] block mb-1">Categoría</label><select value={form.cat} onChange={e => setForm(f => ({ ...f, cat: e.target.value }))} className="w-full px-3 py-2 bg-slate-50 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4FD8]/20 focus:border-[#1B4FD8]">{CATS.filter(c => c !== "Todos").map(c => <option key={c}>{c}</option>)}</select></div>
                    <div><label className="text-sm font-semibold text-[#0F172A] block mb-1">Proveedor</label><select value={form.supplierId} onChange={e => setForm(f => ({ ...f, supplierId: e.target.value }))} className="w-full px-3 py-2 bg-slate-50 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4FD8]/20 focus:border-[#1B4FD8]"><option value="">Sin proveedor</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                  </div>
                )},
              ].map(sec => (
                <div key={sec.title} className="px-6 pt-5">
                  <p className="text-[10px] font-black text-[#CBD5E1] uppercase tracking-widest mb-4">{sec.title}</p>
                  {sec.content}
                </div>
              ))}
              <div className="h-6" />
            </div>
            <div className="px-6 py-4 border-t border-[#E2E8F0] flex gap-3">
              {editingId && (
                <Btn v="danger" onClick={() => handleDelete(editingId)} className="mr-auto"><Trash2 size={14} />Eliminar</Btn>
              )}
              <Btn v="secondary" onClick={() => setDrawer(false)} className={editingId ? "" : "flex-1"}>Cancelar</Btn>
              <Btn v="primary" onClick={handleSave} className={editingId ? "" : "flex-1"}>Guardar producto</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
