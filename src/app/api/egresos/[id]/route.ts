import { NextResponse } from 'next/server';
import pool, { checkColumnExists } from '@/lib/db';
import { runWithTenant } from '@/lib/tenant';
import { requireRole } from '@/lib/auth';
import { handleAuthError } from '@/lib/api-helpers';

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireRole(['Administrador', 'Supervisor']);
    const { id } = params;

    const hasDeletedAt = await checkColumnExists('egresos', 'deleted_at');

    const result = await runWithTenant(session.tenantId, () => {
      if (hasDeletedAt) {
        return pool.query(`
          UPDATE egresos
          SET deleted_at = CURRENT_TIMESTAMP
          WHERE id = $1 AND deleted_at IS NULL
        `, [id]);
      } else {
        return pool.query(`
          DELETE FROM egresos
          WHERE id = $1
        `, [id]);
      }
    });

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Egreso no encontrado o ya eliminado' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Egreso eliminado exitosamente.' });
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error('❌ Error al eliminar el egreso:', err);
    return NextResponse.json({ error: 'Error al eliminar egreso' }, { status: 500 });
  }
}
