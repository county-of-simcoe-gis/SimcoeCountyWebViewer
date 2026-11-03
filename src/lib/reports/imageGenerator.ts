/**
 * Image Generator for ArcGIS Map Services
 * Migrated from SimcoeCountyWebApiSecured imageGenerator.js
 *
 * Generates map images via ArcGIS MapServer export and mapfish print services.
 */

// Print service configuration
const PRINT_URL = "https://opengis.simcoe.ca/print";
const ORIGIN_URL = "https://opengis.simcoe.ca";

const DEFAULT_ORTHO_YEAR = "2024";

/** Ortho year used by report maps; set ORTHO_YEAR to switch (needs Ortho_<year>_Cache and a "<year> Ortho" GeoServer layer). */
export function getOrthoYear(): string {
  const year = process.env.ORTHO_YEAR;
  return year && /^\d{4}$/.test(year) ? year : DEFAULT_ORTHO_YEAR;
}

// Default basemap for print service
function getDefaultBasemap() {
  return {
    type: "tiledwms",
    layers: [`${getOrthoYear()} Ortho`],
    baseURL: "https://opengis.simcoe.ca/geoserver/wms",
    imageFormat: "image/png",
    customParams: { TRANSPARENT: true },
    tileSize: [256, 256],
    opacity: 1,
  };
}

/**
 * Streets (B&W) basemap for print service — used by council reports.
 * Matches the old print_config.json "Streets" WMTS entry.
 */
export const STREETS_BASEMAP = {
  type: "WMTS",
  imageFormat: "image/png",
  opacity: 1,
  style: "Default Style",
  version: "1.0.0",
  dimensions: [] as string[],
  dimensionParams: {},
  requestEncoding: "REST",
  customParams: { TRANSPARENT: "true", zIndex: 4 },
  matrixSet: "EPSG:3857",
  baseURL:
    "https://maps.simcoe.ca/arcgis/rest/services/Public/Streets_Black_And_White_Cache/MapServer/tile/{TileMatrix}/{TileRow}/{TileCol}",
  layer: "Streets_Black_And_White_Cache",
  matrices: [
    { identifier: "0", scaleDenominator: 1091957.5469304254, topLeftCorner: [-20037508.342787, 20037508.342787], tileSize: [256, 256], matrixSize: [230, 200] },
    { identifier: "1", scaleDenominator: 545978.7734656851, topLeftCorner: [-20037508.342787, 20037508.342787], tileSize: [256, 256], matrixSize: [459, 399] },
    { identifier: "2", scaleDenominator: 272989.38673237009, topLeftCorner: [-20037508.342787, 20037508.342787], tileSize: [256, 256], matrixSize: [917, 797] },
    { identifier: "3", scaleDenominator: 136494.69336618504, topLeftCorner: [-20037508.342787, 20037508.342787], tileSize: [256, 256], matrixSize: [1833, 1593] },
    { identifier: "4", scaleDenominator: 68247.34668309252, topLeftCorner: [-20037508.342787, 20037508.342787], tileSize: [256, 256], matrixSize: [3665, 3186] },
    { identifier: "5", scaleDenominator: 34123.67334154626, topLeftCorner: [-20037508.342787, 20037508.342787], tileSize: [256, 256], matrixSize: [7329, 6372] },
    { identifier: "6", scaleDenominator: 17061.836671245605, topLeftCorner: [-20037508.342787, 20037508.342787], tileSize: [256, 256], matrixSize: [14658, 12744] },
    { identifier: "7", scaleDenominator: 8530.918335622802, topLeftCorner: [-20037508.342787, 20037508.342787], tileSize: [256, 256], matrixSize: [29316, 25488] },
    { identifier: "8", scaleDenominator: 4265.459167338929, topLeftCorner: [-20037508.342787, 20037508.342787], tileSize: [256, 256], matrixSize: [58631, 50976] },
    { identifier: "9", scaleDenominator: 2132.729584141936, topLeftCorner: [-20037508.342787, 20037508.342787], tileSize: [256, 256], matrixSize: [117261, 101951] },
    { identifier: "10", scaleDenominator: 1066.3647915984969, topLeftCorner: [-20037508.342787, 20037508.342787], tileSize: [256, 256], matrixSize: [234521, 203901] },
    { identifier: "11", scaleDenominator: 532.9474944663505, topLeftCorner: [-20037508.342787, 20037508.342787], tileSize: [256, 256], matrixSize: [469248, 407980] },
  ],
};

const WEB_MERCATOR_ORIGIN = 20037508.342787;
const LEVEL_0_SCALE_DENOMINATOR = 1091957.5469304254;
const PIXEL_SIZE_METERS = 0.00028;
const ORTHO_LEVELS = 12;

/**
 * Ortho (WMTS) basemap for the print service. The caches share one tiling scheme, so only the
 * year changes the URL/layer; matrix sizes span the whole world so any cache extent is covered.
 */
export function getOrthoBasemap(year: string = getOrthoYear()) {
  return {
    type: "WMTS",
    imageFormat: "image/png",
    opacity: 1,
    style: "Default Style",
    version: "1.0.0",
    dimensions: [] as string[],
    dimensionParams: {},
    requestEncoding: "REST",
    customParams: { TRANSPARENT: "true", zIndex: 5 },
    matrixSet: "EPSG:3857",
    baseURL: `https://maps.simcoe.ca/arcgis/rest/services/Public/Ortho_${year}_Cache/MapServer/tile/{TileMatrix}/{TileRow}/{TileCol}`,
    layer: `Ortho_${year}_Cache`,
    matrices: Array.from({ length: ORTHO_LEVELS }, (_, level) => {
      const scaleDenominator = LEVEL_0_SCALE_DENOMINATOR / 2 ** level;
      const tilesAcrossWorld = Math.round((2 * WEB_MERCATOR_ORIGIN) / (scaleDenominator * PIXEL_SIZE_METERS * 256));
      return {
        identifier: String(level),
        scaleDenominator,
        topLeftCorner: [-WEB_MERCATOR_ORIGIN, WEB_MERCATOR_ORIGIN],
        tileSize: [256, 256],
        matrixSize: [tilesAcrossWorld, tilesAcrossWorld],
      };
    }),
  };
}

/**
 * Get an ArcGIS OAuth2 app token
 */
export async function getArcGISToken(
  serviceUrl: string,
  clientId: string,
  clientSecret: string
): Promise<string | null> {
  try {
    const url = `${serviceUrl}/sharing/rest/oauth2/token?client_id=${clientId}&grant_type=client_credentials&client_secret=${clientSecret}`;
    const response = await fetch(url, {
      method: "GET",
      cache: "no-cache",
    });
    const json = await response.json();
    return json.access_token || null;
  } catch (error) {
    console.error("[ImageGenerator] Error getting ArcGIS token:", error);
    return null;
  }
}

/**
 * Get ArcGIS MapServer service details (layers, etc.)
 */
export async function getServiceDetails(
  host: string,
  service: string,
  token?: string | null
): Promise<{ layers?: Array<{ id: number; name: string }> }> {
  try {
    const url = `https://${host}/arcgis/rest/services/${service}/MapServer?f=json${token ? `&token=${token}` : ""}`;
    const response = await fetch(url);
    return await response.json();
  } catch (error) {
    console.error("[ImageGenerator] Error getting service details:", error);
    return {};
  }
}

/**
 * Build an ArcGIS MapServer export image URL
 */
export function buildExportUrl(
  host: string,
  service: string,
  options: {
    bbox: number[];
    bboxSR: number;
    layers: number[];
    width: number;
    height: number;
    format: string;
    dpi: number;
    layerDefs?: string;
    token?: string | null;
  }
): string {
  let url =
    `https://${host}/arcgis/rest/services/${service}/MapServer/export` +
    `?F=image&bbox=${options.bbox.join(",")}` +
    `&bboxSR=${options.bboxSR}&imageSR=${options.bboxSR}` +
    `&layers=SHOW:${options.layers.join(",")}` +
    `&size=${options.width},${options.height}` +
    `&format=${options.format}` +
    `&transparent=true&dpi=${options.dpi}`;
  if (options.layerDefs) url += `&layerDefs=${options.layerDefs}`;
  if (options.token) url += `&token=${options.token}`;
  return url;
}

/**
 * Get a "layer object" for the mapfish print data
 */
export async function getLayerObject(options: {
  host: string;
  service: string;
  bbox: number[];
  bboxSR: number;
  layers?: number[];
  layerDefs?: string;
  width: number;
  height: number;
  format: string;
  dpi: number;
  token?: string | null;
  reportType?: string;
}): Promise<Record<string, unknown> | null> {
  const details = await getServiceDetails(options.host, options.service, options.token);
  if (!details?.layers) return null;

  const selectedLayers =
    options.layers ||
    [details.layers.find((l) => l.name === options.reportType)?.id].filter(
      (id): id is number => id !== undefined
    );

  const url = buildExportUrl(options.host, options.service, {
    bbox: options.bbox,
    bboxSR: options.bboxSR,
    layers: selectedLayers,
    width: options.width,
    height: options.height,
    format: options.format,
    dpi: options.dpi,
    layerDefs: options.layerDefs,
    token: options.token,
  });

  return {
    type: "image",
    baseURL: url,
    opacity: 1,
    imageFormat: "image/png",
    extent: options.bbox,
    name: "image",
  };
}

/**
 * Get the map scale from an ArcGIS export request
 */
export async function getMapScale(options: {
  host: string;
  service: string;
  bbox: number[];
  bboxSR: number;
  layers: number[];
  width: number;
  height: number;
  format: string;
  dpi: number;
  token?: string | null;
}): Promise<{ scale?: number }> {
  const url =
    `https://${options.host}/arcgis/rest/services/${options.service}/MapServer/export` +
    `?F=json&bbox=${options.bbox.join(",")}&bboxSR=${options.bboxSR}&imageSR=${options.bboxSR}` +
    `&layers=SHOW:${options.layers.join(",")}&size=${options.width},${options.height}` +
    `&format=${options.format}&transparent=true&dpi=${options.dpi}` +
    (options.token ? `&token=${options.token}` : "");

  try {
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch {
    return {};
  }
}

/**
 * Submit a print request to the mapfish print service and poll for the result.
 * Returns the download URL of the generated image.
 */
export async function getMapImage(
  options: {
    layout?: string;
    height: number;
    width: number;
    dpi?: number;
    bbox?: number[];
    outputFormat?: string;
    scale?: number;
    basemap?: Record<string, unknown>;
    center?: number[];
  },
  layers: Record<string, unknown>[]
): Promise<string | null> {
  const height = options.height || 235;
  const width = options.width || 235;
  const dpi = 72;
  const bbox = options.bbox || [-8911577, 5539336, -8910251, 5540766];
  const layout = options.layout || "map only";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const printData: Record<string, any> = {
    layout,
    outputFormat: options.outputFormat || "jpg",
    dpi,
    attributes: {
      map: {
        projection: "EPSG:3857",
        longitudeFirst: true,
        rotation: 0,
        dpi,
        height,
        width,
        bbox,
        layers: [],
      },
    },
  };

  if (options.scale) {
    printData.attributes.map.scale = options.scale;
    printData.attributes.scalebar = { geodetic: options.scale };
    printData.attributes.map.center = options.center || [
      (bbox[0] + bbox[2]) / 2,
      (bbox[1] + bbox[3]) / 2,
    ];
    delete printData.attributes.map.bbox;
  }

  // Add requested layers + basemap
  printData.attributes.map.layers.push(...layers);
  printData.attributes.map.layers.push(options.basemap ?? getDefaultBasemap());

  const printAppId = layout.replace(/ /g, "_");
  const outputFormat = printData.outputFormat;
  const encodedPrintRequest = encodeURIComponent(JSON.stringify(printData));
  const url = `${PRINT_URL}/print/${printAppId}/report.${outputFormat}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: encodedPrintRequest,
    });
    const statusResponse = await response.json();

    // Poll for completion
    return await pollPrintStatus(statusResponse);
  } catch (error) {
    console.error("[ImageGenerator] Print failed:", error);
    return null;
  }
}

/**
 * Poll the mapfish print service for job completion
 */
async function pollPrintStatus(
  statusResponse: { statusURL?: string },
  interval = 250,
  maxAttempts = 120
): Promise<string | null> {
  if (!statusResponse?.statusURL) return null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, interval));

    try {
      const response = await fetch(`${ORIGIN_URL}${statusResponse.statusURL}`);
      const data = await response.json();

      if (data.done === true && data.status === "finished") {
        return `${ORIGIN_URL}${data.downloadURL}`;
      }
      if (data.done === true && data.status === "error") {
        console.error("[ImageGenerator] Print error:", data);
        return null;
      }
      // still running, continue polling
    } catch (error) {
      console.error("[ImageGenerator] Poll error:", error);
      return null;
    }
  }

  console.error("[ImageGenerator] Print timed out");
  return null;
}

/**
 * Download an image from a URL and return its Buffer
 */
export async function downloadImage(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error("[ImageGenerator] Download error:", error);
    return null;
  }
}
