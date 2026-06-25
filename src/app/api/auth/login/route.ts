import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';
import { runWithTenant } from '@/lib/tenant';
import { signSession } from '@/lib/auth-crypto';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, tenantId = 'single' } = body;
    
    if (!email || !password) {
      return NextResponse.json({ error: 'El correo y la contraseña son obligatorios' }, { status: 400 });
    }

    // Resolver slug o ID a la clave física UUID del tenant
    const tenantRes = await pool.query('SELECT id, slug FROM tenants WHERE id = $1 OR slug = $1', [tenantId]);
    if (tenantRes.rowCount === 0) {
      return NextResponse.json({ error: 'Empresa no registrada' }, { status: 404 });
    }
    const resolvedTenantId = tenantRes.rows[0].id;
    const resolvedTenantSlug = tenantRes.rows[0].slug;

    // Buscar al usuario dentro del contexto del tenant especificado
    const result = await runWithTenant(resolvedTenantId, () =>
      pool.query('SELECT * FROM usuarios WHERE email = $1', [email])
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Credenciales inválidas o usuario no pertenece a esta empresa' }, { status: 401 });
    }
    
    const u = result.rows[0];
    const match = await bcrypt.compare(password, u.password);
    if (!match) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }
    
    if (u.status !== 'Activo') {
      return NextResponse.json({ error: 'El usuario está inactivo' }, { status: 403 });
    }
    
    // Crear respuesta con cookie pos_session que incluye el resolvedTenantId
    const response = NextResponse.json({ 
      id: u.id, 
      name: u.name, 
      email: u.email, 
      role: u.role, 
      status: u.status,
      tenantId: u.tenant_id,
      tenantSlug: resolvedTenantSlug
    });
    
    response.cookies.set('pos_session', signSession({ id: u.id, role: u.role, tenantId: u.tenant_id }), {
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
