import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { runWithTenant } from '@/lib/tenant';
import { signSession } from '@/lib/auth-crypto';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      bizName, bizType, bizPhone, bizAddress, dteUrl, dteKey,
      adminName, adminEmail, adminPassword, seedDemo
    } = body;

    if (!bizName || !adminName || !adminEmail || !adminPassword) {
      return NextResponse.json({ error: 'El nombre del negocio, nombre de administrador, correo y contraseña son campos obligatorios.' }, { status: 400 });
    }

    // 1. Generar slug único para la empresa
    let slug = bizName.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Quitar acentos
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    // Verificar si el slug ya existe
    const slugCheck = await pool.query('SELECT id FROM tenants WHERE slug = $1', [slug]);
    if (slugCheck.rowCount > 0) {
      slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const tenantId = crypto.randomUUID();
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 15); // Prueba de 15 días

    // 2. Crear el Tenant en la tabla global (sin RLS activo para tenants)
    await pool.query(`
      INSERT INTO tenants (id, name, slug, plan, status, trial_ends_at)
      VALUES ($1, $2, $3, 'demo', 'active', $4)
    `, [tenantId, bizName, slug, trialEndsAt]);

    // 3. Crear configuración, administrador y sembrar datos opcionales dentro de su contexto
    const client = await pool.connect();
    const adminId = crypto.randomUUID();
    try {
      // runWithTenant asegura que el tenant_id actual esté fijado en el almacenamiento local asíncrono
      await runWithTenant(tenantId, async () => {
        await client.query('BEGIN');

        // Insertar configuración (usando tenantId como id único de configuración)
        await client.query(`
          INSERT INTO configuracion (id, biz_name, biz_type, biz_phone, biz_address, dte_url, dte_key)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [tenantId, bizName, bizType || null, bizPhone || null, bizAddress || null, dteUrl || null, dteKey || null]);

        // Crear el administrador inicial de este tenant
        const hashedPw = await bcrypt.hash(adminPassword, 12);
        await client.query(`
          INSERT INTO usuarios (id, name, email, password, role, status)
          VALUES ($1, $2, $3, $4, 'Administrador', 'Activo')
        `, [adminId, adminName, adminEmail, hashedPw]);

        // Opcional: Sembrar datos demo
        if (seedDemo) {
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
            const pId = crypto.randomUUID();
            await client.query(`
              INSERT INTO productos (id, name, sku, category, stock, min_stock, cost, price, img)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `, [pId, p[1], p[2], p[3], p[4], p[5], p[6], p[7], p[8]]);
          }

          // Clientes
          const mockCustomers = [
            [crypto.randomUUID(), "María López Díaz", "natural", "0614-010180-101-3", "12345-6", "01234567-8", "7888-1234", "maria@empresa.com.sv", 4580.00, "20/06/2025"],
            [crypto.randomUUID(), "Distribuidora San Miguel S.A.", "juridica", "0614-150590-102-1", "98765-4", null, "2222-3344", "compras@distsanmiguel.com.sv", 18420.50, "21/06/2025"],
            [crypto.randomUUID(), "Carlos Mendez Ramos", "natural", null, null, "02345678-9", "7755-9988", "carlos.m@gmail.com", 890.75, "18/06/2025"]
          ];
          for (const c of mockCustomers) {
            await client.query(`
              INSERT INTO clientes (id, name, type, nit, nrc, dui, phone, email, total, last_buy)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            `, c);
          }

          // Proveedores
          const mockSuppliers = [
            [crypto.randomUUID(), "Distribuidora Central", "2222-4455", "11223-4", "contacto@distcentral.com.sv", "20/06/2025"],
            [crypto.randomUUID(), "Proveedor Lácteos SV", "7788-9900", "55667-8", "ventas@lacteos.com.sv", "18/06/2025"],
            [crypto.randomUUID(), "Bebidas del Norte", "2233-1122", "99001-2", "pedidos@bebidasnorte.com.sv", "15/06/2025"]
          ];
          for (const s of mockSuppliers) {
            await client.query(`
              INSERT INTO proveedores (id, name, phone, nrc, email, last_buy)
              VALUES ($1, $2, $3, $4, $5, $6)
            `, s);
          }
        }

        await client.query('COMMIT');
      });

      // Crear sesión automática tras el registro
      const response = NextResponse.json({
        success: true,
        tenantSlug: slug,
        user: {
          id: adminId,
          name: adminName,
          email: adminEmail,
          role: 'Administrador',
          status: 'Activo',
          tenantId: tenantId,
          tenantSlug: slug
        }
      }, { status: 201 });

      response.cookies.set('pos_session', signSession({ id: adminId, role: 'Administrador', tenantId }), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/'
      });

      return response;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error('Error al registrar negocio y admin inicial:', err);
    if (err.code === '23505') {
      return NextResponse.json({ error: 'El correo electrónico ya está registrado en el sistema.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Error interno en el servidor al registrar el negocio.' }, { status: 500 });
  }
}
