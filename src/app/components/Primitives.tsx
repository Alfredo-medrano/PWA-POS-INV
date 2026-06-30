import React from "react";
import { TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";

// ─── Badge ────────────────────────────────────────────────────────────────────
export function Badge({ color, children }: { color: "green" | "amber" | "red" | "blue" | "slate"; children: React.ReactNode }) {
  const map = {
    green: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    amber: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    red:   "bg-red-50 text-red-700 ring-1 ring-red-200",
    blue:  "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
    slate: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
  }[color];
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold ${map}`}>{children}</span>;
}

// ─── DTEPill ──────────────────────────────────────────────────────────────────
export function DTEPill({ on }: { on: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${on ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-red-50 text-red-700 ring-1 ring-red-200"}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${on ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
      {on ? "DTE Conectado" : "DTE Sin conexión"}
    </span>
  );
}

// ─── Btn ──────────────────────────────────────────────────────────────────────
export function Btn({ v = "primary", sz = "md", children, onClick, disabled, full, className = "", type = "button" }: {
  v?: "primary" | "secondary" | "danger" | "ghost" | "success";
  sz?: "xs" | "sm" | "md" | "lg";
  children: React.ReactNode; onClick?: () => void;
  disabled?: boolean; full?: boolean; className?: string;
  type?: "button" | "submit" | "reset";
}) {
  const base = "inline-flex items-center justify-center gap-1.5 font-semibold rounded-lg transition-all focus:outline-none disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap";
  const variants = {
    primary:   "bg-[#1B4FD8] hover:bg-[#1338A8] active:bg-[#0f2d8a] text-white shadow-sm hover:shadow-md",
    secondary: "bg-white hover:bg-slate-50 active:bg-slate-100 text-[#0F172A] ring-1 ring-[#E2E8F0] shadow-sm",
    danger:    "bg-[#DC2626] hover:bg-red-700 active:bg-red-800 text-white shadow-sm",
    ghost:     "bg-transparent hover:bg-slate-100 text-[#64748B] hover:text-[#0F172A]",
    success:   "bg-[#16A34A] hover:bg-green-700 active:bg-green-800 text-white shadow-sm hover:shadow-md",
  }[v];
  const sizes = { xs: "px-2 py-1 text-xs", sm: "px-3 py-1.5 text-xs", md: "px-4 py-2 text-sm", lg: "px-5 py-2.5 text-sm" }[sz];
  return (
    <button type={type} className={`${base} ${variants} ${sizes} ${full ? "w-full" : ""} ${className}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

// ─── Input ────────────────────────────────────────────────────────────────────
export function Input({ label, hint, type = "text", placeholder, value, onChange, icon: Icon, error, className = "" }: {
  label?: string; hint?: string; type?: string; placeholder?: string;
  value: string; onChange: (v: string) => void;
  icon?: React.ElementType; error?: string; className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && <label className="text-sm font-semibold text-[#0F172A]">{label}</label>}
      <div className="relative">
        {Icon && <Icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />}
        <input type={type} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)}
          className={`w-full ${Icon ? "pl-9" : "pl-3"} pr-3 py-2 bg-slate-50 border text-sm text-[#0F172A] placeholder-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#1B4FD8]/30 focus:border-[#1B4FD8] transition-all rounded-lg ${error ? "border-red-400 bg-red-50" : "border-[#E2E8F0]"}`} />
      </div>
      {hint && !error && <p className="text-xs text-[#94A3B8]">{hint}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

// ─── Toggle ───────────────────────────────────────────────────────────────────
export function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} role="switch" aria-checked={on}
      className={`relative w-10 h-6 rounded-full transition-colors shrink-0 focus:outline-none focus:ring-2 focus:ring-[#1B4FD8]/30 ${on ? "bg-[#1B4FD8]" : "bg-slate-200"}`}>
      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-all duration-200 ${on ? "left-5" : "left-1"}`} />
    </button>
  );
}

// ─── KPI ──────────────────────────────────────────────────────────────────────
export function KPI({ icon: Icon, value, label, trend, trendUp, warn, onClick }: {
  icon: React.ElementType; value: string; label: string;
  trend?: string; trendUp?: boolean; warn?: boolean; onClick?: () => void;
}) {
  return (
    <button onClick={onClick}
      className={`bg-white rounded-xl border border-[#E2E8F0] p-4 text-left transition-all hover:shadow-md hover:border-[#1B4FD8]/30 active:scale-[0.98] w-full ${onClick ? "cursor-pointer" : "cursor-default"}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-xl bg-[#EEF2FF] flex items-center justify-center">
          <Icon size={17} className="text-[#1B4FD8]" />
        </div>
        {trend && (
          <span className={`flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded-lg ${trendUp ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
            {trendUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {trend}
          </span>
        )}
        {warn && <AlertTriangle size={15} className="text-amber-500" />}
      </div>
      <p className="text-2xl font-bold text-[#0F172A] leading-none mb-1 tabular-nums">{value}</p>
      <p className="text-xs text-[#64748B] font-medium">{label}</p>
    </button>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`bg-slate-100 rounded-lg animate-pulse ${className}`} />;
}

// ─── Moneda Format Helper ──────────────────────────────────────────────────────
export const $ = (n: number) => `$${n.toFixed(2)}`;
export const status = (p: { stock: number; minStock: number }) => p.stock === 0 ? "empty" : p.stock < p.minStock ? "low" : "ok";
export const CATS = ["Todos", "Bebidas", "Lácteos", "Granos", "Limpieza", "Snacks"];
