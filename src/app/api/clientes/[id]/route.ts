import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { name, type, nit, nrc, dui, phone, email, address } = body;
    
    const result = await pool.query(`
      UPDATE clientes 
      SET name = $1, type = $2, nit = $3, nrc = $4, dui = $5, phone = $6, email = $7, address = $8
      WHERE id = $9
      RETURNING *
    `, [name, type || 'natural', nit || null, nrc || null, dui || null, phone || null, email || null, address || null, id]);
    
    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }
    return NextResponse.json({ id, name, type, nit, nrc, dui, phone, email, address });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Error al actualizar cliente' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const result = await pool.query('DELETE FROM clientes WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Cliente eliminado' });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Error al eliminar cliente' }, { status: 500 });
  }
}
