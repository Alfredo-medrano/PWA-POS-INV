import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';
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
    const { name, email, password, role, status } = body;
    
    let query = `
      UPDATE usuarios
      SET name = $1, email = $2, role = $3, status = $4
      WHERE id = $5
      RETURNING id, name, email, role, status
    `;
    let paramsArray = [name, email, role, status, id];
    
    if (password) {
      const hashedPw = await bcrypt.hash(password, 12);
      query = `
        UPDATE usuarios
        SET name = $1, email = $2, role = $3, status = $4, password = $5
        WHERE id = $6
        RETURNING id, name, email, role, status
      `;
      paramsArray = [name, email, role, status, hashedPw, id];
    }
    
    const result = await pool.query(query, paramsArray);
    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }
    return NextResponse.json(result.rows[0]);
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error(err);
    return NextResponse.json({ error: 'Error al actualizar usuario' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireRole(['Administrador']);
    const { id } = params;
    const result = await pool.query('DELETE FROM usuarios WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Usuario eliminado' });
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error(err);
    return NextResponse.json({ error: 'Error al eliminar usuario' }, { status: 500 });
  }
}

