/**
 * String manipulation utilities
 */

/**
 * Format text to title case
 */
export function toTitleCase(str: string): string {
  return str.replace(/_/g, " ").replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

/**
 * Format text to title case with length limit
 */
export function formatTitleCase(str: string, maxLength?: number): string {
  let result = toTitleCase(str);
  if (maxLength && result.length > maxLength) {
    result = result.substring(0, maxLength) + "...";
  }
  return result;
}
