import { getToken as nextAuthGetToken, type JWT } from "next-auth/jwt";

/**
 * Custom cookie name prefix used in authOptions. Must match the cookie config
 * in src/app/auth/authOptions.ts so server-side token reads find the session.
 */
const COOKIE_PREFIX = "scwv";
const SECURE = process.env.NODE_ENV === "production";

export const SESSION_COOKIE_NAME = `${SECURE ? "__Secure-" : ""}${COOKIE_PREFIX}.session-token`;

type GetTokenArgs = Parameters<typeof nextAuthGetToken>[0];

/**
 * Wrapper around next-auth's getToken that supplies the custom cookie name
 * configured in authOptions. Import this in place of `getToken` from
 * `next-auth/jwt` so server routes can read the renamed session cookie.
 */
export function getToken(params: GetTokenArgs): Promise<JWT | null> {
  return nextAuthGetToken({
    secret: process.env.NEXTAUTH_SECRET,
    cookieName: SESSION_COOKIE_NAME,
    secureCookie: SECURE,
    ...params,
  }) as Promise<JWT | null>;
}
