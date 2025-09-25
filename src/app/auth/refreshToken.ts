// lib/refreshAccessToken.js
import { JWT } from "next-auth/jwt";
import axios from "axios";

export async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    const url = `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/oauth2/v2.0/token`;

    const params = new URLSearchParams({
      client_id: process.env.AZURE_AD_CLIENT_ID!,
      client_secret: process.env.AZURE_AD_CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: token.refreshToken as string,
      scope: `openid profile email offline_access${process.env.GEOSERVER_SCOPE ? ` ${process.env.GEOSERVER_SCOPE}` : ""}`,
    });

    console.log("Making refresh token request...");
    const response = await axios.post(url, params.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    console.log("Refresh token response status:", response.status);
    const refreshedTokens = response.data;

    return {
      accessToken: refreshedTokens.access_token,
      expires: refreshedTokens.expires_in,
    };
  } catch (error) {
    console.error("Error refreshing access token. Full error:", error);
    if (error instanceof Error) {
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}
