import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'El correo electrónico es obligatorio' }, { status: 400 });
    }

    // Check if user exists
    const userRes = await pool.query('SELECT id, name FROM usuarios WHERE email = $1', [email]);
    if (userRes.rowCount === 0) {
      return NextResponse.json({ error: 'El correo electrónico no está registrado' }, { status: 404 });
    }

    const u = userRes.rows[0];

    // Generate temporary password
    const rawTempPassword = `Temp-${Math.floor(100000 + Math.random() * 900000)}`;
    const hashedTemp = await bcrypt.hash(rawTempPassword, 12);

    // Update user password in DB
    await pool.query('UPDATE usuarios SET password = $1 WHERE id = $2', [hashedTemp, u.id]);

    return NextResponse.json({
      success: true,
      message: 'Contraseña restablecida con éxito.',
      tempPassword: rawTempPassword
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Error al restablecer la contraseña' }, { status: 500 });
  }
}
