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
    name?: string;
    preferred_username?: string;
    email?: string;
    groups?: string[];
  }
}

declare module "next-auth/jwt" {
  /**
   * Extended JWT interface with custom properties
   */
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number;
    error?: string;
    roles?: string[];
    locations?: string[];
    email?: string;
  }
}
