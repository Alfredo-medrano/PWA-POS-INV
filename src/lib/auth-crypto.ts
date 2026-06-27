export interface SessionData {
  id: string;
  role: string;
  tenantId: string;
}

// Internal payload type includes expiration — callers never see this directly
interface SessionPayload extends SessionData {
  exp: number;
}

// VULN-04 FIX: Fail hard if SESSION_SECRET is not configured instead of using a guessable default.
// This prevents production deployments from running with a publicly known secret.
const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) {
  throw new Error(
    'FATAL: SESSION_SECRET environment variable is required. ' +
    'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"'
  );
}

// Session TTL: 8 hours (in milliseconds)
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function getHmacSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const data = encoder.encode(payload);
  
  // Use globalThis.crypto to support both standard Node.js and Next.js Edge Runtime
  const cryptoObj = (typeof globalThis !== 'undefined' && globalThis.crypto ? globalThis.crypto : null) as any;
  if (!cryptoObj) {
    throw new Error("Web Crypto API is not available in this environment.");
  }
  const key = await cryptoObj.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await cryptoObj.subtle.sign('HMAC', key, data);
  return arrayBufferToBase64Url(signature);
}

/**
 * VULN-06 FIX: Constant-time string comparison to prevent timing attacks.
 * Works in Edge Runtime without Node.js crypto.timingSafeEqual.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function encodePayload(data: any): string {
  const json = JSON.stringify(data);
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function decodePayload(payload: string): any {
  const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const json = new TextDecoder().decode(bytes);
  return JSON.parse(json);
}

// Sign session data with HMAC-SHA256 + expiration
export async function signSession(data: SessionData): Promise<string> {
  // BUG-04 FIX: Include expiration timestamp in the signed payload
  const payloadData: SessionPayload = {
    ...data,
    exp: Date.now() + SESSION_TTL_MS,
  };
  const payload = encodePayload(payloadData);
  const signature = await getHmacSignature(payload, SESSION_SECRET);
  return `${payload}.${signature}`;
}

// Verify signature and parse session data (edge/middleware-safe)
export async function verifySession(cookieValue: string): Promise<SessionData | null> {
  try {
    const parts = cookieValue.split('.');
    if (parts.length !== 2) return null;
    const [payload, signature] = parts;
    if (!payload || !signature) return null;

    const expectedSignature = await getHmacSignature(payload, SESSION_SECRET);
    
    // VULN-06 FIX: Constant-time comparison instead of !== operator
    if (!timingSafeEqual(expectedSignature, signature)) {
      return null;
    }

    const data = decodePayload(payload);
    if (data && typeof data === 'object' && data.id && data.role && data.tenantId) {
      // BUG-04 FIX: Verify session expiration
      if (typeof data.exp === 'number' && Date.now() > data.exp) {
        return null; // Session expired
      }
      // Return only the SessionData fields (strip exp from the returned object)
      return { id: data.id, role: data.role, tenantId: data.tenantId };
    }
    return null;
  } catch (e: any) {
    console.error("AUTH-CRYPTO VERIFY ERROR:", e);
    return null;
  }
}
