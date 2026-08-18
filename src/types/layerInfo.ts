/**
 * Type definitions for Layer Info components
 */

export interface LayerInfoNativeCRS {
  "@class"?: string;
  $?: string;
}

export interface LayerInfoBoundingBox {
  minx: number;
  maxx: number;
  miny: number;
  maxy: number;
  crs?: {
    "@class": string;
    $: string;
  };
}

export interface LayerInfoAttribute {
  name: string;
  binding: string;
}

export interface LayerInfoAttributes {
  attribute: LayerInfoAttribute | LayerInfoAttribute[];
}

export interface LayerInfoNamespace {
  name: string;
  href?: string;
}

export interface LayerInfoData {
  name: string;
  title: string;
  abstract?: string;
  nativeCRS: LayerInfoNativeCRS | string;
  nativeBoundingBox: LayerInfoBoundingBox;
  attributes?: LayerInfoAttributes;
  namespace?: LayerInfoNamespace;
}

export interface LayerInfoResponse {
  featureType?: LayerInfoData;
  coverage?: LayerInfoData;
}

export interface LayerInfoProps {
  layerURL?: string;
  showDownload?: boolean;
  secure?: boolean;
  hideNewWindow?: boolean;
  hidePrint?: boolean;
  requestHeader?: Record<string, string>;
  params?: Record<string, unknown>;
}

export interface ArcGISFeatureInfo {
  name: string;
  description?: string;
  sourceSpatialReference?: {
    wkt?: string;
    latestWkid?: number;
  };
  extent: {
    xmin: number;
    xmax: number;
    ymin: number;
    ymax: number;
    spatialReference: {
      wkt?: string;
      latestWkid?: number;
    };
  };
  fields?: Array<{
    name: string;
    type: string;
  }>;
}
