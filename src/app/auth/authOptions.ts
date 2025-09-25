import { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import { AuthorizeUser } from "@/lib/secure/authorizeUser";
import { JWT } from "next-auth/jwt";

interface ExtendedToken extends JWT {
  accessToken?: string;
  refreshToken?: string;
  accessTokenExpires?: number;
  error?: string;
  roles?: string[];
  locations?: string[];
  email?: string;
}

export const authOptions: NextAuthOptions = {
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID,
      authorization: {
        params: {
          scope: `openid profile email offline_access${process.env.GEOSERVER_SCOPE ? ` ${process.env.GEOSERVER_SCOPE}` : ""}`,
          // Set the redirect_uri to force the correct callback URL that matches the Azure AD app registration reply URL
          redirect_uri: `${process.env.NEXTAUTH_URL}/callback/azure-ad`,
        },
      },
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name ?? profile.preferred_username,
          email: profile.email,
          groups: profile.groups,
          roles: [],
          locations: [],
        };
      },
    }),
  ],
  // debug: true,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  // Add these configuration options to properly handle basePath
  useSecureCookies: process.env.NODE_ENV === "production",
  // Define URLs explicitly
  pages: {
    signIn: `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/signin`,
    signOut: `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/signout`,
    error: `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/error`,
  },
  callbacks: {
    signIn: async ({ profile }) => {
      // Check if user has required roles during sign-in
      if (profile) {
        const groups = profile?.groups || [];
        const authorization = await AuthorizeUser(groups);

        // Check if user has admin or editor roles
        const hasRequiredRole = authorization.roles.some((role) => role.toLowerCase() === "admin" || role.toLowerCase() === "editor");

        if (!hasRequiredRole) {
          // User doesn't have required roles, deny access
          // NextAuth will redirect to the error page with error=AccessDenied
          throw new Error("AccessDenied");
        }
      }

      return true;
    },
    jwt: async ({ token, account, profile }) => {
      const extendedToken = token as ExtendedToken;

      if (account) {
        // console.log("account", account);
        // console.log("token", token);
        // console.log("user", user);
        // console.log("profile", profile);
        // token.idToken = account.id_token;
        extendedToken.accessToken = account.access_token;
        extendedToken.refreshToken = account.refresh_token;
        extendedToken.accessTokenExpires = account.expires_at ? account.expires_at * 1000 : undefined;
      }
      if (profile) {
        const groups = profile?.groups || [];
        const authorization = await AuthorizeUser(groups);
        if (authorization && authorization.roles.includes("admin") && extendedToken.email?.endsWith("@simcoe.ca") && !authorization.locations.includes("COUNTY OF SIMCOE")) {
          authorization.locations.push("COUNTY OF SIMCOE");
        }
        extendedToken.roles = authorization.roles;
        extendedToken.locations = authorization.locations;
      }
      return extendedToken;
    },
    session: async ({ session, token }) => {
      const extendedToken = token as ExtendedToken;
      return {
        ...session,
        user: {
          ...session.user,
          roles: extendedToken.roles,
          locations: extendedToken.locations,
        },
      };
    },
    // redirect: async ({ url, baseUrl }) => {
    //   // If the URL starts with a slash, it's a relative URL
    //   if (url.startsWith("/")) {
    //     // The baseUrl already includes the basePath since we set NEXTAUTH_URL correctly
    //     return `${baseUrl}${url}`;
    //   }

    //   // If URL is on the same origin as the baseUrl
    //   else if (new URL(url).origin === new URL(baseUrl).origin) {
    //     return url;
    //   }

    //   // Default to the baseUrl (which includes the basePath)
    //   return baseUrl;
    // },
  },
};
