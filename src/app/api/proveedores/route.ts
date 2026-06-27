import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import crypto from 'crypto';
import { requireRole } from '@/lib/auth';
import { handleAuthError } from '@/lib/api-helpers';

export async function GET() {
  try {
    await requireRole(['Administrador', 'Cajero']);
    const result = await pool.query('SELECT * FROM proveedores ORDER BY name ASC');
    return NextResponse.json(result.rows);
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error(err);
    return NextResponse.json({ error: 'Error al obtener proveedores' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireRole(['Administrador']);
    const body = await request.json();
    const { name, phone, nrc, email } = body;
    const id = crypto.randomUUID();
    
    await pool.query(`
      INSERT INTO proveedores (id, name, phone, nrc, email, last_buy)
      VALUES ($1, $2, $3, $4, $5, NULL)
    `, [id, name, phone || null, nrc || null, email || null]);
    
    return NextResponse.json({ id, name, phone, nrc, email, last_buy: null }, { status: 201 });
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error(err);
    return NextResponse.json({ error: 'Error al crear proveedor' }, { status: 500 });
  }
}

