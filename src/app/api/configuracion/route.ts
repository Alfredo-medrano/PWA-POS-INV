import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const result = await pool.query('SELECT * FROM configuracion LIMIT 1');
    if (result.rowCount === 0) {
      return NextResponse.json({});
    }
    const r = result.rows[0];
    return NextResponse.json({
      bizName: r.biz_name,
      bizType: r.biz_type,
      bizPhone: r.biz_phone,
      bizAddress: r.biz_address,
      dteUrl: r.dte_url,
      dteKey: r.dte_key,
      aperturaCaja: parseFloat(r.apertura_caja) || 200.00
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Error al obtener configuración' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { bizName, bizType, bizPhone, bizAddress, dteUrl, dteKey, aperturaCaja } = body;
    
    const check = await pool.query('SELECT id FROM configuracion LIMIT 1');
    if (check.rowCount > 0) {
      const id = check.rows[0].id;
      await pool.query(`
        UPDATE configuracion
        SET biz_name = $1, biz_type = $2, biz_phone = $3, biz_address = $4, dte_url = $5, dte_key = $6, apertura_caja = $7, updated_at = CURRENT_TIMESTAMP
        WHERE id = $8
      `, [bizName, bizType || null, bizPhone || null, bizAddress || null, dteUrl || null, dteKey || null, parseFloat(aperturaCaja) || 200.00, id]);
      return NextResponse.json({ success: true, message: 'Configuración actualizada' });
    } else {
      const id = 'single';
      await pool.query(`
        INSERT INTO configuracion (id, biz_name, biz_type, biz_phone, biz_address, dte_url, dte_key, apertura_caja)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [id, bizName, bizType || null, bizPhone || null, bizAddress || null, dteUrl || null, dteKey || null, parseFloat(aperturaCaja) || 200.00]);
      return NextResponse.json({ success: true, message: 'Configuración creada' }, { status: 201 });
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Error al guardar configuración' }, { status: 500 });
  }
}
