import { NextResponse } from 'next/server';
import pool, { checkTableExists } from '@/lib/db';
import { runWithTenant } from '@/lib/tenant';
import { requireRole } from '@/lib/auth';
import { handleAuthError } from '@/lib/api-helpers';
import crypto from 'crypto';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireRole(['Administrador', 'Supervisor']);
    const { id: productId } = params;

    const body = await request.json();
    const { delta, tipo, motivo } = body;

    const numericDelta = parseInt(delta);
    if (isNaN(numericDelta)) {
      return NextResponse.json({ error: 'La cantidad delta debe ser un número entero válido.' }, { status: 400 });
    }

    if (!tipo || !['Ingreso', 'Egreso', 'Ajuste'].includes(tipo)) {
      return NextResponse.json({ error: 'El tipo de movimiento es inválido o faltante.' }, { status: 400 });
    }

    const hasKardexTable = await checkTableExists('movimientos_inventario');

    const result = await runWithTenant(session.tenantId, async () => {
      // 1. Verificar si el producto existe
      const checkRes = await pool.query('SELECT stock FROM productos WHERE id = $1', [productId]);
      if (checkRes.rowCount === 0) {
        return { error: 'Producto no encontrado', status: 404 };
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // 2. Actualizar stock
        await client.query(`
          UPDATE productos
          SET stock = stock + $1, updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `, [numericDelta, productId]);

        const id = crypto.randomUUID();

        // 3. Crear movimiento de inventario (Kardex) si existe la tabla
        if (hasKardexTable) {
          await client.query(`
            INSERT INTO movimientos_inventario (id, product_id, user_id, tipo, delta, motivo)
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [id, productId, session.id, tipo, numericDelta, motivo || 'Ajuste manual de inventario']);
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

    if (result && 'error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ success: true, message: 'Stock ajustado exitosamente.' });
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error('❌ Error al realizar ajuste de stock:', err);
    return NextResponse.json({ error: 'Error al ajustar stock' }, { status: 500 });
  }
}
