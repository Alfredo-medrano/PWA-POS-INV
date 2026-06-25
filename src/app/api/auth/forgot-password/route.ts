import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';
import { runWithTenant } from '@/lib/tenant';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, tenantId = 'single' } = body;

    if (!email) {
      return NextResponse.json({ error: 'El correo electrónico es obligatorio' }, { status: 400 });
    }

    // Ejecutar la consulta del usuario dentro del contexto del tenant
    const userRes = await runWithTenant(tenantId, () =>
      pool.query('SELECT id, name FROM usuarios WHERE email = $1', [email])
    );
    
    if (userRes.rowCount === 0) {
      return NextResponse.json({ error: 'El correo electrónico no está registrado en esta empresa' }, { status: 404 });
    }

    const u = userRes.rows[0];

    // Generar contraseña temporal
    const rawTempPassword = `Temp-${Math.floor(100000 + Math.random() * 900000)}`;
    const hashedTemp = await bcrypt.hash(rawTempPassword, 12);

    // Actualizar contraseña dentro del contexto del tenant
    await runWithTenant(tenantId, () =>
      pool.query('UPDATE usuarios SET password = $1 WHERE id = $2', [hashedTemp, u.id])
    );

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
