import { NextResponse } from 'next/server';
import pool, { checkTableExists, checkColumnExists } from '@/lib/db';
import { runWithTenant } from '@/lib/tenant';
import { requireRole } from '@/lib/auth';
import { handleAuthError } from '@/lib/api-helpers';
import crypto from 'crypto';

// GET: Obtener el historial de cortes de caja
export async function GET() {
  try {
    const session = await requireRole(['Administrador', 'Supervisor', 'Cajero']);
    
    const hasCortesCajaTable = await checkTableExists('cortes_caja');
    if (!hasCortesCajaTable) {
      return NextResponse.json([]); // Graceful fallback
    }

    const result = await runWithTenant(session.tenantId, () =>
      pool.query(`
        SELECT c.id, c.user_id, u.name as user_name, c.apertura, c.efectivo_esperado, c.efectivo_contado, c.diferencia, c.created_at
        FROM cortes_caja c
        JOIN usuarios u ON u.id = c.user_id
        ORDER BY c.created_at DESC
        LIMIT 100
      `)
    );

    const cortes = result.rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      userName: r.user_name,
      apertura: parseFloat(r.apertura),
      efectivoEsperado: parseFloat(r.efectivo_esperado),
      efectivoContado: parseFloat(r.efectivo_contado),
      diferencia: parseFloat(r.diferencia),
      createdAt: r.created_at
    }));

    return NextResponse.json(cortes);
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error('❌ Error al obtener historial de cortes de caja:', err);
    return NextResponse.json({ error: 'Error al obtener historial de cortes' }, { status: 500 });
  }
}

// POST: Registrar un cierre de caja
export async function POST(request: Request) {
  try {
    const session = await requireRole(['Administrador', 'Supervisor', 'Cajero']);
    
    const body = await request.json();
    const { efectivoContado } = body;

    if (efectivoContado === undefined || efectivoContado === null) {
      return NextResponse.json({ error: 'El efectivo contado es obligatorio.' }, { status: 400 });
    }

    const countedCash = parseFloat(efectivoContado);
    if (isNaN(countedCash) || countedCash < 0) {
      return NextResponse.json({ error: 'El efectivo contado debe ser un número positivo.' }, { status: 400 });
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const hasCortesCajaTable = await checkTableExists('cortes_caja');
    const hasDeletedAt = await checkColumnExists('egresos', 'deleted_at');

    const result = await runWithTenant(session.tenantId, async () => {
      // 1. Obtener apertura de caja
      const configRes = await pool.query('SELECT apertura_caja FROM configuracion LIMIT 1');
      let apertura = 200.00;
      if (configRes.rowCount > 0 && configRes.rows[0].apertura_caja) {
        apertura = parseFloat(configRes.rows[0].apertura_caja);
      }

      // 2. Obtener ventas en efectivo hoy
      const salesRes = await pool.query(`
        SELECT COALESCE(SUM(total), 0) as cash_sales
        FROM ventas
        WHERE pay_method = 'Efectivo' AND created_at >= $1
      `, [startOfToday]);
      const cash = parseFloat(salesRes.rows[0].cash_sales);

      // 3. Obtener egresos hoy (adaptando a presencia de deleted_at)
      let egresosQuery = `SELECT COALESCE(SUM(amount), 0) as total_egresos FROM egresos WHERE created_at >= $1`;
      if (hasDeletedAt) {
        egresosQuery += ` AND deleted_at IS NULL`;
      }
      const egresosRes = await pool.query(egresosQuery, [startOfToday]);
      const egresos = parseFloat(egresosRes.rows[0].total_egresos);

      // 4. Calcular esperado y diferencia
      const esperado = apertura + cash - egresos;
      const diferencia = countedCash - esperado;

      const id = crypto.randomUUID();

      // 5. Insertar el corte de caja si existe la tabla
      if (hasCortesCajaTable) {
        await pool.query(`
          INSERT INTO cortes_caja (id, user_id, apertura, efectivo_esperado, efectivo_contado, diferencia)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [id, session.id, apertura, esperado, countedCash, diferencia]);
      }

      return {
        id,
        userId: session.id,
        apertura,
        efectivoEsperado: esperado,
        efectivoContado: countedCash,
        diferencia,
        createdAt: new Date()
      };
    });

    return NextResponse.json({ exito: true, corte: result }, { status: 201 });
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error('❌ Error al registrar cierre de caja:', err);
    return NextResponse.json({ error: 'Error al registrar cierre de caja' }, { status: 500 });
  }
}
