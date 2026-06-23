import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  Zap, Users, Receipt, Printer, Globe, Lock, Activity,
  CheckCircle, Plus, Edit, XCircle, Download, RefreshCw, Wifi, WifiOff, X, Trash2,
  Building2, Phone, MapPin, DollarSign, Save
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

  const [sec, setSec] = useState("negocio");

  // Business Info state
  const [bizName, setBizName] = useState("");
  const [bizType, setBizType] = useState("");
  const [bizPhone, setBizPhone] = useState("");
  const [bizAddress, setBizAddress] = useState("");
  const [aperturaCaja, setAperturaCaja] = useState("200.00");
  const [savingBiz, setSavingBiz] = useState(false);
  const [bizSaved, setBizSaved] = useState(false);

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
      setBizName(config.bizName || "");
      setBizType(config.bizType || "");
      setBizPhone(config.bizPhone || "");
      setBizAddress(config.bizAddress || "");
      setAperturaCaja(String(config.aperturaCaja || 200));
      setUrl(config.dteUrl || "");
      setKey(config.dteKey || "");
    }
  }, [config]);

  async function handleSaveBizConfig() {
    setSavingBiz(true);
    setBizSaved(false);
    const ok = await saveConfig({
      bizName: bizName || "Mi Negocio",
      bizType: bizType || undefined,
      bizPhone: bizPhone || undefined,
      bizAddress: bizAddress || undefined,
      dteUrl: config?.dteUrl || url,
      dteKey: config?.dteKey || key,
      aperturaCaja: parseFloat(aperturaCaja) || 200
    });
    setSavingBiz(false);
    if (ok) {
      setBizSaved(true);
      toast.success("Configuración de negocio guardada con éxito.");
      setTimeout(() => setBizSaved(false), 3000);
    } else {
      toast.error("Error al guardar la configuración del negocio.");
    }
  }

  async function handleSaveDteConfig() {
    setSavingConfig(true);
    const ok = await saveConfig({
      bizName: config?.bizName || bizName || "Mi Negocio",
      bizType: config?.bizType || bizType,
      bizPhone: config?.bizPhone || bizPhone,
      bizAddress: config?.bizAddress || bizAddress,
      dteUrl: url,
      dteKey: key,
      aperturaCaja: config?.aperturaCaja || parseFloat(aperturaCaja) || 200
    });
    setSavingConfig(false);
    if (ok) {
      toast.success("Configuración DTE guardada con éxito.");
    } else {
      toast.error("Error al guardar la configuración.");
    }
  }

  async function testConn() {
    if (!url) {
      toast.error("Por favor ingresa la URL de la API DTE.");
      return;
    }
    setTesting(true);
    setTestRes("idle");
    try {
      const res = await axios.get(`${url}/api/dte/status`);
      setTesting(false);
      if (res.status === 200) {
        setTestRes("ok");
        setDteConnected(true);
        toast.success("Conexión con DTE exitosa — Emisor validado correctamente");
      } else {
        setTestRes("err");
        setDteConnected(false);
        toast.error("La API de DTE no respondió con éxito.");
      }
    } catch (err) {
      console.error(err);
      setTesting(false);
      setTestRes("err");
      setDteConnected(false);
      toast.error("Error al conectar con la API de DTE. Verifica la URL.");
    }
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
      toast.error("Por favor completa los campos requeridos.");
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
      toast.success("Usuario guardado con éxito.");
      setUserModalOpen(false);
    } else {
      toast.error("Error al guardar usuario. El correo podría estar en uso.");
    }
  }

  async function handleDeleteUserClick(id: string) {
    if (confirm("¿Estás seguro de que deseas eliminar este usuario?")) {
      const success = await deleteUser(id);
      if (success) {
        toast.success("Usuario eliminado con éxito.");
        setUserModalOpen(false);
      } else {
        toast.error("Error al eliminar usuario.");
      }
    }
  }

  const menu = [
    { id: "negocio",     label: "Datos del Negocio",  icon: Building2   },
    { id: "dte",         label: "Integración DTE",    icon: Zap         },
    { id: "usuarios",    label: "Usuarios y Roles",   icon: Users       },
    { id: "impresoras",  label: "Impresoras",         icon: Printer     },
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
          {/* ── DATOS DEL NEGOCIO ── */}
          {sec === "negocio" && (
            <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-6 space-y-5">
              <div>
                <h2 className="font-black text-[#0F172A]">Datos del Negocio</h2>
                <p className="text-xs text-[#94A3B8] mt-0.5">Información general de tu establecimiento comercial</p>
              </div>
              <div className="space-y-4">
                <Input label="Nombre del negocio *" value={bizName} onChange={setBizName} icon={Building2} placeholder="Mi Tienda El Sol" />
                <div>
                  <label className="text-sm font-semibold text-[#0F172A] block mb-2">Tipo de negocio</label>
                  <div className="grid grid-cols-4 gap-2">
                    {["Tienda", "Ferretería", "Papelería", "Otro"].map(t => (
                      <button key={t} onClick={() => setBizType(t)}
                        className={`py-2 rounded-xl border text-xs font-bold transition-all ${bizType === t ? "bg-[#1B4FD8] text-white border-[#1B4FD8] shadow-sm" : "bg-white text-[#64748B] border-[#E2E8F0] hover:border-[#1B4FD8] hover:text-[#1B4FD8]"}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Teléfono" value={bizPhone} onChange={setBizPhone} icon={Phone} placeholder="2222-3344" />
                  <Input label="Dirección" value={bizAddress} onChange={setBizAddress} icon={MapPin} placeholder="Calle, colonia, municipio" />
                </div>
                <div className="border-t border-[#F1F5F9] pt-4">
                  <Input label="Monto de apertura de caja ($)" type="number" value={aperturaCaja} onChange={setAperturaCaja} icon={DollarSign} placeholder="200.00" hint="Este monto se usará por defecto al generar el corte de caja diario." />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Btn v="primary" onClick={handleSaveBizConfig} disabled={savingBiz || !bizName}>
                  {savingBiz ? <><RefreshCw size={13} className="animate-spin" />Guardando...</> : <><Save size={13} />Guardar cambios</>}
                </Btn>
                {bizSaved && (
                  <span className="flex items-center gap-1.5 text-emerald-600 text-xs font-bold animate-in fade-in duration-200">
                    <CheckCircle size={14} />Guardado exitosamente
                  </span>
                )}
              </div>
            </div>
          )}

          {/* ── INTEGRACIÓN DTE ── */}
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
                <Btn v="primary" onClick={handleSaveDteConfig} disabled={savingConfig}>
                  {savingConfig ? "Guardando..." : "Guardar configuración"}
                </Btn>
                {dteConnected && (
                  <Btn v="danger" onClick={() => setDteConnected(false)}>Desconectar</Btn>
                )}
              </div>
              {testRes === "ok" && (
                <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 p-3.5 rounded-xl text-xs font-semibold ring-1 ring-emerald-200"><CheckCircle size={14} />Conexión exitosa — {config?.bizName || "Mi Negocio"} | Producción</div>
              )}
              {testRes === "err" && (
                <div className="flex items-center gap-2 bg-red-50 text-red-700 p-3.5 rounded-xl text-xs font-semibold ring-1 ring-red-200"><XCircle size={14} />Error al conectar. Verifica la URL y API Key.</div>
              )}
            </div>
          )}

          {/* ── USUARIOS Y ROLES ── */}
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
                    {users.length === 0 && (
                      <tr><td colSpan={5} className="text-center py-8 text-sm text-[#94A3B8]">No hay usuarios registrados.</td></tr>
                    )}
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

          {/* ── IMPRESORAS ── */}
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
