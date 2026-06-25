import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;
    
    if (!email || !password) {
      return NextResponse.json({ error: 'El correo y la contraseña son obligatorios' }, { status: 400 });
    }

    // Buscar al usuario de manera global (sin RLS activo para poder resolver el tenant)
    // Usamos pool directamente que en ausencia de tenantId en las cookies no inyectará RLS
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

    // Obtener los datos del tenant/empresa
    const tenantRes = await pool.query('SELECT slug, plan, status, trial_ends_at FROM tenants WHERE id = $1', [u.tenant_id]);
    if (tenantRes.rowCount === 0) {
      return NextResponse.json({ error: 'La empresa asociada a este usuario no existe' }, { status: 404 });
    }

    const tenant = tenantRes.rows[0];

    // Verificar si la demo expiró
    let trialExpired = false;
    if (tenant.plan === 'demo' && new Date(tenant.trial_ends_at) < new Date()) {
      trialExpired = true;
    }

    const userPayload = { 
      id: u.id, 
      name: u.name, 
      email: u.email, 
      role: u.role, 
      status: u.status,
      tenantId: u.tenant_id 
    };

    const response = NextResponse.json({ 
      success: true,
      user: userPayload,
      tenantSlug: tenant.slug,
      trialExpired,
      tenantStatus: tenant.status
    });

    // Guardar sesión en cookies
    response.cookies.set('pos_session', JSON.stringify({ id: u.id, role: u.role, tenantId: u.tenant_id }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });
    
    return response;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Error en inicio de sesión global' }, { status: 500 });
  }
}
