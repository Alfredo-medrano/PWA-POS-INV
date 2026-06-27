"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import axios from "axios";
import { toast, Toaster } from "sonner";
import { Zap, Lock, RefreshCw, CheckCircle, AlertCircle, Eye, EyeOff } from "lucide-react";
import { Btn } from "@/app/components/Primitives";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const tenant = searchParams.get("tenant");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!token || !tenant) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 text-sm font-semibold flex items-start gap-2.5">
        <AlertCircle className="shrink-0 mt-0.5" size={16} />
        <div>
          <p className="font-bold">Enlace de recuperación inválido</p>
          <p className="font-normal text-xs mt-1">Este enlace no cuenta con los parámetros de verificación necesarios. Por favor solicita uno nuevo desde la pantalla de inicio de sesión.</p>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password || !confirmPassword) {
      toast.error("Por favor completa todos los campos.");
      return;
    }

    if (password.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await axios.post("/api/auth/reset-password", {
        token,
        password,
        tenantId: tenant,
      });

      setLoading(false);
      if (res.data && res.data.success) {
        setSuccess(true);
        toast.success("Contraseña restablecida exitosamente.");
      } else {
        setError(res.data?.error || "Error al restablecer la contraseña.");
      }
    } catch (err: any) {
      setLoading(false);
      const errMsg = err.response?.data?.error || "El enlace ha expirado o ya fue utilizado.";
      setError(errMsg);
      toast.error(errMsg);
    }
  }

  if (success) {
    return (
      <div className="text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto shadow-sm">
          <CheckCircle size={32} className="text-emerald-500" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-[#0F172A]">¡Contraseña Actualizada!</h2>
          <p className="text-[#64748B] text-sm leading-relaxed">
            Tu contraseña se ha restablecido correctamente. Ya puedes iniciar sesión con tus nuevas credenciales.
          </p>
        </div>
        <Btn v="primary" sz="lg" full onClick={() => router.push("/")}>
          Ir al inicio de sesión
        </Btn>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <label className="text-sm font-semibold text-[#0F172A] block mb-1">Nueva Contraseña</label>
          <div className="relative">
            <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type={showPass ? "text" : "password"}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4FD8]/30 focus:border-[#1B4FD8] transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPass(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B] cursor-pointer"
            >
              {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <span className="text-[10px] text-[#64748B] mt-1 block">Mínimo 8 caracteres.</span>
        </div>

        <div>
          <label className="text-sm font-semibold text-[#0F172A] block mb-1">Confirmar Nueva Contraseña</label>
          <div className="relative">
            <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type={showConfirm ? "text" : "password"}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4FD8]/30 focus:border-[#1B4FD8] transition-all"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B] cursor-pointer"
            >
              {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 text-xs font-semibold p-3.5 rounded-xl border border-red-200 flex gap-2">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <Btn v="primary" sz="lg" full type="submit" disabled={loading}>
        {loading ? <><RefreshCw size={14} className="animate-spin" /> Actualizando…</> : "Actualizar Contraseña"}
      </Btn>
    </form>
  );
}

export default function ResetPasswordPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <Toaster position="top-right" richColors />
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#1B4FD8] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/10">
            <Zap size={26} className="text-white animate-pulse" />
          </div>
          <h1 className="text-3xl font-extrabold text-[#0F172A] tracking-tight">Establecer Nueva Contraseña</h1>
          <p className="text-[#64748B] text-sm mt-1.5">Completa los campos para actualizar la contraseña de tu cuenta</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-[0_8px_32px_rgba(0,0,0,0.04)] p-8">
          <Suspense fallback={
            <div className="text-center py-8 space-y-3">
              <RefreshCw size={24} className="animate-spin text-[#1B4FD8] mx-auto" />
              <p className="text-sm font-semibold text-[#64748B]">Cargando formulario…</p>
            </div>
          }>
            <ResetPasswordForm />
          </Suspense>
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={() => router.push("/")}
            className="text-sm font-bold text-[#1B4FD8] hover:underline cursor-pointer"
          >
            Volver al inicio de sesión
          </button>
        </div>
      </div>
    </div>
  );
}
