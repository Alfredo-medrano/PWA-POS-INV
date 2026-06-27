import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { runWithTenant } from '@/lib/tenant';
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';

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

    // Resolver slug o ID a la clave física UUID del tenant
    const tenantRes = await pool.query('SELECT id FROM tenants WHERE id = $1 OR slug = $1', [tenantId]);
    if (tenantRes.rowCount === 0) {
      return NextResponse.json({ error: 'Empresa no registrada' }, { status: 404 });
    }
    const resolvedTenantId = tenantRes.rows[0].id;

    // Ejecutar la consulta del usuario dentro del contexto del tenant
    const userRes = await runWithTenant(resolvedTenantId, () =>
      pool.query('SELECT id, name, email FROM usuarios WHERE email = $1', [email])
    );
    
    if (userRes.rowCount === 0) {
      // BUG-03 FIX: Return generic success to prevent email enumeration, but don't process further.
      return NextResponse.json({
        success: true,
        message: 'Si el correo electrónico está registrado en el sistema, recibirás instrucciones para restablecer tu contraseña.'
      });
    }

    const u = userRes.rows[0];

    // BUG-03 FIX: Generate a secure random reset token instead of a temporary password.
    // The token is hashed before storage so a DB leak doesn't expose valid tokens.
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const tokenId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes TTL

    // Invalidate any previous unused tokens for this user
    await runWithTenant(resolvedTenantId, () =>
      pool.query(
        `UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND used_at IS NULL`,
        [u.id]
      )
    );

    // Store the hashed token
    await runWithTenant(resolvedTenantId, () =>
      pool.query(
        `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)`,
        [tokenId, u.id, tokenHash, expiresAt]
      )
    );

    // TODO: Replace with actual email sending (Resend, SendGrid, or Nodemailer)
    // The reset link should point to: /reset-password?token=<rawToken>&tenant=<resolvedTenantId>
    const resetLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/reset-password?token=${rawToken}&tenant=${resolvedTenantId}`;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔑 [PASSWORD RESET - DEV ONLY] Email: ${email}, Reset Link: ${resetLink}`);
      console.log(`   Token expires at: ${expiresAt.toISOString()}`);
    }

    // Placeholder: sendResetEmail(u.email, u.name, resetLink);
    // When integrating an email provider, implement this function in src/lib/email.ts

    return NextResponse.json({
      success: true,
      message: 'Si el correo electrónico está registrado en el sistema, recibirás instrucciones para restablecer tu contraseña.'
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Error al restablecer la contraseña' }, { status: 500 });
  }
}
