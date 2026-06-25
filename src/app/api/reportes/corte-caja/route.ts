import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0,0,0,0);

    // Leer apertura de caja desde configuración
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

    let cash = 0.00;
    let card = 0.00;
    let transfer = 0.00;

    result.rows.forEach(r => {
      const t = parseFloat(r.total);
      if (r.pay_method === 'Efectivo') cash += t;
      else if (r.pay_method === 'Tarjeta') card += t;
      else if (r.pay_method === 'Transferencia') transfer += t;
    });

    // Calcular egresos reales registrados hoy
    const egresosRes = await pool.query(`
      SELECT SUM(amount) as total_egresos 
      FROM egresos 
      WHERE created_at >= $1
    `, [startOfToday]);

    let egresos = 0.00;
    if (egresosRes.rowCount > 0 && egresosRes.rows[0].total_egresos) {
      egresos = parseFloat(egresosRes.rows[0].total_egresos);
    }

    const totalEsperado = apertura + cash + card + transfer - egresos;

    return NextResponse.json([
      { l: "Apertura",         v: apertura,    c: "" },
      { l: "Ventas efectivo",  v: cash,    c: "" },
      { l: "Ventas tarjeta",   v: card,    c: "" },
      { l: "Transferencias",   v: transfer,    c: "" },
      { l: "Egresos",          v: -egresos,    c: "text-red-600" },
      { l: "Total esperado",   v: totalEsperado,   c: "text-[#1B4FD8]" },
    ]);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Error al obtener corte de caja' }, { status: 500 });
  }
}
