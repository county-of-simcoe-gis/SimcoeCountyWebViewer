/**
 * Server-side ArcGIS editor token generation.
 *
 * Wraps ArcGIS's /sharing/rest/generateToken endpoint using a service-account
 * configured via environment variables. Credentials never leave the server.
 */

import { ArcGisEditorTokenResponse } from "./types";

export interface EditorTokenConfig {
  tokenUrl: string;
  username: string;
  password: string;
  client: string;
  referer: string;
  expiration: number;
}

export function getEditorTokenConfig(): EditorTokenConfig {
  const tokenUrl = process.env.ARCGIS_TOKEN_URL || "https://gisportal.simcoe.ca/arcgis/sharing/rest/generateToken";
  const username = process.env.ARCGIS_EDITOR_USERNAME || "";
  const password = process.env.ARCGIS_EDITOR_PASSWORD || "";
  const client = process.env.ARCGIS_EDITOR_CLIENT || "referer";
  const referer = process.env.ARCGIS_EDITOR_REFERER || "https://opengis2.simcoe.ca/apiSecured";
  const expiration = parseInt(process.env.ARCGIS_EDITOR_EXPIRATION || "10", 10);

  if (!username || !password) {
    throw new Error("ArcGIS editor credentials are not configured");
  }

  return { tokenUrl, username, password, client, referer, expiration };
}

/**
 * Fetch a fresh ArcGIS editor token using the configured service account.
 *
 * @returns The token and expiry timestamp (milliseconds since epoch).
 */
export async function getEditorToken(): Promise<{ token: string; expires: number }> {
  const config = getEditorTokenConfig();

  const body = new URLSearchParams({
    username: config.username,
    password: config.password,
    client: config.client,
    referer: config.referer,
    expiration: String(config.expiration),
    f: "json",
  });

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    cache: "no-cache",
    redirect: "follow",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`ArcGIS token request failed: HTTP ${response.status}`);
  }

  const result = (await response.json()) as ArcGisEditorTokenResponse;

  if (result.error) {
    throw new Error(`ArcGIS token request failed: ${result.error.message ?? "Unknown error"}`);
  }

  if (!result.token) {
    throw new Error("ArcGIS token request did not return a token");
  }

  return { token: result.token, expires: result.expires ?? Date.now() + config.expiration * 60_000 };
}
