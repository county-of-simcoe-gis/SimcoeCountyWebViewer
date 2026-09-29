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
  // External / remote / data / blob images — return direct URL without proxying
  if (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("//") || src.startsWith("data:") || src.startsWith("blob:")) {
    return src;
  }

  // Static imports (/_next/static/media/...) already have basePath prepended
  // by Next.js before the loader is called — don't double-prepend.
  if (basePath && src.startsWith(basePath)) {
    return src;
  }

  // Local public images — serve directly with basePath prefix.
  return `${basePath}${src}`;
}
