import { useArcGISTokenStore } from "@/stores/arcgisTokenStore";

export interface EsriQueryResponse {
  features?: Array<{ attributes?: Record<string, unknown> }>;
  exceededTransferLimit?: boolean;
  error?: { message?: string };
}

export async function resolveToken(layerUrl: string, secured: boolean): Promise<string | null> {
  const urlToken = new URL(layerUrl).searchParams.get("token");
  if (urlToken) return urlToken;
  if (!secured) return null;
  return (await useArcGISTokenStore.getState().getValidToken()) ?? null;
}

export function buildQueryUrl(layerUrl: string, params: Record<string, string>, token: string | null): string {
  const query = new URLSearchParams({ ...params, f: "json" });
  if (token) query.set("token", token);
  return `${layerUrl.split("?")[0]}/query?${query.toString()}`;
}

export async function queryJSON(url: string): Promise<EsriQueryResponse> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  const data = (await response.json()) as EsriQueryResponse;
  if (data.error) throw new Error(data.error.message ?? "ArcGIS query failed");
  return data;
}
