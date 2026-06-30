import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { handleAuthError } from '@/lib/api-helpers';
import { runWithTenant } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await requireRole(['Administrador', 'Supervisor', 'Cajero']);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const data = await runWithTenant(session.tenantId, async () => {
      // Leer apertura de caja desde configuración del tenant
      const configRes = await pool.query('SELECT apertura_caja FROM configuracion LIMIT 1');
      let apertura = 200.00;
      if (configRes.rowCount > 0 && configRes.rows[0].apertura_caja) {
        apertura = parseFloat(configRes.rows[0].apertura_caja);
      }

      const result = await pool.query(`
        SELECT total, pay_method 
        FROM ventas 
        WHERE created_at >= $1
      `, [startOfToday]);

      let cash = 0.00, card = 0.00, transfer = 0.00;
      result.rows.forEach(r => {
        const t = parseFloat(r.total);
        if (r.pay_method === 'Efectivo') cash += t;
        else if (r.pay_method === 'Tarjeta') card += t;
        else if (r.pay_method === 'Transferencia') transfer += t;
      });

      const egresosRes = await pool.query(`
        SELECT SUM(amount) as total_egresos 
        FROM egresos 
        WHERE created_at >= $1
          AND (deleted_at IS NULL OR deleted_at IS NOT NULL AND false)
      `, [startOfToday]);

      // Simpler: just query without deleted_at filter if column might not exist
      const egresosResClean = await pool.query(`
        SELECT COALESCE(SUM(amount), 0) as total_egresos 
        FROM egresos 
        WHERE created_at >= $1
      `, [startOfToday]);

      let egresos = 0.00;
      if (egresosResClean.rowCount > 0 && egresosResClean.rows[0].total_egresos) {
        egresos = parseFloat(egresosResClean.rows[0].total_egresos);
      }

      const totalEsperadoEfectivo = apertura + cash - egresos;
      const ventasTotalesDia = cash + card + transfer;

      return [
        { l: "Apertura",          v: apertura,               c: "" },
        { l: "Ventas efectivo",   v: cash,                   c: "" },
        { l: "Ventas tarjeta",    v: card,                   c: "" },
        { l: "Transferencias",    v: transfer,               c: "" },
        { l: "Egresos",           v: -egresos,               c: "text-red-600" },
        { l: "Efectivo esperado", v: totalEsperadoEfectivo,  c: "text-[#1B4FD8] font-black" },
        { l: "Ventas totales",    v: ventasTotalesDia,       c: "text-emerald-600 font-black" },
      ];
    });

    return NextResponse.json(data);
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error(err);
    return NextResponse.json({ error: 'Error al obtener corte de caja' }, { status: 500 });
  }
}
