import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { runWithTenant } from '@/lib/tenant';
import { requireRole } from '@/lib/auth';
import { handleAuthError } from '@/lib/api-helpers';
import crypto from 'crypto';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireRole(['Administrador', 'Supervisor']);
    const { id: saleId } = params;

    const result = await runWithTenant(session.tenantId, async () => {
      // 1. Obtener la venta
      const saleRes = await pool.query('SELECT total, customer_id, raw_dte_json, dte_status FROM ventas WHERE id = $1', [saleId]);
      if (saleRes.rowCount === 0) {
        return { error: 'Venta no encontrada', status: 404 };
      }

      const sale = saleRes.rows[0];
      if (sale.dte_status === 'voided') {
        return { error: 'Esta venta ya se encuentra anulada.', status: 400 };
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // 2. Anular la venta
        await client.query(`
          UPDATE ventas
          SET dte_status = 'voided'
          WHERE id = $1
        `, [saleId]);

        const total = parseFloat(sale.total) || 0.00;
        const details = sale.raw_dte_json?.detalles || [];

        // 3. Devolver los productos al inventario y registrar movimientos (Kardex)
        for (const item of details) {
          const qty = parseInt(item.cantidad) || 0;
          let productId = item.productId;

          if (!productId && item.descripcion) {
            // Fallback por nombre si no tiene ID asignado
            const findProd = await client.query('SELECT id FROM productos WHERE name = $1 LIMIT 1', [item.descripcion]);
            if (findProd.rowCount > 0) {
              productId = findProd.rows[0].id;
            }
          }

          if (productId) {
            // Devolver al stock
            await client.query(`
              UPDATE productos
              SET stock = stock + $1, updated_at = CURRENT_TIMESTAMP
              WHERE id = $2
            `, [qty, productId]);

            // Movimiento Kardex
            const movId = crypto.randomUUID();
            await client.query(`
              INSERT INTO movimientos_inventario (id, product_id, user_id, tipo, delta, motivo)
              VALUES ($1, $2, $3, $4, $5, $6)
            `, [movId, productId, session.id, 'Ingreso', qty, `Devolución por anulación de venta ${saleId.slice(0, 8)}`]);
          }
        }

        // 4. Descontar del acumulado del cliente
        if (sale.customer_id) {
          await client.query(`
            UPDATE clientes
            SET total = GREATEST(0.00, total - $1)
            WHERE id = $2
          `, [total, sale.customer_id]);
        }

        await client.query('COMMIT');
        return { success: true };
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    });

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ success: true, message: 'Venta anulada con éxito.' });
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error('❌ Error al anular la venta:', err);
    return NextResponse.json({ error: 'Error al anular la venta' }, { status: 500 });
  }
}
