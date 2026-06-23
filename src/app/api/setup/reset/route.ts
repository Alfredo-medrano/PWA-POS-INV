import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Truncar todas las tablas
    await client.query('TRUNCATE TABLE ventas, compras, productos, clientes, proveedores, configuracion, usuarios CASCADE');
    
    await client.query('COMMIT');
    return NextResponse.json({ success: true, message: 'Base de datos restablecida completamente' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al restablecer la base de datos:', err);
    return NextResponse.json({ error: 'Error al restablecer la base de datos.' }, { status: 500 });
  } finally {
    client.release();
  }
}
