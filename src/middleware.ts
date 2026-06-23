import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect all /api/ paths EXCEPT login, register, setup status
  if (pathname.startsWith('/api')) {
    const isPublic =
      pathname === '/api/auth/login' ||
      pathname === '/api/setup/status' ||
      pathname === '/api/setup/register';

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
