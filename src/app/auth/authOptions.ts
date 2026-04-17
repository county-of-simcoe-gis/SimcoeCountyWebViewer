import { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import { AuthorizeUser } from "@/lib/authorizeUser";
import { getUserGroups } from "@/lib/microsoftGraph";
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

/**
 * Refreshes an expired Azure AD access token using the refresh token
 */
async function refreshAccessToken(token: ExtendedToken): Promise<ExtendedToken> {
  try {
    console.log("[NextAuth] Refreshing expired access token...");

    const tenantId = process.env.AZURE_AD_TENANT_ID!;
    const clientId = process.env.AZURE_AD_CLIENT_ID!;
    const clientSecret = process.env.AZURE_AD_CLIENT_SECRET!;
    const scope = `openid profile email offline_access${process.env.GEOSERVER_SCOPE ? ` ${process.env.GEOSERVER_SCOPE}` : ""}`;

    const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: token.refreshToken!,
        scope: scope,
      }),
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      console.error("[NextAuth] Token refresh failed:", refreshedTokens);
      throw refreshedTokens;
    }

    console.log("[NextAuth] Token refreshed successfully, expires in:", refreshedTokens.expires_in, "seconds");

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken, // Fall back to old refresh token if not provided
    };
  } catch (error) {
    console.error("[NextAuth] Error refreshing access token:", error);

    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}

// Construct the correct callback URL with /api/auth/ path
const getCallbackUrl = () => `${process.env.NEXTAUTH_URL}api/auth/callback/azuread`;

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
          // Explicitly set redirect_uri to ensure correct callback path with basePath
          redirect_uri: getCallbackUrl(),
        },
      },
      token: {
        // Custom token request to ensure redirect_uri matches authorization request
        async request({ params, provider }) {
          const tenantId = process.env.AZURE_AD_TENANT_ID!;
          const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

          const response = await fetch(tokenUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              client_id: provider.clientId!,
              client_secret: provider.clientSecret as string,
              code: params.code as string,
              grant_type: "authorization_code",
              redirect_uri: getCallbackUrl(), // Must match authorization request
            }),
          });

          const tokens = await response.json();
          if (!response.ok) {
            throw new Error(tokens.error_description || tokens.error || "Token exchange failed");
          }
          return { tokens };
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
  // Use app-specific cookie names to avoid collisions with other NextAuth apps
  // on the same domain. When deployed at root ("/"), path scoping alone can't prevent
  // cookies from being sent to sub-path apps, so unique names prevent other apps from
  // interpreting these cookies and keep the combined header size manageable.
  useSecureCookies: process.env.NODE_ENV === "production",
  cookies: {
    sessionToken: {
      name: `${process.env.NODE_ENV === "production" ? "__Secure-" : ""}scwv.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: process.env.NEXT_PUBLIC_BASE_PATH || "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    callbackUrl: {
      name: `${process.env.NODE_ENV === "production" ? "__Secure-" : ""}scwv.callback-url`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: process.env.NEXT_PUBLIC_BASE_PATH || "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    csrfToken: {
      name: `${process.env.NODE_ENV === "production" ? "__Host-" : ""}scwv.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: process.env.NEXT_PUBLIC_BASE_PATH || "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
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

      // Initial sign in - store tokens from account and process profile
      if (account && profile) {
        console.log("[NextAuth JWT] Account received:", {
          provider: account.provider,
          type: account.type,
          hasAccessToken: !!account.access_token,
          hasIdToken: !!account.id_token,
        });
        extendedToken.accessToken = account.access_token;
        extendedToken.refreshToken = account.refresh_token;
        extendedToken.accessTokenExpires = account.expires_at ? account.expires_at * 1000 : undefined;

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
        if (authorization && authorization.roles.includes("gis_internal") && extendedToken.email?.endsWith("@simcoe.ca") && !authorization.locations.includes("COUNTY OF SIMCOE")) {
          authorization.locations.push("COUNTY OF SIMCOE");
        }
        extendedToken.roles = authorization.roles;
        extendedToken.locations = authorization.locations;
        console.log("[NextAuth JWT] Final token roles:", extendedToken.roles);
        console.log("[NextAuth JWT] Final token locations:", extendedToken.locations);

        return extendedToken;
      }

      // Subsequent requests - check if token needs refresh
      // Return previous token if the access token has not expired yet
      if (extendedToken.accessTokenExpires && Date.now() < extendedToken.accessTokenExpires - 5 * 60 * 1000) {
        // Token still valid (expires in more than 5 minutes), return as-is
        return extendedToken;
      }

      // Access token has expired or is about to expire, try to refresh it
      if (extendedToken.refreshToken) {
        console.log("[NextAuth JWT] Access token expired, attempting refresh...");
        return refreshAccessToken(extendedToken);
      }

      // No refresh token available, return token with error
      console.warn("[NextAuth JWT] Access token expired but no refresh token available");
      return {
        ...extendedToken,
        error: "RefreshAccessTokenError",
      };
    },
    session: async ({ session, token }) => {
      const extendedToken = token as ExtendedToken;
      return {
        ...session,
        accessToken: extendedToken.accessToken,
        error: extendedToken.error,
        user: {
          ...session.user,
          roles: extendedToken.roles,
          locations: extendedToken.locations,
          accessToken: extendedToken.accessToken,
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
