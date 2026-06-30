import { NextResponse } from 'next/server';
import pool, { checkColumnExists } from '@/lib/db';
import crypto from 'crypto';
import { requireRole } from '@/lib/auth';
import { handleAuthError } from '@/lib/api-helpers';

// Obtener egresos registrados hoy
export async function GET() {
  try {
    await requireRole(['Administrador', 'Supervisor', 'Cajero']);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const hasDeletedAt = await checkColumnExists('egresos', 'deleted_at');
    const hasUserId = await checkColumnExists('egresos', 'user_id');

    let queryText = 'SELECT id, amount, concept';
    if (hasUserId) {
      queryText += ', user_id, user_name';
    }
    queryText += ', created_at FROM egresos WHERE created_at >= $1';
    if (hasDeletedAt) {
      queryText += ' AND deleted_at IS NULL';
    }
    queryText += ' ORDER BY created_at DESC';

    const result = await pool.query(queryText, [startOfToday]);

    const egresos = result.rows.map(r => ({
      id: r.id,
      amount: parseFloat(r.amount),
      concept: r.concept,
      userId: hasUserId ? r.user_id : null,
      userName: hasUserId ? r.user_name : 'Cajero',
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
    const session = await requireRole(['Administrador', 'Supervisor', 'Cajero']);

    const body = await request.json();
    const { amount, concept } = body;

    if (!amount || !concept) {
      return NextResponse.json({ error: 'El monto y el concepto son campos obligatorios.' }, { status: 400 });
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return NextResponse.json({ error: 'El monto del egreso debe ser un número positivo.' }, { status: 400 });
    }

    const hasUserId = await checkColumnExists('egresos', 'user_id');
    const id = crypto.randomUUID();

    let cashierName = 'Cajero';
    if (hasUserId) {
      const userRes = await pool.query('SELECT name FROM usuarios WHERE id = $1', [session.id]);
      cashierName = userRes.rowCount > 0 ? userRes.rows[0].name : 'Cajero';
    }

    if (hasUserId) {
      await pool.query(`
        INSERT INTO egresos (id, amount, concept, user_id, user_name)
        VALUES ($1, $2, $3, $4, $5)
      `, [id, numericAmount, concept, session.id, cashierName]);
    } else {
      await pool.query(`
        INSERT INTO egresos (id, amount, concept)
        VALUES ($1, $2, $3)
      `, [id, numericAmount, concept]);
    }

    return NextResponse.json({
      id,
      amount: numericAmount,
      concept,
      userId: hasUserId ? session.id : null,
      userName: cashierName,
      success: true
    }, { status: 201 });
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error('❌ Error al registrar egreso:', err);
    return NextResponse.json({ error: 'Error al registrar egreso' }, { status: 500 });
  }
}
