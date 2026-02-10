import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

/**
 * WFS Proxy for Secured GeoServer Layers
 * Proxies WFS GetFeature requests with bearer token authentication to avoid CORS issues
 * 
 * Usage: /api/proxy/wfs?url=<encoded-wfs-url>
 */
export async function GET(request: NextRequest) {
  try {
    // Get the auth token from the request
    const token = await getToken({ req: request });

    console.log("[WFS Proxy] Token check:", {
      hasToken: !!token,
      hasAccessToken: !!token?.accessToken,
    });

    if (!token?.accessToken) {
      console.error("[WFS Proxy] No access token found in session");
      return NextResponse.json(
        { error: "Unauthorized - No valid session or access token" },
        { status: 401 }
      );
    }

    // Get the target WFS URL from query params
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

    console.log("[WFS Proxy] Fetching:", targetUrl.substring(0, 100) + "...");

    const response = await fetch(targetUrl, {
      headers: fetchHeaders,
    });

    if (!response.ok) {
      console.error(`[WFS Proxy] GeoServer returned ${response.status}: ${response.statusText}`);
      const errorText = await response.text().catch(() => "");
      console.error(`[WFS Proxy] GeoServer error body: ${errorText.substring(0, 500)}`);
      return NextResponse.json(
        { error: `WFS request failed: ${response.status}` },
        { status: response.status }
      );
    }

    // Get the GML/XML response
    const text = await response.text();
    
    // Return the GML with proper headers
    return new NextResponse(text, {
      status: 200,
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "application/gml+xml",
        "Cache-Control": "no-cache", // Don't cache feature queries
      },
    });
  } catch (error) {
    console.error("[WFS Proxy] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
