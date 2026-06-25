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
    const { name, sku, category, stock, minStock, cost, price, img, barcode } = body;
    
    const result = await pool.query(`
      UPDATE productos 
      SET name = $1, sku = $2, category = $3, stock = $4, min_stock = $5, cost = $6, price = $7, img = $8, barcode = $9, updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING *
    `, [name, sku, category, parseInt(stock) || 0, parseInt(minStock) || 0, parseFloat(cost) || 0, parseFloat(price) || 0, img || null, barcode || null, id]);
    
    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }
    return NextResponse.json({ id, name, sku, category, stock, minStock, cost, price, img, barcode });
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error(err);
    return NextResponse.json({ error: 'Error al actualizar producto' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireRole(['Administrador']);
    const { id } = params;
    const result = await pool.query('DELETE FROM productos WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Producto eliminado' });
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error(err);
    return NextResponse.json({ error: 'Error al eliminar producto' }, { status: 500 });
  }
}

