import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  LayoutDashboard, ShoppingCart, Package, Tag, Truck, Users, User as UserIcon,
  BarChart2, Settings, Menu, X, Search, Bell, ChevronLeft,
  ChevronRight, Check, CheckCircle, Smartphone, Home, LogOut,
  Zap, Clock, Wifi, WifiOff, RefreshCw, Lock, AtSign, Building2, Phone, MapPin, Globe, Activity,
  Eye, EyeOff
} from "lucide-react";

// Importar Vistas Modulares
import Dashboard from "./pages/Dashboard";
import POS from "./pages/POS";
import Inventory from "./pages/Inventory";
import Products from "./pages/Products";
import Purchases from "./pages/Purchases";
import Customers from "./pages/Customers";
import Reports from "./pages/Reports";
import Config from "./pages/Config";

// Importar usePOSStore
import { usePOSStore } from "./store/usePOSStore";

// Importar Primitivos
import { DTEPill, Btn, Input, Badge } from "./components/Primitives";

// ─── Types ────────────────────────────────────────────────────────────────────
type Page = "login" | "setup" | "dashboard" | "pos" | "inventario" | "productos" | "compras" | "clientes" | "reportes" | "configuracion" | "notFound" | "trialExpired";

export function hasAccess(role: string, page: Page): boolean {
  if (role === "Administrador") return true;
  if (role === "Supervisor") {
    return page !== "configuracion";
  }
  if (role === "Cajero") {
    return page === "dashboard" || page === "pos" || page === "clientes";
  }
  return false;
}

// ─── Nav Configuration ────────────────────────────────────────────────────────
const NAV = [
  { id: "dashboard",    label: "Dashboard",    icon: LayoutDashboard },
  { id: "pos",          label: "Caja POS",     icon: ShoppingCart    },
  { id: "inventario",   label: "Inventario",   icon: Package         },
  { id: "productos",    label: "Productos",    icon: Tag             },
  { id: "compras",      label: "Compras",      icon: Truck           },
  { id: "clientes",     label: "Clientes",     icon: Users           },
  { id: "reportes",     label: "Reportes",     icon: BarChart2       },
  { id: "configuracion",label: "Configuración",icon: Settings        },
] as const;

// ─── Sidebar Component ────────────────────────────────────────────────────────
function Sidebar({ page, onNav, slim, onToggle }: { page: Page; onNav: (p: Page) => void; slim: boolean; onToggle: () => void }) {
  const logout = usePOSStore(state => state.logout);
  const user = usePOSStore(state => state.user);
  const role = user?.role || "Cajero";
  const allowedNav = NAV.filter(item => hasAccess(role, item.id as Page));

  return (
    <aside className={`hidden md:flex flex-col fixed inset-y-0 left-0 z-30 bg-white border-r border-[#E2E8F0] transition-[width] duration-200 ease-out ${slim ? "w-[60px]" : "w-[180px]"}`}>
      <div className={`flex items-center h-[60px] border-b border-[#E2E8F0] transition-all ${slim ? "justify-center px-0" : "px-4 justify-between"}`}>
        {!slim && (
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#1B4FD8] flex items-center justify-center shadow-sm">
              <Zap size={14} className="text-white" />
            </div>
            <span className="font-bold text-[#0F172A] text-sm tracking-tight">VentaPOS</span>
          </div>
        )}
        <button onClick={onToggle} className="w-7 h-7 rounded-lg flex items-center justify-center text-[#94A3B8] hover:bg-slate-100 hover:text-[#64748B] transition-colors">
          {slim ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto py-2 space-y-0.5 px-2">
        {allowedNav.map(({ id, label, icon: Icon }) => {
          const active = page === id;
          return (
            <button key={id} onClick={() => onNav(id as Page)} title={slim ? label : undefined}
              className={`w-full flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-sm font-medium transition-all ${slim ? "justify-center" : ""} ${active ? "bg-[#EEF2FF] text-[#1B4FD8] font-semibold" : "text-[#64748B] hover:bg-slate-50 hover:text-[#0F172A]"}`}>
              <Icon size={16} className={active ? "text-[#1B4FD8]" : "text-[#94A3B8]"} />
              {!slim && label}
            </button>
          );
        })}
      </nav>
      <div className={`px-2 py-3 border-t border-[#E2E8F0] ${slim ? "flex justify-center" : ""}`}>
        <button onClick={logout} className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-[#94A3B8] hover:text-[#DC2626] hover:bg-red-50 transition-all w-full ${slim ? "justify-center" : ""}`}>
          <LogOut size={14} />
          {!slim && "Cerrar sesión"}
        </button>
      </div>
    </aside>
  );
}

// ─── TopBar Component ─────────────────────────────────────────────────────────
function TopBar({ dte, onMenu }: { dte: boolean; onMenu: () => void }) {
  const user = usePOSStore(state => state.user);
  const initials = user ? user.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase() : "CG";
  return (
    <header className="fixed top-0 right-0 left-0 z-20 h-[60px] bg-white/80 backdrop-blur-md border-b border-[#E2E8F0] flex items-center px-4 gap-3">
      <button className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center text-[#64748B] hover:bg-slate-100 transition-colors" onClick={onMenu}>
        <Menu size={18} />
      </button>
      <div className="flex items-center gap-2 md:hidden">
        <div className="w-6 h-6 rounded-md bg-[#1B4FD8] flex items-center justify-center">
          <Zap size={12} className="text-white" />
        </div>
        <span className="font-bold text-[#0F172A] text-sm">VentaPOS</span>
      </div>
      <div className="flex-1 max-w-xs hidden md:block">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#CBD5E1]" />
          <input placeholder="Buscar productos, clientes…"
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] placeholder-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#1B4FD8]/20 focus:border-[#1B4FD8] transition-all" />
        </div>
      </div>
      <span className="flex-1" />
      <DTEPill on={dte} />
      <button className="relative w-9 h-9 rounded-xl flex items-center justify-center text-[#64748B] hover:bg-slate-100 transition-colors">
        <Bell size={17} />
        <span className="absolute top-2 right-2 w-2 h-2 bg-[#DC2626] rounded-full ring-2 ring-white" />
      </button>
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-[#64748B] hidden sm:inline-block">{user?.name}</span>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1B4FD8] to-[#1338A8] flex items-center justify-center text-white text-xs font-bold shadow-sm cursor-pointer">
          {initials}
        </div>
      </div>
    </header>
  );
}

function BottomNav({ page, onNav }: { page: Page; onNav: (p: Page) => void }) {
  const user = usePOSStore(state => state.user);
  const role = user?.role || "Cajero";
  const items = [
    { id: "dashboard", label: "Inicio",   icon: Home       },
    { id: "pos",       label: "Vender",   icon: ShoppingCart },
    { id: "inventario",label: "Stock",    icon: Package     },
    { id: "reportes",  label: "Reportes", icon: BarChart2   },
  ] as const;

  const allowedItems = items.filter(item => hasAccess(role, item.id as Page));

  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 md:hidden bg-white/90 backdrop-blur-md border-t border-[#E2E8F0] flex h-16">
      {allowedItems.map(({ id, label, icon: Icon }) => (
        <button key={id} onClick={() => onNav(id as Page)}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors ${page === id ? "text-[#1B4FD8]" : "text-[#CBD5E1]"}`}>
          <Icon size={20} />
          {label}
        </button>
      ))}
    </nav>
  );
}

function Layout({ page, onNav, children, dte, slim, onSlim }: {
  page: Page; onNav: (p: Page) => void; children: React.ReactNode;
  dte: boolean; slim: boolean; onSlim: () => void;
}) {
  const user = usePOSStore(state => state.user);
  const role = user?.role || "Cajero";
  const allowedNav = NAV.filter(item => hasAccess(role, item.id as Page));
  const [mob, setMob] = useState(false);
  const pad = slim ? "md:pl-[60px]" : "md:pl-[180px]";
  return (
    <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <TopBar dte={dte} onMenu={() => setMob(o => !o)} />
      <Sidebar page={page} onNav={onNav} slim={slim} onToggle={onSlim} />
      {/* Mobile drawer */}
      {mob && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMob(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between h-[60px] px-4 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2"><div className="w-6 h-6 rounded-md bg-[#1B4FD8] flex items-center justify-center"><Zap size={12} className="text-white" /></div><span className="font-bold text-[#0F172A]">VentaPOS</span></div>
              <button onClick={() => setMob(false)} className="text-[#94A3B8] hover:text-[#64748B]"><X size={18} /></button>
            </div>
            <nav className="flex-1 py-3 px-3 space-y-0.5">
              {allowedNav.map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => { onNav(id as Page); setMob(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${page === id ? "bg-[#EEF2FF] text-[#1B4FD8] font-semibold" : "text-[#64748B] hover:bg-slate-50"}`}>
                  <Icon size={16} />{label}
                </button>
              ))}
            </nav>
            <div className="p-4 border-t border-[#E2E8F0]"><DTEPill on={dte} /></div>
          </div>
        </div>
      )}
      <main className={`pt-[60px] pb-16 md:pb-0 ${pad} transition-[padding] duration-200`}>
        <div className="p-4 md:p-6 max-w-[1400px] mx-auto">{children}</div>
      </main>
      <BottomNav page={page} onNav={onNav} />
    </div>
  );
}

// ─── Login Component ──────────────────────────────────────────────────────────
function Login({ onLogin, tenantId }: { onLogin: () => void; tenantId?: string }) {
  const login = usePOSStore(state => state.login);
  const register = usePOSStore(state => state.register);
  const forgotPassword = usePOSStore(state => state.forgotPassword);

  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [rem, setRem] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  async function handleLogin() {
    setLoading(true);
    setError(null);
    const ok = await login(email, pw, tenantId);
    setLoading(false);
    if (ok) {
      toast.success("¡Sesión iniciada con éxito!");
      onLogin();
    } else {
      setError("Correo o contraseña incorrectos, o cuenta inactiva.");
    }
  }

  async function handleRegister() {
    if (!name || !email || !pw) {
      toast.error("Por favor completa todos los campos requeridos.");
      return;
    }
    setLoading(true);
    setError(null);
    const ok = await register(name, email, pw, tenantId);
    setLoading(false);
    if (ok) {
      toast.success("¡Registro completado e inicio de sesión exitoso!");
      onLogin();
    } else {
      setError("Error al registrarte. El correo ya podría estar en uso.");
    }
  }

  async function handleForgot() {
    if (!email) {
      toast.error("Por favor ingresa tu correo electrónico.");
      return;
    }
    setLoading(true);
    setError(null);
    setTempPassword(null);
    const temp = await forgotPassword(email, tenantId);
    setLoading(false);
    if (temp) {
      setTempPassword(temp);
      toast.success("Contraseña restablecida con éxito.");
    } else {
      setError("No se encontró ningún usuario con ese correo electrónico.");
    }
  }

  return (
    <div className="min-h-screen flex" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Left panel */}
      <div className="hidden md:flex flex-1 relative bg-[#1B4FD8] overflow-hidden">
        <div className="absolute inset-0">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="absolute rounded-full border border-white/10"
              style={{ width: i*200, height: i*200, top: "50%", left: "50%", transform: "translate(-50%,-50%)" }} />
          ))}
          <div className="absolute top-1/3 left-1/4 w-32 h-32 rounded-full bg-white/5" />
          <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full bg-white/5" />
        </div>
        <div className="relative z-10 flex flex-col items-center justify-center w-full p-16 text-center">
          <div className="w-20 h-20 rounded-3xl bg-white/15 border border-white/20 flex items-center justify-center mb-8 shadow-2xl">
            <Zap size={36} className="text-white" />
          </div>
          <h1 className="text-5xl font-bold text-white mb-3 tracking-tight">VentaPOS</h1>
          <p className="text-blue-100 text-xl font-medium mb-12 leading-relaxed">Controla tu inventario,<br />vende más rápido</p>
          <div className="grid grid-cols-2 gap-3 text-left max-w-xs">
            {["Punto de venta ágil", "Inventario en tiempo real", "Reportes inteligentes", "Facturación electrónica"].map(f => (
              <div key={f} className="flex items-center gap-2 text-blue-100 text-sm bg-white/10 rounded-xl px-3 py-2">
                <CheckCircle size={13} className="text-emerald-300 shrink-0" />{f}
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-white">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2.5 mb-10 md:hidden">
            <div className="w-9 h-9 rounded-xl bg-[#1B4FD8] flex items-center justify-center shadow-sm"><Zap size={18} className="text-white" /></div>
            <span className="font-bold text-[#0F172A] text-xl">VentaPOS</span>
          </div>

          {mode === "login" && (
            <>
              <h2 className="text-3xl font-bold text-[#0F172A] mb-1 tracking-tight">Bienvenido</h2>
              <p className="text-[#64748B] text-sm mb-8">Ingresa a tu cuenta para continuar</p>
              <div className="space-y-4">
                <Input label="Correo electrónico" type="email" placeholder="correo@empresa.com" value={email} onChange={setEmail} icon={AtSign} />
                <div>
                  <label className="text-sm font-semibold text-[#0F172A] block mb-1">Contraseña</label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                    <input type={show ? "text" : "password"} value={pw} onChange={e => setPw(e.target.value)} placeholder="••••••••"
                      className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4FD8]/30 focus:border-[#1B4FD8] transition-all" />
                    <button onClick={() => setShow(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B]">
                      {show ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                
                {error && (
                  <div className="bg-red-50 text-red-700 text-xs font-semibold p-3.5 rounded-xl border border-red-200">
                    {error}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-[#64748B] font-medium">
                    <input type="checkbox" checked={rem} onChange={e => setRem(e.target.checked)} className="w-4 h-4 accent-[#1B4FD8] rounded" />
                    Recordarme
                  </label>
                  <button onClick={() => { setMode("forgot"); setError(null); }} className="text-sm text-[#1B4FD8] font-semibold hover:underline">¿Olvidaste tu contraseña?</button>
                </div>
                <Btn v="primary" sz="lg" full onClick={handleLogin} disabled={loading}>
                  {loading ? <><RefreshCw size={14} className="animate-spin" /> Ingresando…</> : "Ingresar"}
                </Btn>
              </div>
              <div className="mt-8 pt-8 border-t border-[#F1F5F9] text-center">
                <p className="text-sm text-[#64748B]">¿Sin cuenta? <button onClick={() => { setMode("register"); setError(null); }} className="text-[#1B4FD8] font-bold hover:underline">Regístrate aquí</button></p>
              </div>
            </>
          )}

          {mode === "register" && (
            <>
              <h2 className="text-3xl font-bold text-[#0F172A] mb-1 tracking-tight">Crea tu cuenta</h2>
              <p className="text-[#64748B] text-sm mb-8">Regístrate como usuario para comenzar a vender</p>
              <div className="space-y-4">
                <Input label="Nombre completo" type="text" placeholder="ej. Juan Pérez" value={name} onChange={setName} icon={UserIcon} />
                <Input label="Correo electrónico" type="email" placeholder="correo@empresa.com" value={email} onChange={setEmail} icon={AtSign} />
                <div>
                  <label className="text-sm font-semibold text-[#0F172A] block mb-1">Contraseña</label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                    <input type={show ? "text" : "password"} value={pw} onChange={e => setPw(e.target.value)} placeholder="••••••••"
                      className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4FD8]/30 focus:border-[#1B4FD8] transition-all" />
                    <button onClick={() => setShow(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B]">
                      {show ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 text-red-700 text-xs font-semibold p-3.5 rounded-xl border border-red-200">
                    {error}
                  </div>
                )}

                <Btn v="primary" sz="lg" full onClick={handleRegister} disabled={loading}>
                  {loading ? <><RefreshCw size={14} className="animate-spin" /> Registrando…</> : "Registrarse"}
                </Btn>
              </div>
              <div className="mt-8 pt-8 border-t border-[#F1F5F9] text-center">
                <p className="text-sm text-[#64748B]">¿Ya tienes cuenta? <button onClick={() => { setMode("login"); setError(null); }} className="text-[#1B4FD8] font-bold hover:underline">Inicia sesión</button></p>
              </div>
            </>
          )}

          {mode === "forgot" && (
            <>
              <h2 className="text-3xl font-bold text-[#0F172A] mb-1 tracking-tight">Recuperación</h2>
              <p className="text-[#64748B] text-sm mb-8">Ingresa tu correo para generar una contraseña temporal</p>
              
              {tempPassword ? (
                <div className="space-y-5">
                  <div className="bg-emerald-50 text-emerald-800 p-4 rounded-2xl border border-emerald-200 text-sm space-y-2">
                    <p className="font-bold">¡Contraseña restablecida con éxito!</p>
                    <p>Usa la siguiente contraseña temporal para iniciar sesión:</p>
                    <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-300 font-mono text-center text-lg font-black tracking-wider text-emerald-950 selection:bg-emerald-200 select-all">
                      {tempPassword}
                    </div>
                    <p className="text-xs text-emerald-600 font-medium">Cópiala y cámbiala inmediatamente en la configuración del perfil una vez accedas.</p>
                  </div>
                  <Btn v="primary" sz="lg" full onClick={() => { setMode("login"); setTempPassword(null); setEmail(""); setPw(""); }}>
                    Ir a Iniciar Sesión
                  </Btn>
                </div>
              ) : (
                <div className="space-y-4">
                  <Input label="Correo electrónico" type="email" placeholder="correo@empresa.com" value={email} onChange={setEmail} icon={AtSign} />

                  {error && (
                    <div className="bg-red-50 text-red-700 text-xs font-semibold p-3.5 rounded-xl border border-red-200">
                      {error}
                    </div>
                  )}

                  <Btn v="primary" sz="lg" full onClick={handleForgot} disabled={loading}>
                    {loading ? <><RefreshCw size={14} className="animate-spin" /> Procesando…</> : "Restablecer Contraseña"}
                  </Btn>
                  
                  <div className="text-center pt-2">
                    <button onClick={() => { setMode("login"); setError(null); }} className="text-sm text-[#1B4FD8] font-bold hover:underline">Volver al inicio de sesión</button>
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
}

// ─── Onboarding Component ─────────────────────────────────────────────────────
function Onboarding({ onDone }: { onDone: () => void }) {
  const registerBusinessAndAdmin = usePOSStore(state => state.registerBusinessAndAdmin);
  const [step, setStep] = useState(1);
  const [biz, setBiz] = useState("");
  const [type, setType] = useState("Tienda");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  
  // Admin account details
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  
  // DTE connection details
  const [url, setUrl] = useState("");
  const [key, setKey] = useState("");
  const [testing, setTesting] = useState(false);
  const [ok, setOk] = useState(false);
  
  // Demo seeding choice
  const [seedDemo, setSeedDemo] = useState(true);

  const STEPS = ["Negocio", "Administrador", "Conexión DTE", "Inicialización"];

  async function testConn() {
    if (!url) {
      toast.error("Por favor ingresa la URL de la API DTE.");
      return;
    }
    setTesting(true);
    setOk(false);
    try {
      const res = await axios.get(`${url}/api/dte/status`);
      setTesting(false);
      if (res.status === 200) {
        setOk(true);
        toast.success("Conexión con DTE exitosa — Emisor validado correctamente");
      } else {
        setOk(false);
        toast.error("La API de DTE no respondió con éxito.");
      }
    } catch (err) {
      console.error(err);
      setTesting(false);
      setOk(false);
      toast.error("Error al conectar con la API de DTE. Verifica la URL.");
    }
  }

  async function handleFinish() {
    if (!biz) {
      toast.error("Por favor ingresa el nombre de tu negocio.");
      setStep(1);
      return;
    }
    if (!adminName || !adminEmail || !adminPassword) {
      toast.error("Por favor completa todos los campos de tu cuenta de administrador.");
      setStep(2);
      return;
    }
    
    const success = await registerBusinessAndAdmin({
      bizName: biz,
      bizType: type,
      bizPhone: phone,
      bizAddress: address,
      dteUrl: url,
      dteKey: key,
      adminName,
      adminEmail,
      adminPassword,
      seedDemo
    });
    
    if (success) {
      toast.success("¡Registro completado con éxito!");
      onDone();
    } else {
      toast.error("Error al registrar la empresa. El correo electrónico del administrador podría ya estar en uso.");
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div className="w-full max-w-lg">
        <div className="text-center mb-10">
          <div className="w-14 h-14 rounded-2xl bg-[#1B4FD8] flex items-center justify-center mx-auto mb-5 shadow-lg">
            <Zap size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#0F172A]">Configura tu VentaPOS</h1>
          <p className="text-[#64748B] text-sm mt-1">Registra tu empresa y tu cuenta de administrador desde cero</p>
        </div>
        {/* Stepper */}
        <div className="flex items-center mb-8 px-2">
          {STEPS.map((s, i) => (
            <div key={s} className={`flex items-center ${i < STEPS.length - 1 ? "flex-1" : ""}`}>
              <div className="flex items-center gap-2 shrink-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${i + 1 < step ? "bg-emerald-500 text-white" : i + 1 === step ? "bg-[#1B4FD8] text-white ring-4 ring-[#EEF2FF]" : "bg-slate-100 text-[#94A3B8]"}`}>
                  {i + 1 < step ? <Check size={13} /> : i + 1}
                </div>
                <span className={`text-xs font-semibold hidden sm:block ${i + 1 === step ? "text-[#1B4FD8]" : i + 1 < step ? "text-emerald-600" : "text-[#CBD5E1]"}`}>{s}</span>
              </div>
              {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-3 transition-colors ${i + 1 < step ? "bg-emerald-400" : "bg-slate-200"}`} />}
            </div>
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-[0_8px_32px_rgba(0,0,0,0.06)] p-7">
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-[#0F172A]">Tu negocio</h2>
              <p className="text-xs text-[#64748B] -mt-3">Ingresa los datos generales de tu establecimiento comercial</p>
              <Input label="Nombre del negocio *" placeholder="Mi Tienda El Sol" value={biz} onChange={setBiz} icon={Building2} />
              <div>
                <label className="text-sm font-semibold text-[#0F172A] block mb-2">Tipo de negocio</label>
                <div className="grid grid-cols-2 gap-2">
                  {["Tienda", "Ferretería", "Papelería", "Otro"].map(t => (
                    <button key={t} onClick={() => setType(t)}
                      className={`py-2.5 rounded-xl border text-sm font-semibold transition-all ${type === t ? "bg-[#1B4FD8] text-white border-[#1B4FD8] shadow-sm" : "bg-white text-[#64748B] border-[#E2E8F0] hover:border-[#1B4FD8] hover:text-[#1B4FD8]"}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Teléfono" placeholder="2222-3344" value={phone} onChange={setPhone} icon={Phone} />
                <Input label="Dirección" placeholder="Calle, colonia" value={address} onChange={setAddress} icon={MapPin} />
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-[#0F172A]">Cuenta del Administrador</h2>
              <p className="text-xs text-[#64748B] -mt-3">Esta cuenta tendrá acceso total para configurar y administrar el sistema</p>
              <Input label="Nombre completo *" placeholder="Ingresa tu nombre completo" value={adminName} onChange={setAdminName} icon={UserIcon} />
              <Input label="Correo electrónico *" type="email" placeholder="admin@minegocio.com.sv" value={adminEmail} onChange={setAdminEmail} icon={AtSign} />
              <Input label="Contraseña de acceso *" type="password" placeholder="Mínimo 6 caracteres" value={adminPassword} onChange={setAdminPassword} icon={Lock} />
            </div>
          )}
          {step === 3 && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-[#0F172A]">Conectividad DTE (Facturación Electrónica)</h2>
              <p className="text-sm text-[#64748B]">Configura la conexión con tu API DTE externa. Puedes omitir este paso y configurarlo después.</p>
              <Input label="URL del sistema DTE" placeholder="https://api.mi-sistema-dte.com" value={url} onChange={setUrl} icon={Globe} />
              <Input label="API Key" placeholder="sk_live_..." type="password" value={key} onChange={setKey} icon={Lock} />
              <Btn v="secondary" full onClick={testConn} disabled={testing || !url || !key}>
                {testing ? <><RefreshCw size={13} className="animate-spin" />Probando conexión…</> : <><Activity size={13} />Probar conexión</>}
              </Btn>
              {ok && <div className="flex items-center gap-2.5 bg-emerald-50 text-emerald-700 p-3.5 rounded-xl text-sm font-semibold ring-1 ring-emerald-200"><CheckCircle size={16} />Conexión exitosa — Emisor validado correctamente</div>}
            </div>
          )}
          {step === 4 && (
            <div className="text-center space-y-5">
              <div className="text-6xl">📊</div>
              <h2 className="text-2xl font-bold text-[#0F172A]">Inicialización de Datos</h2>
              <p className="text-sm text-[#64748B]">Elige cómo deseas iniciar la base de datos de tu negocio.</p>
              <div className="bg-slate-50 rounded-2xl p-5 text-left border border-[#E2E8F0] space-y-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={seedDemo} onChange={e => setSeedDemo(e.target.checked)} className="w-5 h-5 accent-[#1B4FD8] rounded mt-0.5 shrink-0" />
                  <div>
                    <span className="text-sm font-bold text-[#0F172A]">Cargar datos de demostración (Recomendado para pruebas)</span>
                    <p className="text-xs text-[#64748B] mt-1">Precargará un catálogo inicial de productos de prueba, proveedores y clientes modelo para realizar ventas y pruebas de inmediato.</p>
                  </div>
                </label>
                <div className="border-t border-slate-200/60 my-2" />
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={!seedDemo} onChange={e => setSeedDemo(!e.target.checked)} className="w-5 h-5 accent-[#1B4FD8] rounded mt-0.5 shrink-0" />
                  <div>
                    <span className="text-sm font-bold text-[#0F172A]">Iniciar completamente en blanco (Listo para producción)</span>
                    <p className="text-xs text-[#64748B] mt-1">La base de datos estará completamente limpia. Tendrás que registrar tus propios productos, inventario, clientes y proveedores desde cero.</p>
                  </div>
                </label>
              </div>
              <Btn v="primary" sz="lg" full onClick={handleFinish}>Finalizar y abrir Dashboard →</Btn>
            </div>
          )}
        </div>
        {step < 4 && (
          <div className="flex justify-between mt-5">
            <Btn v="ghost" onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1}>Anterior</Btn>
            <Btn v="primary" onClick={() => setStep(s => s + 1)} disabled={(step === 1 && !biz) || (step === 2 && (!adminName || !adminEmail || !adminPassword))}>Siguiente</Btn>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main App Component ────────────────────────────────────────────────────────
export default function App({ tenantId }: { tenantId?: string }) {
  const { user, config, fetchConfig, fetchSetupStatus, setupStatus } = usePOSStore();
  const [page, setPage] = useState<Page>("login");
  const [slim, setSlim] = useState(false);
  const [dteConnected, setDteConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      if (!tenantId) {
        setPage("login");
        setLoading(false);
        return;
      }

      // Cargar configuración de este tenant en particular
      const hasConfig = await fetchConfig(tenantId);
      
      if (!hasConfig) {
        // Tenant no existe
        setPage("notFound");
      } else {
        const currentStoreConfig = usePOSStore.getState().config;
        
        if (currentStoreConfig?.trialExpired || currentStoreConfig?.tenantStatus === 'suspended') {
          setPage("trialExpired");
        } else if (user && (user.tenantId === currentStoreConfig?.tenantId || user.tenantId === currentStoreConfig?.tenantSlug)) {
          setPage("dashboard");
          if (currentStoreConfig?.dteUrl) {
            try {
              const res = await axios.get(`${currentStoreConfig.dteUrl}/api/dte/status`);
              setDteConnected(res.status === 200);
            } catch (err) {
              console.error("DTE connection failed:", err);
              setDteConnected(false);
            }
          }
        } else {
          setPage("login");
        }
      }
      setLoading(false);
    }
    init();
  }, [user, tenantId]);

  useEffect(() => {
    if (user && page !== "login" && page !== "setup" && !hasAccess(user.role, page)) {
      toast.error(`Acceso denegado: tu rol de ${user.role} no tiene permisos para acceder a esta sección.`);
      setPage("dashboard");
    }
  }, [page, user]);

  const handleNav = (targetPage: Page) => {
    if (user && !hasAccess(user.role, targetPage)) {
      toast.error(`Acceso denegado: tu rol de ${user.role} no tiene permisos para acceder a esta sección.`);
      return;
    }
    setPage(targetPage);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="text-center space-y-3">
          <RefreshCw size={24} className="animate-spin text-[#1B4FD8] mx-auto" />
          <p className="text-sm font-semibold text-[#64748B]">Cargando VentaPOS...</p>
        </div>
      </div>
    );
  }

  if (page === "login") {
    return (
      <Login 
        tenantId={tenantId}
        onLogin={async () => {
          const hasConfig = await fetchConfig(tenantId);
          if (hasConfig) {
            setPage("dashboard");
          } else {
            setPage("dashboard");
          }
        }} 
      />
    );
  }

  if (page === "setup") {
    return (
      <Onboarding 
        onDone={() => {
          setPage("dashboard");
        }} 
      />
    );
  }

  if (page === "notFound") {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
        <div className="w-full max-w-md text-center bg-white border border-[#E2E8F0] shadow-xl rounded-3xl p-8 space-y-6">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto border border-red-100">
            <Building2 size={32} />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-[#0F172A]">Negocio no encontrado</h1>
            <p className="text-sm text-[#64748B] leading-relaxed">
              El negocio con identificador <span className="font-mono font-bold text-[#1B4FD8]">"{tenantId}"</span> no está registrado en nuestra plataforma SaaS.
            </p>
          </div>
          <div className="pt-2">
            <Btn v="primary" sz="lg" full onClick={() => window.location.href = '/register'}>
              Registrar un nuevo negocio →
            </Btn>
          </div>
        </div>
      </div>
    );
  }

  if (page === "trialExpired") {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
        <div className="w-full max-w-md text-center bg-white border border-[#E2E8F0] shadow-xl rounded-3xl p-8 space-y-6">
          <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mx-auto border border-amber-100">
            <Clock size={32} className="animate-pulse" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-[#0F172A]">Prueba demo expirada</h1>
            <p className="text-sm text-[#64748B] leading-relaxed">
              La prueba gratuita de 15 días para <span className="font-semibold text-[#0F172A]">{config?.bizName || tenantId}</span> ha expirado o tu cuenta ha sido suspendida.
            </p>
            <p className="text-xs text-[#94A3B8] font-medium">
              Por favor contacta al administrador del sistema o actualiza tu suscripción a un plan para continuar utilizando el punto de venta.
            </p>
          </div>
          <div className="pt-2 space-y-2">
            <Btn v="primary" sz="lg" full onClick={() => toast.info('Integración de pasarela de pago en progreso')}>
              Actualizar plan de pago
            </Btn>
            <Btn v="ghost" sz="sm" full onClick={() => { usePOSStore.getState().logout(); setPage('login'); }}>
              Cerrar sesión
            </Btn>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Layout page={page} onNav={handleNav} dte={dteConnected} slim={slim} onSlim={() => setSlim(s => !s)}>
      {page === "dashboard"    && <Dashboard onNav={handleNav} />}
      {page === "pos"          && <POS dteConnected={dteConnected} />}
      {page === "inventario"   && <Inventory onNav={handleNav} />}
      {page === "productos"    && <Products />}
      {page === "compras"      && <Purchases />}
      {page === "clientes"     && <Customers />}
      {page === "reportes"     && <Reports />}
      {page === "configuracion"&& <Config dteConnected={dteConnected} setDteConnected={setDteConnected} />}
    </Layout>
  );
}
