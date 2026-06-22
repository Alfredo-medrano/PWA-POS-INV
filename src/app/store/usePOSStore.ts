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

  processSale: async () => {
    const { cart, activeCustomer, payMethod, emitDTE, dteType } = get();
    if (cart.length === 0) return false;

    set({ dteStatus: emitDTE ? 'processing' : 'idle' });

    const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.qty, 0);
    const iva = subtotal * 0.13;
    const total = subtotal + iva;

    // Simular el DTE y su número de control
    const controlNum = `DTE-${dteType === 'CF' ? '01' : '03'}-M001-${Math.floor(100000000 + Math.random() * 900000000)}`;

    const rawDteJson = {
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

    // Estado DTE simulado
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
      // Registrar en Neon a través de la API local
      await axios.post('/api/ventas', payload);
      
      // Actualizar estado del DTE en el frontend
      set({ 
        dteStatus: statusDte === 'success' ? 'success' : statusDte === 'contingencia' ? 'contingencia' : 'idle',
        recentDteControl: controlNum
      });

      // Refrescar inventario y clientes
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
