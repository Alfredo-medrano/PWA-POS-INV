import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { handleAuthError } from '@/lib/api-helpers';
import { runWithTenant } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

// Allowlist of valid period values mapped to PostgreSQL interval strings
const VALID_INTERVALS: Record<string, string> = {
  semana: '7 days',
  mes: '30 days',
  anio: '12 months',
};

export async function GET(request: Request) {
  try {
    const session = await requireRole(['Administrador', 'Supervisor', 'Cajero']);

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'mes';

    const interval = VALID_INTERVALS[period];
    if (!interval) {
      return NextResponse.json(
        { error: `Período inválido: '${period}'. Valores permitidos: semana, mes, anio.` },
        { status: 400 }
      );
    }

    const rows = await runWithTenant(session.tenantId, async () => {
      const result = await pool.query(`
        SELECT 
          DATE_TRUNC('day', created_at) AS date_label,
          SUM(total)::decimal(12,2)::float AS daily_total
        FROM ventas
        WHERE created_at >= NOW() - $1::interval
        GROUP BY date_label
        ORDER BY date_label ASC
      `, [interval]);
      return result.rows;
    });

    const monthsShort = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const dataMap: Record<string, number> = {};

    if (period === 'semana') {
      const daysShort = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        dataMap[daysShort[d.getDay()]] = 0;
      }
      rows.forEach(r => {
        const dLabel = daysShort[new Date(r.date_label).getDay()];
        if (dataMap[dLabel] !== undefined) dataMap[dLabel] += r.daily_total;
      });
    } else if (period === 'anio') {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(); d.setMonth(d.getMonth() - i);
        dataMap[monthsShort[d.getMonth()]] = 0;
      }
      rows.forEach(r => {
        const mLabel = monthsShort[new Date(r.date_label).getMonth()];
        if (dataMap[mLabel] !== undefined) dataMap[mLabel] += r.daily_total;
      });
    } else {
      for (let i = 29; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        dataMap[`${d.getDate()} ${monthsShort[d.getMonth()]}`] = 0;
      }
      rows.forEach(r => {
        const dateObj = new Date(r.date_label);
        const dLabel = `${dateObj.getDate()} ${monthsShort[dateObj.getMonth()]}`;
        if (dataMap[dLabel] !== undefined) dataMap[dLabel] += r.daily_total;
      });
    }

    const data = Object.keys(dataMap).map(k => ({ m: k, v: parseFloat(dataMap[k].toFixed(2)) }));
    return NextResponse.json(data);
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error(err);
    return NextResponse.json({ error: 'Error al obtener reportes de ventas' }, { status: 500 });
  }
}
