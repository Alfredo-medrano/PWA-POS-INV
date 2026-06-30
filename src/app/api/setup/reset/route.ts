import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { handleAuthError } from '@/lib/api-helpers';
import { runWithTenant } from '@/lib/tenant';

export async function POST() {
  try {
    // Validar que el invocador sea administrador
    const session = await requireRole(['Administrador']);

    // FIX P4: runWithTenant garantiza que el GUC esté seteado al tenant del admin
    // que ejecuta el reset antes de abrir cualquier conexión.
    await runWithTenant(session.tenantId, async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Defensa en profundidad: WHERE tenant_id = $1 explícito en cada DELETE.
        // RLS ya filtra por GUC, pero una segunda capa evita borrado catastrófico
        // en caso de fallo del mecanismo RLS (ej. policy misconfiguration).
        // No usar TRUNCATE: evade RLS y requiere privilegios DDL.
        await client.query('DELETE FROM compras    WHERE tenant_id = $1', [session.tenantId]);
        await client.query('DELETE FROM ventas     WHERE tenant_id = $1', [session.tenantId]);
        await client.query('DELETE FROM productos  WHERE tenant_id = $1', [session.tenantId]);
        await client.query('DELETE FROM clientes   WHERE tenant_id = $1', [session.tenantId]);
        await client.query('DELETE FROM proveedores WHERE tenant_id = $1', [session.tenantId]);

        try {
          await client.query('DELETE FROM egresos  WHERE tenant_id = $1', [session.tenantId]);
        } catch (e) {
          // Ignorar si la tabla egresos aún no existe
        }

        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    });

    return NextResponse.json({ success: true, message: 'Base de datos del negocio reseteada con éxito' });
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error('❌ Error al resetear base de datos:', err);
    return NextResponse.json({ error: 'Error al limpiar la base de datos' }, { status: 500 });
  }
}

