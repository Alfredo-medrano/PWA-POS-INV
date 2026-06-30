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
        return { time, cashier: cashierName, amount: parseFloat(r.total), method: r.pay_method };
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
      const hourLabels: Record<number, string> = { 7:"7am",8:"8am",9:"9am",10:"10am",11:"11am",12:"12pm",13:"1pm",14:"2pm",15:"3pm",16:"4pm",17:"5pm",18:"6pm" };

      allTodaySales.rows.forEach(s => {
        const hour = new Date(s.created_at).getHours();
        const label = hourLabels[hour];
        if (label) hourlyMap[label] += parseFloat(s.total);
      });

      const hourly = Object.keys(hourlyMap).map(k => ({ h: k, v: parseFloat(hourlyMap[k].toFixed(2)) }));

      const productCounts: Record<string, number> = {};
      allTodaySales.rows.forEach(s => {
        const details = s.raw_dte_json?.detalles || [];
        details.forEach((d: any) => {
          productCounts[d.descripcion] = (productCounts[d.descripcion] || 0) + (parseInt(d.cantidad) || 0);
        });
      });

      let topProduct = "Ninguno";
      let topProductSales = 0;
      Object.keys(productCounts).forEach(name => {
        if (productCounts[name] > topProductSales) { topProduct = name; topProductSales = productCounts[name]; }
      });

      return { salesToday, txCount, topProduct: topProductSales > 0 ? `${topProduct} — ${topProductSales} ventas` : "Ninguno — 0 ventas", recent, hourly };
    });

    return NextResponse.json(data);
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error(err);
    return NextResponse.json({ error: 'Error al obtener estadísticas del dashboard' }, { status: 500 });
  }
}
