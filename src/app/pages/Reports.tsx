import { useEffect, useState } from "react";
import {
  TrendingUp, Package, Star, Receipt, Users, Truck,
  Download, FileSpreadsheet, BarChart2, RefreshCw
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as ChartTooltip, ResponsiveContainer
} from "recharts";
import { usePOSStore } from "../store/usePOSStore";
import { Btn, Badge, $ } from "../components/Primitives";

export default function Reports() {
  const { reportsStats, fetchReportsStats, loadingStats } = usePOSStore();
  const [period, setPeriod] = useState("mes");
  const [active, setActive] = useState("ventas");

  useEffect(() => {
    fetchReportsStats();
  }, []);

  const types = [
    { id: "ventas",     icon: TrendingUp,  label: "Ventas por período"     },
    { id: "inventario", icon: Package,     label: "Inventario valorizado"  },
    { id: "productos",  icon: Star,        label: "Productos más vendidos"  },
    { id: "cortes",     icon: Receipt,     label: "Cortes de caja"         },
    { id: "clientes",   icon: Users,       label: "Clientes frecuentes"    },
    { id: "compras",    icon: Truck,       label: "Compras por proveedor"  },
  ];

  // Si está cargando y no hay estadísticas aún
  if (loadingStats && !reportsStats) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <RefreshCw size={24} className="animate-spin text-[#1B4FD8] mb-2" />
        <p className="text-sm text-[#64748B] font-semibold">Cargando reportes...</p>
      </div>
    );
  }

  const monthlyData = reportsStats?.monthly || [];
  const topProducts = reportsStats?.topProducts || [];
  const corteCaja = reportsStats?.corteCaja || [];

  // Calcular total vendido en la gráfica para el badge
  const monthlyTotalSum = monthlyData.reduce((sum, item) => sum + item.v, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">Reportes</h1>
        <div className="flex gap-0.5 bg-slate-100 rounded-xl p-1">
          {[["hoy","Hoy"],["semana","Semana"],["mes","Este mes"],["custom","Personalizado"]].map(([v,l]) => (
            <button key={v} onClick={() => setPeriod(v)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${period === v ? "bg-white text-[#0F172A] shadow-sm" : "text-[#94A3B8] hover:text-[#64748B]"}`}>{l}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {types.map(r => (
          <button key={r.id} onClick={() => setActive(r.id)}
            className={`bg-white rounded-xl border p-4 text-left transition-all hover:shadow-md flex flex-col gap-3 ${active === r.id ? "border-[#1B4FD8] ring-2 ring-[#1B4FD8]/20 shadow-sm" : "border-[#E2E8F0] hover:border-[#1B4FD8]/30"}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${active === r.id ? "bg-[#1B4FD8] text-white" : "bg-slate-100 text-[#64748B]"}`}><r.icon size={18} /></div>
            <p className="text-sm font-bold text-[#0F172A] leading-snug">{r.label}</p>
          </button>
        ))}
      </div>

      {active === "ventas" && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-6">
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <h3 className="font-black text-[#0F172A]">Ventas por período</h3>
            <div className="flex gap-2">
              <Btn v="secondary" sz="sm"><Download size={13} />PDF</Btn>
              <Btn v="secondary" sz="sm"><FileSpreadsheet size={13} />Excel</Btn>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="m" tick={{ fontSize: 12, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} tickFormatter={v => `$${v / 1000}k`} />
              <ChartTooltip formatter={(v: number) => [$(v), "Ventas"]} contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontSize: 12, boxShadow: "0 8px 24px rgba(0,0,0,.08)" }} />
              <Line type="monotone" dataKey="v" stroke="#1B4FD8" strokeWidth={3} dot={{ fill: "#1B4FD8", r: 5, strokeWidth: 0 }} activeDot={{ r: 7, fill: "#1338A8" }} />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-5 grid grid-cols-3 gap-3">
            {[
              { l: "Vendido (6 meses)", v: $(monthlyTotalSum), c: "text-[#0F172A]" }, 
              { l: "Tendencia", v: "+15%", c: "text-emerald-600" }, 
              { l: "Muestras de Meses", v: String(monthlyData.length), c: "text-[#0F172A]" }
            ].map(s => (
              <div key={s.l} className="bg-slate-50 rounded-xl p-3.5 text-center ring-1 ring-[#E2E8F0]">
                <p className={`text-xl font-black tabular-nums ${s.c}`}>{s.v}</p>
                <p className="text-xs text-[#94A3B8] font-medium mt-0.5">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {active === "productos" && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-6">
          <h3 className="font-black text-[#0F172A] mb-5">Productos más vendidos</h3>
          <div className="space-y-4">
            {topProducts.map((p, i) => {
              // Calcular un porcentaje visual relativo al producto top
              const maxUnits = topProducts[0]?.u || 1;
              const pct = (p.u / maxUnits) * 100;
              return (
                <div key={p.name} className="flex items-center gap-4">
                  <span className="w-7 h-7 rounded-full bg-[#EEF2FF] text-[#1B4FD8] flex items-center justify-center text-xs font-black shrink-0">{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-semibold text-[#0F172A]">{p.name}</span>
                      <span className="text-sm font-black tabular-nums">{$(p.rev)}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-[#1B4FD8] to-[#1338A8] rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-xs text-[#94A3B8] mt-1">{p.u} unidades vendidas</p>
                  </div>
                </div>
              );
            })}
            {topProducts.length === 0 && (
              <div className="text-center py-10 text-xs text-[#94A3B8]">Aún no hay datos de ventas registrados para reportar.</div>
            )}
          </div>
        </div>
      )}

      {active === "cortes" && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-6">
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <h3 className="font-black text-[#0F172A]">Corte de caja — hoy</h3>
            <Btn v="danger" sz="sm">Cerrar caja</Btn>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {corteCaja.map(i => (
              <div key={i.l} className="bg-slate-50 rounded-xl p-4 ring-1 ring-[#E2E8F0]">
                <p className="text-xs text-[#94A3B8] font-medium mb-1.5">{i.l}</p>
                <p className={`text-lg font-black tabular-nums ${i.c || "text-[#0F172A]"}`}>{$(i.v)}</p>
              </div>
            ))}
            {corteCaja.length === 0 && (
              <div className="col-span-3 text-center py-10 text-xs text-[#94A3B8]">Sin datos para generar corte.</div>
            )}
          </div>
        </div>
      )}

      {!["ventas", "productos", "cortes"].includes(active) && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-16 text-center">
          <BarChart2 size={36} className="text-slate-200 mx-auto mb-3" />
          <p className="text-[#64748B] font-semibold text-sm">Selecciona un período para generar el reporte</p>
          <Btn v="primary" sz="sm" className="mt-4" onClick={fetchReportsStats}><Download size={13} />Generar reporte</Btn>
        </div>
      )}
    </div>
  );
}
