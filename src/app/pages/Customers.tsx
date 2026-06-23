import { useState, useEffect } from "react";
import {
  Plus, Search, Edit, X, User, Building2, Hash, Phone, AtSign, MapPin, CheckCircle, Trash2
} from "lucide-react";
import { usePOSStore, Customer } from "../store/usePOSStore";
import { Btn, Input, Badge, $ } from "../components/Primitives";

export default function Customers() {
  const { customers, fetchCustomers, createCustomer, updateCustomer, deleteCustomer } = usePOSStore();
  const [drawer, setDrawer] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const [form, setForm] = useState({
    name: "",
    type: "natural" as "natural" | "juridica",
    nit: "",
    nrc: "",
    dui: "",
    phone: "",
    email: "",
    addr: ""
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  function handleEditClick(c: Customer) {
    setEditingId(c.id);
    setForm({
      name: c.name,
      type: c.type,
      nit: c.nit || "",
      nrc: c.nrc || "",
      dui: c.dui || "",
      phone: c.phone || "",
      email: c.email || "",
      addr: c.address || ""
    });
    setDrawer(true);
  }

  function handleAddClick() {
    setEditingId(null);
    setForm({
      name: "",
      type: "natural",
      nit: "",
      nrc: "",
      dui: "",
      phone: "",
      email: "",
      addr: ""
    });
    setDrawer(true);
  }

  async function handleSave() {
    if (!form.name) return;

    const payload = {
      name: form.name,
      type: form.type,
      nit: form.nit || undefined,
      nrc: form.nrc || undefined,
      dui: form.dui || undefined,
      phone: form.phone || undefined,
      email: form.email || undefined,
      address: form.addr || undefined
    };

    let success = false;
    if (editingId) {
      success = await updateCustomer(editingId, payload);
    } else {
      success = await createCustomer(payload);
    }

    if (success) {
      setDrawer(false);
    }
  }

  async function handleDelete(id: string) {
    if (confirm("¿Estás seguro de que deseas eliminar este cliente?")) {
      await deleteCustomer(id);
      setDrawer(false);
    }
  }

  const list = customers.filter(c => c.name.toLowerCase().includes(q.toLowerCase()) || (c.phone && c.phone.includes(q)) || (c.nit && c.nit.includes(q)));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">Clientes</h1>
        <Btn v="primary" sz="sm" onClick={handleAddClick}><Plus size={14} />Nuevo cliente</Btn>
      </div>
      <div className="relative max-w-xs">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#CBD5E1]" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar cliente…" className="w-full pl-9 pr-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4FD8]/20 focus:border-[#1B4FD8] transition-all" />
      </div>
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-[#E2E8F0]">
              <tr>{["Cliente", "NIT / DUI", "Teléfono", "Correo", "Total comprado", "Última compra", ""].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-bold text-[#94A3B8] tracking-wide whitespace-nowrap">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-[#F8FAFC]">
              {list.map(c => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#EEF2FF] to-[#E0E7FF] flex items-center justify-center text-[#1B4FD8] font-black text-xs shrink-0">
                        {c.name.split(" ").map(n => n[0]).slice(0, 2).join("")}
                      </div>
                      <div>
                        <p className="font-semibold text-[#0F172A]">{c.name}</p>
                        <p className="text-xs text-[#94A3B8]">{c.type === "juridica" ? "Persona Jurídica" : "Persona Natural"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-[#64748B]">{c.nit || c.dui || "—"}</td>
                  <td className="px-4 py-3 font-mono text-[#64748B]">{c.phone || "—"}</td>
                  <td className="px-4 py-3 text-[#64748B]">{c.email || "—"}</td>
                  <td className="px-4 py-3 font-black tabular-nums text-[#0F172A]">{$(c.total)}</td>
                  <td className="px-4 py-3 text-[#64748B]">{c.lastBuy || "—"}</td>
                  <td className="px-4 py-3"><button onClick={() => handleEditClick(c)} className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-[#64748B] transition-colors"><Edit size={13} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {drawer && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDrawer(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0]">
              <h2 className="font-black text-[#0F172A] text-lg">{editingId ? "Editar cliente" : "Nuevo cliente"}</h2>
              <button onClick={() => setDrawer(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#94A3B8] hover:bg-slate-100 transition-colors"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-thin">
              <div><label className="text-sm font-semibold text-[#0F172A] block mb-2">Tipo de persona</label>
                <div className="flex gap-2">
                  {[["natural", "Persona Natural"], ["juridica", "Persona Jurídica"]].map(([v, l]) => (
                    <button key={v} onClick={() => setForm(f => ({ ...f, type: v as any }))} className={`flex-1 py-2.5 text-sm font-bold rounded-xl border transition-all ${form.type === v ? "bg-[#1B4FD8] text-white border-[#1B4FD8]" : "bg-white text-[#64748B] border-[#E2E8F0] hover:border-[#1B4FD8]"}`}>{l}</button>
                  ))}
                </div>
              </div>
              <Input label={form.type === "juridica" ? "Razón social *" : "Nombre completo *"} placeholder={form.type === "juridica" ? "Mi Empresa S.A. de C.V." : "Juan Pérez"} value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} icon={form.type === "juridica" ? Building2 : User} />
              <Input label="NIT — requerido para emitir Crédito Fiscal (CCF)" placeholder="0614-010180-101-3" value={form.nit} onChange={v => setForm(f => ({ ...f, nit: v }))} icon={Hash} />
              {form.type === "natural" && <Input label="DUI" placeholder="01234567-8" value={form.dui} onChange={v => setForm(f => ({ ...f, dui: v }))} />}
              {form.type === "juridica" && <Input label="NRC" placeholder="12345-6" value={form.nrc} onChange={v => setForm(f => ({ ...f, nrc: v }))} />}
              <div className="grid grid-cols-2 gap-3">
                <Input label="Teléfono" placeholder="7888-1234" value={form.phone} onChange={v => setForm(f => ({ ...f, phone: v }))} icon={Phone} />
                <Input label="Correo" type="email" placeholder="correo@empresa.com" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} icon={AtSign} />
              </div>
              <Input label="Dirección" placeholder="Calle Principal, Colonia, Municipio" value={form.addr} onChange={v => setForm(f => ({ ...f, addr: v }))} icon={MapPin} />
              {form.nit && (
                <div className="flex items-start gap-2.5 bg-[#EEF2FF] text-[#1B4FD8] p-3.5 rounded-xl text-xs font-semibold ring-1 ring-[#1B4FD8]/20">
                  <CheckCircle size={14} className="mt-0.5 shrink-0" />
                  Con NIT registrado, el toggle de DTE se activará automáticamente al seleccionar este cliente en el POS.
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-[#E2E8F0] flex gap-3">
              {editingId && (
                <Btn v="danger" onClick={() => handleDelete(editingId)} className="mr-auto"><Trash2 size={14} />Eliminar</Btn>
              )}
              <Btn v="secondary" onClick={() => setDrawer(false)} className={editingId ? "" : "flex-1"}>Cancelar</Btn>
              <Btn v="primary" onClick={handleSave} className={editingId ? "" : "flex-1"}>Guardar cliente</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
