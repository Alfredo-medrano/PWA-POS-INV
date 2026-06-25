import { headers } from 'next/headers';
import { verifySession, signSession, SessionData } from './auth-crypto';

export type { SessionData };
export { verifySession, signSession };

// Retrieve verified session in server context (Server components/API routes)
export function getSession(): SessionData | null {
  try {
    const headerStore = headers();
    const id = headerStore.get('x-user-id');
    const role = headerStore.get('x-user-role');
    const tenantId = headerStore.get('x-tenant-id');
    if (id && role && tenantId) {
      return { id, role, tenantId };
    }
  } catch (e) {
    // Fuera del contexto de solicitud HTTP
  }
  return null;
}

// Validate session and role in API routes (Server-side RBAC)
export async function requireRole(roles: string[]): Promise<SessionData> {
  const session = getSession();
  if (!session) {
    throw new Error('UNAUTHORIZED');
  }
  if (!roles.includes(session.role)) {
    throw new Error('FORBIDDEN');
  }
  return session;
}
