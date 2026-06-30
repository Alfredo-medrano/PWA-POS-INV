import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import crypto from 'crypto';
import { requireRole } from '@/lib/auth';
import { handleAuthError } from '@/lib/api-helpers';

// Obtener egresos registrados hoy
export async function GET() {
  try {
    await requireRole(['Administrador', 'Supervisor', 'Cajero']);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const result = await pool.query(`
      SELECT id, amount, concept, created_at
      FROM egresos
      WHERE created_at >= $1
      ORDER BY created_at DESC
    `, [startOfToday]);

    const egresos = result.rows.map(r => ({
      id: r.id,
      amount: parseFloat(r.amount),
      concept: r.concept,
      createdAt: r.created_at
    }));

    return NextResponse.json(egresos);
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error('❌ Error al obtener egresos:', err);
    return NextResponse.json({ error: 'Error al obtener egresos' }, { status: 500 });
  }
}

// Registrar un egreso
export async function POST(request: Request) {
  try {
    await requireRole(['Administrador', 'Supervisor', 'Cajero']);

    const body = await request.json();
    const { amount, concept } = body;

    if (!amount || !concept) {
      return NextResponse.json({ error: 'El monto y el concepto son campos obligatorios.' }, { status: 400 });
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return NextResponse.json({ error: 'El monto del egreso debe ser un número positivo.' }, { status: 400 });
    }

    const id = crypto.randomUUID();
    await pool.query(`
      INSERT INTO egresos (id, amount, concept)
      VALUES ($1, $2, $3)
    `, [id, numericAmount, concept]);

    return NextResponse.json({
      id,
      amount: numericAmount,
      concept,
      success: true
    }, { status: 201 });
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error('❌ Error al registrar egreso:', err);
    return NextResponse.json({ error: 'Error al registrar egreso' }, { status: 500 });
  }
}
