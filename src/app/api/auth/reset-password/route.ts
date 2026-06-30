import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';
import { runWithTenant } from '@/lib/tenant';
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';
import { verifyResetToken } from '@/lib/reset-tokens';
import { decodePayload } from '@/lib/auth-crypto';

// NB-03: 10 reset confirmation attempts per IP every 1 hour
const RESET_CONFIRM_MAX_ATTEMPTS = 10;
const RESET_CONFIRM_WINDOW_MS = 60 * 60 * 1000;

export async function POST(request: Request) {
  try {
    // NB-03 Rate Limit Check
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`reset-confirm:${ip}`, RESET_CONFIRM_MAX_ATTEMPTS, RESET_CONFIRM_WINDOW_MS);
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
    const { token, password, tenantId } = body;

    if (!token || !password || !tenantId) {
      return NextResponse.json(
        { error: 'Token, contraseña y tenant son campos obligatorios.' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 8 caracteres.' },
        { status: 400 }
      );
    }

    // Resolve tenant
    const tenantRes = await pool.query('SELECT id FROM tenants WHERE id = $1 OR slug = $1', [tenantId]);
    if (tenantRes.rowCount === 0) {
      return NextResponse.json({ error: 'Empresa no registrada' }, { status: 404 });
    }
    const resolvedTenantId = tenantRes.rows[0].id;

    // Decode token to extract userId
    let userId: string;
    try {
      const parts = token.split('.');
      const encoded = parts[0];
      const payload = decodePayload(encoded);
      userId = payload.userId;
      if (!userId) throw new Error();
    } catch (e) {
      return NextResponse.json(
        { error: 'El enlace de restablecimiento es inválido o corrupto.' },
        { status: 400 }
      );
    }

    // Fetch user's current password hash in the resolved tenant context
    const userRes = await runWithTenant(resolvedTenantId, () =>
      pool.query('SELECT password FROM usuarios WHERE id = $1', [userId])
    );
    if (userRes.rowCount === 0) {
      return NextResponse.json(
        { error: 'El enlace de restablecimiento es inválido o el usuario no existe.' },
        { status: 400 }
      );
    }
    const dbPassword = userRes.rows[0].password;

    // Verify token cryptographically and check against the current password hash signature
    const tokenRecord = await verifyResetToken(token, dbPassword);
    if (!tokenRecord || tokenRecord.tenantId !== resolvedTenantId) {
      return NextResponse.json(
        { error: 'El enlace de restablecimiento es inválido, ha expirado o ya fue utilizado.' },
        { status: 400 }
      );
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update password in DB
    await runWithTenant(resolvedTenantId, () =>
      pool.query('UPDATE usuarios SET password = $1 WHERE id = $2', [hashedPassword, userId])
    );

    return NextResponse.json({
      success: true,
      message: 'Contraseña actualizada exitosamente. Ya puedes iniciar sesión.'
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Error al restablecer la contraseña' }, { status: 500 });
  }
}
