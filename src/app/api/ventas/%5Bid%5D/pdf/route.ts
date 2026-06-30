import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { runWithTenant } from '@/lib/tenant';
import { requireRole } from '@/lib/auth';
import { handleAuthError } from '@/lib/api-helpers';
import { sendEmail } from '@/lib/email';

// Helper to format currency
const formatUSD = (val: number) => `$${val.toFixed(2)}`;

// Helper to generate the HTML receipt body
function generateReceiptHtml(sale: any, config: any) {
  const dte = sale.raw_dte_json || {};
  const detalles = dte.detalles || [];
  const subtotal = dte.totales?.subtotal || (sale.total / 1.13);
  const iva = dte.totales?.iva || (sale.total - subtotal);
  const total = parseFloat(sale.total) || 0.00;
  const dateStr = new Date(sale.created_at).toLocaleDateString('es-SV', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });

  const detallesHtml = detalles.map((item: any) => `
    <tr>
      <td style="padding: 6px 0; font-weight: 500;">${item.descripcion}</td>
      <td style="padding: 6px 0; text-align: center;">${item.cantidad}</td>
      <td style="padding: 6px 0; text-align: right;">${formatUSD(item.precioUnitario)}</td>
      <td style="padding: 6px 0; text-align: right; font-weight: 600;">${formatUSD(item.monto)}</td>
    </tr>
  `).join('');

  return `
    <div style="font-family: 'Courier New', Courier, monospace; max-width: 380px; margin: 0 auto; padding: 20px; color: #000; line-height: 1.4; border: 1px solid #eee; background-color: #fff;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="margin: 0; font-size: 20px; font-weight: 900; text-transform: uppercase;">${config.biz_name || 'VentaPOS SaaS'}</h2>
        <p style="margin: 4px 0; font-size: 12px; font-weight: 600;">${config.biz_type || 'Punto de Venta'}</p>
        <p style="margin: 2px 0; font-size: 11px;">Tel: ${config.biz_phone || '—'}</p>
        <p style="margin: 2px 0; font-size: 11px;">${config.biz_address || '—'}</p>
      </div>

      <div style="border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 10px 0; margin-bottom: 15px; font-size: 11px;">
        <p style="margin: 3px 0;"><strong>ID Venta:</strong> ${sale.id}</p>
        <p style="margin: 3px 0;"><strong>Fecha:</strong> ${dateStr}</p>
        <p style="margin: 3px 0;"><strong>Cliente:</strong> ${sale.customer_name || 'Consumidor Final'}</p>
        <p style="margin: 3px 0;"><strong>Pago:</strong> ${sale.pay_method}</p>
        <p style="margin: 3px 0;"><strong>Estado DTE:</strong> ${sale.dte_status === 'success' ? 'Firmado' : sale.dte_status === 'voided' ? 'ANULADO' : 'Pendiente'}</p>
        ${dte.identificacion?.numeroControl ? `<p style="margin: 3px 0;"><strong>N° Control DTE:</strong> ${dte.identificacion.numeroControl}</p>` : ''}
      </div>

      <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 15px;">
        <thead>
          <tr style="border-bottom: 1px solid #000;">
            <th style="text-align: left; padding-bottom: 6px; font-weight: bold;">Ítem</th>
            <th style="text-align: center; padding-bottom: 6px; font-weight: bold;">Cant</th>
            <th style="text-align: right; padding-bottom: 6px; font-weight: bold;">P.Unit</th>
            <th style="text-align: right; padding-bottom: 6px; font-weight: bold;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${detallesHtml}
        </tbody>
      </table>

      <div style="border-top: 1px dashed #000; padding-top: 10px; font-size: 12px;">
        <div style="display: flex; justify-content: space-between; margin: 3px 0;">
          <span>Subtotal:</span>
          <span>${formatUSD(subtotal)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin: 3px 0;">
          <span>IVA (13%):</span>
          <span>${formatUSD(iva)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin: 5px 0 0 0; font-size: 14px; font-weight: bold; border-top: 1px solid #000; padding-top: 5px;">
          <span>TOTAL:</span>
          <span>${formatUSD(total)}</span>
        </div>
      </div>

      <div style="text-align: center; margin-top: 30px; font-size: 11px;">
        <p style="margin: 0; font-weight: bold;">¡Gracias por tu compra!</p>
        <p style="margin: 4px 0 0 0; color: #666; font-size: 10px;">Comprobante de compra electrónico.</p>
      </div>
    </div>
  `;
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireRole(['Administrador', 'Supervisor', 'Cajero']);
    const { id } = params;

    const data = await runWithTenant(session.tenantId, async () => {
      // 1. Obtener la venta
      const saleRes = await pool.query(`
        SELECT id, total, pay_method, dte_status, dte_type, customer_name, raw_dte_json, created_at 
        FROM ventas WHERE id = $1
      `, [id]);
      if (saleRes.rowCount === 0) return null;

      // 2. Obtener configuracion del negocio
      const configRes = await pool.query('SELECT biz_name, biz_type, biz_phone, biz_address FROM configuracion LIMIT 1');
      const config = configRes.rowCount > 0 ? configRes.rows[0] : {};

      return { sale: saleRes.rows[0], config };
    });

    if (!data) {
      return new Response('Venta no encontrada', { status: 404 });
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Ticket de Venta #${data.sale.id.slice(0, 8)}</title>
        <style>
          body {
            margin: 0;
            background-color: #f1f5f9;
            display: flex;
            justify-content: center;
            align-items: flex-start;
            padding: 20px;
          }
          @media print {
            body {
              background-color: #fff;
              padding: 0;
            }
            .no-print {
              display: none !important;
            }
            div[style*="border"] {
              border: none !important;
            }
          }
        </style>
      </head>
      <body>
        <div style="display: flex; flex-direction: column; align-items: center; gap: 15px;">
          <div class="no-print" style="display: flex; gap: 10px;">
            <button onclick="window.print()" style="padding: 8px 16px; background-color: #1b4fd8; color: #fff; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 12px; font-family: sans-serif;">
              Imprimir Ticket
            </button>
            <button onclick="window.close()" style="padding: 8px 16px; background-color: #64748b; color: #fff; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 12px; font-family: sans-serif;">
              Cerrar
            </button>
          </div>
          ${generateReceiptHtml(data.sale, data.config)}
        </div>
        <script>
          // Autodisparar impresión si se abre en ventana dedicada
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          }
        </script>
      </body>
      </html>
    `;

    return new Response(htmlContent, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error('❌ Error al imprimir ticket:', err);
    return new Response('Error al generar ticket', { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireRole(['Administrador', 'Supervisor', 'Cajero']);
    const { id } = params;

    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'El correo electrónico es requerido.' }, { status: 400 });
    }

    const result = await runWithTenant(session.tenantId, async () => {
      // 1. Obtener la venta
      const saleRes = await pool.query(`
        SELECT id, total, pay_method, dte_status, dte_type, customer_name, raw_dte_json, created_at 
        FROM ventas WHERE id = $1
      `, [id]);
      if (saleRes.rowCount === 0) return { error: 'Venta no encontrada', status: 404 };

      // 2. Obtener configuracion del negocio
      const configRes = await pool.query('SELECT biz_name, biz_type, biz_phone, biz_address FROM configuracion LIMIT 1');
      const config = configRes.rowCount > 0 ? configRes.rows[0] : {};

      const sale = saleRes.rows[0];
      const htmlBody = generateReceiptHtml(sale, config);

      // Enviar por email
      const sent = await sendEmail({
        to: email,
        subject: `Tu comprobante de compra en ${config.biz_name || 'VentaPOS'}`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; background-color: #f9fafb;">
            <p style="font-size: 14px; color: #4b5563; margin-bottom: 20px;">Estimado cliente, adjuntamos el comprobante electrónico de tu compra:</p>
            ${htmlBody}
          </div>
        `
      });

      if (!sent) {
        return { error: 'No se pudo enviar el correo. Verifica la configuración de Resend.', status: 500 };
      }

      return { success: true };
    });

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ success: true, message: 'Comprobante enviado al correo con éxito.' });
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error('❌ Error al enviar ticket por correo:', err);
    return NextResponse.json({ error: 'Error al enviar correo' }, { status: 500 });
  }
}
