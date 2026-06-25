import { cookies } from 'next/headers';
import { verifySession, signSession, SessionData } from './auth-crypto';

export type { SessionData };
export { verifySession, signSession };

// Retrieve verified session in server context (Server components/API routes)
export function getSession(): SessionData | null {
  try {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get('pos_session');
    if (!sessionCookie || !sessionCookie.value) {
      return null;
    }
    return verifySession(sessionCookie.value);
  } catch (e) {
    return null;
  }
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
