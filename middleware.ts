import { default as nextAuthMiddleware } from "next-auth/middleware";
import type { NextRequestWithAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

// Read basePath from environment variable ONCE
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ""; // Default to empty string if not set

// Define paths relative to the basePath that should bypass NextAuth checks
const excludedPrefixes = [
  `${basePath}/api/auth`, // NextAuth's own API routes
  // Add any other public API endpoints under basePath if needed
];

export default async function middleware(req: NextRequestWithAuth) {
  const { pathname } = req.nextUrl;
  // console.log("Middleware:", { pathname, basePath });

  // Check if the request path is outside the configured basePath
  // If basePath is set, only apply auth logic to paths starting with it.
  if (basePath && !pathname.startsWith(basePath)) {
    // console.log("Path outside basePath, bypassing auth.");
    // Let Next.js handle routing (it should manage basePath redirects etc.)
    return NextResponse.next();
  }

  // Check if the path matches any excluded prefixes (relative to basePath)
  const isExcluded = excludedPrefixes.some((prefix) => pathname.startsWith(prefix));
  if (isExcluded) {
    // console.log("Path is excluded, bypassing auth.");
    // This is an auth API route or other explicitly excluded path, let it pass through.
    return NextResponse.next();
  }

  // Check for error page - allow access to error page
  if (pathname === `${basePath}/error` || pathname === `${basePath}/signin` || pathname === `${basePath}/signout`) {
    return NextResponse.next();
  }

  // Get the token to check user roles
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // If user is authenticated, check if they have required roles
  if (token) {
    const userRoles = (token.roles as string[]) || [];
    const hasRequiredRole = userRoles.some((role) => role.toLowerCase() === "admin" || role.toLowerCase() === "editor");

    if (!hasRequiredRole) {
      // User doesn't have required roles, redirect to access denied
      const errorUrl = new URL(`${basePath}/error`, req.url);
      errorUrl.searchParams.set("error", "AccessDenied");
      return NextResponse.redirect(errorUrl);
    }
  }

  // For all other relevant paths, apply NextAuth middleware
  // console.log("Applying nextAuthMiddleware.");
  return nextAuthMiddleware(req);
}

export const config = {
  // Updated Matcher:
  // Match everything EXCEPT specific Next.js internals and common static files.
  // API routes are included so they can be properly authenticated.
  // The actual basePath and auth logic (including excluding /api/auth) is handled inside the function above.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)", // Exclude only static assets, images, and favicon
  ],
};
