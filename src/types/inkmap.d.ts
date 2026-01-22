/**
 * Type declarations for @camptocamp/inkmap
 */

declare module "@camptocamp/inkmap" {
  export interface PrintSpec {
    layers: LayerSpec[];
    size: [number, number]; // [width, height] in pixels
    center: [number, number];
    dpi: number;
    scale: number;
    extent?: [number, number, number, number]; // [minX, minY, maxX, maxY]
    scaleBar?: {
      position: string;
      units?: string;
    };
    projection: string;
    projectionDefinitions?: {
      name: string;
      bbox: [number, number, number, number];
      proj4: string;
    }[];
    northArrow?: string; // Position string e.g. "top-right"
    attributions?: string; // Position string e.g. "bottom-right"
  }

  export interface LayerSpec {
    type: string;
    opacity?: number;
    [key: string]: any;
  }

  export interface WMSLayerSpec extends LayerSpec {
    type: "WMS";
    url: string;
    layer: string; // Singular layer name
    version?: string;
    format?: string;
    transparent?: boolean;
  }

  export interface XYZLayerSpec extends LayerSpec {
    type: "XYZ";
    url: string;
  }

  export interface OSMLayerSpec extends LayerSpec {
    type: "OSM";
  }

  export interface GeoJSONLayerSpec extends LayerSpec {
    type: "GeoJSON";
    geojson: any;
    style?: any;
  }

  export interface BingMapsLayerSpec extends LayerSpec {
    type: "BingMaps";
    key: string;
    imagerySet: string;
  }

  /**
   * Prints a map based on the given specification
   * @param spec - The print specification
   * @returns A promise that resolves to a Blob containing the image
   */
  export function print(spec: PrintSpec): Promise<Blob>;

  /**
   * Downloads a blob as a file
   * @param blob - The blob to download
   * @param filename - Optional filename (defaults to 'download')
   */
  export function downloadBlob(blob: Blob, filename?: string): void;

  /**
   * Gets the status of a print job
   * @param jobId - The job ID
   * @returns An observable that emits job status updates
   */
  export function getJobStatus(jobId: string): any;

  /**
   * Cancels a print job
   * @param jobId - The job ID
   */
  export function cancelJob(jobId: string): void;
}
