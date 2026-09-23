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

/**
 * Returns an absolute URL for a public asset, preserving already-absolute URLs.
 *
 * MapFish Print fetches icon URLs server-side, so relative paths must be made
 * absolute and include the configured basePath. Data URLs and absolute URLs
 * are returned unchanged.
 *
 * @example
 *   getAbsolutePublicUrl("/images/logo.png")
 *     // => "https://opengis.simcoe.ca/viewer/images/logo.png"
 */
export function getAbsolutePublicUrl(url: string): string {
  if (!url) return url;

  // Already absolute (http:, https:, //) or inline data — leave as-is.
  if (/^(https?:|\/\/|data:)/i.test(url)) {
    return url;
  }

  const basePath = getBasePath();
  const normalizedPath = url.startsWith("/") ? url : `/${url}`;

  // Avoid double-prefixing when the URL was already built with the basePath.
  const publicUrl = basePath && normalizedPath.startsWith(`${basePath}/`) ? normalizedPath : getPublicPath(normalizedPath);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}${publicUrl}`;
}

export default getPublicPath;
