import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import crypto from 'crypto';
import { requireRole } from '@/lib/auth';
import { handleAuthError } from '@/lib/api-helpers';
import { runWithTenant } from '@/lib/tenant';

export async function GET(request: Request) {
  try {
    const session = await requireRole(['Administrador', 'Supervisor', 'Cajero']);
    
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit') || '') : null;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset') || '') : 0;

    const data = await runWithTenant(session.tenantId, async () => {
      let queryText = 'SELECT * FROM proveedores ORDER BY name ASC';
      const params: any[] = [];

      if (limit !== null && !isNaN(limit)) {
        queryText += ' LIMIT $1 OFFSET $2';
        params.push(limit, isNaN(offset) ? 0 : offset);
      }

      const result = await pool.query(queryText, params);
      const rows = result.rows;

      if (limit !== null) {
        const countRes = await pool.query('SELECT COUNT(*) FROM proveedores');
        const total = parseInt(countRes.rows[0].count);
        return { list: rows, total };
      }

      return rows;
    });

    return NextResponse.json(data);
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error(err);
    return NextResponse.json({ error: 'Error al obtener proveedores' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireRole(['Administrador']);
    const body = await request.json();
    const { name, phone, nrc, email } = body;
    const id = crypto.randomUUID();

    if (!name) {
      return NextResponse.json({ error: 'El nombre del proveedor es requerido.' }, { status: 400 });
    }
    
    const result = await runWithTenant(session.tenantId, async () => {
      await pool.query(`
        INSERT INTO proveedores (id, name, phone, nrc, email, last_buy)
        VALUES ($1, $2, $3, $4, $5, NULL)
      `, [id, name, phone || null, nrc || null, email || null]);
      return { id, name, phone, nrc, email, last_buy: null };
    });
    
    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error(err);
    return NextResponse.json({ error: 'Error al crear proveedor' }, { status: 500 });
  }
}
