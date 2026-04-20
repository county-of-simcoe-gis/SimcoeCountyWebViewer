import { getToken } from "@/lib/authToken";
import { NextRequest, NextResponse } from "next/server";
import { refreshAccessToken } from "@/app/auth/refreshToken";

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });

  return NextResponse.json({ accessToken: token?.accessToken, expires: token?.accessTokenExpires }, { status: 200 });
}
export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request });

    if (!token) {
      return NextResponse.json({ error: "No token found" }, { status: 401 });
    }

    const refreshedToken = await refreshAccessToken(token);

    if (refreshedToken.error) {
      return NextResponse.json({ error: refreshedToken.error }, { status: 401 });
    }

    return NextResponse.json(refreshedToken);
  } catch (error) {
    console.error("Error refreshing token:", error);
    return NextResponse.json({ error: "Failed to refresh token" }, { status: 500 });
  }
}
