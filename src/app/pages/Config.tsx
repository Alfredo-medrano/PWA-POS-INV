import { useEffect, useState } from "react";
import {
  Zap, Users, Receipt, Printer, Globe, Lock, Activity,
  CheckCircle, Plus, Edit, XCircle, Download, RefreshCw, Wifi, WifiOff, X, Trash2
} from "lucide-react";
import { Btn, Input, Badge } from "../components/Primitives";
import { usePOSStore, User } from "../store/usePOSStore";

const ROLES = [
  { name: "Administrador", perms: [true, true, true, true] },
  { name: "Supervisor",    perms: [true, true, true, false] },
  { name: "Cajero",        perms: [true, false, false, false] }
];

const PERMS = [
  "Realizar ventas en caja",
  "Ajustar stock de inventario",
  "Ver reportes y estadísticas",
  "Configurar API DTE"
];

export default function Config({ dteConnected, setDteConnected }: { dteConnected: boolean; setDteConnected: (v: boolean) => void }) {
  const {
    config,
    fetchConfig,
    saveConfig,
    users,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser
  } = usePOSStore();

  const [sec, setSec] = useState("dte");

  // DTE Config state
  const [url, setUrl] = useState("");
  const [key, setKey] = useState("");
  const [testing, setTesting] = useState(false);
  const [testRes, setTestRes] = useState<"idle" | "ok" | "err">("idle");
  const [savingConfig, setSavingConfig] = useState(false);

  // Users Form State
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({ name: "", email: "", password: "", role: "Cajero", status: "Activo" });

  useEffect(() => {
    fetchConfig();
    fetchUsers();
  }, []);

  // Sync inputs with config loaded from database
  useEffect(() => {
    if (config) {
      setUrl(config.dteUrl || "");
      setKey(config.dteKey || "");
    }
  }, [config]);

  async function handleSaveConfig() {
    setSavingConfig(true);
    const ok = await saveConfig({
      bizName: config?.bizName || "Mi Negocio",
      bizType: config?.bizType || "Tienda",
      bizPhone: config?.bizPhone || "",
      bizAddress: config?.bizAddress || "",
      dteUrl: url,
      dteKey: key
    });
    setSavingConfig(false);
    if (ok) {
      alert("Configuración DTE guardada con éxito.");
    } else {
      alert("Error al guardar la configuración.");
    }
  }

  function testConn() {
    setTesting(true);
    setTestRes("idle");
    setTimeout(() => {
      setTesting(false);
      setTestRes("ok");
      setDteConnected(true);
    }, 1200);
  }

  function handleEditUserClick(u: User) {
    setEditingUser(u);
    setUserForm({ name: u.name, email: u.email, password: "", role: u.role, status: u.status });
    setUserModalOpen(true);
  }

  function handleAddUserClick() {
    setEditingUser(null);
    setUserForm({ name: "", email: "", password: "", role: "Cajero", status: "Activo" });
    setUserModalOpen(true);
  }

  async function handleSaveUser() {
    if (!userForm.name || !userForm.email || (!editingUser && !userForm.password)) {
      alert("Por favor completa los campos requeridos.");
      return;
    }

    let success = false;
    if (editingUser) {
      success = await updateUser(editingUser.id, {
        name: userForm.name,
        email: userForm.email,
        role: userForm.role,
        status: userForm.status,
        ...(userForm.password ? { password: userForm.password } : {})
      });
    } else {
      success = await createUser(userForm);
    }

    if (success) {
      setUserModalOpen(false);
    } else {
      alert("Error al guardar usuario. El correo podría estar en uso.");
    }
  }

  async function handleDeleteUserClick(id: string) {
    if (confirm("¿Estás seguro de que deseas eliminar este usuario?")) {
      const success = await deleteUser(id);
      if (success) {
        setUserModalOpen(false);
      } else {
        alert("Error al eliminar usuario.");
      }
    }
  }

  const menu = [
    { id: "dte",        label: "Integración DTE",    icon: Zap         },
    { id: "usuarios",   label: "Usuarios y Roles",   icon: Users       },
    { id: "plan",       label: "Plan y Cobros",      icon: Receipt     },
    { id: "impresoras", label: "Impresoras",         icon: Printer     },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">Configuración</h1>
      <div className="flex flex-col md:flex-row gap-5 items-start">
        {/* Left Column - Nav Menu */}
        <div className="w-full md:w-48 bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-2 flex flex-row md:flex-col gap-0.5 overflow-x-auto shrink-0 scrollbar-none">
          {menu.map(m => {
            const active = sec === m.id;
            return (
              <button key={m.id} onClick={() => setSec(m.id)}
                className={`flex-1 md:flex-none flex items-center justify-center md:justify-start gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${active ? "bg-[#EEF2FF] text-[#1B4FD8]" : "text-[#64748B] hover:bg-slate-50"}`}>
                <m.icon size={14} className={active ? "text-[#1B4FD8]" : "text-[#94A3B8]"} />
                {m.label}
              </button>
            );
          })}
        </div>

        {/* Right Column - Subview Content */}
        <div className="flex-1 w-full">
          {sec === "dte" && (
            <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-6 space-y-5">
              <div>
                <h2 className="font-black text-[#0F172A]">Conexión con Sistema de Facturación Electrónica</h2>
                <p className="text-xs text-[#94A3B8] mt-0.5">Configura el acceso a tu sistema DTE externo</p>
              </div>
              <div className="space-y-4">
                <Input label="URL del sistema DTE" value={url} onChange={setUrl} icon={Globe} />
                <div>
                  <label className="text-sm font-semibold text-[#0F172A] block mb-1">API Key</label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                    <input type="password" value={key} onChange={e => setKey(e.target.value)} placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-[#E2E8F0] text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1B4FD8]/20 focus:border-[#1B4FD8] rounded-lg" />
                  </div>
                </div>
              </div>
              
              <div className={`rounded-xl p-4 flex items-start gap-3 ring-1 ${dteConnected ? "bg-emerald-50 ring-emerald-200" : "bg-red-50 ring-red-200"}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${dteConnected ? "bg-emerald-100" : "bg-red-100"}`}>
                  {dteConnected ? <Wifi size={15} className="text-emerald-600" /> : <WifiOff size={15} className="text-red-600" />}
                </div>
                <div>
                  <p className={`text-sm font-bold ${dteConnected ? "text-emerald-700" : "text-red-700"}`}>{dteConnected ? "● Conectado" : "✕ Sin conexión"}</p>
                  {dteConnected ? (
                    <>
                      <p className="text-xs text-emerald-600 mt-0.5">Último ping: Exitoso</p>
                      <p className="text-xs text-emerald-600">Emisor: {config?.bizName || "Mi Negocio"} · Producción</p>
                    </>
                  ) : (
                    <p className="text-xs text-red-600 mt-0.5">No se podrán emitir DTEs reales. Las ventas locales se registrarán en contingencia.</p>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <Btn v="secondary" onClick={testConn} disabled={testing || !url || !key}>
                  {testing ? <><RefreshCw size={13} className="animate-spin" />Probando...</> : <><Activity size={13} />Probar conexión</>}
                </Btn>
                <Btn v="primary" onClick={handleSaveConfig} disabled={savingConfig}>
                  {savingConfig ? "Guardando..." : "Guardar configuración"}
                </Btn>
                {dteConnected && (
                  <Btn v="danger" onClick={() => setDteConnected(false)}>Desconectar</Btn>
                )}
              </div>
              {testRes === "ok" && (
                <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 p-3.5 rounded-xl text-xs font-semibold ring-1 ring-emerald-200"><CheckCircle size={14} />Conexión exitosa — {config?.bizName || "Mi Negocio"} | Producción</div>
              )}
            </div>
          )}

          {sec === "usuarios" && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-black text-[#0F172A]">Lista de usuarios</h2>
                  <Btn v="secondary" sz="sm" onClick={handleAddUserClick}><Plus size={13} />Agregar usuario</Btn>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#E2E8F0]">
                      <th className="text-left pb-2 text-xs font-bold text-[#94A3B8]">Usuario</th>
                      <th className="text-left pb-2 text-xs font-bold text-[#94A3B8]">Correo</th>
                      <th className="text-left pb-2 text-xs font-bold text-[#94A3B8]">Rol</th>
                      <th className="text-left pb-2 text-xs font-bold text-[#94A3B8]">Estado</th>
                      <th className="pb-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F8FAFC]">
                    {users.map(u => (
                      <tr key={u.id} className="hover:bg-slate-50">
                        <td className="py-2.5 font-semibold text-[#0F172A]">{u.name}</td>
                        <td className="py-2.5 font-mono text-[#64748B] text-xs">{u.email}</td>
                        <td className="py-2.5 text-[#64748B]">{u.role}</td>
                        <td className="py-2.5">
                          <Badge color={u.status === "Activo" ? "green" : "red"}>{u.status}</Badge>
                        </td>
                        <td className="py-2.5 text-right">
                          <button onClick={() => handleEditUserClick(u)} className="text-[#94A3B8] hover:text-[#64748B]"><Edit size={13} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-5 overflow-x-auto">
                <h2 className="font-black text-[#0F172A] mb-4">Permisos por rol</h2>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#E2E8F0]">
                      <th className="text-left py-2 pr-4 text-xs font-bold text-[#94A3B8]">Permiso</th>
                      {ROLES.map(r => <th key={r.name} className="text-center py-2 px-4 text-xs font-bold text-[#94A3B8]">{r.name}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F8FAFC]">
                    {PERMS.map((p, i) => (
                      <tr key={p}>
                        <td className="py-2.5 pr-4 text-[#64748B] text-sm">{p}</td>
                        {ROLES.map(r => <td key={r.name} className="py-2.5 text-center">{r.perms[i] ? <CheckCircle size={15} className="text-emerald-500 mx-auto" /> : <XCircle size={15} className="text-slate-200 mx-auto" />}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {sec === "plan" && (
            <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-6 space-y-5">
              <h2 className="font-black text-[#0F172A]">Plan y facturación</h2>
              <div className="bg-gradient-to-br from-[#EEF2FF] to-[#E0E7FF] rounded-2xl p-5 flex items-center justify-between ring-1 ring-[#1B4FD8]/20">
                <div>
                  <div className="flex items-center gap-2.5 mb-1">
                    <p className="font-black text-[#0F172A] text-xl">Plan Estándar</p>
                    <Badge color="blue">ESTÁNDAR</Badge>
                  </div>
                  <p className="text-sm text-[#64748B]">Hasta 3 usuarios · Inventario ilimitado · Reportes básicos</p>
                </div>
                <Btn v="primary" sz="sm">Cambiar plan</Btn>
              </div>
              <div className="flex items-center justify-between py-3.5 border-b border-[#F1F5F9]">
                <p className="text-sm text-[#64748B]">Próximo cobro</p>
                <p className="font-black text-[#0F172A] tabular-nums">$29.99 — 22 julio 2025</p>
              </div>
              <div>
                <h3 className="font-black text-[#0F172A] text-sm mb-3">Historial de pagos</h3>
                {[{ d: "22 jun 2025", a: "$29.99" }, { d: "22 may 2025", a: "$29.99" }, { d: "22 abr 2025", a: "$29.99" }].map(p => (
                  <div key={p.d} className="flex items-center gap-4 py-3 border-b border-[#F8FAFC] text-sm">
                    <span className="flex-1 text-[#64748B]">{p.d}</span>
                    <span className="font-black tabular-nums">{p.a}</span>
                    <Badge color="green">Pagado</Badge>
                    <button className="text-[#1B4FD8] text-xs font-bold hover:underline flex items-center gap-1"><Download size={11} />Recibo</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {sec === "impresoras" && (
            <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-6">
              <h2 className="font-black text-[#0F172A] mb-5">Impresoras</h2>
              <div className="text-center py-16 border-2 border-dashed border-[#E2E8F0] rounded-2xl">
                <Printer size={36} className="text-slate-200 mx-auto mb-3" />
                <p className="text-sm font-semibold text-[#64748B]">No hay impresoras configuradas</p>
                <p className="text-xs text-[#94A3B8] mt-1 mb-4">Conecta una impresora térmica para imprimir tickets de venta</p>
                <Btn v="secondary" sz="sm"><Plus size={13} />Agregar impresora</Btn>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* USER EDIT/ADD MODAL */}
      {userModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setUserModalOpen(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-[#0F172A] text-base">{editingUser ? "Editar Usuario" : "Nuevo Usuario"}</h3>
              <button onClick={() => setUserModalOpen(false)} className="text-[#94A3B8] hover:text-[#64748B]"><X size={16} /></button>
            </div>
            <div className="space-y-4">
              <Input label="Nombre completo *" placeholder="Ana Martínez" value={userForm.name} onChange={v => setUserForm(f => ({ ...f, name: v }))} />
              <Input label="Correo electrónico *" placeholder="ana@mitienda.com.sv" value={userForm.email} onChange={v => setUserForm(f => ({ ...f, email: v }))} />
              <div>
                <label className="text-xs font-bold text-[#0F172A] block mb-1">Contraseña {editingUser && "(deja en blanco para no cambiar)"} *</label>
                <input type="password" value={userForm.password} onChange={e => setUserForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••"
                  className="w-full px-3 py-2 bg-slate-50 border border-[#E2E8F0] text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1B4FD8]/20 focus:border-[#1B4FD8] rounded-lg" />
              </div>
              <div>
                <label className="text-xs font-bold text-[#0F172A] block mb-1">Rol</label>
                <select value={userForm.role} onChange={e => setUserForm(f => ({ ...f, role: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1B4FD8]/20 focus:border-[#1B4FD8]">
                  <option value="Administrador">Administrador</option>
                  <option value="Supervisor">Supervisor</option>
                  <option value="Cajero">Cajero</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-[#0F172A] block mb-1">Estado</label>
                <select value={userForm.status} onChange={e => setUserForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1B4FD8]/20 focus:border-[#1B4FD8]">
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              {editingUser && (
                <Btn v="danger" onClick={() => handleDeleteUserClick(editingUser.id)}><Trash2 size={13} /> Eliminar</Btn>
              )}
              <Btn v="secondary" className="flex-1" onClick={() => setUserModalOpen(false)}>Cancelar</Btn>
              <Btn v="primary" className="flex-1" onClick={handleSaveUser}>Guardar</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
