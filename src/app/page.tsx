"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePOSStore } from "@/app/store/usePOSStore";
import { toast, Toaster } from "sonner";
import { Zap, AtSign, Lock, RefreshCw, CheckCircle, Eye, EyeOff } from "lucide-react";
import { Btn, Input } from "@/app/components/Primitives";

export default function Home() {
  const router = useRouter();
  const user = usePOSStore(state => state.user);
  const globalLogin = usePOSStore(state => state.globalLogin);

  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(true);

  useEffect(() => {
    // Si el usuario ya tiene sesión activa, redirigir inmediatamente a su espacio
    if (user && user.tenantId) {
      router.push(`/t/${user.tenantId}`);
    } else {
      setRedirecting(false);
    }
  }, [user, router]);

  async function handleGlobalLogin() {
    if (!email || !pw) {
      toast.error("Por favor completa todos los campos.");
      return;
    }
    setLoading(true);
    setError(null);
    
    const result = await globalLogin(email, pw);
    setLoading(false);
    
    if (result.success && result.tenantSlug) {
      toast.success("¡Inicio de sesión exitoso! Redirigiendo a tu espacio de trabajo...");
      router.push(`/t/${result.tenantSlug}`);
    } else {
      setError(result.error || "Credenciales incorrectas o usuario inactivo.");
      toast.error(result.error || "Error al iniciar sesión.");
    }
  }

  if (redirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="text-center space-y-3">
          <RefreshCw size={24} className="animate-spin text-[#1B4FD8] mx-auto" />
          <p className="text-sm font-semibold text-[#64748B]">Redirigiendo a tu negocio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <Toaster position="top-right" richColors />
      
      {/* Panel izquierdo decorativo (Estilo Premium) */}
      <div className="hidden md:flex flex-1 relative bg-[#1B4FD8] overflow-hidden">
        <div className="absolute inset-0">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="absolute rounded-full border border-white/10"
              style={{ width: i * 200, height: i * 200, top: "50%", left: "50%", transform: "translate(-50%,-50%)" }} />
          ))}
          <div className="absolute top-1/3 left-1/4 w-32 h-32 rounded-full bg-white/5" />
          <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full bg-white/5" />
        </div>
        <div className="relative z-10 flex flex-col items-center justify-center w-full p-16 text-center">
          <div className="w-20 h-20 rounded-3xl bg-white/15 border border-white/20 flex items-center justify-center mb-8 shadow-2xl">
            <Zap size={36} className="text-white animate-pulse" />
          </div>
          <h1 className="text-5xl font-extrabold text-white mb-3 tracking-tight">VentaPOS SaaS</h1>
          <p className="text-blue-100 text-xl font-medium mb-12 leading-relaxed">
            La plataforma multi-tienda definitiva.<br />Controla inventarios y vende más rápido.
          </p>
          <div className="grid grid-cols-2 gap-3 text-left max-w-sm">
            {["Aislamiento seguro", "Múltiples sucursales", "Prueba de 15 días gratis", "Facturación DTE"].map(f => (
              <div key={f} className="flex items-center gap-2 text-blue-100 text-sm bg-white/10 rounded-xl px-3.5 py-2.5">
                <CheckCircle size={13} className="text-emerald-300 shrink-0" />{f}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Panel derecho del Formulario de Acceso */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-sm space-y-8">
          <div className="flex items-center gap-2.5 md:hidden">
            <div className="w-9 h-9 rounded-xl bg-[#1B4FD8] flex items-center justify-center shadow-sm">
              <Zap size={18} className="text-white" />
            </div>
            <span className="font-bold text-[#0F172A] text-xl">VentaPOS SaaS</span>
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-extrabold text-[#0F172A] tracking-tight">Iniciar Sesión</h2>
            <p className="text-[#64748B] text-sm">
              Ingresa tus credenciales para acceder a tu negocio
            </p>
          </div>

          <div className="space-y-4">
            <Input 
              label="Correo electrónico" 
              type="email" 
              placeholder="correo@ejemplo.com" 
              value={email} 
              onChange={setEmail} 
              icon={AtSign} 
            />
            
            <div>
              <label className="text-sm font-semibold text-[#0F172A] block mb-1">Contraseña</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                <input 
                  type={show ? "text" : "password"} 
                  value={pw} 
                  onChange={e => setPw(e.target.value)} 
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4FD8]/30 focus:border-[#1B4FD8] transition-all" 
                />
                <button 
                  type="button" 
                  onClick={() => setShow(s => !s)} 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B] cursor-pointer"
                >
                  {show ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-700 text-xs font-semibold p-3.5 rounded-xl border border-red-200">
                {error}
              </div>
            )}

            <Btn v="primary" sz="lg" full onClick={handleGlobalLogin} disabled={loading}>
              {loading ? <><RefreshCw size={14} className="animate-spin" /> Ingresando…</> : "Ingresar a mi negocio"}
            </Btn>
          </div>

          <div className="pt-6 border-t border-[#F1F5F9] text-center">
            <p className="text-sm text-[#64748B]">
              ¿Aún no tienes un negocio registrado?{" "}
              <button 
                onClick={() => router.push("/register")} 
                className="text-[#1B4FD8] font-bold hover:underline cursor-pointer"
              >
                Crea uno gratis aquí
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
