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
      SELECT created_at, total FROM ventas
      WHERE created_at >= NOW() - INTERVAL '${interval}'
      ORDER BY created_at ASC
    `);

    const monthsShort = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const dataMap: Record<string, number> = {};

    if (period === 'semana') {
      const daysShort = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dLabel = daysShort[d.getDay()];
        dataMap[dLabel] = 0;
      }
      result.rows.forEach(r => {
        const dLabel = daysShort[new Date(r.created_at).getDay()];
        if (dataMap[dLabel] !== undefined) {
          dataMap[dLabel] += parseFloat(r.total);
        }
      });
    } else if (period === 'anio') {
      for (let i = 11; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const mLabel = monthsShort[d.getMonth()];
        dataMap[mLabel] = 0;
      }
      result.rows.forEach(r => {
        const mLabel = monthsShort[new Date(r.created_at).getMonth()];
        if (dataMap[mLabel] !== undefined) {
          dataMap[mLabel] += parseFloat(r.total);
        }
      });
    } else {
      // Default to 'mes' (30 days)
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dLabel = `${d.getDate()} ${monthsShort[d.getMonth()]}`;
        dataMap[dLabel] = 0;
      }
      result.rows.forEach(r => {
        const dateObj = new Date(r.created_at);
        const dLabel = `${dateObj.getDate()} ${monthsShort[dateObj.getMonth()]}`;
        if (dataMap[dLabel] !== undefined) {
          dataMap[dLabel] += parseFloat(r.total);
        }
      });
    }

    const data = Object.keys(dataMap).map(k => ({ m: k, v: parseFloat(dataMap[k].toFixed(2)) }));

    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Error al obtener reportes de ventas' }, { status: 500 });
  }
}
