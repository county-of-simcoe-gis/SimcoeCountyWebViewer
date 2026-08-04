"use client";

import AppImage from "@/components/shared/AppImage";
import { getLogoImage, LOGO_MAX_HEIGHT_PX, LOGO_MAX_WIDTH_PX, LOGO_MIN_HEIGHT_PX, LOGO_MIN_WIDTH_PX } from "@/utils/logoUtils";

export interface LogoImageProps {
  /** Configured logo image name/path, or undefined to use the default logo. */
  headerLogoImageName?: string;
  /** Accessible text for the logo. */
  alt?: string;
  /** Additional classes applied to the inner <img> element. */
  className?: string;
  /** Additional classes applied to the outer container. */
  containerClassName?: string;
}

/**
 * Renders a header/splash logo image constrained to sensible min/max dimensions.
 *
 * The container clamps width/height while the inner image uses `object-contain`
 * so that SVGs and bitmaps scale proportionally without overflowing their
 * bounding box.
 */
export default function LogoImage({ headerLogoImageName, alt = "County of Simcoe", className, containerClassName }: LogoImageProps) {
  const src = getLogoImage(headerLogoImageName);

  const containerClasses = [
    "flex items-center justify-center",
    `min-w-[${LOGO_MIN_WIDTH_PX}px]`,
    `min-h-[${LOGO_MIN_HEIGHT_PX}px]`,
    `max-w-[${LOGO_MAX_WIDTH_PX}px]`,
    `max-h-[${LOGO_MAX_HEIGHT_PX}px]`,
    containerClassName,
  ]
    .filter(Boolean)
    .join(" ");

  const imageClasses = ["max-h-full max-w-full object-contain", className].filter(Boolean).join(" ");

  return (
    <div className={containerClasses}>
      <AppImage src={src} alt={alt} className={imageClasses} />
    </div>
  );
}
