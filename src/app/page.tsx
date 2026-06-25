"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePOSStore } from "@/app/store/usePOSStore";

export default function Home() {
  const router = useRouter();
  const user = usePOSStore(state => state.user);

  useEffect(() => {
    // Si el usuario ya tiene sesión iniciada, redirigir a su tenant
    if (user && user.tenantId) {
      router.push(`/t/${user.tenantId}`);
    } else {
      // Si no, enviarlo a registrarse para iniciar prueba demo
      router.push("/register");
    }
  }, [user, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-pulse font-semibold text-slate-400">Redirigiendo...</div>
    </div>
  );
}
