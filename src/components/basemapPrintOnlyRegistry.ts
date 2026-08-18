import type { OLDataType } from "@/utils/openlayers/types";

export interface BasemapPrintOnlyDescriptor {
  id: string;
  basemapServiceName: string;
  basemapLayerName: string;
  sourceType: OLDataType;
  url: string;
  extent?: number[];
  minZoom?: number;
  maxZoom?: number;
  rootPath?: string;
  spritePath?: string;
  pngPath?: string;
  opacity: number;
  printOrder: number;
}

let basemapPrintOnlyDescriptors: BasemapPrintOnlyDescriptor[] = [];

export function setBasemapPrintOnlyDescriptors(descriptors: BasemapPrintOnlyDescriptor[]): void {
  basemapPrintOnlyDescriptors = [...descriptors];
}

export function getBasemapPrintOnlyDescriptors(): BasemapPrintOnlyDescriptor[] {
  return [...basemapPrintOnlyDescriptors];
}

export function clearBasemapPrintOnlyDescriptors(): void {
  basemapPrintOnlyDescriptors = [];
}
