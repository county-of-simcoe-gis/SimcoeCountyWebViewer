import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

// Read basePath from environment variable ONCE
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ""; // Default to empty string if not set

// Define paths that require authentication (protected routes)
// Only /api/secure/* routes require authentication
const protectedPrefixes = [
  `${basePath}/api/secure`, // All secure API routes require authentication
];

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // console.log("Middleware:", { pathname, basePath });

  // Check if the request path is outside the configured basePath
  // If basePath is set, only apply auth logic to paths starting with it.
  if (basePath && !pathname.startsWith(basePath)) {
    // Let Next.js handle routing (it should manage basePath redirects etc.)
    return NextResponse.next();
  }

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
    return NextResponse.json(
      { error: "Unauthorized - Authentication required" },
      { status: 401 }
    );
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
