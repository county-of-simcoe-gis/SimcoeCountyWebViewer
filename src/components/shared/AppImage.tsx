"use client";

import React from "react";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

/**
 * Returns true when the URL points at an internal/public asset
 * (i.e. it starts with "/" but is NOT a protocol-relative "//…" URL).
 */
function isInternalPath(src: string): boolean {
  return src.startsWith("/") && !src.startsWith("//");
}

/**
 * Resolves an image `src` by prepending basePath for internal paths.
 * External URLs (http, https, data:, blob:, //) are returned unchanged.
 */
export function resolveImageSrc(src: string): string {
  if (!basePath || !isInternalPath(src)) return src;
  // Avoid double-prefixing if basePath is already present
  if (src.startsWith(basePath + "/")) return src;
  return `${basePath}${src}`;
}

export type AppImageProps = React.ImgHTMLAttributes<HTMLImageElement>;

/**
 * Drop-in replacement for `<img>` that automatically prepends the
 * configured basePath to internal image URLs.
 *
 * External URLs (http/https, data:, blob:) are passed through unchanged.
 *
 * @example
 *   <AppImage src="/images/logo.png" alt="Logo" />
 *   // renders <img src="/map_nextjs/images/logo.png" ... />
 *
 *   <AppImage src="https://example.com/photo.jpg" alt="External" />
 *   // renders <img src="https://example.com/photo.jpg" ... />
 */
export default function AppImage({ src, ...rest }: AppImageProps) {
  const resolvedSrc = src ? resolveImageSrc(src) : src;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={resolvedSrc} {...rest} />;
}
