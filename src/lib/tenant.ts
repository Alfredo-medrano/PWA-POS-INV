import { AsyncLocalStorage } from 'async_hooks';
import { cookies } from 'next/headers';

// Storage para fijar manualmente el tenant_id en procesos o llamadas específicas
const tenantStorage = new AsyncLocalStorage<string>();

/**
 * Ejecuta una función asíncrona dentro del contexto de un tenant específico.
 */
export function runWithTenant<T>(tenantId: string, fn: () => Promise<T>): Promise<T> {
  return tenantStorage.run(tenantId, fn);
}

/**
 * Obtiene el tenant_id actual del contexto local (AsyncLocalStorage)
 * o intenta extraerlo de la sesión de Next.js (cookies).
 */
export function getTenantId(): string | undefined {
  // 1. Intentar obtenerlo del almacenamiento local asíncrono
  const storageTenantId = tenantStorage.getStore();
  if (storageTenantId) {
    return storageTenantId;
  }

  // 2. Intentar obtenerlo de las cookies de la sesión de Next.js
  try {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get('pos_session');
    if (sessionCookie && sessionCookie.value) {
      const session = JSON.parse(sessionCookie.value);
      return session.tenantId || undefined;
    }
  } catch (e) {
    // Fuera del contexto de solicitud HTTP (ej. durante compilación o scripts)
  }

  return undefined;
}
