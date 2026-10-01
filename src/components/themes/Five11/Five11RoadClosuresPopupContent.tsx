"use client";

interface Five11RoadClosuresPopupContentProps {
  properties: Record<string, unknown>;
}

const FIELD_DISPLAY_ORDER = ["street", "reason", "direction", "description", "laneimpact", "accessallowed", "altroute", "starttime", "endtime", "url", "pocname", "pocemail", "pocphone"];

const FIELD_LABELS: Record<string, string> = {
  street: "Street",
  reason: "Reason",
  direction: "Direction",
  description: "Description",
  laneimpact: "Lane Impact",
  accessallowed: "Access Allowed",
  altroute: "Alternate Route",
  starttime: "Start Time",
  endtime: "End Time",
  url: "URL",
  pocname: "Contact Name",
  pocemail: "Contact Email",
  pocphone: "Contact Phone",
};

/**
 * Format a field name for display if no explicit label is configured.
 */
function formatFieldName(fieldName: string): string {
  if (FIELD_LABELS[fieldName]) {
    return FIELD_LABELS[fieldName];
  }

  return fieldName
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

const DATE_FIELD_NAMES = new Set(["starttime", "endtime"]);

const HIDDEN_FIELD_NAMES = new Set(["objectid", "shape__length", "shape__area", "shape_length", "shape_area", "streetoverride", "last_edited_date", "created_date", "lastediteddate", "createddate"]);

/**
 * Format a value for display.
 */
function formatValue(key: string, value: unknown): string {
  if (value === undefined || value === null) return "";

  // ArcGIS date fields are returned as epoch milliseconds.
  if (DATE_FIELD_NAMES.has(key.toLowerCase()) && typeof value === "number") {
    const date = new Date(value);
    return date.toLocaleString("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }

  return String(value);
}

export default function Five11RoadClosuresPopupContent({ properties }: Five11RoadClosuresPopupContentProps) {
  const entries = Object.entries(properties).filter(([key, value]) => {
    const lowerKey = key.toLowerCase();
    if (key === "geometry" || key.startsWith("_") || key.endsWith("globalid")) return false;
    if (HIDDEN_FIELD_NAMES.has(lowerKey)) return false;
    return value !== undefined && value !== null && value !== "";
  });

  // Sort entries so known fields appear first, then any remaining fields alphabetically.
  entries.sort(([a], [b]) => {
    const indexA = FIELD_DISPLAY_ORDER.indexOf(a.toLowerCase());
    const indexB = FIELD_DISPLAY_ORDER.indexOf(b.toLowerCase());
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return a.localeCompare(b);
  });

  return (
    <div className="space-y-2">
      {entries.map(([key, value]) => (
        <div key={key} className="flex flex-col">
          <span className="text-xs font-semibold text-base-content/70">{formatFieldName(key)}</span>
          {key.toLowerCase() === "url" ? (
            <a href={String(value)} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline break-all">
              {String(value)}
            </a>
          ) : (
            <span className="text-sm">{formatValue(key, value)}</span>
          )}
        </div>
      ))}
      {entries.length === 0 && <div className="text-sm text-base-content/70">No details available</div>}
    </div>
  );
}
