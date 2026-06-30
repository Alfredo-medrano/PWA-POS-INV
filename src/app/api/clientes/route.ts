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
      let queryText = 'SELECT * FROM clientes ORDER BY name ASC';
      const params: any[] = [];

      if (limit !== null && !isNaN(limit)) {
        queryText += ' LIMIT $1 OFFSET $2';
        params.push(limit, isNaN(offset) ? 0 : offset);
      }

      const result = await pool.query(queryText, params);
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

      if (limit !== null) {
        const countRes = await pool.query('SELECT COUNT(*) FROM clientes');
        const total = parseInt(countRes.rows[0].count);
        return { clis, total };
      }

      return clis;
    });

    return NextResponse.json(data);
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error(err);
    return NextResponse.json({ error: 'Error al obtener clientes' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireRole(['Administrador', 'Supervisor', 'Cajero']);
    const body = await request.json();
    const { name, type, nit, nrc, dui, phone, email, address } = body;
    const id = crypto.randomUUID();

    if (!name) {
      return NextResponse.json({ error: 'El nombre del cliente es requerido.' }, { status: 400 });
    }

    const result = await runWithTenant(session.tenantId, async () => {
      // 1. Impedir duplicados por NIT o DUI
      if (nit) {
        const dupNit = await pool.query('SELECT id FROM clientes WHERE nit = $1 LIMIT 1', [nit]);
        if (dupNit.rowCount > 0) {
          return { error: 'Ya existe un cliente registrado con este NIT.', status: 409 };
        }
      }

      if (dui) {
        const dupDui = await pool.query('SELECT id FROM clientes WHERE dui = $1 LIMIT 1', [dui]);
        if (dupDui.rowCount > 0) {
          return { error: 'Ya existe un cliente registrado con este DUI.', status: 409 };
        }
      }

      // 2. Insertar cliente
      await pool.query(`
        INSERT INTO clientes (id, name, type, nit, nrc, dui, phone, email, address, total, last_buy)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 0, NULL)
      `, [id, name, type || 'natural', nit || null, nrc || null, dui || null, phone || null, email || null, address || null]);

      return { success: true };
    });

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ id, name, type, nit, nrc, dui, phone, email, address, total: 0, lastBuy: null }, { status: 201 });
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error(err);
    return NextResponse.json({ error: 'Error al crear cliente' }, { status: 500 });
  }
}
