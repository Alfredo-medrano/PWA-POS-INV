import { cookies } from 'next/headers';

export interface SessionData {
  id: string;
  role: string;
  tenantId: string;
}

export function getSession(): SessionData | null {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get('pos_session');
  if (!sessionCookie || !sessionCookie.value) {
    return null;
  }
  try {
    const data = JSON.parse(sessionCookie.value);
    if (data && typeof data === 'object') {
      if (!data.tenantId) {
        data.tenantId = 'single';
      }
      return data as SessionData;
    }
    return null;
  } catch (e) {
    return null;
  }
}
