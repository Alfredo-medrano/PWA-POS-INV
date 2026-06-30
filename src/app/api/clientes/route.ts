import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import crypto from 'crypto';
import { requireRole } from '@/lib/auth';
import { handleAuthError } from '@/lib/api-helpers';

export async function GET() {
  try {
    await requireRole(['Administrador', 'Supervisor', 'Cajero']);
    const result = await pool.query('SELECT * FROM clientes ORDER BY name ASC');
    const clis = result.rows.map(r => ({
      id: r.id,
      name: r.name,
      type: r.type,
      nit: r.nit,
      nrc: r.nrc,
      dui: r.dui,
      phone: r.phone,
      email: r.email,
      address: r.address,
      total: parseFloat(r.total),
      lastBuy: r.last_buy
    }));
    return NextResponse.json(clis);
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error(err);
    return NextResponse.json({ error: 'Error al obtener clientes' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireRole(['Administrador', 'Supervisor', 'Cajero']);
    const body = await request.json();
    const { name, type, nit, nrc, dui, phone, email, address } = body;
    const id = crypto.randomUUID();
    
    await pool.query(`
      INSERT INTO clientes (id, name, type, nit, nrc, dui, phone, email, address, total, last_buy)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 0, NULL)
    `, [id, name, type || 'natural', nit || null, nrc || null, dui || null, phone || null, email || null, address || null]);
    
    return NextResponse.json({ id, name, type, nit, nrc, dui, phone, email, address, total: 0, lastBuy: null }, { status: 201 });
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error(err);
    return NextResponse.json({ error: 'Error al crear cliente' }, { status: 500 });
  }
}

