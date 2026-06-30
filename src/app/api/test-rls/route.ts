import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { runWithTenant, getTenantId } from '@/lib/tenant';

export async function GET(request: Request) {
  try {
    const session = await requireRole(['Administrador', 'Supervisor', 'Cajero']);
    let debug = [];
    debug.push("session.tenantId: " + session.tenantId);

    const data = await runWithTenant(session.tenantId, async () => {
      debug.push("getTenantId inside runWithTenant: " + getTenantId());
      
      const res = await pool.query("SELECT current_setting('app.current_tenant_id', true) as t");
      debug.push("app.current_tenant_id from db: " + res.rows[0].t);
      
      return debug;
    });

    return NextResponse.json(data);
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
