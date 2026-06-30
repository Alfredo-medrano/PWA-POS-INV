import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySession } from '@/lib/auth-crypto';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { method } = request;

  // Limpiar cualquier cabecera custom enviada por el cliente para evitar suplantaciones (header spoofing)
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete('x-tenant-id');
  requestHeaders.delete('x-user-role');
  requestHeaders.delete('x-user-id');

  // Proteger rutas de API excepto las públicas
  // VULN-02 FIX: /api/auth/register removed from public routes (now requires auth)
  if (pathname.startsWith('/api')) {
    const isPublic =
      pathname === '/api/auth/login' ||
      pathname === '/api/auth/global-login' ||
      pathname === '/api/auth/forgot-password' ||
      pathname === '/api/auth/reset-password' ||
      pathname === '/api/setup/status' ||
      pathname === '/api/setup/register' ||
      (pathname === '/api/configuracion' && method === 'GET');

    if (!isPublic) {
      const sessionCookie = request.cookies.get('pos_session');
      if (!sessionCookie || !sessionCookie.value) {
        return NextResponse.json(
          { error: 'No autorizado. Por favor inicia sesión.' },
          { status: 401 }
        );
      }

      // Validar la firma criptográfica de la sesión de forma asíncrona (compatible con Edge)
      const verified = await verifySession(sessionCookie.value);
      if (!verified) {
        return NextResponse.json(
          { error: 'Sesión inválida o expirada. Por favor inicia sesión.' },
          { status: 401 }
        );
      }

      // Ajuste 2.4: Enforcement de trial expirado en middleware
      if (verified.trialExpired && verified.role !== 'Administrador') {
        const isAllowedDuringExpired =
          pathname === '/api/auth/logout' ||
          (pathname === '/api/configuracion' && method === 'GET');

        if (!isAllowedDuringExpired) {
          return NextResponse.json(
            { error: 'Licencia demo expirada. Por favor contacta al administrador para renovar o realizar el pago.' },
            { status: 403 }
          );
        }
      }

      // Inyectar cabeceras seguras una vez verificado el token
      requestHeaders.set('x-tenant-id', verified.tenantId);
      requestHeaders.set('x-user-role', verified.role);
      requestHeaders.set('x-user-id', verified.id);
    }
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ['/api/:path*'],
};
