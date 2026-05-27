import axiosInstance from "./axiosInstance";

// Types for Radar Images API
export interface RadarImage {
  RADAR_STATION_CODE: string;
  RADAR_CODE?: string;
  RADAR_DESCRIPTION: string;
  RADAR_DATE: string;
  JS_MAPIMAGE: string;
  FILE_NAME: string;
  MINUTES_SINCE_2015: number;
  TIME_ID?: number;
  // allow additional fields from different API versions
  [key: string]: unknown;
}

// Types for Weather Forecast API
export interface WeatherWarning {
  priority: "low" | "medium" | "high";
  text: string;
  link?: string;
}

export interface CityWeatherData {
  city: string;
  currentConditions: {
    temperature: string;
    description: string;
    feelsLike: string;
    humidity: string;
    windSpeed: string;
    windDirection: string;
  };
  forecast: {
    period: string;
    summary: string;
    temperature: string;
    iconCode: string;
    imageUrl?: string;
  }[];
  warnings: WeatherWarning[];
}

/**
 * Fetch radar images for a given date range
 */
export async function getRadarImages(fromDate: string, toDate: string): Promise<RadarImage[]> {
  try {
    const response = await axiosInstance.get("/public/map/tool/weather/RadarImages", {
      params: {
        fromDate,
        toDate,
      },
    });
    return response.data || [];
  } catch (error) {
    console.error("Error fetching radar images:", error);
    return [];
  }
}

/**
 * Fetch weather data for a specific city
 */
export async function getCityWeather(city: string): Promise<CityWeatherData | null> {
  try {
    const response = await axiosInstance.get(`/public/map/tool/weather/${encodeURIComponent(city)}`);

    if (!response.data) {
      return null;
    }

    // Parse the XML response using native DOMParser
    let parsedData = response.data;
    if (typeof response.data === "string") {
      parsedData = parseXMLString(response.data);
    }

    return parseWeatherData(parsedData, city);
  } catch (error) {
    console.error("Error fetching city weather:", error);
    return null;
  }
}

/**
 * Parse weather XML data into a structured format
 */
function parseWeatherData(data: Record<string, unknown>, cityName: string): CityWeatherData {
  // Extract current conditions
  const currentConditions = {
    temperature: extractValue(data, "temperature") || "N/A",
    description: extractValue(data, "condition") || "Unknown",
    feelsLike: extractValue(data, "humidex") || extractValue(data, "windchill") || "N/A",
    humidity: extractValue(data, "humidity") || "N/A",
    windSpeed: extractValue(data, "windSpeed") || "N/A",
    windDirection: extractValue(data, "windDirection") || "N/A",
  };

  // Extract forecast data (typically 3-day)
  const forecast = extractForecast(data);

  // Extract weather warnings
  const warnings = extractWarnings(data);

  return {
    city: cityName,
    currentConditions,
    forecast,
    warnings,
  };
}

/**
 * Extract forecast periods from parsed XML
 */
function extractForecast(data: Record<string, unknown>): Array<{
  period: string;
  summary: string;
  temperature: string;
  iconCode: string;
  imageUrl?: string;
}> {
  const forecasts: Array<{
    period: string;
    summary: string;
    temperature: string;
    iconCode: string;
    imageUrl?: string;
  }> = [];

  // Try several common structures returned from different parsers
  const candidates: unknown[] = [];

  // forecastGroup.forecast (fast-xml-parser / Environment Canada)
  const fd = data as Record<string, unknown>;
  const fg = (fd?.forecastGroup as Record<string, unknown> | undefined)?.forecast;
  if (fg) candidates.push(fg);

  // periodData.period (other feeds)
  const pd = (fd?.periodData as Record<string, unknown> | undefined)?.period;
  if (pd) candidates.push(pd);

  // fallback: top-level period or forecast
  const topPeriod = (fd?.period as unknown) || (fd?.forecast as unknown);
  if (topPeriod) candidates.push(topPeriod);

  // Find the first candidate that has data
  let periodArray: unknown[] = [];
  for (const c of candidates) {
    if (Array.isArray(c) && c.length > 0) {
      periodArray = c as unknown[];
      break;
    }
    if (c && typeof c === "object") {
      periodArray = [c];
      break;
    }
  }

  periodArray.slice(0, 3).forEach((period: unknown) => {
    const p = period as Record<string, unknown>;
    const periodLabel = extractValue(p, "textForecastName") || extractValue(p, "period") || extractValue(p, "title") || extractValue(p, "abbr") || "Period";
    const summary = extractValue(p, "textSummary") || extractValue(p, "abbreviatedForecast") || extractValue(p, "summary") || "";
    const temperature = extractValue(p, "temperature") || extractValue(p, "temperatures") || "N/A";
    const iconCode = extractValue(p, "iconCode") || extractValue(p, "icon") || "00";
    const imageUrl = extractValue(p, "iconUrl") || undefined;

    forecasts.push({
      period: periodLabel,
      summary,
      temperature,
      iconCode,
      imageUrl,
    });
  });

  return forecasts;
}

/**
 * Extract warnings from parsed XML
 */
function extractWarnings(data: Record<string, unknown>): WeatherWarning[] {
  const warnings: WeatherWarning[] = [];

  // Try multiple possible warning/alert structures
  const fd = data as Record<string, unknown>;
  const candidates: unknown[] = [];
  if ((fd?.warnings as Record<string, unknown> | undefined)?.event) candidates.push((fd.warnings as Record<string, unknown>)!.event);
  if ((fd?.alerts as Record<string, unknown> | undefined)?.alert) candidates.push((fd.alerts as Record<string, unknown>)!.alert);
  if ((fd?.events as Record<string, unknown> | undefined)?.event) candidates.push((fd.events as Record<string, unknown>)!.event);

  let alertArray: unknown[] = [];
  for (const c of candidates) {
    if (Array.isArray(c)) {
      alertArray = c;
      break;
    }
    if (c && typeof c === "object") {
      alertArray = [c];
      break;
    }
  }

  alertArray.forEach((alert: unknown) => {
    const a = alert as Record<string, unknown>;
    if (a) {
      let priority: "low" | "medium" | "high" = "low";
      const severity = (a.severity as string) || extractValue(a, "severity") || "";
      const severityLower = String(severity).toLowerCase();

      if (severityLower.includes("extreme") || severityLower.includes("warning") || (a.priority as string) === "high") {
        priority = "high";
      } else if (severityLower.includes("watch") || (a.priority as string) === "medium") {
        priority = "medium";
      }

      const text = (a.title as string) || extractValue(a, "description") || extractValue(a, "title") || "Alert";
      // Try attribute-based url first (fast-xml-parser uses $)
      const linkAttr = (a["$"] && (a["$"] as Record<string, unknown>)["url"]) || (a["$"] && (a["$"] as Record<string, unknown>)["link"]);
      const link = (typeof linkAttr === "string" ? linkAttr : undefined) || (a.url as string) || extractValue(a, "url") || undefined;

      warnings.push({
        priority,
        text,
        link,
      });
    }
  });

  return warnings;
}

/**
 * Parse XML string into a JavaScript object using native DOMParser
 */
function parseXMLString(xmlString: string): Record<string, unknown> {
  try {
    // Create a DOMParser instance (works in both browser and Node.js with dom environment)
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "text/xml");

    // Check for parsing errors
    if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
      console.error("XML parsing error");
      return {};
    }

    return xmlNodeToObject(xmlDoc.documentElement);
  } catch (error) {
    console.error("Error parsing XML:", error);
    return {};
  }
}

/**
 * Recursively convert XML nodes to JavaScript object
 */
function xmlNodeToObject(node: Element): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  // Add attributes
  if (node.attributes.length > 0) {
    for (let i = 0; i < node.attributes.length; i++) {
      const attr = node.attributes[i];
      result[attr.name] = attr.value;
    }
  }

  // Add child nodes
  const children: Record<string, unknown[]> = {};
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === 1) {
      // Element node
      const element = child as Element;
      const childObj = xmlNodeToObject(element);

      if (!children[element.tagName]) {
        children[element.tagName] = [];
      }
      children[element.tagName].push(childObj);
    } else if (child.nodeType === 3) {
      // Text node
      const text = child.textContent?.trim();
      if (text) {
        result["#text"] = text;
      }
    }
  }

  // Add children to result, unwrap single elements
  for (const [key, values] of Object.entries(children)) {
    if (values.length === 1) {
      result[key] = values[0];
    } else {
      result[key] = values;
    }
  }

  return result;
}

/**
 * Recursively extract a value from nested object
 */
function extractValue(obj: Record<string, unknown>, key: string): string | null {
  if (!obj) return null;

  // Helper to extract text from a node produced by XML parsers
  function getText(node: unknown): string | null {
    if (node == null) return null;
    if (typeof node === "string") return node;
    if (typeof node === "number" || typeof node === "boolean") return String(node);
    if (typeof node === "object") {
      const n = node as Record<string, unknown>;
      // Common text node name used by parsers
      if (n["#text"]) return String(n["#text"]);
      // fast-xml-parser uses attribute prefix like $ for attributes; sometimes value is nested
      if (n["$"] && typeof n["$"] === "object") {
        // try to find a textual child inside attributes object
        const attrObj = n["$"] as Record<string, unknown>;
        for (const k of Object.keys(attrObj)) {
          const v = attrObj[k];
          if (typeof v === "string") return v;
        }
      }
      // Otherwise recursively search for first textual child
      for (const k of Object.keys(n)) {
        const childText = getText(n[k]);
        if (childText) return childText;
      }
    }
    return null;
  }

  // Direct match
  if (obj[key]) {
    const val = obj[key];
    const t = getText(val);
    return t !== null ? t : String(val);
  }

  // Recursive search
  for (const k in obj) {
    if (typeof obj[k] === "object" && obj[k] !== null) {
      const result = extractValue(obj[k] as Record<string, unknown>, key);
      if (result) return result;
    }
  }

  return null;
}

/**
 * Format date string for API call (expects YYYY-MM-DD)
 */
export function formatDateForAPI(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Get warning badge color based on priority
 */
export function getWarningColor(priority: WeatherWarning["priority"]): string {
  const colors = {
    low: "bg-gray-200 text-gray-800",
    medium: "bg-yellow-200 text-yellow-800",
    high: "bg-red-200 text-red-800",
  };
  return colors[priority];
}

/**
 * Get warning badge background color for CSS
 */
export function getWarningBgColor(priority: WeatherWarning["priority"]): string {
  const colors = {
    low: "#707070",
    medium: "#ffff00",
    high: "#bb0000",
  };
  return colors[priority];
}
