import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { runWithTenant } from '@/lib/tenant';
import { signSession } from '@/lib/auth-crypto';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password, tenantId = 'single' } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Todos los campos son obligatorios' }, { status: 400 });
    }

    // Resolver slug o ID a la clave física UUID del tenant
    const tenantRes = await pool.query('SELECT id, slug FROM tenants WHERE id = $1 OR slug = $1', [tenantId]);
    if (tenantRes.rowCount === 0) {
      return NextResponse.json({ error: 'Empresa no registrada' }, { status: 404 });
    }
    const resolvedTenantId = tenantRes.rows[0].id;
    const resolvedTenantSlug = tenantRes.rows[0].slug;

    // Check if email already exists
    const checkUser = await pool.query('SELECT id FROM get_user_by_email($1)', [email]);
    if (checkUser.rowCount > 0) {
      return NextResponse.json({ error: 'El correo electrónico ya está registrado' }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    const id = crypto.randomUUID();

    // Insert user within the tenant's context
    await runWithTenant(resolvedTenantId, () =>
      pool.query(
        'INSERT INTO usuarios (id, name, email, password, role, status) VALUES ($1, $2, $3, $4, $5, $6)',
        [id, name, email, hashedPassword, 'Cajero', 'Activo']
      )
    );

    const userPayload = { 
      id, 
      name, 
      email, 
      role: 'Cajero', 
      status: 'Activo',
      tenantId: resolvedTenantId,
      tenantSlug: resolvedTenantSlug
    };
    
    const response = NextResponse.json({ success: true, user: userPayload }, { status: 201 });
    
    response.cookies.set('pos_session', signSession({ id, role: 'Cajero', tenantId: resolvedTenantId }), {
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
