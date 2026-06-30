import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { runWithTenant } from '@/lib/tenant';
import { requireRole } from '@/lib/auth';
import { handleAuthError } from '@/lib/api-helpers';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireRole(['Administrador']);
    const { id } = params;

    const body = await request.json();
    const { supplierId, supplierName, items, status, total } = body;

    if (!supplierId || !supplierName || !items || items.length === 0) {
      return NextResponse.json({ error: 'El proveedor y los ítems son requeridos.' }, { status: 400 });
    }

    const itemsCount = items.reduce((s: number, i: any) => s + parseInt(i.qty), 0);

    const result = await runWithTenant(session.tenantId, async () => {
      // 1. Verificar si la compra existe y está pendiente
      const checkRes = await pool.query('SELECT status FROM compras WHERE id = $1', [id]);
      if (checkRes.rowCount === 0) {
        return { error: 'Compra no encontrada', status: 404 };
      }
      if (checkRes.rows[0].status !== 'Pendiente') {
        return { error: 'Solo se pueden editar compras en estado Pendiente.', status: 400 };
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // 2. Actualizar la compra
        await client.query(`
          UPDATE compras
          SET supplier_id = $1, supplier_name = $2, items_count = $3, total = $4, status = $5, items_json = $6
          WHERE id = $7
        `, [supplierId, supplierName, itemsCount, parseFloat(total) || 0.00, status || 'Pendiente', JSON.stringify(items), id]);

        // 3. Si se marca como recibida, actualizar el inventario y proveedor
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

    return NextResponse.json({ success: true, message: 'Orden de compra actualizada con éxito.' });
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error('❌ Error al actualizar la compra:', err);
    return NextResponse.json({ error: 'Error al actualizar compra' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireRole(['Administrador']);
    const { id } = params;

    const result = await runWithTenant(session.tenantId, async () => {
      // 1. Verificar si la compra existe y está pendiente
      const checkRes = await pool.query('SELECT status FROM compras WHERE id = $1', [id]);
      if (checkRes.rowCount === 0) {
        return { error: 'Compra no encontrada', status: 404 };
      }
      if (checkRes.rows[0].status !== 'Pendiente') {
        return { error: 'Solo se pueden eliminar/cancelar compras en estado Pendiente.', status: 400 };
      }

      await pool.query('DELETE FROM compras WHERE id = $1', [id]);
      return { success: true };
    });

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ success: true, message: 'Orden de compra eliminada con éxito.' });
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error('❌ Error al eliminar la compra:', err);
    return NextResponse.json({ error: 'Error al eliminar compra' }, { status: 500 });
  }
}
