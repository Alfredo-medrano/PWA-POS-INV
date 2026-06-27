import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import crypto from 'crypto';
import axios from 'axios';
import { requireRole } from '@/lib/auth';
import { handleAuthError } from '@/lib/api-helpers';

export async function GET(request: Request) {
  try {
    await requireRole(['Administrador', 'Cajero']);
    
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50') || 50;
    const offset = parseInt(searchParams.get('offset') || '0') || 0;

    const result = await pool.query(`
      SELECT id, total, pay_method, dte_status, dte_type, customer_id, customer_name, raw_dte_json, created_at
      FROM ventas
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    const countRes = await pool.query('SELECT COUNT(*) FROM ventas');
    const totalCount = parseInt(countRes.rows[0].count);

    const sales = result.rows.map(r => ({
      id: r.id,
      total: parseFloat(r.total),
      payMethod: r.pay_method,
      dteStatus: r.dte_status,
      dteType: r.dte_type,
      customerId: r.customer_id,
      customerName: r.customer_name || 'Consumidor Final',
      items: r.raw_dte_json?.detalles || [],
      date: new Date(r.created_at).toLocaleDateString('es-SV', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      time: new Date(r.created_at).toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit', hour12: false }),
      createdAt: r.created_at
    }));

    return NextResponse.json({ sales, total: totalCount });
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error(err);
    return NextResponse.json({ error: 'Error al obtener historial de ventas' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireRole(['Administrador', 'Cajero']);
    
    const body = await request.json();
    const { payMethod, emitDTE, dteType, cart, customer } = body;
    
    if (!cart || !Array.isArray(cart) || cart.length === 0) {
      return NextResponse.json({ error: 'El carrito de compras está vacío' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Recalcular total del carrito en el servidor para evitar manipulación de precios
      let subtotal = 0.00;
      const verifiedCartItems = [];

      for (const item of cart) {
        const productId = item.product.id;
        const qty = parseInt(item.qty) || 1;

        const prodRes = await client.query('SELECT id, name, price, stock FROM productos WHERE id = $1', [productId]);
        if (prodRes.rowCount === 0) {
          throw new Error(`Producto no encontrado en inventario: ${productId}`);
        }

        const dbProd = prodRes.rows[0];
        const currentStock = parseInt(dbProd.stock);

        if (currentStock < qty) {
          throw new Error(`Stock insuficiente para ${dbProd.name} (Solicitado: ${qty}, Disponible: ${currentStock})`);
        }

        const price = parseFloat(dbProd.price);
        subtotal += price * qty;

        verifiedCartItems.push({
          id: dbProd.id,
          name: dbProd.name,
          price: price,
          qty: qty
        });
      }

      const iva = subtotal * 0.13;
      const calculatedTotal = subtotal + iva;

      // 2. Resolver cajero
      const userRes = await client.query('SELECT name FROM usuarios WHERE id = $1', [session.id]);
      const cashierName = userRes.rowCount > 0 ? userRes.rows[0].name : 'Cajero General';

      // 3. Integración DTE (Hacienda) en el Servidor
      let statusDte = 'idle';
      let controlNum = `DTE-${dteType === 'CF' ? '01' : '03'}-M001-${Math.floor(100000000 + Math.random() * 900000000)}`;

      if (emitDTE) {
        statusDte = 'contingencia'; // Fallback por defecto si no está configurado o falla
        
        // Obtener configuración del emisor (contiene dte_url y dte_key)
        const configRes = await client.query('SELECT dte_url, dte_key, biz_name FROM configuracion LIMIT 1');
        if (configRes.rowCount > 0) {
          const cfg = configRes.rows[0];
          if (cfg.dte_url && cfg.dte_key) {
            try {
              let tipoDocumento = '13'; // Default DUI
              let numDocumento = '00000000-0';
              if (customer) {
                if (customer.nit) {
                  tipoDocumento = '36';
                  numDocumento = customer.nit;
                } else if (customer.dui) {
                  tipoDocumento = '13';
                  numDocumento = customer.dui;
                }
              }

              const dtePayload = {
                tipoDte: dteType === 'CF' ? '01' : '03',
                receptor: {
                  nombre: customer?.name || 'Consumidor Final',
                  correo: customer?.email || 'cliente@generico.com',
                  tipoDocumento: tipoDocumento,
                  numDocumento: numDocumento
                },
                items: verifiedCartItems.map(item => ({
                  descripcion: item.name,
                  cantidad: item.qty,
                  precioUnitario: item.price,
                  uniMedida: 59
                })),
                condicionOperacion: 1,
                datosPago: {
                  periodo: null,
                  plazo: null,
                  monto: calculatedTotal
                }
              };

              // Llamado HTTP externo seguro (server-to-server)
              const dteRes = await axios.post(`${cfg.dte_url}/api/dte/v2/facturar`, dtePayload, {
                headers: {
                  'Authorization': `Bearer ${cfg.dte_key}`,
                  'Content-Type': 'application/json'
                },
                timeout: 5000 // 5s timeout
              });

              if (dteRes.data && dteRes.data.numeroControl) {
                controlNum = dteRes.data.numeroControl;
                statusDte = 'success';
              }
            } catch (err: any) {
              console.error('❌ Error llamando a la API DTE de Hacienda, se procede en contingencia:', err.message);
              statusDte = 'contingencia';
            }
          }
        }
      }

      // 4. Estructurar JSON del DTE
      const rawDteJson = {
        cajeroId: session.id,
        cajeroName: cashierName,
        identificacion: {
          version: dteType === 'CF' ? 1 : 3,
          numeroControl: controlNum,
          tipoDte: dteType === 'CF' ? '01' : '03',
          fecEmi: new Date().toISOString().split('T')[0]
        },
        detalles: verifiedCartItems.map(item => ({
          descripcion: item.name,
          cantidad: item.qty,
          precioUnitario: item.price,
          monto: item.price * item.qty
        })),
        totales: {
          subtotal: subtotal,
          iva: iva,
          total: calculatedTotal
        }
      };

      // 5. Crear el registro de venta con el total verificado del servidor
      const saleId = crypto.randomUUID();
      await client.query(`
        INSERT INTO ventas (id, total, pay_method, dte_status, dte_type, customer_id, customer_name, raw_dte_json)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [saleId, calculatedTotal, payMethod, statusDte, dteType, customer?.id || null, customer?.name || null, JSON.stringify(rawDteJson)]);

      // 6. Decrementar el stock de los productos
      for (const item of verifiedCartItems) {
        await client.query(`
          UPDATE productos 
          SET stock = stock - $1, updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `, [item.qty, item.id]);
      }

      // 7. Actualizar balance acumulado del cliente
      if (customer && customer.id) {
        const today = new Date().toLocaleDateString("es-SV", { day: '2-digit', month: '2-digit', year: 'numeric' });
        await client.query(`
          UPDATE clientes
          SET total = total + $1, last_buy = $2
          WHERE id = $3
        `, [calculatedTotal, today, customer.id]);
      }

      await client.query('COMMIT');
      return NextResponse.json({ exito: true, id: saleId, controlNum, dteStatus: statusDte }, { status: 201 });

    } catch (err: any) {
      await client.query('ROLLBACK');
      console.error('❌ Error procesando transacción de venta:', err.message);
      // Evitar propagar errores crudos de base de datos a clientes.
      // Si el error fue lanzado explícitamente por lógica de negocio, se devuelve ese mensaje.
      const isBusinessErr = !err.code && err.message;
      const clientMessage = isBusinessErr ? err.message : 'Error interno al procesar la venta en el servidor.';
      return NextResponse.json({ error: clientMessage }, { status: 500 });
    } finally {
      client.release();
    }
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error(err);
    return NextResponse.json({ error: 'Error al registrar venta' }, { status: 500 });
  }
}
