import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

/**
 * WMS Proxy for Secured GeoServer Layers
 * Proxies WMS GetMap requests with bearer token authentication to avoid CORS issues
 *
 * Usage: /api/proxy/wms?url=<encoded-wms-url>
 */
export async function GET(request: NextRequest) {
  try {
    // Get the auth token from the request
    const token = await getToken({ req: request });

    console.log("[WMS Proxy] Token check:", {
      hasToken: !!token,
      hasAccessToken: !!token?.accessToken,
      tokenKeys: token ? Object.keys(token) : [],
    });

    if (!token?.accessToken) {
      console.error("[WMS Proxy] No access token found in session");
      return NextResponse.json(
        { error: "Unauthorized - No valid session or access token" },
        { status: 401 }
      );
    }

    // Get the target WMS URL from query params
    const searchParams = request.nextUrl.searchParams;
    const targetUrl = searchParams.get("url");

    if (!targetUrl) {
      return NextResponse.json(
        { error: "Missing 'url' parameter" },
        { status: 400 }
      );
    }

    // Validate URL is for opengis servers
    if (!targetUrl.includes("opengis.simcoe.ca") && !targetUrl.includes("opengis2.simcoe.ca")) {
      return NextResponse.json(
        { error: "Invalid target URL - must be opengis server" },
        { status: 400 }
      );
    }

    // Only send auth header to secured GeoServer (opengis2).
    // The public server (opengis) has a smaller header-size limit and
    // rejects large Bearer tokens with HTTP 431.
    const isSecuredEndpoint = targetUrl.includes("opengis2.simcoe.ca");
    const fetchHeaders: HeadersInit = isSecuredEndpoint
      ? { Authorization: `Bearer ${token.accessToken}` }
      : {};

    console.log("[WMS Proxy] Fetching:", targetUrl.substring(0, 100) + "...");

    const response = await fetch(targetUrl, {
      headers: fetchHeaders,
    });

    if (!response.ok) {
      console.error(`[WMS Proxy] GeoServer returned ${response.status}: ${response.statusText}`);
      // Try to get error body for more details
      const errorText = await response.text().catch(() => "");
      console.error(`[WMS Proxy] GeoServer error body: ${errorText.substring(0, 500)}`);
      return NextResponse.json(
        { error: `WMS request failed: ${response.status}` },
        { status: response.status }
      );
    }

    const contentType = response.headers.get("Content-Type") || "application/octet-stream";
    const bytes = await response.arrayBuffer();

    const isLikelyImage = contentType.startsWith("image/");

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": isLikelyImage ? "public, max-age=300" : "no-store",
      },
    });
  } catch (error) {
    console.error("[WMS Proxy] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST variant of the WMS proxy.
 * Accepts `{ url: string }` in the JSON body to avoid very long query strings
 * (which can trigger 431 errors due to request line/header size limits).
 */
export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request });

    if (!token?.accessToken) {
      return NextResponse.json(
        { error: "Unauthorized - No valid session or access token" },
        { status: 401 }
      );
    }

    const body = (await request.json().catch(() => null)) as { url?: string } | null;
    const targetUrl = body?.url;

    if (!targetUrl) {
      return NextResponse.json(
        { error: "Missing 'url' in request body" },
        { status: 400 }
      );
    }

    if (!targetUrl.includes("opengis.simcoe.ca") && !targetUrl.includes("opengis2.simcoe.ca")) {
      return NextResponse.json(
        { error: "Invalid target URL - must be opengis server" },
        { status: 400 }
      );
    }

    // Convert potential long URL GET to POST x-www-form-urlencoded for GeoServer.
    // Trim optional params to keep the payload compact (GeoServer does not require them).
    const urlObj = new URL(targetUrl);
    const originPath = `${urlObj.origin}${urlObj.pathname}`;
    const searchParams = urlObj.searchParams;

    const requiredKeys = new Set([
      "SERVICE",
      "REQUEST",
      "VERSION",
      "LAYERS",
      "QUERY_LAYERS",
      "INFO_FORMAT",
      "CRS",
      "SRS",
      "BBOX",
      "WIDTH",
      "HEIGHT",
      "I",
      "J",
    ]);

    const filteredParams = new URLSearchParams();
    searchParams.forEach((value, key) => {
      if (requiredKeys.has(key.toUpperCase())) {
        filteredParams.append(key, value);
      }
    });

    const isSecuredPostEndpoint = originPath.includes("opengis2.simcoe.ca");
    const postHeaders: HeadersInit = isSecuredPostEndpoint
      ? { Authorization: `Bearer ${token.accessToken}` }
      : {};

    const response = await fetch(originPath, {
      method: "POST",
      headers: postHeaders,
      body: filteredParams,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error(`[WMS Proxy] GeoServer returned ${response.status}: ${response.statusText}`);
      console.error(`[WMS Proxy] GeoServer error body: ${errorText.substring(0, 500)}`);
      return NextResponse.json(
        { error: `WMS request failed: ${response.status}` },
        { status: response.status }
      );
    }

    const contentType = response.headers.get("Content-Type") || "application/octet-stream";
    const bytes = await response.arrayBuffer();
    const isLikelyImage = contentType.startsWith("image/");

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": isLikelyImage ? "public, max-age=300" : "no-store",
      },
    });
  } catch (error) {
    console.error("[WMS Proxy] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
