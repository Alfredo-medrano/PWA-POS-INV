export interface SessionData {
  id: string;
  role: string;
  tenantId: string;
}

const SESSION_SECRET = process.env.SESSION_SECRET || 'a_very_secure_and_long_default_secret_key_for_pos_system_2026';

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
  const cryptoObj = typeof globalThis !== 'undefined' && globalThis.crypto ? globalThis.crypto : (await import('crypto')).default;
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

// Sign session data with HMAC-SHA256
export async function signSession(data: SessionData): Promise<string> {
  const payload = encodePayload(data);
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
    if (expectedSignature !== signature) {
      return null;
    }

    const data = decodePayload(payload);
    if (data && typeof data === 'object' && data.id && data.role && data.tenantId) {
      return data as SessionData;
    }
    return null;
  } catch (e: any) {
    console.error("AUTH-CRYPTO VERIFY ERROR:", e);
    return null;
  }
}
