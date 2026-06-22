require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

// Configurar pool de PostgreSQL para Neon
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Función para inicializar las tablas de base de datos
async function initDatabase() {
  const client = await pool.connect();
  try {
    console.log('🔄 Inicializando base de datos en Neon...');
    
    // 1. Tabla de Productos
    await client.query(`
      CREATE TABLE IF NOT EXISTS productos (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        sku VARCHAR(100) NOT NULL UNIQUE,
        category VARCHAR(100) NOT NULL,
        stock INTEGER NOT NULL DEFAULT 0,
        min_stock INTEGER NOT NULL DEFAULT 0,
        cost DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        img TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Tabla de Clientes
    await client.query(`
      CREATE TABLE IF NOT EXISTS clientes (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL DEFAULT 'natural',
        nit VARCHAR(50),
        nrc VARCHAR(50),
        dui VARCHAR(50),
        phone VARCHAR(50),
        email VARCHAR(255),
        total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        last_buy VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 3. Tabla de Ventas (Historial de transacciones y DTE)
    await client.query(`
      CREATE TABLE IF NOT EXISTS ventas (
        id VARCHAR(36) PRIMARY KEY,
        total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        pay_method VARCHAR(50) NOT NULL,
        dte_status VARCHAR(50) NOT NULL,
        dte_type VARCHAR(50) NOT NULL,
        raw_dte_json JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Estructura de tablas inicializada.');

    // 4. Semillar productos si la tabla está vacía
    const prodRes = await client.query('SELECT COUNT(*) FROM productos');
    if (parseInt(prodRes.rows[0].count) === 0) {
      console.log('🌱 Semillando productos iniciales...');
      const mockProducts = [
        ["1", "Coca-Cola 2L", "CC2L", "Bebidas", 45, 10, 1.20, 2.00, "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=160&h=160&fit=crop&auto=format"],
        ["2", "Arroz Calrose 5lb", "AR5", "Granos", 8, 15, 2.80, 4.50, "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=160&h=160&fit=crop&auto=format"],
        ["3", "Leche Entera 1L", "LE1", "Lácteos", 0, 20, 0.90, 1.50, "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=160&h=160&fit=crop&auto=format"],
        ["4", "Jabón Líquido 1L", "JL1", "Limpieza", 23, 5, 1.80, 3.00, "https://images.unsplash.com/photo-1584305574647-0cc949a2bb9f?w=160&h=160&fit=crop&auto=format"],
        ["5", "Frijoles Rojos 1lb", "FJ1", "Granos", 34, 10, 0.80, 1.50, "https://images.unsplash.com/photo-1590779033100-9f60a05a013d?w=160&h=160&fit=crop&auto=format"],
        ["6", "Pan Dulce Unidad", "PD1", "Snacks", 12, 20, 0.25, 0.50, "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=160&h=160&fit=crop&auto=format"],
        ["7", "Pepsi 2L", "PP2L", "Bebidas", 30, 10, 1.10, 1.90, "https://images.unsplash.com/photo-1629203851122-3726555cf519?w=160&h=160&fit=crop&auto=format"],
        ["8", "Queso Duro 200g", "QD1", "Lácteos", 7, 8, 3.20, 5.00, "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=160&h=160&fit=crop&auto=format"],
        ["9", "Azúcar Blanca 5lb", "AZ5", "Granos", 55, 10, 1.50, 2.50, "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=160&h=160&fit=crop&auto=format"],
        ["10", "Papel Higiénico x4", "PH4", "Limpieza", 18, 15, 2.50, 4.25, "https://images.unsplash.com/photo-1584556812952-905ffd0c611a?w=160&h=160&fit=crop&auto=format"],
        ["11", "Cereal Zucaritas", "CZ1", "Snacks", 14, 5, 2.90, 4.75, "https://images.unsplash.com/photo-1521483451569-e33803c0330c?w=160&h=160&fit=crop&auto=format"],
        ["12", "Agua Cristal 1.5L", "AC15", "Bebidas", 60, 20, 0.45, 0.85, "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=160&h=160&fit=crop&auto=format"]
      ];
      for (const p of mockProducts) {
        await client.query(`
          INSERT INTO productos (id, name, sku, category, stock, min_stock, cost, price, img)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, p);
      }
      console.log('✅ Productos semillados.');
    }

    // 5. Semillar clientes si la tabla está vacía
    const cliRes = await client.query('SELECT COUNT(*) FROM clientes');
    if (parseInt(cliRes.rows[0].count) === 0) {
      console.log('🌱 Semillando clientes iniciales...');
      const mockCustomers = [
        ["1", "María López Díaz", "natural", "0614-010180-101-3", "12345-6", "01234567-8", "7888-1234", "maria@empresa.com.sv", 4580.00, "20/06/2025"],
        ["2", "Distribuidora San Miguel S.A.", "juridica", "0614-150590-102-1", "98765-4", null, "2222-3344", "compras@distsanmiguel.com.sv", 18420.50, "21/06/2025"],
        ["3", "Carlos Mendez Ramos", "natural", null, null, "02345678-9", "7755-9988", "carlos.m@gmail.com", 890.75, "18/06/2025"]
      ];
      for (const c of mockCustomers) {
        await client.query(`
          INSERT INTO clientes (id, name, type, nit, nrc, dui, phone, email, total, last_buy)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, c);
      }
      console.log('✅ Clientes semillados.');
    }

  } catch (err) {
    console.error('❌ Error inicializando base de datos:', err);
  } finally {
    client.release();
  }
}

// Inicializar DB
initDatabase();

// ========================================
// ENDPOINTS: PRODUCTOS (CRUD)
// ========================================

// Listar productos
app.get('/api/productos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM productos ORDER BY name ASC');
    const prods = result.rows.map(r => ({
      id: r.id,
      name: r.name,
      sku: r.sku,
      category: r.category,
      stock: parseInt(r.stock),
      minStock: parseInt(r.min_stock),
      cost: parseFloat(r.cost),
      price: parseFloat(r.price),
      img: r.img
    }));
    res.json(prods);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

// Crear producto
app.post('/api/productos', async (req, res) => {
  const { name, sku, category, stock, minStock, cost, price, img } = req.body;
  const id = crypto.randomUUID();
  try {
    await pool.query(`
      INSERT INTO productos (id, name, sku, category, stock, min_stock, cost, price, img)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [id, name, sku, category, parseInt(stock) || 0, parseInt(minStock) || 0, parseFloat(cost) || 0, parseFloat(price) || 0, img || null]);
    
    res.status(201).json({ id, name, sku, category, stock, minStock, cost, price, img });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
      res.status(400).json({ error: 'El SKU ya está en uso por otro producto' });
    } else {
      res.status(500).json({ error: 'Error al crear producto' });
    }
  }
});

// Actualizar producto
app.put('/api/productos/:id', async (req, res) => {
  const { id } = req.params;
  const { name, sku, category, stock, minStock, cost, price, img } = req.body;
  try {
    const result = await pool.query(`
      UPDATE productos 
      SET name = $1, sku = $2, category = $3, stock = $4, min_stock = $5, cost = $6, price = $7, img = $8, updated_at = CURRENT_TIMESTAMP
      WHERE id = $9
      RETURNING *
    `, [name, sku, category, parseInt(stock) || 0, parseInt(minStock) || 0, parseFloat(cost) || 0, parseFloat(price) || 0, img || null, id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json({ id, name, sku, category, stock, minStock, cost, price, img });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar producto' });
  }
});

// Eliminar producto
app.delete('/api/productos/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM productos WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json({ message: 'Producto eliminado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar producto' });
  }
});


// ========================================
// ENDPOINTS: CLIENTES (CRUD)
// ========================================

// Listar clientes
app.get('/api/clientes', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM clientes ORDER BY name ASC');
    const clis = result.rows.map(r => ({
      id: r.id,
      name: r.name,
      type: r.type,
      nit: r.nit,
      nrc: r.nrc,
      dui: r.dui,
      phone: r.phone,
      email: r.email,
      total: parseFloat(r.total),
      lastBuy: r.last_buy
    }));
    res.json(clis);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener clientes' });
  }
});

// Crear cliente
app.post('/api/clientes', async (req, res) => {
  const { name, type, nit, nrc, dui, phone, email } = req.body;
  const id = crypto.randomUUID();
  try {
    await pool.query(`
      INSERT INTO clientes (id, name, type, nit, nrc, dui, phone, email, total, last_buy)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, NULL)
    `, [id, name, type || 'natural', nit || null, nrc || null, dui || null, phone || null, email || null]);
    
    res.status(201).json({ id, name, type, nit, nrc, dui, phone, email, total: 0, lastBuy: null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear cliente' });
  }
});

// Actualizar cliente
app.put('/api/clientes/:id', async (req, res) => {
  const { id } = req.params;
  const { name, type, nit, nrc, dui, phone, email } = req.body;
  try {
    const result = await pool.query(`
      UPDATE clientes 
      SET name = $1, type = $2, nit = $3, nrc = $4, dui = $5, phone = $6, email = $7
      WHERE id = $8
      RETURNING *
    `, [name, type || 'natural', nit || null, nrc || null, dui || null, phone || null, email || null, id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    res.json({ id, name, type, nit, nrc, dui, phone, email });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar cliente' });
  }
});

// Eliminar cliente
app.delete('/api/clientes/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM clientes WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    res.json({ message: 'Cliente eliminado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar cliente' });
  }
});


// ========================================
// ENDPOINT: TRANSACCION DE VENTA
// ========================================
app.post('/api/ventas', async (req, res) => {
  const { total, payMethod, dteStatus, dteType, cart, customer, rawDteJson } = req.body;
  
  if (!cart || !Array.isArray(cart) || cart.length === 0) {
    return res.status(400).json({ error: 'El carrito de compras está vacío' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Crear el registro de venta
    const saleId = crypto.randomUUID();
    await client.query(`
      INSERT INTO ventas (id, total, pay_method, dte_status, dte_type, raw_dte_json)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [saleId, parseFloat(total) || 0.00, payMethod, dteStatus, dteType, JSON.stringify(rawDteJson || {})]);

    // 2. Decrementar el stock de los productos
    for (const item of cart) {
      const productId = item.product.id;
      const qty = parseInt(item.qty) || 1;

      const prodRes = await client.query('SELECT stock, name FROM productos WHERE id = $1', [productId]);
      if (prodRes.rowCount === 0) {
        throw new Error(`Producto no encontrado en inventario: ${productId}`);
      }

      const currentStock = parseInt(prodRes.rows[0].stock);
      const productName = prodRes.rows[0].name;

      if (currentStock < qty) {
        throw new Error(`Stock insuficiente para ${productName} (Solicitado: ${qty}, Disponible: ${currentStock})`);
      }

      await client.query(`
        UPDATE productos 
        SET stock = stock - $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [qty, productId]);
    }

    // 3. Actualizar cliente si aplica
    if (customer && customer.id) {
      const today = new Date().toLocaleDateString("es-SV", { day: '2-digit', month: '2-digit', year: 'numeric' });
      await client.query(`
        UPDATE clientes
        SET total = total + $1, last_buy = $2
        WHERE id = $3
      `, [parseFloat(total) || 0.00, today, customer.id]);
    }

    await client.query('COMMIT');
    res.status(201).json({ exito: true, id: saleId });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error procesando transacción de venta:', err.message);
    res.status(500).json({ error: err.message || 'Error interno al procesar la venta' });
  } finally {
    client.release();
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor API corriendo en http://localhost:${PORT}`);
});
