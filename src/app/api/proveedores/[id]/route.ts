import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireRole } from '@/lib/auth';

function handleAuthError(err: any) {
  if (err.message === 'UNAUTHORIZED') {
    return NextResponse.json({ error: 'No autorizado. Por favor inicia sesión.' }, { status: 401 });
  }
  if (err.message === 'FORBIDDEN') {
    return NextResponse.json({ error: 'Acceso denegado. Permisos insuficientes.' }, { status: 403 });
  }
  return null;
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireRole(['Administrador']);
    const { id } = params;
    const body = await request.json();
    const { name, phone, nrc, email } = body;
    
    const result = await pool.query(`
      UPDATE proveedores
      SET name = $1, phone = $2, nrc = $3, email = $4
      WHERE id = $5
      RETURNING *
    `, [name, phone || null, nrc || null, email || null, id]);
    
    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Proveedor no encontrado' }, { status: 404 });
    }
    return NextResponse.json(result.rows[0]);
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error(err);
    return NextResponse.json({ error: 'Error al actualizar proveedor' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireRole(['Administrador']);
    const { id } = params;
    const result = await pool.query('DELETE FROM proveedores WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Proveedor no encontrado' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Proveedor eliminado' });
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error(err);
    return NextResponse.json({ error: 'Error al eliminar proveedor' }, { status: 500 });
  }
}

