/**
 * Shared color parsing and conversion utilities for OpenLayers style values.
 *
 * OL stores colors in several formats depending on context:
 *   - Arrays:  [r, g, b] or [r, g, b, a]
 *   - Strings: "rgba(232, 9, 229, 0.8)", "#e809e5", "#fff"
 *
 * The helpers here normalise between those representations and the
 * simple {r, g, b, a} object used by UI components (sliders, color pickers).
 */

export interface ColorRGB {
  r: number;
  g: number;
  b: number;
  a: number;
}

/**
 * Parse an OpenLayers color value (array, rgba/rgb string, hex, or short-hex)
 * into a {@link ColorRGB} object.  Returns `null` when the value cannot be
 * parsed.
 */
export const parseOLColor = (color: unknown): ColorRGB | null => {
  if (!color) return null;

  // [r, g, b] or [r, g, b, a]
  if (Array.isArray(color) && color.length >= 3) {
    return {
      r: color[0],
      g: color[1],
      b: color[2],
      a: color[3] ?? 1,
    };
  }

  if (typeof color !== "string") return null;

  // rgba(…) / rgb(…)
  const rgbaMatch = color.match(/^rgba?\s*\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)(?:\s*,\s*([\d.]+))?\s*\)$/i);
  if (rgbaMatch) {
    return {
      r: Number(rgbaMatch[1]),
      g: Number(rgbaMatch[2]),
      b: Number(rgbaMatch[3]),
      a: rgbaMatch[4] ? Number(rgbaMatch[4]) : 1,
    };
  }

  // #RRGGBB
  const hexMatch = color.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (hexMatch) {
    return {
      r: parseInt(hexMatch[1], 16),
      g: parseInt(hexMatch[2], 16),
      b: parseInt(hexMatch[3], 16),
      a: 1,
    };
  }

  // #RGB (short-hex)
  const shortHexMatch = color.match(/^#?([a-f\d])([a-f\d])([a-f\d])$/i);
  if (shortHexMatch) {
    return {
      r: parseInt(shortHexMatch[1] + shortHexMatch[1], 16),
      g: parseInt(shortHexMatch[2] + shortHexMatch[2], 16),
      b: parseInt(shortHexMatch[3] + shortHexMatch[3], 16),
      a: 1,
    };
  }

  return null;
};

/** Convert a hex color string (`#RRGGBB`) to a {@link ColorRGB}. */
export const hexToRgb = (hex: string): ColorRGB => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16), a: 1 } : { r: 0, g: 0, b: 0, a: 1 };
};

/** Convert a {@link ColorRGB} to a `#RRGGBB` hex string (alpha is ignored). */
export const rgbToHex = (rgb: ColorRGB): string => {
  const toHex = (n: number) => {
    const hex = Math.round(n).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
};

/**
 * Normalise any OL color value to a `#RRGGBB` hex string.
 * Returns `undefined` when the value cannot be parsed.
 */
export const normalizeColorToHex = (color: unknown): string | undefined => {
  const parsed = parseOLColor(color);
  return parsed ? rgbToHex(parsed) : undefined;
};

/** Convert a hex color string to an `rgba(…)` string with the given alpha. */
export const hexToRgba = (hex: string, alpha: number): string => {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/** Extract the px font size from an OpenLayers font string like `"bold 14px arial"`. */
export const extractFontSize = (font?: string): string | undefined => {
  if (!font) return undefined;
  const match = font.match(/(\d+(?:\.\d+)?)px/i);
  return match ? `${match[1]}px` : undefined;
};
