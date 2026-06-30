import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { requireRole } from '@/lib/auth';
import { handleAuthError } from '@/lib/api-helpers';

export async function GET() {
  try {
    await requireRole(['Administrador']);
    const result = await pool.query('SELECT id, name, email, role, status FROM usuarios ORDER BY name ASC');
    return NextResponse.json(result.rows);
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error(err);
    return NextResponse.json({ error: 'Error al obtener usuarios' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireRole(['Administrador']);
    const body = await request.json();
    const { name, email, password, role, status } = body;
    
    const allowedRoles = ['Administrador', 'Supervisor', 'Cajero'];
    const assignedRole = allowedRoles.includes(role) ? role : 'Cajero';
    
    const id = crypto.randomUUID();
    const hashedPw = await bcrypt.hash(password, 12);
    
    await pool.query(`
      INSERT INTO usuarios (id, name, email, password, role, status)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [id, name, email, hashedPw, assignedRole, status || 'Activo']);
    
    return NextResponse.json({ id, name, email, role: assignedRole, status }, { status: 201 });
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error(err);
    if (err.code === '23505') {
      return NextResponse.json({ error: 'El correo electrónico ya está en uso' }, { status: 400 });
    } else {
      return NextResponse.json({ error: 'Error al crear usuario' }, { status: 500 });
    }
  }
}

