import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import crypto from 'crypto';
import { requireRole } from '@/lib/auth';

function handleAuthError(err: any) {
  if (err.message === 'UNAUTHORIZED') {
    return NextResponse.json({ error: 'No autorizado. Por favor inicia sesión.' }, { status: 401 });
  }
  if (err.message === 'FORBIDDEN') {
    return NextResponse.json({ error: 'Acceso denegado. Permisos insuficientes.' }, { status: 403 });
  }
  return null;
}

export async function POST() {
  try {
    // Validar rol de Administrador
    await requireRole(['Administrador']);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Verificar si ya hay productos para evitar duplicidad accidental
      const checkProds = await client.query('SELECT id FROM productos LIMIT 1');
      if (checkProds.rowCount > 0) {
        throw new Error('La base de datos de tu empresa ya contiene productos. Resetéala primero para poder sembrar.');
      }

      // 2. Sembrar Productos demo
      const mockProducts = [
        ["Coca-Cola 2L", "CC2L", "Bebidas", 45, 10, 1.20, 2.00, "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=160&h=160&fit=crop&auto=format"],
        ["Arroz Calrose 5lb", "AR5", "Granos", 8, 15, 2.80, 4.50, "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=160&h=160&fit=crop&auto=format"],
        ["Leche Entera 1L", "LE1", "Lácteos", 12, 20, 0.90, 1.50, "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=160&h=160&fit=crop&auto=format"],
        ["Jabón Líquido 1L", "JL1", "Limpieza", 23, 5, 1.80, 3.00, "https://images.unsplash.com/photo-1584305574647-0cc949a2bb9f?w=160&h=160&fit=crop&auto=format"],
        ["Frijoles Rojos 1lb", "FJ1", "Granos", 34, 10, 0.80, 1.50, "https://images.unsplash.com/photo-1590779033100-9f60a05a013d?w=160&h=160&fit=crop&auto=format"],
        ["Pan Dulce Unidad", "PD1", "Snacks", 12, 20, 0.25, 0.50, "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=160&h=160&fit=crop&auto=format"],
        ["Pepsi 2L", "PP2L", "Bebidas", 30, 10, 1.10, 1.90, "https://images.unsplash.com/photo-1629203851122-3726555cf519?w=160&h=160&fit=crop&auto=format"],
        ["Queso Duro 200g", "QD1", "Lácteos", 7, 8, 3.20, 5.00, "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=160&h=160&fit=crop&auto=format"]
      ];

      for (const p of mockProducts) {
        const id = crypto.randomUUID();
        await client.query(`
          INSERT INTO productos (id, name, sku, category, stock, min_stock, cost, price, img)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [id, p[0], p[1], p[2], p[3], p[4], p[5], p[6], p[7]]);
      }

      // 3. Sembrar Clientes demo
      const mockCustomers = [
        ["María López Díaz", "natural", null, null, "01234567-8", "7888-1234", "maria@empresa.com.sv", 150.00, "20/06/2025"],
        ["Distribuidora San Miguel S.A.", "juridica", "0614-150590-102-1", "98765-4", null, "2222-3344", "compras@distsanmiguel.com.sv", 420.50, "21/06/2025"],
        ["Carlos Mendez Ramos", "natural", null, null, "02345678-9", "7755-9988", "carlos.m@gmail.com", 0.00, null]
      ];

      for (const c of mockCustomers) {
        const id = crypto.randomUUID();
        await client.query(`
          INSERT INTO clientes (id, name, type, nit, nrc, dui, phone, email, total, last_buy)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [id, c[0], c[1], c[2], c[3], c[4], c[5], c[6], c[7], c[8]]);
      }

      // 4. Sembrar Proveedores demo
      const mockSuppliers = [
        ["Distribuidora Central", "2222-4455", "11223-4", "contacto@distcentral.com.sv", "20/06/2025"],
        ["Proveedor Lácteos SV", "7788-9900", "55667-8", "ventas@lacteos.com.sv", "18/06/2025"],
        ["Bebidas del Norte", "2233-1122", "99001-2", "pedidos@bebidasnorte.com.sv", "15/06/2025"]
      ];

      for (const s of mockSuppliers) {
        const id = crypto.randomUUID();
        await client.query(`
          INSERT INTO proveedores (id, name, phone, nrc, email, last_buy)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [id, s[0], s[1], s[2], s[3], s[4]]);
      }

      await client.query('COMMIT');
      return NextResponse.json({ success: true, message: 'Datos semilla sembrados con éxito' });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error('❌ Error al sembrar base de datos:', err);
    return NextResponse.json({ error: err.message || 'Error al sembrar la base de datos' }, { status: 500 });
  }
}
