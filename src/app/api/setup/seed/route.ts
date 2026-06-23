import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST() {
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
    return NextResponse.json({ success: true, message: 'Datos demo sembrados con éxito.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al sembrar datos demo:', err);
    return NextResponse.json({ error: 'Error al sembrar datos demo.' }, { status: 500 });
  } finally {
    client.release();
  }
}
