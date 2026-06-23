import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
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
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Error al actualizar proveedor' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const result = await pool.query('DELETE FROM proveedores WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Proveedor no encontrado' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Proveedor eliminado' });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Error al eliminar proveedor' }, { status: 500 });
  }
}
