import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { handleAuthError } from '@/lib/api-helpers';
import { runWithTenant } from '@/lib/tenant';

export async function GET(request: Request) {
  try {
    const session = await requireRole(['Administrador']);
    
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit') || '') : null;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset') || '') : 0;

    const data = await runWithTenant(session.tenantId, async () => {
      let queryText = 'SELECT * FROM compras ORDER BY created_at DESC';
      const params: any[] = [];

      if (limit !== null && !isNaN(limit)) {
        queryText += ' LIMIT $1 OFFSET $2';
        params.push(limit, isNaN(offset) ? 0 : offset);
      }

      const result = await pool.query(queryText, params);
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

      if (limit !== null) {
        const countRes = await pool.query('SELECT COUNT(*) FROM compras');
        const total = parseInt(countRes.rows[0].count);
        return { list, total };
      }

      return list;
    });

    return NextResponse.json(data);
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error(err);
    return NextResponse.json({ error: 'Error al obtener compras' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireRole(['Administrador']);
    const body = await request.json();
    const { supplierId, supplierName, items, status, total } = body;
    const itemsCount = items.reduce((s: number, i: any) => s + parseInt(i.qty), 0);

    const result = await runWithTenant(session.tenantId, async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        
        let attempts = 0;
        let success = false;
        let id = "";

        while (attempts < 5 && !success) {
          id = `OC-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
          try {
            // Check if ID is already in use (to prevent constraint error aborting the transaction)
            const existsRes = await client.query('SELECT id FROM compras WHERE id = $1', [id]);
            if (existsRes.rowCount > 0) {
              attempts++;
              continue;
            }

            await client.query(`
              INSERT INTO compras (id, supplier_id, supplier_name, items_count, total, status, items_json)
              VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [id, supplierId, supplierName, itemsCount, parseFloat(total) || 0.00, status || 'Pendiente', JSON.stringify(items)]);

            success = true;
          } catch (err: any) {
            if (err.code === '23505') {
              attempts++;
            } else {
              throw err;
            }
          }
        }

        if (!success) {
          throw new Error('No se pudo generar un ID único para la orden de compra tras varios intentos.');
        }

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
        return { id, supplierId, supplierName, itemsCount, total, status };
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        throw err;
      } finally {
        client.release();
      }
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error(err);
    return NextResponse.json({ error: 'Error al registrar compra' }, { status: 500 });
  }
}
