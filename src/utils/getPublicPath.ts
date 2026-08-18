/**
 * Prepends the configured basePath to a public asset path.
 *
 * Next.js `<Image>` handles basePath automatically, but raw `<img>` tags
 * and programmatic references to files in `public/` do not.
 * Use this helper whenever you build a URL that points to the public folder
 * outside of the Next.js `<Image>` component.
 *
 * @example
 *   getPublicPath("/images/logo.png")  // => "/map_nextjs/images/logo.png"
 */
export function getBasePath(): string {
  if (process.env.NEXT_PUBLIC_BASE_PATH) {
    return process.env.NEXT_PUBLIC_BASE_PATH;
  }

  if (typeof window === "undefined") {
    return "";
  }

  const pathParts = window.location.pathname.split("/").filter(Boolean);
  if (pathParts.length === 0) return "";

  return `/${pathParts[0]}`;
}

export function getPublicPath(path: string): string {
  // Ensure the path starts with /
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getBasePath()}${normalizedPath}`;
}

export default getPublicPath;
