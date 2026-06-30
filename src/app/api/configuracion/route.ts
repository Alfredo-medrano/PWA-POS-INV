import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { runWithTenant } from '@/lib/tenant';
import { requireRole, getSession } from '@/lib/auth';
import { handleAuthError } from '@/lib/api-helpers';
import crypto from 'crypto';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const queryTenantId = searchParams.get('tenantId');

    let trialExpired = false;
    let tenantStatus = 'active';
    let resolvedTenantId = queryTenantId;
    let resolvedTenantSlug = null;

    if (queryTenantId) {
      // Buscar tenant por id o por slug
      const tenantRes = await pool.query('SELECT id, slug, plan, status, trial_ends_at FROM tenants WHERE id = $1 OR slug = $1', [queryTenantId]);
      if (tenantRes.rowCount === 0) {
        return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });
      }
      const tenant = tenantRes.rows[0];
      resolvedTenantId = tenant.id;
      resolvedTenantSlug = tenant.slug;
      tenantStatus = tenant.status;
      if (tenant.plan === 'demo' && new Date(tenant.trial_ends_at) < new Date()) {
        trialExpired = true;
      }
    }

    const queryFn = () => pool.query('SELECT * FROM configuracion LIMIT 1');

    // Ejecutar consulta bajo el contexto del tenant
    const result = resolvedTenantId 
      ? await runWithTenant(resolvedTenantId, queryFn)
      : await queryFn();

    if (result.rowCount === 0) {
      return NextResponse.json({ 
        tenantId: resolvedTenantId,
        tenantSlug: resolvedTenantSlug,
        bizName: 'Configuración pendiente',
        trialExpired,
        tenantStatus
      });
    }
    const r = result.rows[0];
    const session = getSession();

    if (!session) {
      return NextResponse.json({
        tenantId: resolvedTenantId,
        tenantSlug: resolvedTenantSlug,
        bizName: r.biz_name,
        trialExpired,
        tenantStatus
      });
    }

    return NextResponse.json({
      tenantId: resolvedTenantId,
      tenantSlug: resolvedTenantSlug,
      bizName: r.biz_name,
      bizType: r.biz_type,
      bizPhone: r.biz_phone,
      bizAddress: r.biz_address,
      dteUrl: r.dte_url,
      // Retornar máscara segura si existe llave, nunca la clave real en texto plano
      dteKey: r.dte_key ? '••••••••' : '',
      aperturaCaja: parseFloat(r.apertura_caja) || 200.00,
      trialExpired,
      tenantStatus
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Error al obtener configuración' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireRole(['Administrador']);
    const body = await request.json();
    const { bizName, bizType, bizPhone, bizAddress, dteUrl, dteKey, aperturaCaja } = body;

    await runWithTenant(session.tenantId, async () => {
      const check = await pool.query('SELECT id, dte_key FROM configuracion LIMIT 1');
      if (check.rowCount > 0) {
        const id = check.rows[0].id;
        const oldDteKey = check.rows[0].dte_key;
        // Preservar la clave existente si el cliente envía la máscara de vuelta
        const finalDteKey = dteKey === '••••••••' ? oldDteKey : dteKey;
        
        await pool.query(`
          UPDATE configuracion
          SET biz_name = $1, biz_type = $2, biz_phone = $3, biz_address = $4, dte_url = $5, dte_key = $6, apertura_caja = $7, updated_at = CURRENT_TIMESTAMP
          WHERE id = $8
        `, [bizName, bizType || null, bizPhone || null, bizAddress || null, dteUrl || null, finalDteKey || null, parseFloat(aperturaCaja) || 200.00, id]);
      } else {
        const id = crypto.randomUUID();
        const finalDteKey = dteKey === '••••••••' ? null : dteKey;
        
        await pool.query(`
          INSERT INTO configuracion (id, biz_name, biz_type, biz_phone, biz_address, dte_url, dte_key, apertura_caja)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [id, bizName, bizType || null, bizPhone || null, bizAddress || null, dteUrl || null, finalDteKey || null, parseFloat(aperturaCaja) || 200.00]);
      }
    });

    return NextResponse.json({ success: true, message: 'Configuración guardada' });
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error(err);
    return NextResponse.json({ error: 'Error al guardar configuración' }, { status: 500 });
  }
}

