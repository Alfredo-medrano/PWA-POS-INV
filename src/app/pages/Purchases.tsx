import { useState } from "react";
import { Plus, Truck, Edit, MoreVertical, FileSpreadsheet } from "lucide-react";
import { Btn, Badge, $ } from "../components/Primitives";

export default function Purchases() {
  const [tab, setTab] = useState<"ordenes" | "proveedores">("ordenes");
  const orders = [
    { id: "OC-001", sup: "Distribuidora Central",   date: "20/06/2025", n: 8,  total: 450.80, s: "Recibida"  },
    { id: "OC-002", sup: "Proveedor Lácteos SV",    date: "18/06/2025", n: 4,  total: 180.00, s: "Pendiente" },
    { id: "OC-003", sup: "Bebidas del Norte",        date: "15/06/2025", n: 12, total: 890.50, s: "Recibida"  },
    { id: "OC-004", sup: "Distribuidora Central",   date: "12/06/2025", n: 6,  total: 320.25, s: "Cancelada" },
  ];
  const sups = [
    { name: "Distribuidora Central",  phone: "2222-4455", nrc: "11223-4", last: "20/06/2025" },
    { name: "Proveedor Lácteos SV",   phone: "7788-9900", nrc: "55667-8", last: "18/06/2025" },
    { name: "Bebidas del Norte",       phone: "2233-1122", nrc: "99001-2", last: "15/06/2025" },
  ];
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">Compras</h1>
        <Btn v="primary" sz="sm"><Plus size={14} />Nueva compra</Btn>
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
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-[#E2E8F0]">
              <tr>{["# Orden", "Proveedor", "Fecha", "Productos", "Total", "Estado", ""].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-bold text-[#94A3B8] tracking-wide">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-[#F8FAFC]">
              {orders.map(o => (
                <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-bold text-[#1B4FD8]">{o.id}</td>
                  <td className="px-4 py-3 font-semibold text-[#0F172A]">{o.sup}</td>
                  <td className="px-4 py-3 text-[#64748B]">{o.date}</td>
                  <td className="px-4 py-3 tabular-nums text-center font-semibold">{o.n}</td>
                  <td className="px-4 py-3 font-black tabular-nums">{$(o.total)}</td>
                  <td className="px-4 py-3"><Badge color={o.s === "Recibida" ? "green" : o.s === "Pendiente" ? "amber" : "red"}>{o.s}</Badge></td>
                  <td className="px-4 py-3"><button className="text-[#CBD5E1] hover:text-[#64748B] transition-colors"><MoreVertical size={14} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex justify-end"><Btn v="secondary" sz="sm"><Plus size={13} />Agregar proveedor</Btn></div>
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-[#E2E8F0]">
                <tr>{["Nombre", "Teléfono", "NRC", "Última compra", ""].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-bold text-[#94A3B8] tracking-wide">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-[#F8FAFC]">
                {sups.map(s => (
                  <tr key={s.name} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-[#0F172A]">{s.name}</td>
                    <td className="px-4 py-3 font-mono text-[#64748B]">{s.phone}</td>
                    <td className="px-4 py-3 font-mono text-[#64748B]">{s.nrc}</td>
                    <td className="px-4 py-3 text-[#64748B]">{s.last}</td>
                    <td className="px-4 py-3"><button className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-[#64748B] transition-colors"><Edit size={13} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
