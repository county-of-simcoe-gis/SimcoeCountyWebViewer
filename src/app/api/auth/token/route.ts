import { getToken } from "@/lib/authToken";
import { getAccessToken } from "@/lib/accessTokenCache";
import { NextRequest, NextResponse } from "next/server";
import { refreshAccessToken } from "@/app/auth/refreshToken";

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });

  if (!token?.oid) {
    return NextResponse.json({ error: "No token found" }, { status: 401 });
  }

  // Try the in-memory cache first; if empty, do a refresh
  let accessToken = getAccessToken(token.oid);
  if (!accessToken && token.refreshToken) {
    const result = await refreshAccessToken(token);
    if ("accessToken" in result) {
      accessToken = result.accessToken;
    }
  }

  return NextResponse.json({ accessToken: accessToken ?? null, expires: token.accessTokenExpires ?? null }, { status: 200 });
}
export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request });

    if (!token) {
      return NextResponse.json({ error: "No token found" }, { status: 401 });
    }

    const result = await refreshAccessToken(token);

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    return NextResponse.json({ accessToken: result.accessToken, expires: result.expires });
  } catch (error) {
    console.error("Error refreshing token:", error);
    return NextResponse.json({ error: "Failed to refresh token" }, { status: 500 });
  }
}
