import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
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
      
      await client.query("UPDATE compras SET status = 'Recibida' WHERE id = $1", [id]);
      
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
      return NextResponse.json({ success: true, message: 'Orden de compra recibida con éxito' });
    } catch (err: any) {
      await client.query('ROLLBACK');
      console.error(err);
      throw err;
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || 'Error al recibir compra' }, { status: 500 });
  }
}
