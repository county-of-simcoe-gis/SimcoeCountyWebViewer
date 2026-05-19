import { getToken as nextAuthGetToken, type JWT } from "next-auth/jwt";
import { getAccessToken, setAccessToken } from "@/lib/accessTokenCache";

/**
 * Custom cookie name prefix used in authOptions. Must match the cookie config
 * in src/app/auth/authOptions.ts so server-side token reads find the session.
 */
const COOKIE_PREFIX = "scwv";
const SECURE = process.env.NODE_ENV === "production";

export const SESSION_COOKIE_NAME = `${SECURE ? "__Secure-" : ""}${COOKIE_PREFIX}.session-token`;

type GetTokenArgs = Parameters<typeof nextAuthGetToken>[0];

/**
 * Refresh the Azure AD access token using a refresh token, and cache the result.
 * This is a lightweight version used only by this module to avoid a circular
 * dependency on authOptions.
 */
async function refreshAndCache(oid: string, refreshToken: string): Promise<string | null> {
  try {
    const tenantId = process.env.AZURE_AD_TENANT_ID!;
    const clientId = process.env.AZURE_AD_CLIENT_ID!;
    const clientSecret = process.env.AZURE_AD_CLIENT_SECRET!;
    const scope = `openid profile email offline_access${process.env.GEOSERVER_SCOPE ? ` ${process.env.GEOSERVER_SCOPE}` : ""}`;

    const response = await fetch(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: "refresh_token",
          refresh_token: refreshToken,
          scope,
        }),
      },
    );

    if (!response.ok) return null;

    const data = await response.json();
    const expiresAt = Date.now() + data.expires_in * 1000;
    setAccessToken(oid, data.access_token, expiresAt);
    return data.access_token;
  } catch {
    return null;
  }
}

/**
 * Wrapper around next-auth's getToken that supplies the custom cookie name
 * configured in authOptions and enriches the result with the cached access
 * token. If the cache is empty (e.g. after server restart) and the JWT carries
 * a refresh token, an on-demand refresh is performed so that API routes always
 * have access to `token.accessToken`.
 *
 * Import this in place of `getToken` from `next-auth/jwt` so server routes
 * can read the renamed session cookie and still access `token.accessToken`.
 */
export async function getToken(params: GetTokenArgs): Promise<JWT | null> {
  const token = await nextAuthGetToken({
    secret: process.env.NEXTAUTH_SECRET,
    cookieName: SESSION_COOKIE_NAME,
    secureCookie: SECURE,
    ...params,
  }) as JWT | null;

  if (token?.oid) {
    let cachedAccessToken = getAccessToken(token.oid);

    // Cache miss — do an on-demand refresh so the caller gets an accessToken
    if (!cachedAccessToken && token.refreshToken) {
      cachedAccessToken = await refreshAndCache(token.oid, token.refreshToken);
    }

    if (cachedAccessToken) {
      token.accessToken = cachedAccessToken;
    }
  }

  return token;
}
