import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { runWithTenant } from '@/lib/tenant';
import { requireRole } from '@/lib/auth';
import { handleAuthError } from '@/lib/api-helpers';
import axios from 'axios';

// Función centralizada para reconciliar las ventas de un tenant específico
async function reconcileVentasForTenant(tenantId: string) {
  // 1. Obtener la configuración del emisor para este tenant
  const configRes = await pool.query('SELECT dte_url, dte_key FROM configuracion LIMIT 1');
  if (configRes.rowCount === 0) return;
  
  const cfg = configRes.rows[0];
  if (!cfg.dte_url || !cfg.dte_key) return;

  // 2. Buscar ventas en estado 'processing' creadas hace más de 5 minutos
  const salesRes = await pool.query(`
    SELECT id, raw_dte_json 
    FROM ventas 
    WHERE dte_status = 'processing' 
      AND created_at < NOW() - INTERVAL '5 minutes'
  `);

  for (const sale of salesRes.rows) {
    const saleId = sale.id;
    const rawDteJson = sale.raw_dte_json || {};
    let statusDte = 'contingencia';
    let controlNum = rawDteJson?.identificacion?.numeroControl;

    if (controlNum) {
      try {
        // Consultar el estado del DTE en Hacienda
        const consultRes = await axios.get(`${cfg.dte_url}/api/dte/v2/consultar/${controlNum}`, {
          headers: { 'Authorization': `Bearer ${cfg.dte_key}` },
          timeout: 4000
        });

        if (consultRes.data && consultRes.data.procesado) {
          statusDte = 'success';
          if (consultRes.data.numeroControl) {
            controlNum = consultRes.data.numeroControl;
          }
        }
      } catch (err: any) {
        console.error(`[Reconciliation] Consulta fallida en Hacienda para venta ${saleId}:`, err.message);
        statusDte = 'contingencia';
      }
    }

    // Actualizar el estado de la venta e inyectar el número de control confirmado
    const finalDteJson = { ...rawDteJson };
    if (finalDteJson.identificacion) {
      finalDteJson.identificacion.numeroControl = controlNum;
    }

    await pool.query(`
      UPDATE ventas 
      SET dte_status = $1, raw_dte_json = $2 
      WHERE id = $3
    `, [statusDte, JSON.stringify(finalDteJson), saleId]);

    console.log(`🔑 [RECONCILIATION - AUDIT LOG] Tenant: ${tenantId}, Venta: ${saleId}, Nuevo Estado: ${statusDte}`);
  }
}

export async function POST(request: Request) {
  try {
    const cronSecret = request.headers.get('x-cron-secret') || request.headers.get('Authorization')?.replace('Bearer ', '');

    if (cronSecret && cronSecret === process.env.CRON_SECRET) {
      // 1. MODO CRON / SISTEMA: Consultar e iterar por todos los tenants activos
      const tenantsRes = await pool.query("SELECT id FROM tenants WHERE status = 'active'");
      
      for (const row of tenantsRes.rows) {
        const tenantId = row.id;
        await runWithTenant(tenantId, async () => {
          await reconcileVentasForTenant(tenantId);
        });
      }
      
      return NextResponse.json({ success: true, message: 'Reconciliación de sistema completada exitosamente.' });
    } else {
      // 2. MODO MANUAL: Requiere permisos de Administrador o Supervisor de la sesión actual
      const session = await requireRole(['Administrador', 'Supervisor']);
      const tenantId = session.tenantId;

      await runWithTenant(tenantId, async () => {
        await reconcileVentasForTenant(tenantId);
      });

      return NextResponse.json({ success: true, message: 'Reconciliación manual completada para el tenant actual.' });
    }
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error('❌ Error en el proceso de reconciliación de ventas:', err);
    return NextResponse.json({ error: 'Error interno en el endpoint de reconciliación' }, { status: 500 });
  }
}
