import { NextRequest, NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";

/**
 * Server-side helpers to fetch Environment Canada city weather XML
 */

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.text();
  } catch (err) {
    console.error("fetchText error:", err, url);
    return null;
  }
}

async function getCurrentHour(baseUrl: string): Promise<string | null> {
  const responseText = await fetchText(baseUrl);
  if (!responseText) return null;

  const now = new Date();
  const currentUtcHour = now.getUTCHours();
  const currentHourString = String(currentUtcHour).padStart(2, "0");

  const linkRegex = /<a[^>]*href=["'](\d+)\/["'][^>]*>/g;
  const matches = [...responseText.matchAll(linkRegex)];
  const availableHours = matches.map((m) => parseInt(m[1], 10));
  if (availableHours.length === 0) return null;

  let selectedHour: string;
  if (availableHours.includes(currentUtcHour)) {
    selectedHour = currentHourString;
  } else {
    selectedHour = String(Math.max(...availableHours)).padStart(2, "0");
  }

  const fullDirectoryUrl = baseUrl.endsWith("/") ? `${baseUrl}${selectedHour}/` : `${baseUrl}/${selectedHour}/`;
  return fullDirectoryUrl;
}

async function getWeatherLink(highestLink: string, city: string): Promise<string | null> {
  const responseText = await fetchText(highestLink);
  if (!responseText) return null;

  const linkRegex = /<a[^>]+href=["']([^"']+\.xml)["'][^>]*>/gi;
  const matches = [...responseText.matchAll(linkRegex)];
  if (matches.length === 0) return null;

  const cityCode = city.startsWith("s") ? city : `s${city.padStart(7, "0")}`;

  const found = matches.find((m) => {
    const href = m[1];
    try {
      const decoded = decodeURIComponent(href);
      return decoded.includes(cityCode) && decoded.includes("en.xml");
    } catch {
      return m[1].includes(cityCode) && m[1].includes("en.xml");
    }
  });

  if (!found) return null;

  const base = highestLink.endsWith("/") ? highestLink : highestLink + "/";
  return base + found[1];
}

async function getWeather(url: string): Promise<string | null> {
  return await fetchText(url);
}

async function getCityWeather(city: string): Promise<string | null> {
  // Use Environment Canada today citypage path
  const baseUrl = "https://dd.weather.gc.ca/today/citypage_weather/ON/";
  const highestLink = await getCurrentHour(baseUrl);
  if (!highestLink) return null;

  const weatherLink = await getWeatherLink(highestLink, city);
  if (!weatherLink) return null;

  const xml = await getWeather(weatherLink);
  return xml;
}

/**
 * GET /api/public/map/tool/weather/[city]
 * Fetch weather data for a specific city code
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ city: string }> }): Promise<NextResponse> {
  try {
    const { city } = await params;
    if (!city) {
      return NextResponse.json({ error: "City parameter is required" }, { status: 400 });
    }

    const xml = await getCityWeather(city);
    if (!xml) {
      console.error("Weather link or XML not found for city:", city);
      return NextResponse.json({}, { status: 200 });
    }

    try {
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "",
        attributesGroupName: "$",
        numberParseOptions: {
          leadingZeros: false,
        },
        textNodeName: "#text",
        ignoreDeclaration: true,
      });
      const parsed = parser.parse(xml);
      const siteData = parsed?.siteData ? parsed.siteData : parsed;
      return NextResponse.json({ siteData }, { status: 200 });
    } catch (err) {
      console.error("XML parse error:", err);
      return new NextResponse(xml, { headers: { "Content-Type": "application/xml" } });
    }
  } catch (error) {
    console.error("Error fetching city weather:", error);
    return NextResponse.json({ error: "Failed to fetch city weather" }, { status: 500 });
  }
}
