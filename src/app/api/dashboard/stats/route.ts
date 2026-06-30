import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { handleAuthError } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireRole(['Administrador', 'Supervisor', 'Cajero']);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const salesRes = await pool.query(`
      SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as count 
      FROM ventas 
      WHERE created_at >= $1
    `, [startOfToday]);
    const salesToday = parseFloat(salesRes.rows[0].total);
    const txCount = parseInt(salesRes.rows[0].count);

    const recentRes = await pool.query(`
      SELECT total, pay_method, raw_dte_json, created_at
      FROM ventas
      ORDER BY created_at DESC
      LIMIT 5
    `);
    const recent = recentRes.rows.map(r => {
      const time = new Date(r.created_at).toLocaleTimeString("es-SV", { hour: '2-digit', minute: '2-digit', hour12: false });
      const cashierName = r.raw_dte_json?.cajeroName || "Cajero General";
      return {
        time,
        cashier: cashierName,
        amount: parseFloat(r.total),
        method: r.pay_method
      };
    });

    const allTodaySales = await pool.query(`
      SELECT total, created_at, raw_dte_json 
      FROM ventas 
      WHERE created_at >= $1
    `, [startOfToday]);

    const hourlyMap: Record<string, number> = {
      "7am": 0, "8am": 0, "9am": 0, "10am": 0, "11am": 0, "12pm": 0,
      "1pm": 0, "2pm": 0, "3pm": 0, "4pm": 0, "5pm": 0, "6pm": 0
    };

    allTodaySales.rows.forEach(s => {
      const date = new Date(s.created_at);
      const hour = date.getHours();
      let label = "";
      if (hour === 7) label = "7am";
      else if (hour === 8) label = "8am";
      else if (hour === 9) label = "9am";
      else if (hour === 10) label = "10am";
      else if (hour === 11) label = "11am";
      else if (hour === 12) label = "12pm";
      else if (hour === 13) label = "1pm";
      else if (hour === 14) label = "2pm";
      else if (hour === 15) label = "3pm";
      else if (hour === 16) label = "4pm";
      else if (hour === 17) label = "5pm";
      else if (hour === 18) label = "6pm";
      
      if (label) {
        hourlyMap[label] += parseFloat(s.total);
      }
    });

    const hourly = Object.keys(hourlyMap).map(k => ({ h: k, v: parseFloat(hourlyMap[k].toFixed(2)) }));

    const productCounts: Record<string, number> = {};
    allTodaySales.rows.forEach(s => {
      const details = s.raw_dte_json?.detalles || [];
      details.forEach((d: any) => {
        const name = d.descripcion;
        const qty = parseInt(d.cantidad) || 0;
        productCounts[name] = (productCounts[name] || 0) + qty;
      });
    });

    let topProduct = "Ninguno";
    let topProductSales = 0;
    Object.keys(productCounts).forEach(name => {
      if (productCounts[name] > topProductSales) {
        topProduct = name;
        topProductSales = productCounts[name];
      }
    });

    return NextResponse.json({
      salesToday,
      txCount,
      topProduct: topProductSales > 0 ? `${topProduct} — ${topProductSales} ventas` : "Ninguno — 0 ventas",
      recent,
      hourly
    });
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error(err);
    return NextResponse.json({ error: 'Error al obtener estadísticas del dashboard' }, { status: 500 });
  }
}
