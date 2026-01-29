import { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import { AuthorizeUser } from "@/lib/secure/authorizeUser";
import { getUserGroups } from "@/lib/secure/microsoftGraph";
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
      // Use 'azuread' as the provider ID to avoid dash in callback URL
      // Callback URL will be: /api/auth/callback/azuread
      id: "azuread",
      name: "Azure AD",
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID,
      authorization: {
        params: {
          scope: `openid profile email offline_access${process.env.GEOSERVER_SCOPE ? ` ${process.env.GEOSERVER_SCOPE}` : ""}`,
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
    signIn: async () => {
      // Allow any authenticated Azure AD user to sign in
      // Role checking is done at the API route level for protected resources
      return true;
    },
    jwt: async ({ token, account, profile }) => {
      const extendedToken = token as ExtendedToken;

      if (account) {
        console.log("[NextAuth JWT] Account received:", {
          provider: account.provider,
          type: account.type,
          hasAccessToken: !!account.access_token,
          hasIdToken: !!account.id_token,
        });
        extendedToken.accessToken = account.access_token;
        extendedToken.refreshToken = account.refresh_token;
        extendedToken.accessTokenExpires = account.expires_at ? account.expires_at * 1000 : undefined;
      }
      if (profile) {
        console.log("[NextAuth JWT] Profile received:", {
          sub: profile.sub,
          name: profile.name,
          email: profile.email,
          groups: profile.groups,
          groupsLength: profile.groups?.length || 0,
        });

        // Get groups from profile or fetch from Microsoft Graph API
        let groups = profile?.groups || [];

        // If no groups in profile, fetch from Microsoft Graph API using the user's object ID
        if (groups.length === 0 && profile.sub) {
          console.log("[NextAuth JWT] No groups in profile, fetching from Microsoft Graph API...");
          try {
            groups = await getUserGroups(profile.sub);
            console.log("[NextAuth JWT] Fetched groups from Graph API:", groups.length, "groups");
          } catch (error) {
            console.error("[NextAuth JWT] Error fetching groups from Graph API:", error);
          }
        }

        console.log("[NextAuth JWT] Calling AuthorizeUser with groups:", groups);
        const authorization = await AuthorizeUser(groups);
        console.log("[NextAuth JWT] AuthorizeUser returned:", authorization);
        if (authorization && authorization.roles.includes("admin") && extendedToken.email?.endsWith("@simcoe.ca") && !authorization.locations.includes("COUNTY OF SIMCOE")) {
          authorization.locations.push("COUNTY OF SIMCOE");
        }
        extendedToken.roles = authorization.roles;
        extendedToken.locations = authorization.locations;
        console.log("[NextAuth JWT] Final token roles:", extendedToken.roles);
        console.log("[NextAuth JWT] Final token locations:", extendedToken.locations);
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
