import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { method } = request;

  // Proteger rutas de API excepto las públicas (login, forgot-password, registro de setup, estado de setup, y GET de configuración)
  if (pathname.startsWith('/api')) {
    const isPublic =
      pathname === '/api/auth/login' ||
      pathname === '/api/auth/global-login' ||
      pathname === '/api/auth/forgot-password' ||
      pathname === '/api/setup/status' ||
      pathname === '/api/setup/register' ||
      (pathname === '/api/configuracion' && method === 'GET');

    if (!isPublic) {
      const session = request.cookies.get('pos_session');
      if (!session || !session.value) {
        return NextResponse.json(
          { error: 'No autorizado. Por favor inicia sesión.' },
          { status: 401 }
        );
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
