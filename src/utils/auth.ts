/**
 * Shared authentication utilities for client-side code.
 *
 * Provides helpers for retrieving the current user's access token
 * and making authenticated fetch requests (e.g. to secured GeoServer endpoints).
 */

import { getSession } from "next-auth/react";

/**
 * Get the access token from the NextAuth session.
 * Works in both React component and non-component (utility) code.
 * Returns undefined when no session or token is available.
 */
export async function getAccessToken(): Promise<string | undefined> {
  try {
    const session = await getSession();

    // If the JWT callback flagged a refresh error the token is stale — treat
    // it as unavailable so callers don't send an expired bearer token.
    if (session?.error === "RefreshAccessTokenError") {
      console.warn("[Auth] Session has a RefreshAccessTokenError — access token is expired/invalid");
      return undefined;
    }

    return session?.accessToken || session?.user?.accessToken || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Determine whether a URL points to a secured GeoServer endpoint.
 */
export function isSecuredUrl(url: string): boolean {
  return url.includes("opengis2.simcoe.ca");
}

/**
 * Build a RequestInit with optional Authorization header for secured endpoints.
 *
 * @param secured  Whether the target is a secured endpoint.
 * @param token    Pre-fetched access token (avoids redundant getSession calls
 *                 when you already have the token). If omitted and `secured` is
 *                 true the function will call `getAccessToken()` automatically.
 * @returns        A `RequestInit` object ready to pass to `fetch()`.
 *                 Throws if `secured` is true but no token is available.
 */
export async function buildAuthFetchOptions(secured: boolean, token?: string): Promise<RequestInit> {
  const fetchOptions: RequestInit = {
    method: "GET",
    mode: "cors",
  };

  if (secured) {
    const resolvedToken = token ?? (await getAccessToken());
    if (resolvedToken) {
      fetchOptions.headers = { Authorization: `Bearer ${resolvedToken}` };
    } else {
      throw new Error("Authentication required for secured endpoint (no token available)");
    }
  }

  return fetchOptions;
}

/**
 * Fetch a URL, automatically attaching auth headers when the URL is secured.
 *
 * For public endpoints this is equivalent to a plain `fetch()`.
 * For secured endpoints (`opengis2.simcoe.ca`) it attaches the Bearer token.
 *
 * @param url      The resource URL.
 * @param secured  Explicit override — pass `true`/`false` to force behaviour.
 *                 When omitted the function auto-detects via `isSecuredUrl()`.
 * @param token    Pre-fetched access token (optional).
 */
export async function fetchWithAuth(url: string, secured?: boolean, token?: string): Promise<Response> {
  const isSecured = secured ?? isSecuredUrl(url);
  const fetchOptions = await buildAuthFetchOptions(isSecured, token);
  return fetch(url, fetchOptions);
}
