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
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

export function getPublicPath(path: string): string {
  // Ensure the path starts with /
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${basePath}${normalizedPath}`;
}

export default getPublicPath;
