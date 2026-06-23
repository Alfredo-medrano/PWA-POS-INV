import { useEffect } from "react";
import {
  ShoppingCart, AlertTriangle, DollarSign, Star,
  CalendarDays, BarChart2, Settings, Plus, ChevronRight,
  Banknote, CreditCard, Smartphone, RefreshCw
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as ChartTooltip, ResponsiveContainer
} from "recharts";
import { usePOSStore } from "../store/usePOSStore";
import { KPI, Badge, Btn, $, status } from "../components/Primitives";

export default function Dashboard({ onNav }: { onNav: (p: any) => void }) {
  const {
    products,
    fetchProducts,
    user,
    dashboardStats,
    fetchDashboardStats,
    loadingStats
  } = usePOSStore();

  useEffect(() => {
    fetchProducts();
    fetchDashboardStats();
  }, []);

  const today = new Date().toLocaleDateString("es-SV", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const lowStock = products.filter(p => status(p) !== "ok");

  // Si está cargando por primera vez y no hay estadísticas, mostrar spinner
  if (loadingStats && !dashboardStats) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <RefreshCw size={24} className="animate-spin text-[#1B4FD8] mb-2" />
        <p className="text-sm text-[#64748B] font-semibold">Cargando estadísticas...</p>
      </div>
    );
  }

  const kpis = {
    sales: $(dashboardStats?.salesToday || 0),
    txs: String(dashboardStats?.txCount || 0),
    top: dashboardStats?.topProduct || "Ninguno — 0 ventas",
  };

  const hourlyData = dashboardStats?.hourly || [];
  const recentSales = dashboardStats?.recent || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">Buenos días, {user?.name.split(" ")[0]} 👋</h1>
          <p className="text-sm text-[#64748B] capitalize mt-0.5 flex items-center gap-1.5"><CalendarDays size={13} />{today}</p>
        </div>
        <Btn v="primary" sz="md" onClick={() => onNav("pos")}><Plus size={15} />Nueva Venta</Btn>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI icon={DollarSign}    value={kpis.sales} label="Ventas hoy"       trend="En tiempo real" trendUp />
        <KPI icon={ShoppingCart}  value={kpis.txs}   label="Transacciones"   trend="Hoy" trendUp />
        <KPI icon={Star}          value={kpis.top}   label="Producto top hoy" />
        <KPI icon={AlertTriangle} value={`${lowStock.length} alertas`} label="Productos con stock bajo" warn onClick={() => onNav("inventario")} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-[#0F172A] text-sm">Ventas por hora — hoy</h3>
            <Badge color="blue">{kpis.sales} total</Badge>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={hourlyData} margin={{ top: 0, right: 0, left: -22, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="h" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <ChartTooltip formatter={(v: number) => [`$${v}`, "Ventas"]} contentStyle={{ borderRadius: 10, border: "1px solid #E2E8F0", fontSize: 12, boxShadow: "0 4px 16px rgba(0,0,0,.08)" }} cursor={{ fill: "#EEF2FF" }} />
              <Bar dataKey="v" fill="#1B4FD8" radius={[4, 4, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm">
          <h3 className="font-bold text-[#0F172A] text-sm mb-4">Últimas ventas</h3>
          <div className="space-y-3">
            {recentSales.map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                  {s.method === "Efectivo" ? <Banknote size={13} className="text-[#64748B]" /> : s.method === "Tarjeta" ? <CreditCard size={13} className="text-[#64748B]" /> : <Smartphone size={13} className="text-[#64748B]" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#0F172A] truncate">{s.cashier}</p>
                  <p className="text-xs text-[#94A3B8]">{s.time}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-[#0F172A] tabular-nums">{$(s.amount)}</p>
                  <Badge color={s.method === "Efectivo" ? "slate" : s.method === "Tarjeta" ? "blue" : "green"}>{s.method}</Badge>
                </div>
              </div>
            ))}
            {recentSales.length === 0 && (
              <div className="text-center py-10 text-xs text-[#94A3B8]">No hay ventas registradas hoy.</div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-[#0F172A] text-sm">Stock bajo — requiere atención</h3>
            <Btn v="ghost" sz="xs" onClick={() => onNav("inventario")}>Ver todos <ChevronRight size={11} /></Btn>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-[#F1F5F9]">
                {["Producto", "Stock actual", "Mínimo", ""].map(h => <th key={h} className="text-left pb-2 text-xs font-semibold text-[#94A3B8]">{h}</th>)}
              </tr></thead>
              <tbody>
                {lowStock.slice(0, 5).map(p => (
                  <tr key={p.id} className="border-b border-[#F8FAFC] hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 font-semibold text-[#0F172A]">{p.name}</td>
                    <td className="py-2.5 tabular-nums"><span className={p.stock === 0 ? "text-red-600 font-bold" : "text-amber-600 font-bold"}>{p.stock}</span></td>
                    <td className="py-2.5 tabular-nums text-[#94A3B8]">{p.minStock}</td>
                    <td className="py-2.5"><Btn v="secondary" sz="xs" onClick={() => onNav("compras")}>Reabastecer</Btn></td>
                  </tr>
                ))}
                {lowStock.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-6 text-sm text-[#94A3B8]">🎉 ¡Todo el stock está normal!</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm">
          <h3 className="font-bold text-[#0F172A] text-sm mb-4">Accesos rápidos</h3>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { label: "Nueva Venta",      icon: ShoppingCart, page: "pos",          bg: "bg-[#EEF2FF] text-[#1B4FD8]" },
              { label: "Agregar Producto", icon: Plus,         page: "productos",     bg: "bg-emerald-50 text-emerald-700" },
              { label: "Ver Reportes",     icon: BarChart2,    page: "reportes",      bg: "bg-violet-50 text-violet-700" },
              { label: "Configuración",    icon: Settings,     page: "configuracion", bg: "bg-slate-100 text-[#64748B]" },
            ].map(q => (
              <button key={q.label} onClick={() => onNav(q.page)}
                className="flex flex-col items-center gap-2 p-3.5 rounded-xl border border-[#E2E8F0] hover:border-[#1B4FD8]/40 hover:shadow-sm hover:bg-[#EEF2FF]/20 transition-all group">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${q.bg}`}><q.icon size={18} /></div>
                <span className="text-xs font-semibold text-[#0F172A] text-center leading-tight">{q.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
