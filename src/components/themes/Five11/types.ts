/**
 * Types for the 511 Live Feeds theme
 */

export interface Five11LayerConfig {
  apiUrl: string;
  layerName: string;
  displayName: string;
  imageName: string;
  clickable: boolean;
  visible: boolean;
  zIndex: number;
  geometryType: "Point" | "LineString";
}

export interface Five11Config {
  wazeToggleLayers: Five11LayerConfig[];
  mtoToggleLayers: Five11LayerConfig[];
}

// Waze alert feature properties
export interface WazeAlertProperties {
  type?: string;
  subtype?: string;
  reportDescription?: string;
  date?: string;
  street?: string;
  uuid?: string;
  [key: string]: unknown;
}

// Waze jam/irregularity feature properties
export interface WazeLineProperties {
  speedKMH?: number;
  delay?: number;
  date?: string;
  street?: string;
  city?: string;
  level?: number;
  length?: number;
  [key: string]: unknown;
}

// MTO event feature properties
export interface MtoEventProperties {
  DirectionOfTravel?: string;
  Description?: string;
  LanesAffected?: string;
  EventType?: string;
  IsFullClosure?: boolean | string;
  Comment?: string;
  startDate?: string;
  endDate?: string;
  [key: string]: unknown;
}

// MTO camera feature properties
export interface MtoCameraProperties {
  Description?: string;
  Url?: string;
  Latitude?: number;
  Longitude?: number;
  [key: string]: unknown;
}

// Union type for all 511 feature properties
export type Five11FeatureProperties = WazeAlertProperties | WazeLineProperties | MtoEventProperties | MtoCameraProperties;
