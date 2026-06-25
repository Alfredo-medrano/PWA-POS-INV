import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';

// ─── Interfaces ───────────────────────────────────────────────────────────────
export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  stock: number;
  minStock: number;
  cost: number;
  price: number;
  img?: string;
  barcode?: string;
}

export interface CartItem {
  product: Product;
  qty: number;
}

export interface Customer {
  id: string;
  name: string;
  type: 'natural' | 'juridica';
  nit?: string;
  nrc?: string;
  dui?: string;
  phone?: string;
  email?: string;
  address?: string;
  total: number;
  lastBuy?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  tenantId?: string;
  tenantSlug?: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  nrc?: string;
  email?: string;
  last_buy?: string;
}

export interface Purchase {
  id: string;
  supplierId?: string;
  sup: string;
  date: string;
  n: number;
  total: number;
  s: string;
  items?: any[];
}

export interface BusinessConfig {
  tenantId?: string;
  tenantSlug?: string;
  bizName: string;
  bizType?: string;
  bizPhone?: string;
  bizAddress?: string;
  dteUrl?: string;
  dteKey?: string;
  aperturaCaja?: number;
  trialExpired?: boolean;
  tenantStatus?: string;
}

export interface Sale {
  id: string;
  total: number;
  payMethod: string;
  dteStatus: string;
  dteType: string;
  customerId?: string;
  customerName: string;
  items: any[];
  date: string;
  time: string;
  createdAt: string;
}

export interface DashboardStats {
  salesToday: number;
  txCount: number;
  topProduct: string;
  recent: any[];
  hourly: any[];
}

export interface ReportsStats {
  monthly: any[];
  topProducts: any[];
  corteCaja: any[];
}

export interface SalePayload {
  total: number;
  payMethod: string;
  dteStatus: string;
  dteType: string;
  cart: CartItem[];
  customer?: { id: string; name: string } | null;
  rawDteJson: any;
}

interface POSState {
  products: Product[];
  customers: Customer[];
  cart: CartItem[];
  activeCustomer: Customer | null;
  payMethod: 'Efectivo' | 'Tarjeta' | 'Transferencia' | 'Mixto';
  cashPaid: string;
  emitDTE: boolean;
  dteType: 'CF' | 'CCF';
  dteStatus: 'idle' | 'processing' | 'success' | 'contingencia';
  recentDteControl: string;
  loadingProducts: boolean;
  loadingCustomers: boolean;

  // Nuevos Estados para Config/Auth/Compras/Analíticas
  config: BusinessConfig | null;
  user: User | null;
  users: User[];
  suppliers: Supplier[];
  purchases: Purchase[];
  dashboardStats: DashboardStats | null;
  reportsStats: ReportsStats | null;
  loadingStats: boolean;
  loadingUsers: boolean;
  loadingSuppliers: boolean;
  loadingPurchases: boolean;

  // Historial de ventas
  sales: Sale[];
  salesTotalCount: number;
  loadingSales: boolean;

  // Acciones
  fetchProducts: () => Promise<void>;
  fetchCustomers: () => Promise<void>;
  addProduct: (product: Product) => void;
  setQty: (productId: string, delta: number) => void;
  removeItem: (productId: string) => void;
  pickCustomer: (customer: Customer | null) => void;
  setPayMethod: (method: 'Efectivo' | 'Tarjeta' | 'Transferencia' | 'Mixto') => void;
  setCashPaid: (amount: string) => void;
  setEmitDTE: (emit: boolean) => void;
  setDteType: (type: 'CF' | 'CCF') => void;
  resetCart: () => void;
  
  // CRUD Productos
  createProduct: (product: Omit<Product, 'id'>) => Promise<boolean>;
  updateProduct: (id: string, product: Omit<Product, 'id'>) => Promise<boolean>;
  deleteProduct: (id: string) => Promise<boolean>;

  // CRUD Clientes
  createCustomer: (customer: Omit<Customer, 'id' | 'total'>) => Promise<boolean>;
  updateCustomer: (id: string, customer: Omit<Customer, 'id' | 'total'>) => Promise<boolean>;
  deleteCustomer: (id: string) => Promise<boolean>;

  // Cobro
  processSale: () => Promise<boolean>;

  // Nuevas Acciones
  fetchConfig: (tenantId?: string) => Promise<boolean>;
  saveConfig: (cfg: BusinessConfig) => Promise<boolean>;
  login: (email: string, password: string, tenantId?: string) => Promise<boolean>;
  globalLogin: (email: string, password: string) => Promise<{ success: boolean; tenantSlug?: string; error?: string }>;
  logout: () => Promise<void>;
  register: (name: string, email: string, password: string, tenantId?: string) => Promise<boolean>;
  forgotPassword: (email: string, tenantId?: string) => Promise<string | null>;
  
  fetchUsers: () => Promise<void>;
  createUser: (usr: Omit<User, 'id'> & { password?: string }) => Promise<boolean>;
  updateUser: (id: string, usr: Partial<User> & { password?: string }) => Promise<boolean>;
  deleteUser: (id: string) => Promise<boolean>;

  fetchSuppliers: () => Promise<void>;
  createSupplier: (sup: Omit<Supplier, 'id' | 'last_buy'>) => Promise<boolean>;
  updateSupplier: (id: string, sup: Omit<Supplier, 'id' | 'last_buy'>) => Promise<boolean>;
  deleteSupplier: (id: string) => Promise<boolean>;

  fetchPurchases: () => Promise<void>;
  createPurchase: (purchase: { supplierId: string, supplierName: string, items: any[], status: string, total: number }) => Promise<boolean>;
  receivePurchase: (id: string) => Promise<boolean>;

  fetchDashboardStats: () => Promise<void>;
  fetchReportsStats: (period?: string) => Promise<void>;
  fetchSales: () => Promise<void>;
  
  // Acciones de Inicialización/Setup
  setupStatus: { isConfigured: boolean; hasUsers: boolean } | null;
  fetchSetupStatus: () => Promise<boolean>;
  registerBusinessAndAdmin: (data: any) => Promise<boolean>;
  resetDatabase: () => Promise<boolean>;
  seedDatabase: () => Promise<boolean>;
}

export const usePOSStore = create<POSState>()(
  persist(
    (set, get) => ({
      products: [],
      customers: [],
      cart: [],
      activeCustomer: null,
      payMethod: 'Efectivo',
      cashPaid: '',
      emitDTE: false,
      dteType: 'CF',
      dteStatus: 'idle',
      recentDteControl: '',
      loadingProducts: false,
      loadingCustomers: false,

  // Inicializar Nuevos Estados
  config: null,
  user: typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('pos_user') || 'null') : null,
  users: [],
  suppliers: [],
  purchases: [],
  dashboardStats: null,
  reportsStats: null,
  loadingStats: false,
  loadingUsers: false,
  loadingSuppliers: false,
  loadingPurchases: false,
  setupStatus: null,
  sales: [],
  salesTotalCount: 0,
  loadingSales: false,

  fetchProducts: async () => {
    set({ loadingProducts: true });
    try {
      const res = await axios.get('/api/productos');
      set({ products: res.data, loadingProducts: false });
    } catch (err) {
      console.error('Error fetching products:', err);
      set({ loadingProducts: false });
    }
  },

  fetchCustomers: async () => {
    set({ loadingCustomers: true });
    try {
      const res = await axios.get('/api/clientes');
      set({ customers: res.data, loadingCustomers: false });
    } catch (err) {
      console.error('Error fetching customers:', err);
      set({ loadingCustomers: false });
    }
  },

  addProduct: (product) => {
    if (product.stock === 0) return;
    const { cart } = get();
    const existing = cart.find(item => item.product.id === product.id);
    let newCart;
    if (existing) {
      newCart = cart.map(item =>
        item.product.id === product.id
          ? { ...item, qty: Math.min(product.stock, item.qty + 1) }
          : item
      );
    } else {
      newCart = [...cart, { product, qty: 1 }];
    }
    set({ cart: newCart });
  },

  setQty: (productId, delta) => {
    const { cart } = get();
    const newCart = cart.map(item => {
      if (item.product.id === productId) {
        const nextQty = Math.max(1, item.qty + delta);
        return { ...item, qty: Math.min(item.product.stock, nextQty) };
      }
      return item;
    });
    set({ cart: newCart });
  },

  removeItem: (productId) => {
    const { cart } = get();
    set({ cart: cart.filter(item => item.product.id !== productId) });
  },

  pickCustomer: (customer) => {
    if (customer) {
      set({
        activeCustomer: customer,
        emitDTE: !!customer.nit,
        dteType: customer.nit ? 'CCF' : 'CF'
      });
    } else {
      set({
        activeCustomer: null,
        emitDTE: false,
        dteType: 'CF'
      });
    }
  },

  setPayMethod: (method) => set({ payMethod: method }),
  setCashPaid: (amount) => set({ cashPaid: amount }),
  setEmitDTE: (emit) => set({ emitDTE: emit }),
  setDteType: (type) => set({ dteType: type }),

  resetCart: () => set({
    cart: [],
    activeCustomer: null,
    payMethod: 'Efectivo',
    cashPaid: '',
    emitDTE: false,
    dteType: 'CF',
    dteStatus: 'idle',
    recentDteControl: ''
  }),

  createProduct: async (product) => {
    try {
      await axios.post('/api/productos', product);
      await get().fetchProducts();
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  },

  updateProduct: async (id, product) => {
    try {
      await axios.put(`/api/productos/${id}`, product);
      await get().fetchProducts();
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  },

  deleteProduct: async (id) => {
    try {
      await axios.delete(`/api/productos/${id}`);
      await get().fetchProducts();
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  },

  createCustomer: async (customer) => {
    try {
      await axios.post('/api/clientes', customer);
      await get().fetchCustomers();
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  },

  updateCustomer: async (id, customer) => {
    try {
      await axios.put(`/api/clientes/${id}`, customer);
      await get().fetchCustomers();
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  },

  deleteCustomer: async (id) => {
    try {
      await axios.delete(`/api/clientes/${id}`);
      await get().fetchCustomers();
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  },

  // Configuración
  fetchConfig: async (tenantId) => {
    try {
      const url = tenantId ? `/api/configuracion?tenantId=${tenantId}` : '/api/configuracion';
      const res = await axios.get(url);
      if (res.data && res.data.bizName) {
        set({ config: res.data });
        return true;
      }
      set({ config: null });
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  },

  saveConfig: async (cfg) => {
    try {
      await axios.post('/api/configuracion', cfg);
      set({ config: cfg });
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  },

  // Autenticación
  login: async (email, password, tenantId) => {
    try {
      const res = await axios.post('/api/auth/login', { email, password, tenantId });
      set({ user: res.data });
      localStorage.setItem('pos_user', JSON.stringify(res.data));
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  },

  globalLogin: async (email, password) => {
    try {
      const res = await axios.post('/api/auth/global-login', { email, password });
      if (res.data && res.data.success) {
        set({ user: res.data.user });
        localStorage.setItem('pos_user', JSON.stringify(res.data.user));
        return { success: true, tenantSlug: res.data.tenantSlug };
      }
      return { success: false, error: 'Credenciales inválidas' };
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.error || 'Error en inicio de sesión';
      return { success: false, error: errMsg };
    }
  },

  logout: async () => {
    try {
      await axios.post('/api/auth/logout');
    } catch (err) {
      console.error('Logout error:', err);
    }
    set({ user: null });
    localStorage.removeItem('pos_user');
  },

  register: async (name, email, password, tenantId) => {
    try {
      const res = await axios.post('/api/auth/register', { name, email, password, tenantId });
      if (res.data && res.data.success) {
        set({ user: res.data.user });
        localStorage.setItem('pos_user', JSON.stringify(res.data.user));
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  },

  forgotPassword: async (email, tenantId) => {
    try {
      const res = await axios.post('/api/auth/forgot-password', { email, tenantId });
      if (res.data && res.data.success) {
        return res.data.tempPassword;
      }
      return null;
    } catch (err) {
      console.error(err);
      return null;
    }
  },

  // Usuarios CRUD
  fetchUsers: async () => {
    set({ loadingUsers: true });
    try {
      const res = await axios.get('/api/usuarios');
      set({ users: res.data, loadingUsers: false });
    } catch (err) {
      console.error(err);
      set({ loadingUsers: false });
    }
  },

  createUser: async (usr) => {
    try {
      await axios.post('/api/usuarios', usr);
      await get().fetchUsers();
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  },

  updateUser: async (id, usr) => {
    try {
      await axios.put(`/api/usuarios/${id}`, usr);
      await get().fetchUsers();
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  },

  deleteUser: async (id) => {
    try {
      await axios.delete(`/api/usuarios/${id}`);
      await get().fetchUsers();
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  },

  // Proveedores CRUD
  fetchSuppliers: async () => {
    set({ loadingSuppliers: true });
    try {
      const res = await axios.get('/api/proveedores');
      set({ suppliers: res.data, loadingSuppliers: false });
    } catch (err) {
      console.error(err);
      set({ loadingSuppliers: false });
    }
  },

  createSupplier: async (sup) => {
    try {
      await axios.post('/api/proveedores', sup);
      await get().fetchSuppliers();
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  },

  updateSupplier: async (id, sup) => {
    try {
      await axios.put(`/api/proveedores/${id}`, sup);
      await get().fetchSuppliers();
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  },

  deleteSupplier: async (id) => {
    try {
      await axios.delete(`/api/proveedores/${id}`);
      await get().fetchSuppliers();
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  },

  // Compras (Órdenes)
  fetchPurchases: async () => {
    set({ loadingPurchases: true });
    try {
      const res = await axios.get('/api/compras');
      set({ purchases: res.data, loadingPurchases: false });
    } catch (err) {
      console.error(err);
      set({ loadingPurchases: false });
    }
  },

  createPurchase: async (purchase) => {
    try {
      await axios.post('/api/compras', purchase);
      await get().fetchPurchases();
      await get().fetchProducts();
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  },

  receivePurchase: async (id) => {
    try {
      await axios.put(`/api/compras/${id}/recepcion`);
      await get().fetchPurchases();
      await get().fetchProducts();
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  },

  // Analíticas
  fetchDashboardStats: async () => {
    set({ loadingStats: true });
    try {
      const res = await axios.get('/api/dashboard/stats');
      set({ dashboardStats: res.data, loadingStats: false });
    } catch (err) {
      console.error(err);
      set({ loadingStats: false });
    }
  },

  fetchReportsStats: async (period?: string) => {
    set({ loadingStats: true });
    try {
      const p = period || 'mes';
      const [monthlyRes, productsRes, corteRes] = await Promise.all([
        axios.get(`/api/reportes/ventas?period=${p}`),
        axios.get(`/api/reportes/productos-top?period=${p}`),
        axios.get('/api/reportes/corte-caja')
      ]);
      set({
        reportsStats: {
          monthly: monthlyRes.data,
          topProducts: productsRes.data,
          corteCaja: corteRes.data
        },
        loadingStats: false
      });
    } catch (err) {
      console.error(err);
      set({ loadingStats: false });
    }
  },

  fetchSales: async () => {
    set({ loadingSales: true });
    try {
      const res = await axios.get('/api/ventas?limit=100');
      set({ sales: res.data.sales || [], salesTotalCount: res.data.total || 0, loadingSales: false });
    } catch (err) {
      console.error(err);
      set({ loadingSales: false });
    }
  },

  // Proceso de Venta
  processSale: async () => {
    const { cart, activeCustomer, payMethod, emitDTE, dteType, user, config } = get();
    if (cart.length === 0) return false;

    let statusDte: 'idle' | 'processing' | 'success' | 'contingencia' = 'idle';
    let controlNum = `DTE-${dteType === 'CF' ? '01' : '03'}-M001-${Math.floor(100000000 + Math.random() * 900000000)}`;

    const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.qty, 0);
    const iva = subtotal * 0.13;
    const total = subtotal + iva;

    if (emitDTE) {
      set({ dteStatus: 'processing' });
      if (config && config.dteUrl) {
        try {
          // Map receptor document type and number
          let tipoDocumento = '13'; // Default DUI
          let numDocumento = '00000000-0';
          if (activeCustomer) {
            if (activeCustomer.nit) {
              tipoDocumento = '36';
              numDocumento = activeCustomer.nit;
            } else if (activeCustomer.dui) {
              tipoDocumento = '13';
              numDocumento = activeCustomer.dui;
            }
          }

          const dtePayload = {
            tipoDte: dteType === 'CF' ? '01' : '03',
            receptor: {
              nombre: activeCustomer?.name || 'Consumidor Final',
              correo: activeCustomer?.email || 'cliente@generico.com',
              tipoDocumento: tipoDocumento,
              numDocumento: numDocumento
            },
            items: cart.map(item => ({
              descripcion: item.product.name,
              cantidad: item.qty,
              precioUnitario: item.product.price,
              uniMedida: 59
            })),
            condicionOperacion: 1,
            datosPago: {
              periodo: null,
              plazo: null,
              monto: total
            }
          };

          const headers: Record<string, string> = {};
          if (config.dteKey) {
            headers['Authorization'] = `Bearer ${config.dteKey}`;
          }

          const dteRes = await axios.post(`${config.dteUrl}/api/dte/v2/facturar`, dtePayload, { headers });
          if (dteRes.data && dteRes.data.numeroControl) {
            controlNum = dteRes.data.numeroControl;
          }
          statusDte = 'success';
        } catch (err) {
          console.error('Error calling Back-DTE API, falling back to contingencia:', err);
          statusDte = 'contingencia';
        }
      } else {
        statusDte = 'contingencia';
      }
    }

    const rawDteJson = {
      cajeroId: user?.id || '1',
      cajeroName: user?.name || 'Cajero General',
      identificacion: {
        version: dteType === 'CF' ? 1 : 3,
        numeroControl: controlNum,
        tipoDte: dteType === 'CF' ? '01' : '03',
        fecEmi: new Date().toISOString().split('T')[0]
      },
      detalles: cart.map(item => ({
        descripcion: item.product.name,
        cantidad: item.qty,
        precioUnitario: item.product.price,
        monto: item.product.price * item.qty
      })),
      totales: {
        subtotal,
        iva,
        total
      }
    };

    const payload: SalePayload = {
      total,
      payMethod,
      dteStatus: statusDte,
      dteType,
      cart,
      customer: activeCustomer ? { id: activeCustomer.id, name: activeCustomer.name } : null,
      rawDteJson
    };

    try {
      await axios.post('/api/ventas', payload);
      
      set({ 
        dteStatus: statusDte,
        recentDteControl: controlNum
      });

      await get().fetchProducts();
      await get().fetchCustomers();
      return true;
    } catch (err) {
      console.error('Error en proceso de venta:', err);
      set({ dteStatus: 'idle' });
      return false;
    }
  },

  fetchSetupStatus: async () => {
    try {
      const res = await axios.get('/api/setup/status');
      set({ setupStatus: res.data });
      return res.data.isConfigured && res.data.hasUsers;
    } catch (err) {
      console.error(err);
      return false;
    }
  },

  registerBusinessAndAdmin: async (data) => {
    try {
      const res = await axios.post('/api/setup/register', data);
      if (res.data && res.data.success) {
        set({ user: res.data.user });
        localStorage.setItem('pos_user', JSON.stringify(res.data.user));
        // Recargar la configuración cargada del negocio
        await get().fetchConfig();
        // Forzar recarga del estado de configuración
        await get().fetchSetupStatus();
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  },

  resetDatabase: async () => {
    try {
      await axios.post('/api/setup/reset');
      set({
        user: null,
        config: null,
        products: [],
        customers: [],
        cart: [],
        activeCustomer: null,
        suppliers: [],
        purchases: [],
        dashboardStats: null,
        reportsStats: null,
        setupStatus: { isConfigured: false, hasUsers: false }
      });
      localStorage.removeItem('pos_user');
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  },

  seedDatabase: async () => {
    try {
      await axios.post('/api/setup/seed');
      await get().fetchProducts();
      await get().fetchCustomers();
      await get().fetchSuppliers();
      await get().fetchPurchases();
      // Recargar analíticas si aplica
      await get().fetchDashboardStats();
      await get().fetchReportsStats();
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  }
}),
{
  name: 'pos-checkout-store',
  partialize: (state) => ({
    cart: state.cart,
    activeCustomer: state.activeCustomer,
    payMethod: state.payMethod,
    cashPaid: state.cashPaid,
    emitDTE: state.emitDTE,
    dteType: state.dteType,
    user: state.user
  })
}
)
);
