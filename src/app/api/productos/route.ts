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
      let queryText = 'SELECT * FROM productos ORDER BY name ASC';
      const params: any[] = [];

      if (limit !== null && !isNaN(limit)) {
        queryText += ' LIMIT $1 OFFSET $2';
        params.push(limit, isNaN(offset) ? 0 : offset);
      }

      const result = await pool.query(queryText, params);
      const prods = result.rows.map(r => ({
        id: r.id,
        name: r.name,
        sku: r.sku,
        category: r.category,
        stock: parseInt(r.stock),
        minStock: parseInt(r.min_stock),
        cost: parseFloat(r.cost),
        price: parseFloat(r.price),
        img: r.img,
        barcode: r.barcode
      }));

      if (limit !== null) {
        const countRes = await pool.query('SELECT COUNT(*) FROM productos');
        const total = parseInt(countRes.rows[0].count);
        return { products: prods, total };
      }

      return prods;
    });

    return NextResponse.json(data);
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error(err);
    return NextResponse.json({ error: 'Error al obtener productos' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireRole(['Administrador', 'Supervisor']);
    const body = await request.json();
    const { name, sku, category, stock, minStock, cost, price, img, barcode } = body;
    const id = crypto.randomUUID();

    await runWithTenant(session.tenantId, () =>
      pool.query(`
        INSERT INTO productos (id, name, sku, category, stock, min_stock, cost, price, img, barcode)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [id, name, sku, category, parseInt(stock) || 0, parseInt(minStock) || 0, parseFloat(cost) || 0, parseFloat(price) || 0, img || null, barcode || null])
    );

    return NextResponse.json({ id, name, sku, category, stock, minStock, cost, price, img, barcode }, { status: 201 });
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error(err);
    if (err.code === '23505') {
      return NextResponse.json({ error: 'El SKU ya está en uso por otro producto' }, { status: 400 });
    } else {
      return NextResponse.json({ error: 'Error al crear producto' }, { status: 500 });
    }
  }
}
