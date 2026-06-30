import { Pool } from 'pg';
import { getTenantId } from './tenant';

const connectionString = process.env.DATABASE_URL;

let rawPool: Pool;

const poolConfig = {
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

if (process.env.NODE_ENV === 'production') {
  rawPool = new Pool(poolConfig);
} else {
  if (!(global as any).pool) {
    (global as any).pool = new Pool(poolConfig);
  }
  rawPool = (global as any).pool;
}

// Inicializar tablas e incorporar columnas nuevas con multitenancy y RLS
async function initDatabase() {
  const client = await rawPool.connect();
  
  const runQuery = async (label: string, queryText: string, params?: any[]) => {
    try {
      await client.query(queryText, params);
    } catch (e: any) {
      // 42701 = column already exists, 42P07 = relation already exists, 42710 = constraint already exists
      if (e.code === '42701' || e.code === '42P07' || e.code === '42710') {
        return;
      }
      console.warn(`⚠️ Warning during [${label}]: ${e.message} (code: ${e.code})`);
    }
  };

  try {
    console.log('🔄 Verificando e inicializando tablas en Neon con soporte SaaS...');
    
    // 0. Crear tabla de Tenants
    await runQuery('Create tenants', `
      CREATE TABLE IF NOT EXISTS tenants (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL,
        plan VARCHAR(50) NOT NULL DEFAULT 'demo',
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        trial_ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Inserción de inquilino inicial por defecto para compatibilidad
    await runQuery('Insert default tenant', `
      INSERT INTO tenants (id, name, slug, plan, status, trial_ends_at)
      VALUES ('single', 'Negocio Inicial', 'inicial', 'demo', 'active', NOW() + INTERVAL '15 days')
      ON CONFLICT (id) DO NOTHING
    `);

    // 1. Productos
    await runQuery('Create productos', `
      CREATE TABLE IF NOT EXISTS productos (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        sku VARCHAR(100) NOT NULL,
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

    await runQuery('Add barcode to productos', `
      ALTER TABLE productos ADD COLUMN IF NOT EXISTS barcode VARCHAR(100);
    `);

    // 2. Clientes
    await runQuery('Create clientes', `
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

    await runQuery('Add address to clientes', `
      ALTER TABLE clientes ADD COLUMN IF NOT EXISTS address TEXT;
    `);

    // 3. Ventas
    await runQuery('Create ventas', `
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

    await runQuery('Add customer columns to ventas', `
      ALTER TABLE ventas ADD COLUMN IF NOT EXISTS customer_id VARCHAR(36);
      ALTER TABLE ventas ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);
    `);

    // 4. Configuracion
    await runQuery('Create configuracion', `
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

    await runQuery('Add apertura_caja to configuracion', `
      ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS apertura_caja DECIMAL(12,2) NOT NULL DEFAULT 200.00;
    `);

    // 5. Usuarios
    await runQuery('Create usuarios', `
      CREATE TABLE IF NOT EXISTS usuarios (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'Cajero',
        status VARCHAR(50) NOT NULL DEFAULT 'Activo',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 6. Proveedores
    await runQuery('Create proveedores', `
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
    await runQuery('Create compras', `
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

    // 8. Egresos
    await runQuery('Create egresos', `
      CREATE TABLE IF NOT EXISTS egresos (
        id VARCHAR(36) PRIMARY KEY,
        amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        concept TEXT NOT NULL,
        user_id VARCHAR(36),
        user_name VARCHAR(255),
        deleted_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 9. Cortes de caja
    await runQuery('Create cortes_caja', `
      CREATE TABLE IF NOT EXISTS cortes_caja (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        apertura DECIMAL(12,2),
        efectivo_esperado DECIMAL(12,2),
        efectivo_contado DECIMAL(12,2),
        diferencia DECIMAL(12,2),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 10. Movimientos de inventario
    await runQuery('Create movimientos_inventario', `
      CREATE TABLE IF NOT EXISTS movimientos_inventario (
        id VARCHAR(36) PRIMARY KEY,
        product_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        tipo VARCHAR(20) NOT NULL,
        delta INTEGER NOT NULL,
        motivo TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Migraciones adicionales de esquema y constraints compuestos
    await runQuery('Drop productos_sku_key', `ALTER TABLE productos DROP CONSTRAINT IF EXISTS productos_sku_key`);
    await runQuery('Drop productos_tenant_sku_key', `ALTER TABLE productos DROP CONSTRAINT IF EXISTS productos_tenant_sku_key`);
    await runQuery('Create index ux_productos_tenant_sku', `CREATE UNIQUE INDEX IF NOT EXISTS ux_productos_tenant_sku ON productos (tenant_id, sku)`);
    await runQuery('Drop usuarios_email_key', `ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_email_key`);
    await runQuery('Create index ux_usuarios_tenant_email', `CREATE UNIQUE INDEX IF NOT EXISTS ux_usuarios_tenant_email ON usuarios (tenant_id, email)`);
    
    // Add egresos columns
    await runQuery('Add user_id to egresos', `ALTER TABLE egresos ADD COLUMN IF NOT EXISTS user_id VARCHAR(36)`);
    await runQuery('Add user_name to egresos', `ALTER TABLE egresos ADD COLUMN IF NOT EXISTS user_name VARCHAR(255)`);
    await runQuery('Add deleted_at to egresos', `ALTER TABLE egresos ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE`);

    // --- MIGRACIÓN MULTITENANT ---
    const tablesToMigrate = ['productos', 'clientes', 'ventas', 'configuracion', 'usuarios', 'proveedores', 'compras', 'egresos', 'cortes_caja', 'movimientos_inventario'];
    
    for (const table of tablesToMigrate) {
      await runQuery(`Add tenant_id to ${table}`, `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(36)`);
      await runQuery(`Set default tenant_id on ${table}`, `UPDATE ${table} SET tenant_id = 'single' WHERE tenant_id IS NULL`);
      await runQuery(`Alter tenant_id default on ${table}`, `ALTER TABLE ${table} ALTER COLUMN tenant_id SET DEFAULT current_setting('app.current_tenant_id', true)`);
      await runQuery(`Alter tenant_id not null on ${table}`, `ALTER TABLE ${table} ALTER COLUMN tenant_id SET NOT NULL`);
      await runQuery(`Add FK fk_tenant on ${table}`, `ALTER TABLE ${table} ADD CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE`);
      await runQuery(`Enable RLS on ${table}`, `ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
      await runQuery(`Force RLS on ${table}`, `ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`);
      await runQuery(`Drop policy on ${table}`, `DROP POLICY IF EXISTS tenant_isolation_policy ON ${table}`);
      await runQuery(`Create policy on ${table}`, `
        CREATE POLICY tenant_isolation_policy ON ${table}
          USING (tenant_id = current_setting('app.current_tenant_id', true));
      `);
    }

    // Migración de idempotency_key
    await runQuery('Add idempotency_key to ventas', `ALTER TABLE ventas ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(36)`);
    await runQuery('Create index ux_ventas_tenant_idempotency', `
      CREATE UNIQUE INDEX IF NOT EXISTS ux_ventas_tenant_idempotency
      ON ventas (tenant_id, idempotency_key)
      WHERE idempotency_key IS NOT NULL
    `);

    // 8. Crear función SECURITY DEFINER para lookup de usuarios sin RLS (utilizada en login global)
    await runQuery('Create get_user_by_email function', `
      CREATE OR REPLACE FUNCTION get_user_by_email(p_email VARCHAR)
      RETURNS TABLE (
        id VARCHAR,
        name VARCHAR,
        email VARCHAR,
        password VARCHAR,
        role VARCHAR,
        status VARCHAR,
        tenant_id VARCHAR
      ) 
      SECURITY DEFINER
      AS $$
      BEGIN
        RETURN QUERY 
        SELECT u.id, u.name, u.email, u.password, u.role, u.status, u.tenant_id
        FROM usuarios u
        WHERE u.email = p_email;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await runQuery('Grant execute on get_user_by_email', `
      GRANT EXECUTE ON FUNCTION get_user_by_email(VARCHAR) TO pos_app_user;
    `);

    console.log('✅ Base de datos inicializada.');
  } catch (err: any) {
    console.error('❌ Error crítico inicializando base de datos:', err);
  } finally {
    client.release();
  }
}

// Ejecutar migración de forma asíncrona sin bloquear la importación
initDatabase().catch(err => console.error("Error al iniciar DB:", err));

// Crear Proxy sobre rawPool para inyectar automáticamente el tenant_id en RLS
const pool = new Proxy(rawPool, {
  get(target, prop, receiver) {
    if (prop === 'query') {
      return async function(text: any, params?: any[]) {
        const tenantId = getTenantId();
        if (tenantId) {
          // Obtener un cliente del proxy (lo que invoca el método connect envuelto abajo)
          const client = await receiver.connect();
          try {
            return await client.query(text, params);
          } finally {
            client.release();
          }
        } else {
          return target.query(text, params);
        }
      };
    }
    if (prop === 'connect') {
      return async function() {
        const client = await target.connect();
        const tenantId = getTenantId();
        
        try {
          if (tenantId) {
            if ((client as any)._lastTenantId !== tenantId) {
              await client.query(`SELECT set_config('app.current_tenant_id', $1, false)`, [tenantId]);
              (client as any)._lastTenantId = tenantId;
            }
          } else {
            if ((client as any)._lastTenantId !== undefined) {
              await client.query(`SELECT set_config('app.current_tenant_id', '', false)`);
              delete (client as any)._lastTenantId;
            }
          }
        } catch (err) {
          client.release();
          throw err;
        }
        
        return client;
      };
    }
    const val = Reflect.get(target, prop, receiver);
    if (typeof val === 'function') {
      return val.bind(target);
    }
    return val;
  }
}) as unknown as Pool;

const tableCache = new Map<string, boolean>();
const columnCache = new Map<string, boolean>();

export async function checkTableExists(tableName: string): Promise<boolean> {
  if (tableCache.has(tableName)) {
    return tableCache.get(tableName)!;
  }
  try {
    const res = await rawPool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name = $1
      )
    `, [tableName]);
    const exists = res.rows[0]?.exists === true;
    tableCache.set(tableName, exists);
    return exists;
  } catch (err) {
    console.error(`Error checking if table ${tableName} exists:`, err);
    return false;
  }
}

export async function checkColumnExists(tableName: string, columnName: string): Promise<boolean> {
  const cacheKey = `${tableName}:${columnName}`;
  if (columnCache.has(cacheKey)) {
    return columnCache.get(cacheKey)!;
  }
  try {
    const res = await rawPool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = $1 
          AND column_name = $2
      )
    `, [tableName, columnName]);
    const exists = res.rows[0]?.exists === true;
    columnCache.set(cacheKey, exists);
    return exists;
  } catch (err) {
    console.error(`Error checking if column ${columnName} exists in ${tableName}:`, err);
    return false;
  }
}

export default pool;
