import { create } from 'zustand';
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
  total: number;
  lastBuy?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
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
  bizName: string;
  bizType?: string;
  bizPhone?: string;
  bizAddress?: string;
  dteUrl?: string;
  dteKey?: string;
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
  fetchConfig: () => Promise<boolean>;
  saveConfig: (cfg: BusinessConfig) => Promise<boolean>;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  
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
  fetchReportsStats: () => Promise<void>;
}

export const usePOSStore = create<POSState>((set, get) => ({
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
  user: JSON.parse(localStorage.getItem('pos_user') || 'null'),
  users: [],
  suppliers: [],
  purchases: [],
  dashboardStats: null,
  reportsStats: null,
  loadingStats: false,
  loadingUsers: false,
  loadingSuppliers: false,
  loadingPurchases: false,

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
  fetchConfig: async () => {
    try {
      const res = await axios.get('/api/configuracion');
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
  login: async (email, password) => {
    try {
      const res = await axios.post('/api/auth/login', { email, password });
      set({ user: res.data });
      localStorage.setItem('pos_user', JSON.stringify(res.data));
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  },

  logout: () => {
    set({ user: null });
    localStorage.removeItem('pos_user');
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

  fetchReportsStats: async () => {
    set({ loadingStats: true });
    try {
      const [monthlyRes, productsRes, corteRes] = await Promise.all([
        axios.get('/api/reportes/ventas'),
        axios.get('/api/reportes/productos-top'),
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

  // Proceso de Venta
  processSale: async () => {
    const { cart, activeCustomer, payMethod, emitDTE, dteType, user } = get();
    if (cart.length === 0) return false;

    set({ dteStatus: emitDTE ? 'processing' : 'idle' });

    const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.qty, 0);
    const iva = subtotal * 0.13;
    const total = subtotal + iva;

    const controlNum = `DTE-${dteType === 'CF' ? '01' : '03'}-M001-${Math.floor(100000000 + Math.random() * 900000000)}`;

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

    const statusDte = emitDTE ? (Math.random() > 0.08 ? 'success' : 'contingencia') : 'idle';

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
        dteStatus: statusDte === 'success' ? 'success' : statusDte === 'contingencia' ? 'contingencia' : 'idle',
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
  }
}));
