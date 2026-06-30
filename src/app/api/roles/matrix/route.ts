import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { handleAuthError } from '@/lib/api-helpers';

export async function GET() {
  try {
    // Solo usuarios autenticados pueden ver la matriz de roles
    await requireRole(['Administrador', 'Supervisor', 'Cajero']);

    const matrix = [
      { resource: 'Usuarios (CRUD completo)', endpoint: '/api/usuarios', get: ['Administrador'], post: ['Administrador'], put: ['Administrador'], delete: ['Administrador'] },
      { resource: 'Productos (Listados)', endpoint: '/api/productos', get: ['Administrador', 'Supervisor', 'Cajero'], post: ['Administrador', 'Supervisor'], put: ['Administrador', 'Supervisor'], delete: ['Administrador', 'Supervisor'] },
      { resource: 'Clientes (CRUD completo)', endpoint: '/api/clientes', get: ['Administrador', 'Supervisor', 'Cajero'], post: ['Administrador', 'Supervisor', 'Cajero'], put: ['Administrador', 'Supervisor', 'Cajero'], delete: ['Administrador', 'Supervisor'] },
      { resource: 'Compras y Proveedores', endpoint: '/api/compras', get: ['Administrador'], post: ['Administrador'], put: ['Administrador'], delete: ['Administrador'] },
      { resource: 'Egresos de Caja', endpoint: '/api/egresos', get: ['Administrador', 'Supervisor', 'Cajero'], post: ['Administrador', 'Supervisor', 'Cajero'], put: [], delete: ['Administrador', 'Supervisor', 'Cajero'] },
      { resource: 'Historial de Ventas', endpoint: '/api/ventas', get: ['Administrador', 'Supervisor', 'Cajero'], post: ['Administrador', 'Supervisor', 'Cajero'], put: [], delete: [] },
      { resource: 'Anulación de Ventas', endpoint: '/api/ventas/[id]/anular', get: [], post: ['Administrador', 'Supervisor'], put: [], delete: [] },
      { resource: 'Cortes de Caja (Reporte Diario)', endpoint: '/api/reportes/corte-caja', get: ['Administrador', 'Supervisor'], post: [], put: [], delete: [] },
      { resource: 'Cortes de Caja (Cierre/Historial)', endpoint: '/api/reportes/corte-caja/cerrar', get: ['Administrador', 'Supervisor', 'Cajero'], post: ['Administrador', 'Supervisor', 'Cajero'], put: [], delete: [] }
    ];

    return NextResponse.json(matrix);
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error(err);
    return NextResponse.json({ error: 'Error al obtener matriz de roles' }, { status: 500 });
  }
}
