import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getToken } from "@/lib/authToken";

// Define paths that require authentication (protected routes)
// Only /api/secure/* routes require authentication
// Note: When basePath is configured in next.config.ts, Next.js strips the
// basePath from pathnames before passing them to middleware, so these paths
// should NOT include the basePath prefix.
const protectedPrefixes = [
  `/api/secure`, // All secure API routes require authentication
];

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // console.log("Middleware:", { pathname });

  // Check if the path requires authentication
  const isProtected = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));

  if (!isProtected) {
    // This is a public route, allow access without authentication
    return NextResponse.next();
  }

  // For protected routes, check if user has a valid token
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    // No token found - return 401 for API routes
    // The client-side will handle showing a login prompt
    return NextResponse.json({ error: "Unauthorized - Authentication required" }, { status: 401 });
  }

  // User is authenticated, allow the request to proceed
  // Role checking is done at the individual API route level
  return NextResponse.next();
}

export const config = {
  // Matcher: Only run middleware on /api/secure/* routes
  // All other routes are public and don't need middleware checks
  matcher: [
    "/api/secure/:path*", // All secure API routes
  ],
};
