import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;
    
    const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }
    
    const u = result.rows[0];
    const match = await bcrypt.compare(password, u.password);
    if (!match) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }
    
    if (u.status !== 'Activo') {
      return NextResponse.json({ error: 'El usuario está inactivo' }, { status: 403 });
    }
    
    const response = NextResponse.json({ id: u.id, name: u.name, email: u.email, role: u.role, status: u.status });
    response.cookies.set('pos_session', JSON.stringify({ id: u.id, role: u.role }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });
    return response;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Error en inicio de sesión' }, { status: 500 });
  }
}
