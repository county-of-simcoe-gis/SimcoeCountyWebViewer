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

/**
 * Replace all occurrences in a string
 */
export function replaceAllInString(str: string, find: string, replace: string): string {
  return str.replace(new RegExp(escapeRegExp(find), "g"), replace);
}

/**
 * Escape special regex characters in a string
 */
export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Format string with placeholders
 * Usage: formatReplace("Hello {0}, welcome to {1}!", "John", "the app")
 */
export function formatReplace(fmt: string, ...args: unknown[]): string {
  return fmt.replace(/{(\d+)}/g, (match, number) => {
    return typeof args[number] !== "undefined" ? String(args[number]) : match;
  });
}
