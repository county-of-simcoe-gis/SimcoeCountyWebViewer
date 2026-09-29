import { JWT } from "next-auth/jwt";
import { setAccessToken } from "@/lib/accessTokenCache";

/**
 * Refresh the Azure AD access token using the refresh token from the JWT.
 * The new access token is stored in the in-memory cache (not in the JWT cookie).
 */
export async function refreshAccessToken(token: JWT): Promise<{ accessToken: string; expires: number } | { error: string }> {
  try {
    if (!token.refreshToken) {
      return { error: "RefreshAccessTokenError" };
    }

    const url = `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/oauth2/v2.0/token`;

    const params = new URLSearchParams({
      client_id: process.env.AZURE_AD_CLIENT_ID!,
      client_secret: process.env.AZURE_AD_CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: token.refreshToken,
      scope: `openid profile email offline_access${process.env.GEOSERVER_SCOPE ? ` ${process.env.GEOSERVER_SCOPE}` : ""}`,
    });

    console.log("Making refresh token request...");
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Token refresh failed:", errorData);
      return { error: "RefreshAccessTokenError" };
    }

    const refreshedTokens = await response.json();
    console.log("Refresh token response status:", response.status);

    const newExpiresAt = Date.now() + refreshedTokens.expires_in * 1000;

    // Cache the new access token in memory
    if (token.oid) {
      setAccessToken(token.oid, refreshedTokens.access_token, newExpiresAt);
    }

    return {
      accessToken: refreshedTokens.access_token,
      expires: newExpiresAt,
    };
  } catch (error) {
    console.error("Error refreshing access token:", error);
    return { error: "RefreshAccessTokenError" };
  }
}
