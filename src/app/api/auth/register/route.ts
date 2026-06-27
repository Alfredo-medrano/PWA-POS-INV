import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { runWithTenant } from '@/lib/tenant';
import { signSession } from '@/lib/auth-crypto';
import { requireRole } from '@/lib/auth';
import { handleAuthError } from '@/lib/api-helpers';

// VULN-02 FIX: Registration is now behind authentication.
// Only Administrators can create new user accounts for their tenant.
export async function POST(request: Request) {
  try {
    const session = await requireRole(['Administrador']);

    const body = await request.json();
    const { name, email, password, role } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Todos los campos son obligatorios' }, { status: 400 });
    }

    // Use the authenticated admin's tenant — no external tenantId parameter needed
    const resolvedTenantId = session.tenantId;

    // Resolve tenant slug for the response
    const tenantRes = await pool.query('SELECT slug FROM tenants WHERE id = $1', [resolvedTenantId]);
    const resolvedTenantSlug = tenantRes.rowCount > 0 ? tenantRes.rows[0].slug : null;

    // Check if email already exists globally
    const checkUser = await pool.query('SELECT id FROM get_user_by_email($1)', [email]);
    if (checkUser.rowCount > 0) {
      return NextResponse.json({ error: 'El correo electrónico ya está registrado' }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    const id = crypto.randomUUID();

    // Validate role — only allow Cajero or Administrador
    const allowedRoles = ['Cajero', 'Administrador'];
    const assignedRole = allowedRoles.includes(role) ? role : 'Cajero';

    // Insert user within the admin's tenant context
    await runWithTenant(resolvedTenantId, () =>
      pool.query(
        'INSERT INTO usuarios (id, name, email, password, role, status) VALUES ($1, $2, $3, $4, $5, $6)',
        [id, name, email, hashedPassword, assignedRole, 'Activo']
      )
    );

    return NextResponse.json({ 
      success: true, 
      user: { id, name, email, role: assignedRole, status: 'Activo', tenantId: resolvedTenantId, tenantSlug: resolvedTenantSlug }
    }, { status: 201 });
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error(err);
    return NextResponse.json({ error: 'Error al registrar usuario' }, { status: 500 });
  }
}
