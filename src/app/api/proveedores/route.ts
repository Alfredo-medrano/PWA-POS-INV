import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import crypto from 'crypto';

export async function GET() {
  try {
    const result = await pool.query('SELECT * FROM proveedores ORDER BY name ASC');
    return NextResponse.json(result.rows);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Error al obtener proveedores' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, phone, nrc, email } = body;
    const id = crypto.randomUUID();
    
    await pool.query(`
      INSERT INTO proveedores (id, name, phone, nrc, email, last_buy)
      VALUES ($1, $2, $3, $4, $5, NULL)
    `, [id, name, phone || null, nrc || null, email || null]);
    
    return NextResponse.json({ id, name, phone, nrc, email, last_buy: null }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Error al crear proveedor' }, { status: 500 });
  }
}
