/**
 * Custom Next.js image loader that works correctly with basePath.
 *
 * The default image optimizer makes internal HTTP requests to fetch source
 * images, but it strips the basePath from the URL, causing 404s for local
 * public files (e.g. /images/*).
 *
 * This loader serves local images directly (with basePath prepended) and
 * returns external images as direct URLs (no proxy/optimization).
 */

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

interface ImageLoaderParams {
  src: string;
  width: number;
  quality?: number;
}

export default function imageLoader({ src }: ImageLoaderParams): string {
  // External / remote images — return direct URL without proxying
  if (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("//")) {
    return src;
  }

  // Local public images — serve directly with basePath prefix.
  // The basePath is already included by Next.js for <Image> src, but the
  // loader receives the *original* src (without basePath), so we prepend it.
  return `${basePath}${src}`;
}
