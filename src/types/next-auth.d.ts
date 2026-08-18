import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  /**
   * Extended Session interface with custom properties
   */
  interface Session {
    accessToken?: string;
    user: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      roles?: string[];
      locations?: string[];
      accessToken?: string;
    };
    error?: string;
  }

  /**
   * Extended User interface with custom properties
   */
  interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    groups?: string[];
    roles?: string[];
    locations?: string[];
  }

  /**
   * Extended Profile interface for Azure AD
   */
  interface Profile {
    sub?: string;
    oid?: string;
    name?: string;
    preferred_username?: string;
    email?: string;
    groups?: string[];
  }
}

declare module "next-auth/jwt" {
  /**
   * Extended JWT interface with custom properties.
   *
   * accessToken is NOT stored in the JWT cookie (to keep cookie size small and
   * avoid 431 errors). It is populated at runtime by the getToken() wrapper in
   * authToken.ts from the server-side in-memory cache.
   *
   * refreshToken remains in the JWT cookie for standard OAuth2 token renewal.
   */
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number;
    error?: string;
    roles?: string[];
    locations?: string[];
    email?: string;
    oid?: string;
  }
}
