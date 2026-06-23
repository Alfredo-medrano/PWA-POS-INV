import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import crypto from 'crypto';

export async function GET(request: Request) {
  try {
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
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Error al obtener historial de ventas' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { total, payMethod, dteStatus, dteType, cart, customer, rawDteJson } = body;
    
    if (!cart || !Array.isArray(cart) || cart.length === 0) {
      return NextResponse.json({ error: 'El carrito de compras está vacío' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Crear el registro de venta
      const saleId = crypto.randomUUID();
      await client.query(`
        INSERT INTO ventas (id, total, pay_method, dte_status, dte_type, customer_id, customer_name, raw_dte_json)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [saleId, parseFloat(total) || 0.00, payMethod, dteStatus, dteType, customer?.id || null, customer?.name || null, JSON.stringify(rawDteJson || {})]);

      // 2. Decrementar el stock de los productos
      for (const item of cart) {
        const productId = item.product.id;
        const qty = parseInt(item.qty) || 1;

        const prodRes = await client.query('SELECT stock, name FROM productos WHERE id = $1', [productId]);
        if (prodRes.rowCount === 0) {
          throw new Error(`Producto no encontrado en inventario: ${productId}`);
        }

        const currentStock = parseInt(prodRes.rows[0].stock);
        const productName = prodRes.rows[0].name;

        if (currentStock < qty) {
          throw new Error(`Stock insuficiente para ${productName} (Solicitado: ${qty}, Disponible: ${currentStock})`);
        }

        await client.query(`
          UPDATE productos 
          SET stock = stock - $1, updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `, [qty, productId]);
      }

      // 3. Actualizar cliente si aplica
      if (customer && customer.id) {
        const today = new Date().toLocaleDateString("es-SV", { day: '2-digit', month: '2-digit', year: 'numeric' });
        await client.query(`
          UPDATE clientes
          SET total = total + $1, last_buy = $2
          WHERE id = $3
        `, [parseFloat(total) || 0.00, today, customer.id]);
      }

      await client.query('COMMIT');
      return NextResponse.json({ exito: true, id: saleId }, { status: 201 });

    } catch (err: any) {
      await client.query('ROLLBACK');
      console.error('❌ Error procesando transacción de venta:', err.message);
      return NextResponse.json({ error: err.message || 'Error interno al procesar la venta' }, { status: 500 });
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: 'Error al registrar venta' }, { status: 500 });
  }
}
