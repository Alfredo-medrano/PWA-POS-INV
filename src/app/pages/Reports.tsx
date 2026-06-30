import { useEffect, useState } from "react";
import axios from "@/lib/axios-client";
import { toast } from "sonner";
import {
  TrendingUp, Package, Star, Receipt, Users, Truck,
  Download, FileSpreadsheet, BarChart2, RefreshCw, Percent, DollarSign, Plus
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
    fetchSuppliers,
    sales,
    salesTotalCount,
    loadingSales,
    fetchSales
  } = usePOSStore();

  const [period, setPeriod] = useState("mes");
  const [active, setActive] = useState("ventas");

  // Estados y funciones para Egresos de Caja (Salidas de Caja)
  const [egresos, setEgresos] = useState<any[]>([]);
  const [egresoAmount, setEgresoAmount] = useState("");
  const [egresoConcept, setEgresoConcept] = useState("");
  const [loadingEgresos, setLoadingEgresos] = useState(false);
  const [submittingEgreso, setSubmittingEgreso] = useState(false);

  // Historial de cierres de caja
  const [cortesHistory, setCortesHistory] = useState<any[]>([]);
  const [loadingCortes, setLoadingCortes] = useState(false);
  const [efectivoContado, setEfectivoContado] = useState("");
  const [submittingCorte, setSubmittingCorte] = useState(false);

  // Paginación e Historial de Ventas
  const [salesPage, setSalesPage] = useState(1);
  const salesLimit = 10;

  // Filtros de ventas
  const [filterDate, setFilterDate] = useState("");
  const [filterPayMethod, setFilterPayMethod] = useState("");
  const [filterDteStatus, setFilterDteStatus] = useState("");

  async function fetchCortesHistory() {
    setLoadingCortes(true);
    try {
      const res = await axios.get("/api/reportes/corte-caja/cerrar");
      setCortesHistory(res.data || []);
    } catch (err) {
      console.error("Error al obtener historial de cortes:", err);
    } finally {
      setLoadingCortes(false);
    }
  }

  async function handleAddCorte(e: React.FormEvent) {
    e.preventDefault();
    if (!efectivoContado) {
      toast.error("Por favor ingresa el monto de efectivo contado.");
      return;
    }
    const val = parseFloat(efectivoContado);
    if (isNaN(val) || val < 0) {
      toast.error("El monto debe ser un número positivo.");
      return;
    }
    setSubmittingCorte(true);
    try {
      await axios.post("/api/reportes/corte-caja/cerrar", { efectivoContado: val });
      toast.success("Cierre de caja registrado exitosamente.");
      setEfectivoContado("");
      await fetchCortesHistory();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || "Error al registrar el cierre de caja.");
    } finally {
      setSubmittingCorte(false);
    }
  }

  function exportSalesToCSV() {
    if (sales.length === 0) {
      toast.error("No hay ventas para exportar.");
      return;
    }
    const headers = ["ID Venta", "Fecha", "Cliente", "Método Pago", "Total", "Estado DTE"];
    const rows = sales.map(s => [
      s.id,
      new Date(s.createdAt).toLocaleString("es-SV"),
      s.customerName,
      s.payMethod,
      s.total.toFixed(2),
      s.dteStatus
    ]);
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF"
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `reporte_ventas_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV descargado con éxito.");
  }

  function exportInventoryToCSV() {
    if (products.length === 0) {
      toast.error("No hay productos para exportar.");
      return;
    }
    const headers = ["Producto", "Categoría", "Stock", "Costo", "Precio", "Valor Total (Costo)"];
    const rows = products.map(p => [
      p.name,
      p.category,
      p.stock.toString(),
      p.cost.toFixed(2),
      p.price.toFixed(2),
      (p.stock * p.cost).toFixed(2)
    ]);
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF"
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `reporte_inventario_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV de inventario descargado con éxito.");
  }

  async function handleAnularVenta(id: string) {
    if (confirm("¿Confirmas la anulación de esta venta? Se emitirá una Nota de Crédito DTE 05 y el stock retornará al inventario.")) {
      try {
        const res = await axios.post(`/api/ventas/${id}/anular`);
        if (res.data.success) {
          toast.success("Venta anulada con éxito. Nota de crédito emitida.");
          const offset = (salesPage - 1) * salesLimit;
          await fetchSales(salesLimit, offset);
        }
      } catch (err: any) {
        console.error(err);
        toast.error(err.response?.data?.error || "Error al anular la venta.");
      }
    }
  }

  async function fetchEgresos() {
    setLoadingEgresos(true);
    try {
      const res = await axios.get("/api/egresos");
      setEgresos(res.data || []);
    } catch (err) {
      console.error("Error al obtener egresos:", err);
    } finally {
      setLoadingEgresos(false);
    }
  }

  async function handleAddEgreso(e: React.FormEvent) {
    e.preventDefault();
    if (!egresoAmount || !egresoConcept) {
      toast.error("Completa el monto y el concepto del egreso.");
      return;
    }
    const amt = parseFloat(egresoAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("El monto debe ser un número positivo.");
      return;
    }
    setSubmittingEgreso(true);
    try {
      await axios.post("/api/egresos", { amount: amt, concept: egresoConcept });
      toast.success("Egreso registrado con éxito.");
      setEgresoAmount("");
      setEgresoConcept("");
      await fetchEgresos();
      await fetchReportsStats(period);
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || "Error al registrar egreso.");
    } finally {
      setSubmittingEgreso(false);
    }
  }

  useEffect(() => {
    if (active === "cortes") {
      fetchEgresos();
      fetchCortesHistory();
    } else if (active === "historial") {
      const offset = (salesPage - 1) * salesLimit;
      fetchSales(salesLimit, offset);
    }
  }, [active, salesPage]);

  useEffect(() => {
    fetchReportsStats(period);
    fetchProducts();
    fetchCustomers();
    fetchPurchases();
    fetchSuppliers();
  }, [period]);

  const types = [
    { id: "ventas",     icon: TrendingUp,  label: "Ventas por período"     },
    { id: "historial",  icon: Receipt,     label: "Historial de ventas"    },
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
            <div>
              <h3 className="font-black text-[#0F172A]">Inventario Valorizado</h3>
              <p className="text-xs text-[#94A3B8] mt-0.5">Datos en tiempo real de valorización en bodega</p>
            </div>
            <Btn v="secondary" sz="sm" onClick={exportInventoryToCSV}><FileSpreadsheet size={13} /> Exportar CSV</Btn>
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
        <div className="space-y-5 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-6">
            <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
              <h3 className="font-black text-[#0F172A]">Corte de Caja Diario (Resumen de Hoy)</h3>
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Formulario para registrar cierre */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-6 space-y-4">
              <div>
                <h3 className="font-black text-[#0F172A]">Realizar Cierre de Caja</h3>
                <p className="text-xs text-[#94A3B8] mt-0.5">Ingresa el efectivo real contado en caja chica para cuadrar el día</p>
              </div>
              <form onSubmit={handleAddCorte} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-[#0F172A] block mb-1.5">Efectivo Físico Contado ($) *</label>
                  <div className="relative">
                    <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                    <input type="number" step="0.01" min="0.00" value={efectivoContado} onChange={e => setEfectivoContado(e.target.value)} placeholder="0.00"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1B4FD8]/20 focus:border-[#1B4FD8]" />
                  </div>
                </div>
                <Btn v="primary" type="submit" disabled={submittingCorte || !efectivoContado} className="w-full justify-center">
                  {submittingCorte ? "Registrando..." : "Cerrar Caja y Registrar"}
                </Btn>
              </form>
            </div>

            {/* Formulario para registrar egreso */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-6 space-y-4">
              <div>
                <h3 className="font-black text-[#0F172A]">Registrar Salida de Caja (Egreso)</h3>
                <p className="text-xs text-[#94A3B8] mt-0.5">Registra gastos menores o retiros de efectivo de la caja chica</p>
              </div>
              <form onSubmit={handleAddEgreso} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-[#0F172A] block mb-1.5">Concepto / Descripción *</label>
                  <input type="text" value={egresoConcept} onChange={e => setEgresoConcept(e.target.value)} placeholder="Ej. Pago de basura, Compra de hielo"
                    className="w-full px-3 py-2 bg-slate-50 border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1B4FD8]/20 focus:border-[#1B4FD8]" />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#0F172A] block mb-1.5">Monto ($) *</label>
                  <div className="relative">
                    <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                    <input type="number" step="0.01" min="0.01" value={egresoAmount} onChange={e => setEgresoAmount(e.target.value)} placeholder="0.00"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1B4FD8]/20 focus:border-[#1B4FD8]" />
                  </div>
                </div>
                <Btn v="primary" type="submit" disabled={submittingEgreso || !egresoConcept || !egresoAmount} className="w-full justify-center">
                  {submittingEgreso ? "Registrando..." : <><Plus size={13} /> Registrar Egreso</>}
                </Btn>
              </form>
            </div>

            {/* Listado de egresos de hoy */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-6 space-y-4">
              <div>
                <h3 className="font-black text-[#0F172A]">Egresos Registrados Hoy</h3>
                <p className="text-xs text-[#94A3B8] mt-0.5">Lista de salidas de dinero registradas durante el turno de hoy</p>
              </div>
              <div className="overflow-y-auto max-h-60 border border-[#E2E8F0] rounded-xl">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-[#E2E8F0] sticky top-0">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-bold text-[#94A3B8]">Concepto</th>
                      <th className="text-left px-4 py-2.5 font-bold text-[#94A3B8]">Hora</th>
                      <th className="text-right px-4 py-2.5 font-bold text-[#94A3B8]">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {egresos.map(e => (
                      <tr key={e.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-semibold text-[#0F172A]">{e.concept}</td>
                        <td className="px-4 py-3 text-[#64748B] font-mono">
                          {new Date(e.createdAt).toLocaleTimeString("es-SV", { hour: '2-digit', minute: '2-digit', hour12: true })}
                        </td>
                        <td className="px-4 py-3 text-right font-black text-red-600 tabular-nums">-{$(e.amount)}</td>
                      </tr>
                    ))}
                    {egresos.length === 0 && (
                      <tr>
                        <td colSpan={3} className="text-center py-10 text-[#94A3B8] font-medium">No se han registrado egresos hoy.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Historial de cierres de caja */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-6 space-y-4">
            <div>
              <h3 className="font-black text-[#0F172A]">Historial de Cierres de Caja</h3>
              <p className="text-xs text-[#94A3B8] mt-0.5">Registro histórico de cuadres y diferencias al cierre del día</p>
            </div>
            <div className="overflow-x-auto border border-[#E2E8F0] rounded-xl">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-[#E2E8F0]">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-bold text-[#94A3B8]">Fecha / Hora</th>
                    <th className="text-left px-4 py-2.5 font-bold text-[#94A3B8]">Cajero</th>
                    <th className="text-right px-4 py-2.5 font-bold text-[#94A3B8]">Apertura</th>
                    <th className="text-right px-4 py-2.5 font-bold text-[#94A3B8]">Efectivo Esperado</th>
                    <th className="text-right px-4 py-2.5 font-bold text-[#94A3B8]">Efectivo Contado</th>
                    <th className="text-right px-4 py-2.5 font-bold text-[#94A3B8]">Diferencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cortesHistory.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 text-[#64748B] font-mono">
                        {new Date(c.createdAt).toLocaleString("es-SV", { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-3 font-semibold text-[#0F172A]">{c.userName}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-[#64748B]">{$(c.apertura)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-[#64748B]">{$(c.efectivoEsperado)}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-[#0F172A]">{$(c.efectivoContado)}</td>
                      <td className={`px-4 py-3 text-right tabular-nums font-black ${c.diferencia < 0 ? "text-red-600" : c.diferencia > 0 ? "text-emerald-600" : "text-slate-500"}`}>
                        {c.diferencia > 0 ? `+${$(c.diferencia)}` : $(c.diferencia)}
                      </td>
                    </tr>
                  ))}
                  {cortesHistory.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-[#94A3B8] font-medium">No hay cierres de caja registrados en el historial.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {active === "historial" && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-6 space-y-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="font-black text-[#0F172A]">Historial de Ventas</h3>
              <p className="text-xs text-[#94A3B8] mt-0.5">Consulta y gestiona las transacciones de ventas realizadas</p>
            </div>
            <div className="flex gap-2">
              <Btn v="secondary" sz="sm" onClick={exportSalesToCSV}><FileSpreadsheet size={13} /> Exportar CSV</Btn>
            </div>
          </div>

          {/* Filtros */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-[#E2E8F0]">
            <div>
              <label className="text-xs font-bold text-[#0F172A] block mb-1">Fecha</label>
              <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-[#0F172A] block mb-1">Método de Pago</label>
              <select value={filterPayMethod} onChange={e => setFilterPayMethod(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none">
                <option value="">Todos</option>
                <option value="Efectivo">Efectivo</option>
                <option value="Tarjeta">Tarjeta</option>
                <option value="Transferencia">Transferencia</option>
                <option value="Mixto">Mixto</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-[#0F172A] block mb-1">Estado DTE</label>
              <select value={filterDteStatus} onChange={e => setFilterDteStatus(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none">
                <option value="">Todos</option>
                <option value="success">Firmado</option>
                <option value="pending">Pendiente</option>
                <option value="rejected">Rechazado</option>
                <option value="voided">Anulado</option>
              </select>
            </div>
          </div>

          {/* Tabla de ventas */}
          <div className="overflow-x-auto border border-[#E2E8F0] rounded-xl">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-[#E2E8F0]">
                <tr>
                  <th className="text-left px-4 py-2.5 font-bold text-[#94A3B8]">ID Venta</th>
                  <th className="text-left px-4 py-2.5 font-bold text-[#94A3B8]">Fecha / Hora</th>
                  <th className="text-left px-4 py-2.5 font-bold text-[#94A3B8]">Cliente</th>
                  <th className="text-left px-4 py-2.5 font-bold text-[#94A3B8]">Método Pago</th>
                  <th className="text-right px-4 py-2.5 font-bold text-[#94A3B8]">Total</th>
                  <th className="text-center px-4 py-2.5 font-bold text-[#94A3B8]">DTE</th>
                  <th className="text-center px-4 py-2.5 font-bold text-[#94A3B8]">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sales
                  .filter(s => {
                    if (filterDate) {
                      const sDate = new Date(s.createdAt).toISOString().split('T')[0];
                      if (sDate !== filterDate) return false;
                    }
                    if (filterPayMethod && s.payMethod !== filterPayMethod) return false;
                    if (filterDteStatus && s.dteStatus !== filterDteStatus) return false;
                    return true;
                  })
                  .map(s => (
                    <tr key={s.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-mono font-bold text-[#1B4FD8]">{s.id.slice(0, 8)}...</td>
                      <td className="px-4 py-3 text-[#64748B] font-medium">{s.date} {s.time}</td>
                      <td className="px-4 py-3 font-semibold text-[#0F172A]">{s.customerName}</td>
                      <td className="px-4 py-3 text-[#64748B]">{s.payMethod}</td>
                      <td className="px-4 py-3 text-right font-black text-[#0F172A] tabular-nums">{$(s.total)}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge color={s.dteStatus === "success" ? "green" : s.dteStatus === "pending" ? "amber" : s.dteStatus === "voided" ? "red" : "slate"}>
                          {s.dteStatus === "success" ? "Firmado" : s.dteStatus === "pending" ? "Pendiente" : s.dteStatus === "voided" ? "Anulado" : s.dteStatus}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex gap-2 justify-center">
                          <button onClick={() => window.open(`/api/ventas/${s.id}/pdf`, '_blank')}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-[#0F172A] rounded font-bold text-[10px] transition-all">
                            PDF
                          </button>
                          {s.dteStatus !== "voided" && (
                            <button onClick={() => handleAnularVenta(s.id)}
                              className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded font-bold text-[10px] transition-all">
                              Anular
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                {sales.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-[#94A3B8] font-medium">No se encontraron ventas registradas.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-[#94A3B8] font-semibold">Total: {salesTotalCount} ventas</span>
            <div className="flex gap-2">
              <Btn v="secondary" sz="xs" disabled={salesPage === 1} onClick={() => setSalesPage(p => p - 1)}>
                Anterior
              </Btn>
              <span className="text-xs font-bold text-[#0F172A] flex items-center px-2">Pág. {salesPage}</span>
              <Btn v="secondary" sz="xs" disabled={salesPage * salesLimit >= salesTotalCount} onClick={() => setSalesPage(p => p + 1)}>
                Siguiente
              </Btn>
            </div>
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
