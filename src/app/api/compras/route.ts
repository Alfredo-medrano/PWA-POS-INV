import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
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
    return NextResponse.json(list);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Error al obtener compras' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { supplierId, supplierName, items, status, total } = body;
    const id = `OC-${Math.floor(100 + Math.random() * 900)}`;
    const itemsCount = items.reduce((s: number, i: any) => s + parseInt(i.qty), 0);
    
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
      return NextResponse.json({ id, supplierId, supplierName, itemsCount, total, status }, { status: 201 });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(err);
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Error al registrar compra' }, { status: 500 });
  }
}
