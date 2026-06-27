/**
 * In-memory store for password reset tokens.
 * Bypasses the database DDL permission restrictions in environments
 * where the application database user does not have schema modification privileges.
 */

interface ResetToken {
  userId: string;
  tenantId: string;
  expiresAt: number;
}

const store = new Map<string, ResetToken>();

/**
 * Stores a new reset token hash and invalidates any previous active tokens for the same user.
 */
export function storeResetToken(
  tokenHash: string,
  userId: string,
  tenantId: string,
  expiresAt: Date
): void {
  // Invalidate previous tokens for this user to prevent multiple active reset links
  store.forEach((entry, hash) => {
    if (entry.userId === userId && entry.tenantId === tenantId) {
      store.delete(hash);
    }
  });

  store.set(tokenHash, {
    userId,
    tenantId,
    expiresAt: expiresAt.getTime(),
  });
}

/**
 * Retrieves a reset token if it exists and has not expired.
 * Automatically deletes expired tokens upon access.
 */
export function getResetToken(tokenHash: string): ResetToken | null {
  const entry = store.get(tokenHash);
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    store.delete(tokenHash);
    return null;
  }

  return entry;
}

/**
 * Consumes/deletes a reset token after successful use.
 */
export function consumeResetToken(tokenHash: string): void {
  store.delete(tokenHash);
}
