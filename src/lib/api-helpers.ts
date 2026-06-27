import { NextResponse } from 'next/server';

/**
 * Centralized handler for authentication/authorization errors thrown by requireRole().
 * Maps UNAUTHORIZED and FORBIDDEN error messages to appropriate HTTP responses.
 * 
 * @returns NextResponse if the error is an auth error, null otherwise (caller should handle as 500).
 */
export function handleAuthError(err: any): NextResponse | null {
  if (err.message === 'UNAUTHORIZED') {
    return NextResponse.json(
      { error: 'No autorizado. Por favor inicia sesión.' },
      { status: 401 }
    );
  }
  if (err.message === 'FORBIDDEN') {
    return NextResponse.json(
      { error: 'Acceso denegado. Permisos insuficientes.' },
      { status: 403 }
    );
  }
  return null;
}
