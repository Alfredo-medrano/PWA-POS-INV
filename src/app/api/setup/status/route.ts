import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const configRes = await pool.query('SELECT COUNT(*) FROM configuracion');
    const userRes = await pool.query('SELECT COUNT(*) FROM usuarios');
    return NextResponse.json({
      isConfigured: parseInt(configRes.rows[0].count) > 0,
      hasUsers: parseInt(userRes.rows[0].count) > 0
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Error al obtener estado de configuración' }, { status: 500 });
  }
}
