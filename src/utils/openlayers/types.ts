// OpenLayers Layer Types
export const OL_LAYER_TYPES = {
  Image: "Image",
  Tile: "Tile",
  Vector: "Vector",
  Group: "Group",
} as const;

export type OLLayerType = (typeof OL_LAYER_TYPES)[keyof typeof OL_LAYER_TYPES];

// OpenLayers Data Types
export const OL_DATA_TYPES = {
  GML3: "GML3",
  GML2: "GML2",
  GPX: "GPX",
  KML: "KML",
  OSMXML: "OSMXML",
  EsriJSON: "EsriJSON",
  GeoJSON: "GeoJSON",
  TopoJSON: "TopoJSON",
  IGC: "IGC",
  Polyline: "Polyline",
  WKT: "WKT",
  MVT: "MVT",
  XYZ: "XYZ",
  OSM: "OSM",
  Vector: "Vector",
  ImageWMS: "ImageWMS",
  TileArcGISRest: "TileArcGISRest",
  TileImage: "TileImage",
  SimcoeTiled: "SimcoeTiled", // Custom Simcoe tile type
  Stamen: "Stamen",
  ImageStatic: "ImageStatic",
  WMTS: "WMTS",
  TileWMS: "TileWMS",
  ImageArcGISRest: "ImageArcGISRest",
  LayerGroup: "LayerGroup",
  VectorTile: "VectorTile",
  GeoTIFF: "GeoTIFF",
} as const;

export type OLDataType = (typeof OL_DATA_TYPES)[keyof typeof OL_DATA_TYPES];

// Layer Creation Options Interface
export interface LayerOptions {
  sourceType: OLDataType;
  source?: string;
  projection?: string;
  layerName?: string;
  url?: string;
  params?: Record<string, unknown>;
  tiled?: boolean;
  file?: File | string;
  extent?: number[];
  name?: string;
  secured?: boolean;
  background?: string | null;
  rootPath?: string | null;
  spritePath?: string | null;
  pngPath?: string | null;
  minZoom?: number | null;
  maxZoom?: number | null;
  layers?: LayerOptions[];
}

// Layer Rebuild Parameters
export interface RebuildParams {
  sourceType: OLDataType;
  source?: string;
  projection?: string;
  layerName?: string;
  url?: string;
  tiled?: boolean;
  file?: string;
  extent?: number[];
  name?: string;
  background?: string | null;
}

// Basemap Layer Interface (for basemap switcher)
export interface BasemapLayerConfig {
  url: string;
  type: string;
  isOverlay?: boolean;
  excludePrint?: boolean;
  fullExtent?: number[];
  minZoom?: number;
  maxZoom?: number;
  rootPath?: string;
  spritePath?: string;
  pngPath?: string;
}

// Grouped Layer Options
export interface GroupedLayerOptions {
  name?: string;
  layers: LayerOptions[];
}

// Capabilities Options
export interface CapabilitiesOptions {
  url: string;
  layerName?: string;
  secured?: boolean;
  returnLayers?: number[];
} 