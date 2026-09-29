/** Minimum logo width in pixels. */
export const LOGO_MIN_WIDTH_PX = 32;
/** Minimum logo height in pixels. */
export const LOGO_MIN_HEIGHT_PX = 32;
/** Maximum logo width in pixels. */
export const LOGO_MAX_WIDTH_PX = 200;
/** Maximum logo height in pixels. */
export const LOGO_MAX_HEIGHT_PX = 60;

/**
 * Resolves a configured header/logo image name into a usable image src.
 *
 * - If the value already starts with "/" or "http", it is returned as-is.
 * - Otherwise, it is treated as a filename under /images/.
 * - When no value is supplied, falls back to the original "/images/logo.png".
 */
export function getLogoImage(headerLogoImageName?: string): string {
  if (headerLogoImageName) {
    if (headerLogoImageName.startsWith("/") || headerLogoImageName.startsWith("http")) {
      return headerLogoImageName;
    }
    return `/images/${headerLogoImageName}`;
  }
  return "/images/logo.png";
}
