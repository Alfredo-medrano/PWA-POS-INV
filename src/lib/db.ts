import { Pool } from 'pg';

let pool: Pool;

const connectionString = process.env.DATABASE_URL;

if (process.env.NODE_ENV === 'production') {
  pool = new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false,
    },
  });
} else {
  if (!(global as any).pool) {
    (global as any).pool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false,
      },
    });
  }
  pool = (global as any).pool;
}

// Inicializar tablas e incorporar columnas nuevas
async function initDatabase() {
  const client = await pool.connect();
  try {
    console.log('🔄 Verificando e inicializando tablas en Neon...');
    
    // 1. Productos
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

    // Migración: agregar barcode si no existe
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE productos ADD COLUMN IF NOT EXISTS barcode VARCHAR(100);
      EXCEPTION WHEN OTHERS THEN NULL;
      END $$;
    `);

    // 2. Clientes
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

    // Migración: agregar address si no existe
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE clientes ADD COLUMN IF NOT EXISTS address TEXT;
      EXCEPTION WHEN OTHERS THEN NULL;
      END $$;
    `);

    // 3. Ventas
    await client.query(`
      CREATE TABLE IF NOT EXISTS ventas (
        id VARCHAR(36) PRIMARY KEY,
        total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        pay_method VARCHAR(50) NOT NULL,
        dte_status VARCHAR(50) NOT NULL,
        dte_type VARCHAR(50) NOT NULL,
        customer_id VARCHAR(36),
        customer_name VARCHAR(255),
        raw_dte_json JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      DO $$ BEGIN
        ALTER TABLE ventas ADD COLUMN IF NOT EXISTS customer_id VARCHAR(36);
        ALTER TABLE ventas ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);
      EXCEPTION WHEN OTHERS THEN NULL;
      END $$;
    `);

    // 4. Configuracion
    await client.query(`
      CREATE TABLE IF NOT EXISTS configuracion (
        id VARCHAR(50) PRIMARY KEY,
        biz_name VARCHAR(255) NOT NULL,
        biz_type VARCHAR(100),
        biz_phone VARCHAR(50),
        biz_address TEXT,
        dte_url TEXT,
        dte_key TEXT,
        apertura_caja DECIMAL(12,2) NOT NULL DEFAULT 200.00,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      DO $$ BEGIN
        ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS apertura_caja DECIMAL(12,2) NOT NULL DEFAULT 200.00;
      EXCEPTION WHEN OTHERS THEN NULL;
      END $$;
    `);

    // 5. Usuarios
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

    // 6. Proveedores
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

    // 7. Compras
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

    console.log('✅ Base de datos inicializada/actualizada.');
  } catch (err) {
    console.error('❌ Error inicializando base de datos:', err);
  } finally {
    client.release();
  }
}

// Ejecutar migración de forma asíncrona sin bloquear la importación
initDatabase().catch(err => console.error("Error al iniciar DB:", err));

export default pool;
