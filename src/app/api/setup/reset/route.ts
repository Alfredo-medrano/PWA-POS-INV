import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { handleAuthError } from '@/lib/api-helpers';

export async function POST() {
  try {
    // Validar que el invocador sea administrador
    await requireRole(['Administrador']);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Borrar de forma secuencial obedeciendo RLS (no usar TRUNCATE ya que evade RLS y requiere privilegios DDL)
      await client.query('DELETE FROM compras');
      await client.query('DELETE FROM ventas');
      await client.query('DELETE FROM productos');
      await client.query('DELETE FROM clientes');
      await client.query('DELETE FROM proveedores');

      // Si existe una tabla de egresos (la crearemos luego), borrarla también
      try {
        await client.query('DELETE FROM egresos');
      } catch (e) {
        // Ignorar si la tabla egresos aún no existe
      }

      await client.query('COMMIT');
      return NextResponse.json({ success: true, message: 'Base de datos del negocio reseteada con éxito' });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error('❌ Error al resetear base de datos:', err);
    return NextResponse.json({ error: 'Error al limpiar la base de datos' }, { status: 500 });
  }
}
