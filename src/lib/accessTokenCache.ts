/**
 * In-memory cache for Azure AD access tokens, keyed by user oid.
 *
 * Keeps access tokens out of the JWT cookie (which would bloat headers and
 * cause 431 errors) while avoiding any external storage dependency. The
 * refresh token stays in the JWT for standard OAuth2 token renewal.
 *
 * On server restart the cache is empty — the next session call will use the
 * refresh token from the JWT to obtain a fresh access token transparently.
 */

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

const cache = new Map<string, CachedToken>();

/** Store (or update) the access token for a user. */
export function setAccessToken(oid: string, accessToken: string, expiresAt: number) {
  cache.set(oid, { accessToken, expiresAt });
}

/**
 * Retrieve a cached access token if it exists and has not expired.
 * Returns `null` when absent or stale (caller should refresh).
 */
export function getAccessToken(oid: string): string | null {
  const entry = cache.get(oid);
  if (!entry) return null;
  // Treat as expired 60 seconds early to avoid edge-case clock skew
  if (Date.now() >= entry.expiresAt - 60 * 1000) {
    cache.delete(oid);
    return null;
  }
  return entry.accessToken;
}

/** Remove a user's cached token (e.g. on sign-out). */
export function clearAccessToken(oid: string) {
  cache.delete(oid);
}
