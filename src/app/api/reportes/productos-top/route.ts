import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'mes';

    let interval = '30 days';
    if (period === 'semana') {
      interval = '7 days';
    } else if (period === 'anio') {
      interval = '12 months';
    }

    const result = await pool.query(`
      SELECT raw_dte_json, total FROM ventas
      WHERE created_at >= NOW() - INTERVAL '${interval}'
    `);

    const productAgg: Record<string, { u: number; rev: number }> = {};

    result.rows.forEach(r => {
      const details = r.raw_dte_json?.detalles || [];
      details.forEach((d: any) => {
        const name = d.descripcion;
        const qty = parseInt(d.cantidad) || 0;
        const rev = parseFloat(d.monto) || 0;
        if (!productAgg[name]) {
          productAgg[name] = { u: 0, rev: 0 };
        }
        productAgg[name].u += qty;
        productAgg[name].rev += rev;
      });
    });

    const list = Object.keys(productAgg).map(name => ({
      name,
      u: productAgg[name].u,
      rev: parseFloat(productAgg[name].rev.toFixed(2))
    }))
    .sort((a, b) => b.u - a.u)
    .slice(0, 5);

    return NextResponse.json(list);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Error al obtener productos más vendidos' }, { status: 500 });
  }
}
