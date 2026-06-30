import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';
import { runWithTenant } from '@/lib/tenant';
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';
import { sendEmail, getResetPasswordTemplate } from '@/lib/email';
import { signResetToken } from '@/lib/reset-tokens';

// VULN-01 FIX: 3 reset attempts per IP every 15 minutes (stricter than login)
const RESET_MAX_ATTEMPTS = 3;
const RESET_WINDOW_MS = 15 * 60 * 1000;

export async function POST(request: Request) {
  try {
    // Rate limit check before any processing
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`forgot:${ip}`, RESET_MAX_ATTEMPTS, RESET_WINDOW_MS);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Demasiados intentos. Intenta de nuevo más tarde.' },
        { 
          status: 429,
          headers: { 'Retry-After': String(rateLimit.retryAfter) }
        }
      );
    }

    const body = await request.json();
    const { email, tenantId = 'single' } = body;

    if (!email) {
      return NextResponse.json({ error: 'El correo electrónico es obligatorio' }, { status: 400 });
    }

    let resolvedTenantId: string | null = null;

    // Resolve tenant ID globally using the email if tenantId is the default 'single'
    if (tenantId === 'single') {
      const globalUserRes = await pool.query('SELECT tenant_id FROM get_user_by_email($1)', [email]);
      if (globalUserRes.rowCount > 0) {
        resolvedTenantId = globalUserRes.rows[0].tenant_id;
      }
    }

    // Fallback to resolving the tenant ID by slug/ID
    if (!resolvedTenantId) {
      const tenantRes = await pool.query('SELECT id FROM tenants WHERE id = $1 OR slug = $1', [tenantId]);
      if (tenantRes.rowCount === 0) {
        return NextResponse.json({ error: 'Empresa no registrada' }, { status: 404 });
      }
      resolvedTenantId = tenantRes.rows[0].id;
    }

    // Ejecutar la consulta del usuario dentro del contexto del tenant
    const userRes = await runWithTenant(resolvedTenantId, () =>
      pool.query('SELECT id, name, email, password FROM usuarios WHERE email = $1', [email])
    );
    
    if (userRes.rowCount === 0) {
      // BUG-03 FIX: Return generic success to prevent email enumeration, but don't process further.
      return NextResponse.json({
        success: true,
        message: 'Si el correo electrónico está registrado en el sistema, recibirás instrucciones para restablecer tu contraseña.'
      });
    }

    const u = userRes.rows[0];

    // BUG-03 FIX: Generate a secure signed stateless token containing user metadata and password signature
    const rawToken = await signResetToken(u.id, resolvedTenantId, u.password);

    // Reset link pointing to the password reset confirmation route
    const resetLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/reset-password?token=${rawToken}&tenant=${resolvedTenantId}`;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔑 [PASSWORD RESET - DEV ONLY] Email: ${email}, Reset Link: ${resetLink}`);
    }

    // Send the password recovery email using Resend
    await sendEmail({
      to: u.email,
      subject: 'Restablecer Contraseña - PWA-POS-INV',
      html: getResetPasswordTemplate(u.name, resetLink),
    });

    return NextResponse.json({
      success: true,
      message: 'Si el correo electrónico está registrado en el sistema, recibirás instrucciones para restablecer tu contraseña.'
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Error al restablecer la contraseña' }, { status: 500 });
  }
}
