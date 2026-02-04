import type { AvlVehicle, AvlSubGroup } from "../types/avl.types";

/**
 * Get a friendly date string from a Date object
 * Format: "YYYY-MM-DD h:mm AM/PM"
 */
export function getFriendlyDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const datePart = `${year}-${month}-${day}`;

  let hours = date.getHours();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12; // convert 0 to 12
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const timePart = `${hours}:${minutes} ${ampm}`;

  return `${datePart} ${timePart}`;
}

/**
 * Get SQL date string format for API calls
 * Format: "YYYY-MM-DD HH:mm:ss"
 */
export function getSqlDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Sort vehicles by vehicle ID ascending
 */
export function sortByVehicleIdAsc(a: AvlVehicle, b: AvlVehicle): number {
  if (a.vehicle_name < b.vehicle_name) return -1;
  if (a.vehicle_name > b.vehicle_name) return 1;
  return 0;
}

/**
 * Sort vehicles by vehicle ID descending
 */
export function sortByVehicleIdDesc(a: AvlVehicle, b: AvlVehicle): number {
  if (a.vehicle_name > b.vehicle_name) return -1;
  if (a.vehicle_name < b.vehicle_name) return 1;
  return 0;
}

/**
 * Sort vehicles by speed ascending
 */
export function sortBySpeedAsc(a: AvlVehicle, b: AvlVehicle): number {
  if (a.velocity < b.velocity) return -1;
  if (a.velocity > b.velocity) return 1;
  return 0;
}

/**
 * Sort vehicles by speed descending
 */
export function sortBySpeedDesc(a: AvlVehicle, b: AvlVehicle): number {
  if (a.velocity > b.velocity) return -1;
  if (a.velocity < b.velocity) return 1;
  return 0;
}

/**
 * Sort vehicles by date ascending (most recent first)
 */
export function sortByDateAsc(a: AvlVehicle, b: AvlVehicle): number {
  const dateA = new Date(a.date);
  const dateB = new Date(b.date);
  return dateA > dateB ? -1 : dateA < dateB ? 1 : 0;
}

/**
 * Sort vehicles by date descending (oldest first)
 */
export function sortByDateDesc(a: AvlVehicle, b: AvlVehicle): number {
  const dateA = new Date(a.date);
  const dateB = new Date(b.date);
  return dateA < dateB ? -1 : dateA > dateB ? 1 : 0;
}

/**
 * Add computed vehicle info (lastReported, cssClass, dateFriendly)
 */
export function addVehicleInfo(vehicle: AvlVehicle, subGroup: AvlSubGroup): AvlVehicle {
  vehicle.imageName = subGroup.imageName;

  const date = new Date(vehicle.date);
  // Date from API is in UTC but treated as local by new Date() in some browsers if 'Z' is missing/implicit
  // Legacy code suggests subtracting 5 hours, but clean UTC handling should just work if we treat it as Date.
  // The previous explicit timezone addition was causing double-shifting.
  // We use the date object directly which will be formatted to local time by getFriendlyDateString.
  const diff = Math.round((Date.now() - date.getTime()) / 1000);

  let differenceString = "";
  let cssClass = " ";

  if (diff < 2) {
    differenceString = "1 sec";
    cssClass = "green";
  } else if (diff < 60) {
    differenceString = diff + " seconds";
    cssClass = "green";
  } else if (diff >= 60 && diff < 90) {
    differenceString = "1 minute";
    cssClass = "green";
  } else if (diff > 60 && diff < 3600) {
    differenceString = Math.round(diff / 60) + " min";
    cssClass = "green";
  } else if (diff >= 3600 && diff < 5400) {
    differenceString = "1 hour";
    cssClass = "red";
  } else if (diff >= 5400 && diff < 86401) {
    differenceString = Math.round(diff / 3600) + " hr";
    cssClass = "red";
  } else {
    differenceString = Math.round(diff / 86400) + " days";
    cssClass = "red";
  }

  vehicle.lastReported = "Last Reported: " + differenceString;
  vehicle.cssClass = cssClass;
  vehicle.dateFriendly = getFriendlyDateString(date);

  return vehicle;
}

/**
 * Clean device names for consistent matching between database and GeoTab
 */
export function cleanDeviceNameForMatching(rawName: string, groupName: string): string {
  if (!rawName) return "";

  // Group-specific processing rules
  if (groupName === "Innisfil" || groupName === "Severn") {
    // For Innisfil/Severn: Replace dash with empty string
    return rawName.replace("-", "");
  } else if (groupName === "Roads GeoTab" || groupName === "Solid Waste GeoTab") {
    // For Road/Solid Waste: Use first part before dash
    return rawName.split("-")[0];
  } else if (groupName === "Waste Contractor") {
    // Convert to uppercase for case-insensitive comparison
    const deviceName = rawName.toUpperCase();

    // Handle different Waste Contractor name formats
    if (deviceName.startsWith("E")) {
      // For E-prefixed names, remove the E
      return rawName.substring(1).split("-")[0];
    } else if (deviceName.startsWith("SIMCOE")) {
      // For SIMCOE names, extract the numeric portion
      return deviceName.replace(/SIMCOE\s*[-–—]\s*/i, "").trim();
    } else if (deviceName.startsWith("SMC")) {
      // For SMC names, extract the numeric portion
      const parts = deviceName.split(/[-–—]/);
      if (parts.length > 1) {
        // Get the part after the dash and remove any E prefix if present
        let extractedPart = parts[1].trim();
        if (extractedPart.startsWith("E")) {
          extractedPart = extractedPart.substring(1);
        }
        return extractedPart;
      }
    }
    // Default case for Waste Contractor - use first part before dash
    return rawName.split("-")[0];
  } else {
    // Default case for other groups - use name as is
    return rawName;
  }
}

/**
 * Check if a string is "purely numeric" (only digits after removing non-alphanumeric chars)
 * This prevents matching "1691 Ops Eng SUV" (has text) to "16-91" (numeric only)
 */
export function isPurelyNumeric(str: string): boolean {
  if (!str) return false;
  const alphanumOnly = str.replace(/[^a-zA-Z0-9]/g, "");
  return /^\d+$/.test(alphanumOnly);
}

/**
 * Convert UTC date to local EST time
 */
export function convertUTCToLocal(utcDateString: string): string {
  if (!utcDateString) return utcDateString;
  const date = new Date(utcDateString);
  // Change to 5 hours for EST (was 4 hours for EDT)
  return new Date(date.getTime() - 5 * 60 * 60 * 1000).toISOString();
}

/**
 * Format date friendly for display using Intl.DateTimeFormat with explicit timezone
 */
export function formatDateFriendly(utcDateString: string): string {
  if (!utcDateString) return utcDateString;
  const date = new Date(utcDateString);

  // Use Intl.DateTimeFormat with explicit timezone for proper UTC to EST/EDT conversion
  const options: Intl.DateTimeFormatOptions = {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  };

  const parts = new Intl.DateTimeFormat("en-US", options).formatToParts(date);
  const year = parts.find((p) => p.type === "year")?.value || "";
  const month = parts.find((p) => p.type === "month")?.value || "";
  const day = parts.find((p) => p.type === "day")?.value || "";
  const hour = parts.find((p) => p.type === "hour")?.value || "";
  const minute = parts.find((p) => p.type === "minute")?.value || "";
  const dayPeriod = parts.find((p) => p.type === "dayPeriod")?.value || "";

  return `${year}-${month}-${day} ${hour}:${minute} ${dayPeriod}`;
}

/**
 * Calculate bearing between two points (in degrees)
 */
export function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRadians = (deg: number) => (deg * Math.PI) / 180;
  const toDegrees = (rad: number) => (rad * 180) / Math.PI;

  const dLon = toRadians(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRadians(lat2));
  const x =
    Math.cos(toRadians(lat1)) * Math.sin(toRadians(lat2)) -
    Math.sin(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.cos(dLon);
  const bearing = toDegrees(Math.atan2(y, x));
  return (bearing + 360) % 360;
}

/**
 * Round time to nearest 10 minutes
 */
export function roundTime(date: Date): Date {
  const coeff = 1000 * 60 * 10;
  return new Date(Math.round(date.getTime() / coeff) * coeff);
}

/**
 * Calculate difference in days between two dates
 */
export function dateDiffInDays(a: Date, b: Date): number {
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  const utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.floor((utc2 - utc1) / MS_PER_DAY);
}

/**
 * Generate unique ID
 */
export function getUID(): string {
  return Math.random().toString(36).substring(2, 11);
}

/**
 * Convert coordinate from lat/long to Web Mercator
 */
export function toWebMercatorFromLatLong(coords: [number, number]): [number, number] {
  const [lon, lat] = coords;
  const x = (lon * 20037508.34) / 180;
  let y = Math.log(Math.tan(((90 + lat) * Math.PI) / 360)) / (Math.PI / 180);
  y = (y * 20037508.34) / 180;
  return [x, y];
}

/**
 * Download file from data URI
 */
export function download(dataUri: string, filename: string): void {
  const link = document.createElement("a");
  link.setAttribute("href", dataUri);
  link.setAttribute("download", filename);
  link.click();
}
