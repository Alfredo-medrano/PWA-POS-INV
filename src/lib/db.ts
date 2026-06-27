import { Pool } from 'pg';
import { getTenantId } from './tenant';

const connectionString = process.env.DATABASE_URL;

let rawPool: Pool;

if (process.env.NODE_ENV === 'production') {
  rawPool = new Pool({
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
  rawPool = (global as any).pool;
}

// Inicializar tablas e incorporar columnas nuevas con multitenancy y RLS
async function initDatabase() {
  const client = await rawPool.connect();
  try {
    console.log('🔄 Verificando e inicializando tablas en Neon con soporte SaaS...');
    
    // 0. Crear tabla de Tenants
    await client.query(`
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
    await client.query(`
      INSERT INTO tenants (id, name, slug, plan, status, trial_ends_at)
      VALUES ('single', 'Negocio Inicial', 'inicial', 'demo', 'active', NOW() + INTERVAL '15 days')
      ON CONFLICT (id) DO NOTHING
    `);

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

    // 8. Egresos
    await client.query(`
      CREATE TABLE IF NOT EXISTS egresos (
        id VARCHAR(36) PRIMARY KEY,
        amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        concept TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 9. Password Reset Tokens (BUG-03 FIX)
    await client.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        token_hash VARCHAR(64) NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        used_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add Foreign Key constraint if not present
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_password_reset_user'
        ) THEN
          ALTER TABLE password_reset_tokens 
          ADD CONSTRAINT fk_password_reset_user FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    // Create index on token_hash if it does not exist
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_hash ON password_reset_tokens (token_hash);
    `);

    // --- MIGRACIÓN MULTITENANT ---
    const tablesToMigrate = ['productos', 'clientes', 'ventas', 'configuracion', 'usuarios', 'proveedores', 'compras', 'egresos', 'password_reset_tokens'];
    
    for (const table of tablesToMigrate) {
      // 1. Agregar columna tenant_id
      await client.query(`
        ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(36);
      `);
      
      // 2. Mapear datos antiguos/existentes al tenant por defecto 'single'
      await client.query(`
        UPDATE ${table} SET tenant_id = 'single' WHERE tenant_id IS NULL;
      `);
      
      // 3. Forzar restricción NOT NULL y valor DEFAULT automático basado en RLS
      await client.query(`
        ALTER TABLE ${table} ALTER COLUMN tenant_id SET DEFAULT current_setting('app.current_tenant_id', true);
        ALTER TABLE ${table} ALTER COLUMN tenant_id SET NOT NULL;
      `);

      // 4. Agregar constraint de Foreign Key
      await client.query(`
        DO $$ BEGIN
          ALTER TABLE ${table} ADD CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
        EXCEPTION WHEN OTHERS THEN NULL;
        END $$;
      `);

      // 5. Habilitar RLS y forzarlo
      await client.query(`
        ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;
        ALTER TABLE ${table} FORCE ROW LEVEL SECURITY;
      `);

      // 6. Configurar política de aislamiento
      await client.query(`
        DO $$ BEGIN
          DROP POLICY IF EXISTS tenant_isolation_policy ON ${table};
          CREATE POLICY tenant_isolation_policy ON ${table}
            USING (tenant_id = current_setting('app.current_tenant_id', true));
        EXCEPTION WHEN OTHERS THEN NULL;
        END $$;
      `);
    }

    // 8. Crear función SECURITY DEFINER para lookup de usuarios sin RLS (utilizada en login global)
    await client.query(`
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

    await client.query(`
      GRANT EXECUTE ON FUNCTION get_user_by_email(VARCHAR) TO pos_app_user;
    `);

    console.log('✅ Base de datos inicializada con RLS y soporte SaaS.');
  } catch (err: any) {
    if (err.code === '42501') {
      console.log('ℹ️ Conexión de base de datos en modo lectura/escritura (sin privilegios de alteración de esquema/DDL). Omitiendo inicialización de tablas.');
    } else {
      console.error('❌ Error inicializando base de datos:', err);
    }
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
          const client = await target.connect();
          try {
            await client.query('BEGIN');
            await client.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [tenantId]);
            const result = await client.query(text, params);
            await client.query('COMMIT');
            return result;
          } catch (err) {
            await client.query('ROLLBACK');
            throw err;
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
        const originalQuery = client.query;
        
        // Envolver el query del cliente para inyectar el tenant_id cuando comience una transacción
        client.query = async function(text: any, params?: any[]) {
          const normalizedText = typeof text === 'string' ? text.trim().toUpperCase() : '';
          if (normalizedText === 'BEGIN') {
            const res = await originalQuery.call(this, text, params);
            const tenantId = getTenantId();
            if (tenantId) {
              await originalQuery.call(this, `SELECT set_config('app.current_tenant_id', $1, true)`, [tenantId]);
            }
            return res;
          }
          return originalQuery.call(this, text, params);
        } as any;
        
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

export default pool;
