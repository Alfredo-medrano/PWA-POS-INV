import { useEffect, useState } from "react";
import {
  TrendingUp, Package, Star, Receipt, Users, Truck,
  Download, FileSpreadsheet, BarChart2, RefreshCw, Percent
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as ChartTooltip, ResponsiveContainer
} from "recharts";
import { usePOSStore } from "../store/usePOSStore";
import { Btn, Badge, $ } from "../components/Primitives";

export default function Reports() {
  const {
    reportsStats,
    fetchReportsStats,
    loadingStats,
    products,
    fetchProducts,
    customers,
    fetchCustomers,
    purchases,
    fetchPurchases,
    suppliers,
    fetchSuppliers
  } = usePOSStore();

  const [period, setPeriod] = useState("mes");
  const [active, setActive] = useState("ventas");

  useEffect(() => {
    fetchReportsStats(period);
    fetchProducts();
    fetchCustomers();
    fetchPurchases();
    fetchSuppliers();
  }, [period]);

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

  // Computaciones de Inventario
  const totalValCost = products.reduce((sum, p) => sum + (p.cost * p.stock), 0);
  const totalValPrice = products.reduce((sum, p) => sum + (p.price * p.stock), 0);
  const projectedProfit = totalValPrice - totalValCost;
  const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
  const highestValueProducts = [...products]
    .sort((a, b) => (b.stock * b.cost) - (a.stock * a.cost))
    .slice(0, 10);

  // Computaciones de Clientes
  const topCustomers = [...customers]
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  // Computaciones de Compras
  const supplierAgg: Record<string, { count: number; total: number }> = {};
  purchases.forEach(p => {
    const sName = p.sup;
    if (!supplierAgg[sName]) {
      supplierAgg[sName] = { count: 0, total: 0 };
    }
    supplierAgg[sName].count += 1;
    supplierAgg[sName].total += p.total;
  });
  const supplierPurchaseList = Object.keys(supplierAgg).map(name => ({
    name,
    count: supplierAgg[name].count,
    total: supplierAgg[name].total
  })).sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">Reportes</h1>
        <div className="flex rounded-lg overflow-hidden border border-[#E2E8F0] p-1 bg-white shadow-sm gap-1">
          {[["semana", "Semana"], ["mes", "Mes"], ["anio", "Año"]].map(([id, label]) => (
            <button key={id} onClick={() => setPeriod(id)}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${period === id ? "bg-[#1B4FD8] text-white" : "text-[#64748B] hover:text-[#0F172A]"}`}>
              {label}
            </button>
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
              <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
              <ChartTooltip formatter={(v: number) => [$(v), "Ventas"]} contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontSize: 12, boxShadow: "0 8px 24px rgba(0,0,0,.08)" }} />
              <Line type="monotone" dataKey="v" stroke="#1B4FD8" strokeWidth={3} dot={{ fill: "#1B4FD8", r: 5, strokeWidth: 0 }} activeDot={{ r: 7, fill: "#1338A8" }} />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-5 grid grid-cols-3 gap-3">
            {(() => {
              // Calcular tendencia real comparando los últimos 2 registros
              let trendLabel = "Sin datos";
              let trendColor = "text-[#94A3B8]";
              if (monthlyData.length >= 2) {
                const last = monthlyData[monthlyData.length - 1]?.v || 0;
                const prev = monthlyData[monthlyData.length - 2]?.v || 0;
                if (prev > 0) {
                  const pct = ((last - prev) / prev * 100).toFixed(0);
                  trendLabel = `${Number(pct) >= 0 ? "+" : ""}${pct}%`;
                  trendColor = Number(pct) >= 0 ? "text-emerald-600" : "text-red-600";
                } else if (last > 0) {
                  trendLabel = "↑ Nuevo";
                  trendColor = "text-emerald-600";
                }
              }
              return [
                { l: `Vendido (${period === "semana" ? "semana" : period === "anio" ? "año" : "mes"})`, v: $(monthlyTotalSum), c: "text-[#0F172A]" }, 
                { l: "Tendencia", v: trendLabel, c: trendColor }, 
                { l: "Intervalos registrados", v: String(monthlyData.filter(m => m.v > 0).length), c: "text-[#0F172A]" }
              ].map(s => (
                <div key={s.l} className="bg-slate-50 rounded-xl p-3.5 text-center ring-1 ring-[#E2E8F0]">
                  <p className={`text-xl font-black tabular-nums ${s.c}`}>{s.v}</p>
                  <p className="text-xs text-[#94A3B8] font-medium mt-0.5">{s.l}</p>
                </div>
              ));
            })()}
          </div>
        </div>
      )}

      {active === "inventario" && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h3 className="font-black text-[#0F172A]">Inventario Valorizado</h3>
            <span className="text-xs text-[#94A3B8] font-bold">Datos en tiempo real</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Productos en catálogo", val: products.length, unit: "ítems", color: "text-[#0F172A]" },
              { label: "Existencias totales", val: totalStock, unit: "unidades", color: "text-[#0F172A]" },
              { label: "Valorización (Costo)", val: $(totalValCost), unit: "costo total", color: "text-[#1B4FD8]" },
              { label: "Valorización (Venta)", val: $(totalValPrice), unit: "venta total", color: "text-emerald-600" }
            ].map(card => (
              <div key={card.label} className="bg-slate-50 rounded-xl p-4 ring-1 ring-[#E2E8F0] text-center">
                <p className={`text-base font-black ${card.color}`}>{card.val}</p>
                <p className="text-[10px] text-[#94A3B8] font-bold uppercase mt-1">{card.label}</p>
                <p className="text-[9px] text-[#CBD5E1] mt-0.5">{card.unit}</p>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-black text-[#64748B] uppercase tracking-wider">Productos con mayor valor en almacén</h4>
            <div className="overflow-x-auto border border-[#E2E8F0] rounded-xl">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-[#E2E8F0]">
                  <tr>
                    {["Producto", "Categoría", "Stock", "Costo", "Precio", "Valor Total (Costo)"].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 font-bold text-[#94A3B8]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {highestValueProducts.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2 font-semibold text-[#0F172A]">{p.name}</td>
                      <td className="px-4 py-2 text-[#64748B]">{p.category}</td>
                      <td className="px-4 py-2 font-mono tabular-nums">{p.stock}</td>
                      <td className="px-4 py-2 font-mono tabular-nums">{$(p.cost)}</td>
                      <td className="px-4 py-2 font-mono tabular-nums">{$(p.price)}</td>
                      <td className="px-4 py-2 font-black tabular-nums text-[#1B4FD8]">{$(p.stock * p.cost)}</td>
                    </tr>
                  ))}
                  {highestValueProducts.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-6 text-[#94A3B8]">No hay productos en inventario.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
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
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {corteCaja.map(i => (
              <div key={i.l} className="bg-slate-50 rounded-xl p-4 ring-1 ring-[#E2E8F0]">
                <p className="text-xs text-[#94A3B8] font-medium mb-1.5">{i.l}</p>
                <p className={`text-base font-black tabular-nums ${i.c || "text-[#0F172A]"}`}>{$(i.v)}</p>
              </div>
            ))}
            {corteCaja.length === 0 && (
              <div className="col-span-3 text-center py-10 text-xs text-[#94A3B8]">Sin datos para generar corte.</div>
            )}
          </div>
        </div>
      )}

      {active === "clientes" && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h3 className="font-black text-[#0F172A]">Clientes Frecuentes</h3>
            <span className="text-xs text-[#94A3B8] font-bold">Ordenado por facturación total</span>
          </div>
          <div className="overflow-x-auto border border-[#E2E8F0] rounded-xl">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-[#E2E8F0]">
                <tr>
                  {["Cliente", "DUI / NIT", "Teléfono", "Correo", "Total Comprado", "Última Compra"].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 font-bold text-[#94A3B8]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topCustomers.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-2">
                      <p className="font-semibold text-[#0F172A]">{c.name}</p>
                      <p className="text-[10px] text-[#94A3B8]">{c.type === "juridica" ? "Persona Jurídica" : "Persona Natural"}</p>
                    </td>
                    <td className="px-4 py-2 font-mono text-[#64748B]">{c.nit || c.dui || "—"}</td>
                    <td className="px-4 py-2 font-mono text-[#64748B]">{c.phone || "—"}</td>
                    <td className="px-4 py-2 text-[#64748B]">{c.email || "—"}</td>
                    <td className="px-4 py-2 font-black tabular-nums text-emerald-600">{$(c.total)}</td>
                    <td className="px-4 py-2 text-[#64748B]">{c.lastBuy || "—"}</td>
                  </tr>
                ))}
                {topCustomers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-[#94A3B8]">No hay clientes registrados.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {active === "compras" && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h3 className="font-black text-[#0F172A]">Compras por Proveedor</h3>
            <span className="text-xs text-[#94A3B8] font-bold">Consolidado de órdenes de compra</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-3">
              <h4 className="text-xs font-black text-[#64748B] uppercase tracking-wider">Resumen por Proveedor</h4>
              <div className="overflow-x-auto border border-[#E2E8F0] rounded-xl">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-[#E2E8F0]">
                    <tr>
                      {["Proveedor", "N° Órdenes", "Monto Total"].map(h => (
                        <th key={h} className="text-left px-4 py-2.5 font-bold text-[#94A3B8]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {supplierPurchaseList.map(s => (
                      <tr key={s.name} className="hover:bg-slate-50/50">
                        <td className="px-4 py-2 font-semibold text-[#0F172A]">{s.name}</td>
                        <td className="px-4 py-2 font-mono tabular-nums">{s.count}</td>
                        <td className="px-4 py-2 font-black tabular-nums text-[#1B4FD8]">{$(s.total)}</td>
                      </tr>
                    ))}
                    {supplierPurchaseList.length === 0 && (
                      <tr>
                        <td colSpan={3} className="text-center py-6 text-[#94A3B8]">No hay compras registradas.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-black text-[#64748B] uppercase tracking-wider">Últimas Órdenes de Compra</h4>
              <div className="overflow-x-auto border border-[#E2E8F0] rounded-xl">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-[#E2E8F0]">
                    <tr>
                      {["ID", "Proveedor", "Total", "Estado"].map(h => (
                        <th key={h} className="text-left px-4 py-2.5 font-bold text-[#94A3B8]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {purchases.slice(0, 5).map(p => (
                      <tr key={p.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-2 font-mono text-[10px] text-[#1B4FD8]">{p.id.slice(0, 8)}</td>
                        <td className="px-4 py-2 font-semibold text-[#0F172A]">{p.sup}</td>
                        <td className="px-4 py-2 font-black tabular-nums">{$(p.total)}</td>
                        <td className="px-4 py-2">
                          <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${p.s === 'Recibida' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                            {p.s}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {purchases.length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-center py-6 text-[#94A3B8]">No hay compras registradas.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
