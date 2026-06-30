import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { handleAuthError } from '@/lib/api-helpers';
import { runWithTenant } from '@/lib/tenant';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireRole(['Administrador', 'Supervisor', 'Cajero']);
    const { id } = params;
    const body = await request.json();
    const { name, type, nit, nrc, dui, phone, email, address } = body;

    const result = await runWithTenant(session.tenantId, () =>
      pool.query(`
        UPDATE clientes 
        SET name = $1, type = $2, nit = $3, nrc = $4, dui = $5, phone = $6, email = $7, address = $8
        WHERE id = $9
        RETURNING *
      `, [name, type || 'natural', nit || null, nrc || null, dui || null, phone || null, email || null, address || null, id])
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }
    return NextResponse.json({ id, name, type, nit, nrc, dui, phone, email, address });
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error(err);
    return NextResponse.json({ error: 'Error al actualizar cliente' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireRole(['Administrador', 'Supervisor']);
    const { id } = params;

    const result = await runWithTenant(session.tenantId, () =>
      pool.query('DELETE FROM clientes WHERE id = $1', [id])
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Cliente eliminado' });
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error(err);
    return NextResponse.json({ error: 'Error al eliminar cliente' }, { status: 500 });
  }
}
