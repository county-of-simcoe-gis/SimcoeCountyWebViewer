import React, { ReactNode } from "react";
import Feature from "ol/Feature";
import type Geometry from "ol/geom/Geometry";
import moment from "moment";
import DOMPurify from "dompurify";
import Attachments from "@/components/common/Attachments";

/** Regex patterns for keys to exclude from identify popups and CSV export */
export const IDENTIFY_FILTER_KEY_PATTERNS = [
  /^_.*$/,
  /^id$/,
  /^geometry$/,
  /^geom$/,
  /^extent_geom$/,
  /^.*gid.*$/,
  /^globalid$/,
  /^objectid.*$/,
  /^shape.*$/,
  /^displayfieldname$/,
  /^displayfieldvalue$/,
  /^layerdisplayname$/,
  /^geostasis\..*$/,
  /^.*fid.*$/,
  /^boundedby$/,
  /^feature id$/,
];

/** Check whether a property key should be excluded from display */
export function isExcludedKey(key: string): boolean {
  const lower = key.toLowerCase();
  return IDENTIFY_FILTER_KEY_PATTERNS.some((pattern) => pattern.test(lower));
}

/** Filter an OL Feature's property keys, removing internal/system fields and object values */
export function filterFeatureKeys(feature: Feature<Geometry>): string[] {
  const props = feature.getProperties();
  return Object.keys(props).filter((key) => {
    const val = props[key];
    if (val !== null && typeof val === "object") return false;
    return !isExcludedKey(key);
  });
}

/** Filter a plain properties object's keys, removing internal/system fields */
export function filterPropertyKeys(properties: Record<string, unknown>): string[] {
  return Object.keys(properties).filter((key) => !isExcludedKey(key));
}

/** Field labels that should never be reformatted as dates (false-positive guards) */
const DATE_LABEL_EXCLUSIONS = ["NUMBER", "BYLAW", "WASTE COLLECTION DAY"];

/**
 * Detect a strict ISO 8601 date/time string and format it for display (local time).
 * Includes the time-of-day when the source value contains one, otherwise date-only.
 * Returns null when the value isn't a date-like string, or the label matches an
 * exclusion guard (e.g. "Bylaw Number"), so callers can leave the raw value untouched.
 */
export function formatIdentifyDateValue(label: string, value: string): string | null {
  if (!value || value.length < 8) return null;
  if (DATE_LABEL_EXCLUSIONS.some((word) => label.toUpperCase().includes(word))) return null;
  if (!moment(value, [moment.ISO_8601, "YYYY-MM-DDZ"], true).isValid()) return null;

  const hasSeconds = /\d{2}:\d{2}:\d{2}/.test(value);
  const hasTime = hasSeconds || /\d{2}:\d{2}/.test(value);
  if (!hasTime) return moment(value).format("YYYY-MM-DD");
  return moment(value).format(hasSeconds ? "YYYY-MM-DD HH:mm:ss" : "YYYY-MM-DD HH:mm");
}

/**
 * Format an epoch-millisecond date value (e.g. from a typed columnar store
 * that has already parsed a "date" column) using the same date-only vs.
 * date-time convention as `formatIdentifyDateValue`. Formats in UTC (matching
 * how `Date.parse` treats bare "YYYY-MM-DD" strings) so date-only values
 * round-trip to the same calendar date regardless of the viewer's local
 * timezone. Since the original string granularity isn't available, a value
 * that lands exactly on UTC midnight is treated as date-only; anything else
 * includes the time.
 */
export function formatEpochDateValue(ms: number): string {
  const d = moment.utc(ms);
  const isMidnightUtc = d.hours() === 0 && d.minutes() === 0 && d.seconds() === 0;
  return isMidnightUtc ? d.format("YYYY-MM-DD") : d.format("YYYY-MM-DD HH:mm:ss");
}

/**
 * Optional hint describing the source column's declared type (e.g. from a
 * typed columnar store such as the Attribute Table's `ColumnarStore`).
 * When provided, it lets callers bypass the generic runtime-type heuristics
 * below (which are needed for untyped sources like OL Feature properties)
 * in favor of exact, type-aware formatting. Omit it to preserve the default
 * heuristic-based behavior (used by InfoRow/Identify).
 */
export type FieldTypeHint = "number" | "string" | "boolean" | "date";

/**
 * Check if a string contains HTML tags
 */
const isHtmlString = (str: string): boolean => {
  const htmlRegex = /<[a-z][\w]*[^>]*>/i;
  return htmlRegex.test(str);
};

/**
 * Check if a string is an HTTP URL
 */
const isHttpUrl = (str: string): boolean => {
  return !!str && str.substring(0, 4).toUpperCase() === "HTTP";
};

/**
 * Check if a string is a UNC path (\\server\path)
 */
const isUncPath = (str: string): boolean => {
  return !!str && str.substring(0, 2).toUpperCase() === "\\\\";
};

/**
 * Check if a string is a Windows drive path (C:\path)
 */
const isWindowsPath = (str: string): boolean => {
  return !!str && str.length > 2 && str.substring(1, 3).toUpperCase() === ":\\";
};

/**
 * Safely render HTML string using DOMPurify
 */
const renderSafeHtml = (htmlString: string) => {
  const cleanHtml = DOMPurify.sanitize(htmlString);
  return <div dangerouslySetInnerHTML={{ __html: cleanHtml }} />;
};

/**
 * Format field name: convert snake_case to Title Case and replace underscores with spaces
 * Handles special cases like attachmentUrl → "Attachments"
 */
export const formatFieldName = (fieldName: string): string => {
  // Special case: attachment URLs get formatted as "Attachments"
  if (fieldName.toLowerCase() === "attachmenturl" || fieldName.toLowerCase() === "attachment_url" || fieldName.toLowerCase() === "attachment url") {
    return "Attachments";
  }
  return fieldName.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
};

/**
 * Format field value for display with HTML, URL, date, and type handling
 * Returns a React element or null if value is null/undefined
 */
export const formatFieldValue = (label: string, value: unknown, columnType?: FieldTypeHint): ReactNode | null => {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return null;
  }

  // Pass through already-rendered React elements unchanged (avoid
  // JSON.stringify-ing them in the object-handling branch below).
  if (React.isValidElement(value)) {
    return value;
  }

  // When the caller knows the source column's declared type, use exact
  // type-aware formatting instead of the runtime-type heuristics below.
  if (columnType === "date") {
    if (typeof value === "number") return formatEpochDateValue(value);
    if (typeof value === "string") return formatIdentifyDateValue(label, value) ?? value;
  }
  if (columnType === "number") {
    return String(value);
  }

  // Handle booleans
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  // Handle numbers and dates
  if (typeof value === "number") {
    // Check if this looks like a timestamp (must be a large number, e.g., > 1000000000 which is Sep 2001)
    if (value > 1000000000) {
      // Likely a date timestamp
      const dateStr = new Date(value).toISOString().slice(0, 19).replace("T", " ");
      return dateStr;
    }
    return String(value);
  }

  // Handle strings - convert to string first
  const valueStr = typeof value === "string" ? value : typeof value === "object" ? JSON.stringify(value) : String(value);

  // Handle attachment URLs
  if (label.toLowerCase() === "attachmenturl" || label.toLowerCase() === "attachment url") {
    return <Attachments attachmentUrl={valueStr} />;
  }

  // Handle HTTP URLs
  if (isHttpUrl(valueStr)) {
    return (
      <a href={valueStr} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
        Click To Open
      </a>
    );
  }

  // Handle UNC paths
  if (isUncPath(valueStr)) {
    return (
      <a href={valueStr} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
        Click To Open
      </a>
    );
  }

  // Handle Windows drive paths
  if (isWindowsPath(valueStr)) {
    return (
      <a href={valueStr} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
        {valueStr}
      </a>
    );
  }

  // Handle HTML strings (check before date formatting to prioritize explicit HTML)
  if (isHtmlString(valueStr)) {
    return renderSafeHtml(valueStr);
  }

  // Handle date/time formatting — strict ISO 8601 detection
  const dateValue = formatIdentifyDateValue(label, valueStr);
  if (dateValue !== null) {
    return dateValue;
  }

  // Default: return as plain text
  return valueStr;
};

/**
 * Format field value as plain text (for cases where React elements aren't suitable)
 * Used mainly for display, export, or console logging
 */
export const formatFieldValueAsText = (label: string, value: unknown, columnType?: FieldTypeHint): string => {
  if (value === null || value === undefined) {
    return "N/A";
  }

  if (columnType === "date") {
    if (typeof value === "number") return formatEpochDateValue(value);
    if (typeof value === "string") return formatIdentifyDateValue(label, value) ?? value;
  }
  if (columnType === "number") {
    return String(value);
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "number") {
    // Check if it's a timestamp (must be a large number, e.g., > 1000000000 which is Sep 2001)
    if (value > 1000000000) {
      return new Date(value).toISOString().slice(0, 19).replace("T", " ");
    }
    return String(value);
  }

  const valueStr = typeof value === "string" ? value : typeof value === "object" ? JSON.stringify(value) : String(value);

  // Check for date
  const dateValue = formatIdentifyDateValue(label, valueStr);
  if (dateValue !== null) {
    return dateValue;
  }

  return valueStr;
};
