/**
 * Microsoft Graph API helper for fetching user group memberships
 * 
 * Azure AD tokens often don't include group claims, especially when users
 * have many group memberships. This module fetches groups from Microsoft Graph API
 * using client credentials flow.
 */

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface GroupMembershipResponse {
  value: string[];
}

// Cache for the app token
let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Get an access token for Microsoft Graph API using client credentials flow
 */
async function getGraphAppToken(): Promise<string> {
  // Check if we have a valid cached token (with 5 min buffer)
  if (cachedToken && cachedToken.expiresAt > Date.now() + 5 * 60 * 1000) {
    return cachedToken.token;
  }

  const tokenUrl = `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/oauth2/v2.0/token`;
  
  const params = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: process.env.AZURE_AD_CLIENT_ID!,
    client_secret: process.env.AZURE_AD_CLIENT_SECRET!,
    scope: "https://graph.microsoft.com/.default",
  });

  console.log("[MicrosoftGraph] Fetching app token from:", tokenUrl);

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[MicrosoftGraph] Token request failed:", response.status, errorText);
    throw new Error(`Failed to get Graph API token: ${response.status} ${errorText}`);
  }

  const data: TokenResponse = await response.json();
  
  // Cache the token
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  console.log("[MicrosoftGraph] Successfully obtained app token");
  return data.access_token;
}

/**
 * Fetch user's group memberships from Microsoft Graph API
 * 
 * @param userObjectId - The user's Azure AD object ID (oid claim from token)
 * @returns Array of group IDs the user belongs to
 */
export async function getUserGroups(userObjectId: string): Promise<string[]> {
  try {
    console.log("[MicrosoftGraph] Fetching groups for user:", userObjectId);
    
    const accessToken = await getGraphAppToken();
    
    // Use getMemberGroups endpoint which returns group IDs
    const graphUrl = `https://graph.microsoft.com/v1.0/users/${userObjectId}/getMemberGroups`;
    
    const response = await fetch(graphUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        securityEnabledOnly: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[MicrosoftGraph] getMemberGroups failed:", response.status, errorText);
      throw new Error(`Failed to get user groups: ${response.status} ${errorText}`);
    }

    const data: GroupMembershipResponse = await response.json();
    console.log("[MicrosoftGraph] User groups fetched:", data.value?.length || 0, "groups");
    console.log("[MicrosoftGraph] Group IDs:", data.value);
    
    return data.value || [];
  } catch (error) {
    console.error("[MicrosoftGraph] Error fetching user groups:", error);
    return [];
  }
}
