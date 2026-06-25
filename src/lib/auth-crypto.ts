import crypto from 'crypto';

export interface SessionData {
  id: string;
  role: string;
  tenantId: string;
}

const SESSION_SECRET = process.env.SESSION_SECRET || 'a_very_secure_and_long_default_secret_key_for_pos_system_2026';

// Sign session data with HMAC-SHA256
export function signSession(data: SessionData): string {
  const payload = Buffer.from(JSON.stringify(data)).toString('base64url');
  const hmac = crypto.createHmac('sha256', SESSION_SECRET);
  hmac.update(payload);
  const signature = hmac.digest('base64url');
  return `${payload}.${signature}`;
}

// Verify signature and parse session data (edge/middleware-safe)
export function verifySession(cookieValue: string): SessionData | null {
  try {
    const parts = cookieValue.split('.');
    if (parts.length !== 2) return null;
    const [payload, signature] = parts;
    if (!payload || !signature) return null;

    const hmac = crypto.createHmac('sha256', SESSION_SECRET);
    hmac.update(payload);
    const expectedSignature = hmac.digest('base64url');

    // Safe comparison to prevent timing attacks
    const bufExpected = Buffer.from(expectedSignature);
    const bufActual = Buffer.from(signature);
    if (bufExpected.length !== bufActual.length || !crypto.timingSafeEqual(bufExpected, bufActual)) {
      return null;
    }

    const decoded = Buffer.from(payload, 'base64url').toString('utf8');
    const data = JSON.parse(decoded);
    if (data && typeof data === 'object' && data.id && data.role && data.tenantId) {
      return data as SessionData;
    }
    return null;
  } catch (e) {
    return null;
  }
}
