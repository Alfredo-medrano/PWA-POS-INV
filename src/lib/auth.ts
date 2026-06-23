import { cookies } from 'next/headers';

export function getSession() {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get('pos_session');
  if (!sessionCookie || !sessionCookie.value) {
    return null;
  }
  try {
    return JSON.parse(sessionCookie.value);
  } catch (e) {
    return null;
  }
}
