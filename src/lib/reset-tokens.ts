import { 
  SESSION_SECRET, 
  getHmacSignature, 
  timingSafeEqual, 
  encodePayload, 
  decodePayload 
} from './auth-crypto';

interface ResetTokenPayload {
  userId: string;
  tenantId: string;
  passSig: string;
  exp: number;
}

/**
 * Generates a stateless signed reset token containing the user metadata and
 * a signature of the current password hash to enable invalidation upon use.
 */
export async function signResetToken(
  userId: string,
  tenantId: string,
  passwordHash: string,
  ttlMs: number = 30 * 60 * 1000 // 30 minutes
): Promise<string> {
  const passSig = passwordHash.slice(0, 15);
  const payload: ResetTokenPayload = {
    userId,
    tenantId,
    passSig,
    exp: Date.now() + ttlMs,
  };
  const encoded = encodePayload(payload);
  const signature = await getHmacSignature(encoded, SESSION_SECRET);
  return `${encoded}.${signature}`;
}

/**
 * Verifies the stateless signed reset token, checks expiration, and ensures
 * it matches the current password signature (preventing reuse).
 */
export async function verifyResetToken(
  tokenString: string,
  currentPasswordHash: string
): Promise<{ userId: string; tenantId: string } | null> {
  try {
    const parts = tokenString.split('.');
    if (parts.length !== 2) return null;
    const [encoded, signature] = parts;
    if (!encoded || !signature) return null;

    const expectedSignature = await getHmacSignature(encoded, SESSION_SECRET);
    if (!timingSafeEqual(expectedSignature, signature)) {
      return null;
    }

    const payload = decodePayload(encoded) as ResetTokenPayload;
    if (!payload || !payload.userId || !payload.tenantId || !payload.passSig || !payload.exp) {
      return null;
    }

    if (Date.now() > payload.exp) {
      return null; // Token expired
    }

    // Verify that the password has not been changed since token issuance
    const currentPassSig = currentPasswordHash.slice(0, 15);
    if (!timingSafeEqual(payload.passSig, currentPassSig)) {
      return null; // Token already consumed (password changed)
    }

    return { userId: payload.userId, tenantId: payload.tenantId };
  } catch (err) {
    console.error("verifyResetToken error:", err);
    return null;
  }
}
