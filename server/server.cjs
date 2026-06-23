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

    // 4. Tabla de Configuracion (Ajustes de negocio y DTE)
    await client.query(`
      CREATE TABLE IF NOT EXISTS configuracion (
        id VARCHAR(50) PRIMARY KEY,
        biz_name VARCHAR(255) NOT NULL,
        biz_type VARCHAR(100),
        biz_phone VARCHAR(50),
        biz_address TEXT,
        dte_url TEXT,
        dte_key TEXT,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 5. Tabla de Usuarios (Cajeros y Administradores)
    await client.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'Cajero',
        status VARCHAR(50) NOT NULL DEFAULT 'Activo',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 6. Tabla de Proveedores
    await client.query(`
      CREATE TABLE IF NOT EXISTS proveedores (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        nrc VARCHAR(50),
        email VARCHAR(255),
        last_buy VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 7. Tabla de Compras (Abastecimiento de stock)
    await client.query(`
      CREATE TABLE IF NOT EXISTS compras (
        id VARCHAR(36) PRIMARY KEY,
        supplier_id VARCHAR(36),
        supplier_name VARCHAR(255) NOT NULL,
        items_count INTEGER DEFAULT 0,
        total DECIMAL(12,2) DEFAULT 0.00,
        status VARCHAR(50) NOT NULL DEFAULT 'Pendiente',
        items_json JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Estructura de tablas inicializada.');

    // No realizamos semillado automático para permitir una inicialización limpia desde cero
    console.log('🌱 Base de datos vacía lista para el registro del negocio.');

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


// ========================================
// ENDPOINTS: AUTENTICACION
// ========================================
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const hashedPw = crypto.createHash('sha256').update(password).digest('hex');
    const result = await pool.query('SELECT * FROM usuarios WHERE email = $1 AND password = $2', [email, hashedPw]);
    if (result.rowCount === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas o usuario inactivo' });
    }
    const u = result.rows[0];
    if (u.status !== 'Activo') {
      return res.status(403).json({ error: 'El usuario está inactivo' });
    }
    res.json({ id: u.id, name: u.name, email: u.email, role: u.role, status: u.status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error en inicio de sesión' });
  }
});

// ========================================
// ENDPOINTS: CONFIGURACION (NEGOCIO)
// ========================================
app.get('/api/configuracion', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM configuracion LIMIT 1');
    if (result.rowCount === 0) {
      return res.json({});
    }
    const r = result.rows[0];
    res.json({
      bizName: r.biz_name,
      bizType: r.biz_type,
      bizPhone: r.biz_phone,
      bizAddress: r.biz_address,
      dteUrl: r.dte_url,
      dteKey: r.dte_key
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener configuración' });
  }
});

app.post('/api/configuracion', async (req, res) => {
  const { bizName, bizType, bizPhone, bizAddress, dteUrl, dteKey } = req.body;
  try {
    const check = await pool.query('SELECT id FROM configuracion LIMIT 1');
    if (check.rowCount > 0) {
      const id = check.rows[0].id;
      await pool.query(`
        UPDATE configuracion
        SET biz_name = $1, biz_type = $2, biz_phone = $3, biz_address = $4, dte_url = $5, dte_key = $6, updated_at = CURRENT_TIMESTAMP
        WHERE id = $7
      `, [bizName, bizType || null, bizPhone || null, bizAddress || null, dteUrl || null, dteKey || null, id]);
      res.json({ success: true, message: 'Configuración actualizada' });
    } else {
      const id = 'single';
      await pool.query(`
        INSERT INTO configuracion (id, biz_name, biz_type, biz_phone, biz_address, dte_url, dte_key)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [id, bizName, bizType || null, bizPhone || null, bizAddress || null, dteUrl || null, dteKey || null]);
      res.status(201).json({ success: true, message: 'Configuración creada' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al guardar configuración' });
  }
});

// ========================================
// ENDPOINTS: USUARIOS (CRUD)
// ========================================
app.get('/api/usuarios', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email, role, status FROM usuarios ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

app.post('/api/usuarios', async (req, res) => {
  const { name, email, password, role, status } = req.body;
  const id = crypto.randomUUID();
  try {
    const hashedPw = crypto.createHash('sha256').update(password).digest('hex');
    await pool.query(`
      INSERT INTO usuarios (id, name, email, password, role, status)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [id, name, email, hashedPw, role || 'Cajero', status || 'Activo']);
    res.status(201).json({ id, name, email, role, status });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
      res.status(400).json({ error: 'El correo electrónico ya está en uso' });
    } else {
      res.status(500).json({ error: 'Error al crear usuario' });
    }
  }
});

app.put('/api/usuarios/:id', async (req, res) => {
  const { id } = req.params;
  const { name, email, password, role, status } = req.body;
  try {
    let query = `
      UPDATE usuarios
      SET name = $1, email = $2, role = $3, status = $4
      WHERE id = $5
      RETURNING id, name, email, role, status
    `;
    let params = [name, email, role, status, id];
    
    if (password) {
      const hashedPw = crypto.createHash('sha256').update(password).digest('hex');
      query = `
        UPDATE usuarios
        SET name = $1, email = $2, role = $3, status = $4, password = $5
        WHERE id = $6
        RETURNING id, name, email, role, status
      `;
      params = [name, email, role, status, hashedPw, id];
    }
    
    const result = await pool.query(query, params);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
});

app.delete('/api/usuarios/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM usuarios WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json({ message: 'Usuario eliminado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
});

// ========================================
// ENDPOINTS: PROVEEDORES (CRUD)
// ========================================
app.get('/api/proveedores', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM proveedores ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener proveedores' });
  }
});

app.post('/api/proveedores', async (req, res) => {
  const { name, phone, nrc, email } = req.body;
  const id = crypto.randomUUID();
  try {
    await pool.query(`
      INSERT INTO proveedores (id, name, phone, nrc, email, last_buy)
      VALUES ($1, $2, $3, $4, $5, NULL)
    `, [id, name, phone || null, nrc || null, email || null]);
    res.status(201).json({ id, name, phone, nrc, email, last_buy: null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear proveedor' });
  }
});

app.put('/api/proveedores/:id', async (req, res) => {
  const { id } = req.params;
  const { name, phone, nrc, email } = req.body;
  try {
    const result = await pool.query(`
      UPDATE proveedores
      SET name = $1, phone = $2, nrc = $3, email = $4
      WHERE id = $5
      RETURNING *
    `, [name, phone || null, nrc || null, email || null, id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Proveedor no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar proveedor' });
  }
});

app.delete('/api/proveedores/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM proveedores WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Proveedor no encontrado' });
    }
    res.json({ message: 'Proveedor eliminado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar proveedor' });
  }
});

// ========================================
// ENDPOINTS: COMPRAS (ORDENES)
// ========================================
app.get('/api/compras', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM compras ORDER BY created_at DESC');
    const list = result.rows.map(r => ({
      id: r.id,
      supplierId: r.supplier_id,
      sup: r.supplier_name,
      date: new Date(r.created_at).toLocaleDateString("es-SV", { day: '2-digit', month: '2-digit', year: 'numeric' }),
      n: parseInt(r.items_count),
      total: parseFloat(r.total),
      s: r.status,
      items: r.items_json
    }));
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener compras' });
  }
});

app.post('/api/compras', async (req, res) => {
  const { supplierId, supplierName, items, status, total } = req.body;
  const id = `OC-${Math.floor(100 + Math.random() * 900)}`;
  const itemsCount = items.reduce((s, i) => s + parseInt(i.qty), 0);
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    await client.query(`
      INSERT INTO compras (id, supplier_id, supplier_name, items_count, total, status, items_json)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [id, supplierId, supplierName, itemsCount, parseFloat(total) || 0.00, status || 'Pendiente', JSON.stringify(items)]);

    if (status === 'Recibida') {
      for (const item of items) {
        await client.query(`
          UPDATE productos
          SET stock = stock + $1, cost = $2, updated_at = CURRENT_TIMESTAMP
          WHERE id = $3
        `, [parseInt(item.qty), parseFloat(item.cost), item.productId]);
      }
      
      const today = new Date().toLocaleDateString("es-SV", { day: '2-digit', month: '2-digit', year: 'numeric' });
      await client.query(`
        UPDATE proveedores
        SET last_buy = $1
        WHERE id = $2
      `, [today, supplierId]);
    }

    await client.query('COMMIT');
    res.status(201).json({ id, supplierId, supplierName, itemsCount, total, status });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Error al registrar compra' });
  } finally {
    client.release();
  }
});

app.put('/api/compras/:id/recepcion', async (req, res) => {
  const { id } = req.params;
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const compRes = await client.query('SELECT * FROM compras WHERE id = $1', [id]);
    if (compRes.rowCount === 0) {
      throw new Error('Orden de compra no encontrada');
    }
    
    const c = compRes.rows[0];
    if (c.status === 'Recibida') {
      throw new Error('La orden ya fue recibida anteriormente');
    }
    
    await client.query('UPDATE compras SET status = \'Recibida\' WHERE id = $1', [id]);
    
    const items = c.items_json || [];
    for (const item of items) {
      await client.query(`
        UPDATE productos
        SET stock = stock + $1, cost = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `, [parseInt(item.qty), parseFloat(item.cost), item.product_id || item.productId]);
    }
    
    if (c.supplier_id) {
      const today = new Date().toLocaleDateString("es-SV", { day: '2-digit', month: '2-digit', year: 'numeric' });
      await client.query(`
        UPDATE proveedores
        SET last_buy = $1
        WHERE id = $2
      `, [today, c.supplier_id]);
    }

    await client.query('COMMIT');
    res.json({ success: true, message: 'Orden de compra recibida con éxito' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: err.message || 'Error al recibir compra' });
  } finally {
    client.release();
  }
});

// ========================================
// ENDPOINTS: ANALITICAS (DASHBOARD & REPORTS)
// ========================================
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const salesRes = await pool.query(`
      SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as count 
      FROM ventas 
      WHERE created_at >= $1
    `, [startOfToday]);
    const salesToday = parseFloat(salesRes.rows[0].total);
    const txCount = parseInt(salesRes.rows[0].count);

    const recentRes = await pool.query(`
      SELECT total, pay_method, raw_dte_json, created_at
      FROM ventas
      ORDER BY created_at DESC
      LIMIT 5
    `);
    const recent = recentRes.rows.map(r => {
      const time = new Date(r.created_at).toLocaleTimeString("es-SV", { hour: '2-digit', minute: '2-digit', hour12: false });
      const cashierName = r.raw_dte_json?.cajeroName || "Cajero General";
      return {
        time,
        cashier: cashierName,
        amount: parseFloat(r.total),
        method: r.pay_method
      };
    });

    const allTodaySales = await pool.query(`
      SELECT total, created_at 
      FROM ventas 
      WHERE created_at >= $1
    `, [startOfToday]);

    const hourlyMap = {
      "7am": 0, "8am": 0, "9am": 0, "10am": 0, "11am": 0, "12pm": 0,
      "1pm": 0, "2pm": 0, "3pm": 0, "4pm": 0, "5pm": 0, "6pm": 0
    };

    allTodaySales.rows.forEach(s => {
      const date = new Date(s.created_at);
      const hour = date.getHours();
      let label = "";
      if (hour === 7) label = "7am";
      else if (hour === 8) label = "8am";
      else if (hour === 9) label = "9am";
      else if (hour === 10) label = "10am";
      else if (hour === 11) label = "11am";
      else if (hour === 12) label = "12pm";
      else if (hour === 13) label = "1pm";
      else if (hour === 14) label = "2pm";
      else if (hour === 15) label = "3pm";
      else if (hour === 16) label = "4pm";
      else if (hour === 17) label = "5pm";
      else if (hour === 18) label = "6pm";
      
      if (label) {
        hourlyMap[label] += parseFloat(s.total);
      }
    });

    const hourly = Object.keys(hourlyMap).map(k => ({ h: k, v: parseFloat(hourlyMap[k].toFixed(2)) }));

    let productCounts = {};
    allTodaySales.rows.forEach(s => {
      const details = s.raw_dte_json?.detalles || [];
      details.forEach(d => {
        const name = d.descripcion;
        const qty = parseInt(d.cantidad) || 0;
        productCounts[name] = (productCounts[name] || 0) + qty;
      });
    });

    let topProduct = "Ninguno";
    let topProductSales = 0;
    Object.keys(productCounts).forEach(name => {
      if (productCounts[name] > topProductSales) {
        topProduct = name;
        topProductSales = productCounts[name];
      }
    });

    res.json({
      salesToday,
      txCount,
      topProduct: topProductSales > 0 ? `${topProduct} — ${topProductSales} ventas` : "Ninguno — 0 ventas",
      recent,
      hourly
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener estadísticas del dashboard' });
  }
});

app.get('/api/reportes/ventas', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT created_at, total FROM ventas
      WHERE created_at >= NOW() - INTERVAL '6 months'
      ORDER BY created_at ASC
    `);

    const monthsShort = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const monthlyMap = {};

    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const mLabel = monthsShort[d.getMonth()];
      monthlyMap[mLabel] = 0;
    }

    result.rows.forEach(r => {
      const mLabel = monthsShort[new Date(r.created_at).getMonth()];
      if (monthlyMap[mLabel] !== undefined) {
        monthlyMap[mLabel] += parseFloat(r.total);
      }
    });

    const monthly = Object.keys(monthlyMap).map(k => ({ m: k, v: parseFloat(monthlyMap[k].toFixed(2)) }));

    res.json(monthly);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener reportes mensuales' });
  }
});

app.get('/api/reportes/productos-top', async (req, res) => {
  try {
    const result = await pool.query('SELECT raw_dte_json, total FROM ventas');
    const productAgg = {};

    result.rows.forEach(r => {
      const details = r.raw_dte_json?.detalles || [];
      details.forEach(d => {
        const name = d.descripcion;
        const qty = parseInt(d.cantidad) || 0;
        const rev = parseFloat(d.monto) || 0;
        if (!productAgg[name]) {
          productAgg[name] = { u: 0, rev: 0 };
        }
        productAgg[name].u += qty;
        productAgg[name].rev += rev;
      });
    });

    const list = Object.keys(productAgg).map(name => ({
      name,
      u: productAgg[name].u,
      rev: parseFloat(productAgg[name].rev.toFixed(2))
    }))
    .sort((a, b) => b.u - a.u)
    .slice(0, 5);

    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener productos más vendidos' });
  }
});

app.get('/api/reportes/corte-caja', async (req, res) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0,0,0,0);

    const result = await pool.query(`
      SELECT total, pay_method 
      FROM ventas 
      WHERE created_at >= $1
    `, [startOfToday]);

    let apertura = 200.00;
    let cash = 0.00;
    let card = 0.00;
    let transfer = 0.00;
    let egresos = 0.00;

    result.rows.forEach(r => {
      const t = parseFloat(r.total);
      if (r.pay_method === 'Efectivo') cash += t;
      else if (r.pay_method === 'Tarjeta') card += t;
      else if (r.pay_method === 'Transferencia') transfer += t;
    });

    const totalEsperado = apertura + cash + card + transfer - egresos;

    res.json([
      { l: "Apertura",         v: apertura,    c: "" },
      { l: "Ventas efectivo",  v: cash,    c: "" },
      { l: "Ventas tarjeta",   v: card,    c: "" },
      { l: "Transferencias",   v: transfer,    c: "" },
      { l: "Egresos",          v: -egresos,    c: "text-red-600" },
      { l: "Total esperado",   v: totalEsperado,   c: "text-[#1B4FD8]" },
    ]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener corte de caja' });
  }
});

// ========================================
// ENDPOINTS: SETUP Y MANTENIMIENTO (SISTEMA DESDE CERO)
// ========================================

// Obtener estado del setup
app.get('/api/setup/status', async (req, res) => {
  try {
    const configRes = await pool.query('SELECT COUNT(*) FROM configuracion');
    const userRes = await pool.query('SELECT COUNT(*) FROM usuarios');
    res.json({
      isConfigured: parseInt(configRes.rows[0].count) > 0,
      hasUsers: parseInt(userRes.rows[0].count) > 0
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener estado de configuración' });
  }
});

// Registrar empresa y administrador inicial (con opción de semillado demo)
app.post('/api/setup/register', async (req, res) => {
  const {
    bizName, bizType, bizPhone, bizAddress, dteUrl, dteKey,
    adminName, adminEmail, adminPassword, seedDemo
  } = req.body;

  if (!bizName || !adminName || !adminEmail || !adminPassword) {
    return res.status(400).json({ error: 'El nombre del negocio, nombre de administrador, correo y contraseña son campos obligatorios.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Crear o actualizar la configuración
    const configId = 'single';
    await client.query(`
      INSERT INTO configuracion (id, biz_name, biz_type, biz_phone, biz_address, dte_url, dte_key)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE 
      SET biz_name = $2, biz_type = $3, biz_phone = $4, biz_address = $5, dte_url = $6, dte_key = $7, updated_at = CURRENT_TIMESTAMP
    `, [configId, bizName, bizType || null, bizPhone || null, bizAddress || null, dteUrl || null, dteKey || null]);

    // 2. Crear el primer administrador
    const adminId = crypto.randomUUID();
    const hashedPw = crypto.createHash('sha256').update(adminPassword).digest('hex');
    await client.query(`
      INSERT INTO usuarios (id, name, email, password, role, status)
      VALUES ($1, $2, $3, $4, 'Administrador', 'Activo')
      ON CONFLICT (email) DO NOTHING
    `, [adminId, adminName, adminEmail, hashedPw]);

    // 3. Sembrar datos demo opcionalmente
    if (seedDemo) {
      console.log('🌱 Sembrando datos demo solicitados por el onboarding...');
      
      // Productos
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
          ON CONFLICT (sku) DO NOTHING
        `, p);
      }

      // Clientes
      const mockCustomers = [
        ["1", "María López Díaz", "natural", "0614-010180-101-3", "12345-6", "01234567-8", "7888-1234", "maria@empresa.com.sv", 4580.00, "20/06/2025"],
        ["2", "Distribuidora San Miguel S.A.", "juridica", "0614-150590-102-1", "98765-4", null, "2222-3344", "compras@distsanmiguel.com.sv", 18420.50, "21/06/2025"],
        ["3", "Carlos Mendez Ramos", "natural", null, null, "02345678-9", "7755-9988", "carlos.m@gmail.com", 890.75, "18/06/2025"]
      ];
      for (const c of mockCustomers) {
        await client.query(`
          INSERT INTO clientes (id, name, type, nit, nrc, dui, phone, email, total, last_buy)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (id) DO NOTHING
        `, c);
      }

      // Proveedores
      const mockSuppliers = [
        ["1", "Distribuidora Central", "2222-4455", "11223-4", "contacto@distcentral.com.sv", "20/06/2025"],
        ["2", "Proveedor Lácteos SV", "7788-9900", "55667-8", "ventas@lacteos.com.sv", "18/06/2025"],
        ["3", "Bebidas del Norte", "2233-1122", "99001-2", "pedidos@bebidasnorte.com.sv", "15/06/2025"]
      ];
      for (const s of mockSuppliers) {
        await client.query(`
          INSERT INTO proveedores (id, name, phone, nrc, email, last_buy)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (id) DO NOTHING
        `, s);
      }

      // Compras
      const mockPurchases = [
        ["OC-001", "1", "Distribuidora Central", 8, 450.80, "Recibida", JSON.stringify([{ product_id: "1", product_name: "Coca-Cola 2L", price: 1.20, qty: 375 }])],
        ["OC-002", "2", "Proveedor Lácteos SV", 4, 180.00, "Pendiente", JSON.stringify([{ product_id: "3", product_name: "Leche Entera 1L", price: 0.90, qty: 200 }])],
        ["OC-003", "3", "Bebidas del Norte", 12, 890.50, "Recibida", JSON.stringify([{ product_id: "7", product_name: "Pepsi 2L", price: 1.10, qty: 810 }])]
      ];
      for (const cp of mockPurchases) {
        await client.query(`
          INSERT INTO compras (id, supplier_id, supplier_name, items_count, total, status, items_json)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (id) DO NOTHING
        `, cp);
      }
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      user: {
        id: adminId,
        name: adminName,
        email: adminEmail,
        role: 'Administrador',
        status: 'Activo'
      }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al registrar negocio y admin inicial:', err);
    res.status(500).json({ error: 'Error interno en el servidor al registrar el negocio.' });
  } finally {
    client.release();
  }
});

// Sembrar datos demo individualmente
app.post('/api/setup/seed', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Productos
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
        ON CONFLICT (sku) DO NOTHING
      `, p);
    }

    // Clientes
    const mockCustomers = [
      ["1", "María López Díaz", "natural", "0614-010180-101-3", "12345-6", "01234567-8", "7888-1234", "maria@empresa.com.sv", 4580.00, "20/06/2025"],
      ["2", "Distribuidora San Miguel S.A.", "juridica", "0614-150590-102-1", "98765-4", null, "2222-3344", "compras@distsanmiguel.com.sv", 18420.50, "21/06/2025"],
      ["3", "Carlos Mendez Ramos", "natural", null, null, "02345678-9", "7755-9988", "carlos.m@gmail.com", 890.75, "18/06/2025"]
    ];
    for (const c of mockCustomers) {
      await client.query(`
        INSERT INTO clientes (id, name, type, nit, nrc, dui, phone, email, total, last_buy)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO NOTHING
      `, c);
    }

    // Proveedores
    const mockSuppliers = [
      ["1", "Distribuidora Central", "2222-4455", "11223-4", "contacto@distcentral.com.sv", "20/06/2025"],
      ["2", "Proveedor Lácteos SV", "7788-9900", "55667-8", "ventas@lacteos.com.sv", "18/06/2025"],
      ["3", "Bebidas del Norte", "2233-1122", "99001-2", "pedidos@bebidasnorte.com.sv", "15/06/2025"]
    ];
    for (const s of mockSuppliers) {
      await client.query(`
        INSERT INTO proveedores (id, name, phone, nrc, email, last_buy)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO NOTHING
      `, s);
    }

    // Compras
    const mockPurchases = [
      ["OC-001", "1", "Distribuidora Central", 8, 450.80, "Recibida", JSON.stringify([{ product_id: "1", product_name: "Coca-Cola 2L", price: 1.20, qty: 375 }])],
      ["OC-002", "2", "Proveedor Lácteos SV", 4, 180.00, "Pendiente", JSON.stringify([{ product_id: "3", product_name: "Leche Entera 1L", price: 0.90, qty: 200 }])],
      ["OC-003", "3", "Bebidas del Norte", 12, 890.50, "Recibida", JSON.stringify([{ product_id: "7", product_name: "Pepsi 2L", price: 1.10, qty: 810 }])]
    ];
    for (const cp of mockPurchases) {
      await client.query(`
        INSERT INTO compras (id, supplier_id, supplier_name, items_count, total, status, items_json)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO NOTHING
      `, cp);
    }

    await client.query('COMMIT');
    res.json({ success: true, message: 'Datos demo sembrados con éxito.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al sembrar datos demo:', err);
    res.status(500).json({ error: 'Error al sembrar datos demo.' });
  } finally {
    client.release();
  }
});

// Restablecer/limpiar la base de datos completa
app.post('/api/setup/reset', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Truncar todas las tablas
    await client.query('TRUNCATE TABLE ventas, compras, productos, clientes, proveedores, configuracion, usuarios CASCADE');
    
    await client.query('COMMIT');
    res.json({ success: true, message: 'Base de datos restablecida completamente' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al restablecer la base de datos:', err);
    res.status(500).json({ error: 'Error al restablecer la base de datos.' });
  } finally {
    client.release();
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor API corriendo en http://localhost:${PORT}`);
});
