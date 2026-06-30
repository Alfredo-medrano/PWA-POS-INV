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
      // BUG-01 FIX: Parameterized interval instead of string interpolation
      const result = await pool.query(`
        SELECT 
          d->>'descripcion' AS name,
          SUM((d->>'cantidad')::integer)::integer AS u,
          SUM((d->>'monto')::decimal(12,2))::float AS rev
        FROM ventas,
        LATERAL jsonb_array_elements(raw_dte_json->'detalles') d
        WHERE created_at >= NOW() - $1::interval
          AND raw_dte_json IS NOT NULL
          AND jsonb_typeof(raw_dte_json->'detalles') = 'array'
        GROUP BY name
        ORDER BY u DESC
        LIMIT 5
      `, [interval]);
      return result.rows;
    });

    return NextResponse.json(rows);
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error(err);
    return NextResponse.json({ error: 'Error al obtener productos más vendidos' }, { status: 500 });
  }
}
