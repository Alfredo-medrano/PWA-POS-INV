import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';
import { signSession } from '@/lib/auth-crypto';
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';

// VULN-01 FIX: 5 login attempts per IP every 15 minutes
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

export async function POST(request: Request) {
  try {
    // Rate limit check before any processing
    const ip = getClientIp(request);
    const rateLimit = await checkRateLimit(`global-login:${ip}`, LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MS);
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
    const { email, password } = body;
    
    if (!email || !password) {
      return NextResponse.json({ error: 'El correo y la contraseña son obligatorios' }, { status: 400 });
    }

    // Buscar al usuario de manera global (sin RLS activo para poder resolver el tenant)
    // Usamos get_user_by_email que corre con SECURITY DEFINER y evita restricciones RLS
    const result = await pool.query('SELECT * FROM get_user_by_email($1)', [email]);
    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    // Ajuste 1.2: Controlar colisión de emails en login global
    if (result.rowCount > 1) {
      return NextResponse.json({
        error: 'Este correo electrónico está registrado en múltiples empresas. Por favor, inicia sesión usando la dirección web específica de tu empresa (ej: /t/empresa).'
      }, { status: 409 });
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
      tenantId: u.tenant_id,
      tenantSlug: tenant.slug
    };

    const response = NextResponse.json({ 
      success: true,
      user: userPayload,
      tenantSlug: tenant.slug,
      trialExpired,
      tenantStatus: tenant.status
    });

    // Guardar sesión en cookies de forma firmada criptográficamente
    response.cookies.set('pos_session', await signSession({ id: u.id, role: u.role, tenantId: u.tenant_id, trialExpired }), {
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
