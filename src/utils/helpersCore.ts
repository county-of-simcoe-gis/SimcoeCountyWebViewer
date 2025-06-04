/**
 * Core utility functions
 */

/**
 * Generate a unique ID
 */
export function getUID(): string {
  return Math.random().toString(36).substr(2, 9);
}

/**
 * Try to parse JSON safely
 */
export function tryParseJSON(jsonString: string): unknown | false {
  try {
    const obj = JSON.parse(jsonString);
    if (obj && typeof obj === 'object') {
      return obj;
    }
  } catch {
    // Parsing failed
  }
  return false;
} 