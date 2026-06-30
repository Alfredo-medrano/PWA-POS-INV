import { NextResponse } from 'next/server';
import pool, { checkColumnExists } from '@/lib/db';
import crypto from 'crypto';
import axios from 'axios';
import { requireRole } from '@/lib/auth';
import { handleAuthError } from '@/lib/api-helpers';
import { runWithTenant } from '@/lib/tenant';

export async function GET(request: Request) {
  try {
    const session = await requireRole(['Administrador', 'Supervisor', 'Cajero']);

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50') || 50;
    const offset = parseInt(searchParams.get('offset') || '0') || 0;

    const data = await runWithTenant(session.tenantId, async () => {
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

      return { sales, total: totalCount };
    });

    return NextResponse.json(data);
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error(err);
    return NextResponse.json({ error: 'Error al obtener historial de ventas' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireRole(['Administrador', 'Supervisor', 'Cajero']);
    
    const body = await request.json();
    const { payMethod, emitDTE, dteType, cart, customer } = body;
    
    // 0. Validar Idempotency Key (debe ser un UUID v4 válido)
    const idempotencyKey = request.headers.get('x-idempotency-key') || body.idempotencyKey;
    const uuidv4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!idempotencyKey || typeof idempotencyKey !== 'string' || !uuidv4Regex.test(idempotencyKey)) {
      return NextResponse.json({ error: 'La clave de idempotencia es requerida y debe ser un UUID v4 válido.' }, { status: 400 });
    }

    const hasIdempotencyKeyCol = await checkColumnExists('ventas', 'idempotency_key');

    // Si la columna no existe, hacemos la verificación manual antes de insertar
    if (!hasIdempotencyKeyCol) {
      const dupRes = await pool.query(
        `SELECT id, dte_status, raw_dte_json FROM ventas WHERE raw_dte_json->>'idempotencyKey' = $1 LIMIT 1`,
        [idempotencyKey]
      );
      if (dupRes.rowCount > 0) {
        const sale = dupRes.rows[0];
        return NextResponse.json({
          exito: true,
          id: sale.id,
          controlNum: sale.raw_dte_json?.identificacion?.numeroControl || '',
          dteStatus: sale.dte_status
        }, { status: 200 });
      }
    }

    if (!cart || !Array.isArray(cart) || cart.length === 0) {
      return NextResponse.json({ error: 'El carrito de compras está vacío' }, { status: 400 });
    }

    // Orden determinista de bloqueo para prevenir deadlocks
    const sortedCart = [...cart].sort((a, b) =>
      String(a.product.id).localeCompare(String(b.product.id))
    );

    // Wrap the entire transaction in runWithTenant so the pool Proxy sets
    // app.current_tenant_id before any query fires (activating RLS policies).
    return await runWithTenant(session.tenantId, async () => {
    const client = await pool.connect();
    let saleId = crypto.randomUUID();
    let subtotal = 0.00;
    const verifiedCartItems: any[] = [];
    
    try {
      await client.query('BEGIN');

      // 1. Recalcular total del carrito en el servidor para evitar manipulación de precios
      // Usar FOR UPDATE para bloqueo pesimista en orden determinista
      for (const item of sortedCart) {
        const productId = item.product.id;
        const qty = parseInt(item.qty) || 1;

        const prodRes = await client.query('SELECT id, name, price, stock FROM productos WHERE id = $1 FOR UPDATE', [productId]);
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

      let controlNum = `DTE-${dteType === 'CF' ? '01' : '03'}-M001-${Math.floor(100000000 + Math.random() * 900000000)}`;
      let statusDte = emitDTE ? 'processing' : 'idle';

      // 4. Estructurar JSON inicial del DTE
      const rawDteJson: any = {
        cajeroId: session.id,
        cajeroName: cashierName,
        identificacion: {
          version: dteType === 'CF' ? 1 : 3,
          numeroControl: controlNum,
          tipoDte: dteType === 'CF' ? '01' : '03',
          fecEmi: new Date().toISOString().split('T')[0]
        },
        detalles: verifiedCartItems.map(item => ({
          productId: item.id,
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

      if (!hasIdempotencyKeyCol) {
        rawDteJson.idempotencyKey = idempotencyKey;
      }

      // 5. Crear el registro de venta con total (adaptando a presencia de columna idempotency_key)
      if (hasIdempotencyKeyCol) {
        await client.query(`
          INSERT INTO ventas (id, total, pay_method, dte_status, dte_type, customer_id, customer_name, raw_dte_json, idempotency_key)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [saleId, calculatedTotal, payMethod, statusDte, dteType, customer?.id || null, customer?.name || null, JSON.stringify(rawDteJson), idempotencyKey]);
      } else {
        await client.query(`
          INSERT INTO ventas (id, total, pay_method, dte_status, dte_type, customer_id, customer_name, raw_dte_json)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [saleId, calculatedTotal, payMethod, statusDte, dteType, customer?.id || null, customer?.name || null, JSON.stringify(rawDteJson)]);
      }

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
      client.release();

      // --- TRABAJO FUERA DE LA TRANSACCIÓN (DTE/Hacienda) ---
      let finalStatusDte = statusDte;
      let finalControlNum = controlNum;
      let finalDteJson = { ...rawDteJson };

      if (emitDTE) {
        // Consultar configuracion
        const configRes = await pool.query('SELECT dte_url, dte_key FROM configuracion LIMIT 1');
        if (configRes.rowCount > 0) {
          const cfg = configRes.rows[0];
          if (cfg.dte_url && cfg.dte_key) {
            try {
              let tipoDocumento = '13';
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

              const dteRes = await axios.post(`${cfg.dte_url}/api/dte/v2/facturar`, dtePayload, {
                headers: {
                  'Authorization': `Bearer ${cfg.dte_key}`,
                  'Content-Type': 'application/json'
                },
                timeout: 5000
              });

              if (dteRes.data && dteRes.data.numeroControl) {
                finalControlNum = dteRes.data.numeroControl;
                finalStatusDte = 'success';
                finalDteJson.identificacion.numeroControl = finalControlNum;
              }
            } catch (err: any) {
              console.error('❌ Error llamando a la API DTE de Hacienda, se procede en contingencia:', err.message);
              finalStatusDte = 'contingencia';
            }
          }
        }

        // Actualizar el estado de la venta de forma asíncrona/aislada
        await pool.query(`
          UPDATE ventas 
          SET dte_status = $1, raw_dte_json = $2 
          WHERE id = $3
        `, [finalStatusDte, JSON.stringify(finalDteJson), saleId]);
      }

      return NextResponse.json({ exito: true, id: saleId, controlNum: finalControlNum, dteStatus: finalStatusDte }, { status: 201 });

    } catch (err: any) {
      await client.query('ROLLBACK');
      client.release();

      // Control de error de clave de idempotencia duplicada (código 23505)
      if (err.code === '23505') {
        const queryText = hasIdempotencyKeyCol 
          ? 'SELECT id, dte_status, raw_dte_json FROM ventas WHERE idempotency_key = $1'
          : `SELECT id, dte_status, raw_dte_json FROM ventas WHERE raw_dte_json->>'idempotencyKey' = $1`;
        
        const existingSale = await pool.query(queryText, [idempotencyKey]);
        if (existingSale.rowCount > 0) {
          const sale = existingSale.rows[0];
          return NextResponse.json({
            exito: true,
            id: sale.id,
            controlNum: sale.raw_dte_json?.identificacion?.numeroControl || '',
            dteStatus: sale.dte_status
          }, { status: 200 });
        }
      }

      console.error('❌ Error procesando transacción de venta:', err.message);
      const isBusinessErr = !err.code && err.message;
      const clientMessage = isBusinessErr ? err.message : 'Error interno al procesar la venta en el servidor.';
      return NextResponse.json({ error: clientMessage }, { status: 500 });
    }
    }); // end runWithTenant
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error(err);
    return NextResponse.json({ error: 'Error al registrar venta' }, { status: 500 });
  }
}
