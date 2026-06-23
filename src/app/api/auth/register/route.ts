import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Todos los campos son obligatorios' }, { status: 400 });
    }

    // Check if email already exists
    const checkUser = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email]);
    if (checkUser.rowCount > 0) {
      return NextResponse.json({ error: 'El correo electrónico ya está registrado' }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    const id = crypto.randomUUID();

    // Insert user
    await pool.query(
      'INSERT INTO usuarios (id, name, email, password, role, status) VALUES ($1, $2, $3, $4, $5, $6)',
      [id, name, email, hashedPassword, 'Cajero', 'Activo']
    );

    const userPayload = { id, name, email, role: 'Cajero', status: 'Activo' };
    const response = NextResponse.json({ success: true, user: userPayload }, { status: 201 });
    
    response.cookies.set('pos_session', JSON.stringify({ id, role: 'Cajero' }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });

    return response;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Error al registrar usuario' }, { status: 500 });
  }
}
