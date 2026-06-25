"use client";

import { useState } from "react";
import axios from "axios";
import { toast, Toaster } from "sonner";
import { useRouter } from "next/navigation";
import {
  Zap, Check, CheckCircle, Activity, Globe, Lock, AtSign, Building2, Phone, MapPin, User, ChevronLeft, ChevronRight, RefreshCw
} from "lucide-react";
import { usePOSStore } from "@/app/store/usePOSStore";
import { Btn, Input } from "@/app/components/Primitives";

export default function RegisterTenantPage() {
  const router = useRouter();
  const registerBusinessAndAdmin = usePOSStore(state => state.registerBusinessAndAdmin);
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
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
    
    setLoading(true);
    try {
      const res = await axios.post("/api/setup/register", {
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
      
      setLoading(false);
      if (res.data && res.data.success) {
        toast.success("¡Empresa registrada con éxito! Redirigiendo a tu panel...");
        // Redirigir al panel del nuevo tenant
        router.push(`/t/${res.data.tenantSlug}`);
      } else {
        toast.error("Error al registrar la empresa. Verifica los datos.");
      }
    } catch (err: any) {
      setLoading(false);
      console.error(err);
      const errMsg = err.response?.data?.error || "Error al registrar la empresa.";
      toast.error(errMsg);
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <Toaster position="top-right" richColors />
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#1B4FD8] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/10">
            <Zap size={26} className="text-white animate-pulse" />
          </div>
          <h1 className="text-3xl font-extrabold text-[#0F172A] tracking-tight">Crea tu Negocio POS</h1>
          <p className="text-[#64748B] text-sm mt-1.5">Regístrate y comienza tu prueba demo gratuita de 15 días</p>
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

        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-[0_8px_32px_rgba(0,0,0,0.04)] p-8">
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
              <Input label="Nombre completo *" placeholder="Ingresa tu nombre completo" value={adminName} onChange={setAdminName} icon={User} />
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
              <Btn v="primary" sz="lg" full onClick={handleFinish} disabled={loading}>
                {loading ? <><RefreshCw size={14} className="animate-spin" /> Registrando empresa…</> : "Finalizar y abrir Dashboard →"}
              </Btn>
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
