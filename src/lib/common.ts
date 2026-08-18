/**
 * Common utility functions for API operations
 */

/**
 * Formats a date object into SQL-compatible string format
 * @param dt Date object to format
 * @returns Formatted date string (YYYY-MM-DD HH:mm:ss)
 */
export function getSqlDateString(dt: Date): string {
  const year = dt.getFullYear();
  const month = pad2(dt.getMonth() + 1);
  const day = pad2(dt.getDate());
  const hours = pad2(dt.getHours());
  const minutes = pad2(dt.getMinutes());
  const seconds = pad2(dt.getSeconds());

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Pads a number with leading zeros to ensure 2-digit format
 * @param number Number to pad
 * @returns Padded string
 */
export function pad2(number: number): string {
  let str = number.toString();
  while (str.length < 2) {
    str = "0" + str;
  }
  return str;
}

/**
 * Checks if the request host is allowed based on environment configuration
 * @param host Host from request headers
 * @returns true if host is allowed, false otherwise
 */
export function isHostAllowed(host?: string): boolean {
  if (!host) {
    return false;
  }

  const allowedOrigins = process.env.APP_ALLOWED_ORIGINS?.split(",") || ["localhost"];
  return allowedOrigins.includes(host);
}

/**
 * Validates if a Bearer token exists in the Authorization header
 * @param request NextRequest object
 * @returns Bearer token string or null if not found
 */
export function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.substring(7);
}
