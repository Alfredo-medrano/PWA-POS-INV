/**
 * In-memory rate limiter with TTL-based automatic cleanup.
 * 
 * Designed for serverless-compatible environments where Redis is not available.
 * Note: In multi-instance deployments (e.g., multiple serverless containers),
 * each instance maintains its own counter. For distributed rate limiting,
 * consider migrating to Upstash Redis.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup expired entries every 60 seconds to prevent memory leaks
const CLEANUP_INTERVAL_MS = 60_000;
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function ensureCleanupTimer() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    store.forEach((entry, key) => {
      if (now >= entry.resetAt) {
        store.delete(key);
      }
    });
    // Stop the timer if the store is empty to avoid keeping the process alive
    if (store.size === 0 && cleanupTimer) {
      clearInterval(cleanupTimer);
      cleanupTimer = null;
    }
  }, CLEANUP_INTERVAL_MS);
  // Allow the Node.js process to exit even if the timer is active
  if (cleanupTimer && typeof cleanupTimer === 'object' && 'unref' in cleanupTimer) {
    cleanupTimer.unref();
  }
}

export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Remaining attempts in the current window */
  remaining: number;
  /** Seconds until the rate limit window resets (for Retry-After header) */
  retryAfter: number;
}

/**
 * Check and increment the rate limit counter for a given key.
 * 
 * @param key - Unique identifier (typically IP address or IP:route)
 * @param maxAttempts - Maximum allowed attempts within the window
 * @param windowMs - Time window in milliseconds
 * @returns RateLimitResult indicating whether the request is allowed
 */
export function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number
): RateLimitResult {
  ensureCleanupTimer();

  const now = Date.now();
  const entry = store.get(key);

  // First request or window expired — reset counter
  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxAttempts - 1, retryAfter: 0 };
  }
  // Within window — check if under limit
  entry.count += 1;
  const remaining = Math.max(0, maxAttempts - entry.count);
  const retryAfter = Math.ceil((entry.resetAt - now) / 1000);

  if (entry.count >= maxAttempts) {
    return { allowed: false, remaining: 0, retryAfter };
  }

  return { allowed: true, remaining, retryAfter: 0 };
}

/**
 * Extract client IP from a Request object.
 * Checks x-forwarded-for (set by reverse proxies like Vercel) first,
 * then falls back to x-real-ip, then to a default.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs; take the first (client IP)
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || '127.0.0.1';
}
