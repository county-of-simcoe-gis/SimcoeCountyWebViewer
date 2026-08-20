/**
 * Core utility functions
 */

import { v4 as uuidv4 } from "uuid";

/**
 * Generate a unique ID (RFC 4122 v4 UUID).
 * uuid v4 uses cryptographically secure randomness.
 */
export function getUID(): string {
  return uuidv4();
}

/**
 * Convert an HTML string to plain text using DOMParser.
 * Unlike regex-based tag stripping, the HTML parser handles multi-character
 * sequences (comments, script/style content, unclosed tags) correctly.
 * Falls back to the input string when DOMParser is unavailable (e.g. SSR).
 */
export function htmlToText(html: string): string {
  if (typeof DOMParser === "undefined") return html;
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body.textContent ?? "";
}

/**
 * Try to parse JSON safely
 */
export function tryParseJSON(jsonString: string): unknown | false {
  try {
    const obj = JSON.parse(jsonString);
    if (obj && typeof obj === "object") {
      return obj;
    }
  } catch {
    // Parsing failed
  }
  return false;
}
