import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';
import { runWithTenant } from '@/lib/tenant';
import { signSession } from '@/lib/auth-crypto';
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';

// VULN-01 FIX: 5 login attempts per IP every 15 minutes
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

export async function POST(request: Request) {
  try {
    // Rate limit check before any processing
    const ip = getClientIp(request);
    const rateLimit = await checkRateLimit(`login:${ip}`, LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MS);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Demasiados intentos de inicio de sesión. Intenta de nuevo más tarde.' },
        { 
          status: 429,
          headers: { 'Retry-After': String(rateLimit.retryAfter) }
        }
      );
    }

    const body = await request.json();
    const { email, password, tenantId = 'single' } = body;
    
    if (!email || !password) {
      return NextResponse.json({ error: 'El correo y la contraseña son obligatorios' }, { status: 400 });
    }

    // Resolver slug o ID a la clave física UUID del tenant
    const tenantRes = await pool.query('SELECT id, slug, plan, status, trial_ends_at FROM tenants WHERE id = $1 OR slug = $1', [tenantId]);
    if (tenantRes.rowCount === 0) {
      return NextResponse.json({ error: 'Empresa no registrada' }, { status: 404 });
    }
    const tenant = tenantRes.rows[0];
    const resolvedTenantId = tenant.id;
    const resolvedTenantSlug = tenant.slug;

    // Verificar si la demo expiró
    let trialExpired = false;
    if (tenant.plan === 'demo' && new Date(tenant.trial_ends_at) < new Date()) {
      trialExpired = true;
    }

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
    
    // Crear respuesta con cookie pos_session que incluye el resolvedTenantId y trialExpired
    const response = NextResponse.json({ 
      id: u.id, 
      name: u.name, 
      email: u.email, 
      role: u.role, 
      status: u.status,
      tenantId: u.tenant_id,
      tenantSlug: resolvedTenantSlug,
      trialExpired
    });
    
    response.cookies.set('pos_session', await signSession({ id: u.id, role: u.role, tenantId: u.tenant_id, trialExpired }), {
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
