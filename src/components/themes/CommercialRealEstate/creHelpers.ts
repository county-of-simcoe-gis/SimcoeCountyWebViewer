import type { Image as ImageLayer } from "ol/layer";
import type { ImageWMS } from "ol/source";
import type { Feature } from "ol";
import type { Geometry } from "ol/geom";
import { GeoJSON } from "ol/format";
import { PROPERTY_TYPES, type PropertyType } from "./creObjects";
import { useCREStore } from "./stores/creStore";
import { showMessage } from "@/utils/helpersUI";
import { getAxiosClient } from "@/lib/axiosInstance";
import creConfig from "./config.json";

/**
 * Build a CQL filter string for a given property type based on current store state.
 */
export function buildCqlFilterForType(propType: PropertyType): string {
  const state = useCREStore.getState();

  // Base filter for property type
  let sql = `_proptype = '${propType}'`;

  // Sale type
  if (state.selectedType.value !== "For Sale or Lease") {
    sql += ` AND _saletype = '${state.selectedType.value}'`;
  }

  // Incentive
  if (state.incentiveChecked) {
    sql += " AND Incentive = 'Yes'";
  }

  // Building Space (only when in BuildingSize mode)
  if (state.searchMode === "BuildingSize") {
    const fromSpace = state.selectedBuildingSpaceFrom.value;
    const toSpace = state.selectedBuildingSpaceTo.value;
    if (toSpace <= fromSpace && toSpace !== 99999999999) {
      showMessage("Building Space", "Building Space From Size must be smaller than To Size", "warning");
    } else if (fromSpace !== 0 || toSpace !== 99999999999) {
      sql += ` AND _squarefeet >= ${fromSpace} AND _squarefeet <= ${toSpace}`;
    }
  }

  // Land Size (only when in LandSize mode)
  if (state.searchMode === "LandSize") {
    const fromLandSize = state.selectedLandSizeFrom.value;
    const toLandSize = state.selectedLandSizeTo.value;
    if (toLandSize <= fromLandSize && toLandSize !== 9999999999) {
      showMessage("Land Size", "Land From Size must be smaller than To Size", "warning");
    } else if (fromLandSize !== 0 || toLandSize !== 9999999999) {
      sql += ` AND Acres >= ${fromLandSize} AND Acres <= ${toLandSize}`;
    }
  }

  // Price
  const fromPrice = state.selectedPriceFrom.value;
  const toPrice = state.selectedPriceTo.value;
  if (toPrice <= fromPrice && toPrice !== 99999999999999) {
    showMessage("Price", "Price To must be larger than Price From", "warning");
  } else if (fromPrice !== 0 || toPrice !== 99999999999999) {
    sql += ` AND _listprice >= ${fromPrice} AND _listprice <= ${toPrice}`;
  }

  return sql;
}

/**
 * Update the CQL filter on a WMS layer source.
 */
export function updateWmsFilter(layer: ImageLayer<ImageWMS>, cqlFilter: string): void {
  const source = layer.getSource() as ImageWMS;
  if (source && typeof source.updateParams === "function") {
    source.updateParams({ cql_filter: cqlFilter });
  }
}

/**
 * Update all property type layer filters from current store state.
 */
export function updateAllLayerFilters(): void {
  const state = useCREStore.getState();

  PROPERTY_TYPES.forEach((propType) => {
    const layerState = state.propertyLayers[propType];
    if (layerState?.pointLayer) {
      const cql = buildCqlFilterForType(propType);
      updateWmsFilter(layerState.pointLayer, cql);
    }
  });
}

/**
 * Fetch WFS GeoJSON features for a given CQL filter using the polygon layer.
 * Optionally constrains to a bounding box.
 */
export async function fetchWfsFeatures(cqlFilter: string, extent?: [number, number, number, number] | null): Promise<Feature<Geometry>[]> {
  const serverUrl = creConfig.geoserverUrl;
  const layerName = creConfig.polygonLayerName;

  const params = new URLSearchParams({
    service: "wfs",
    version: "2.0.0",
    request: "GetFeature",
    typeNames: layerName,
    outputFormat: "application/json",
    srsName: "EPSG:3857",
  });

  if (cqlFilter) {
    let finalFilter = cqlFilter;
    if (extent) {
      finalFilter += ` AND BBOX(geom, ${extent.join(",")}, 'EPSG:3857')`;
    }
    params.set("cql_filter", finalFilter);
  }

  // Append sortBy manually — URLSearchParams encodes + as %2B which GeoServer rejects
  const url = `${serverUrl}wfs?${params.toString()}&sortBy=Incentive+D`;

  try {
    const axiosClient = getAxiosClient(url);
    const response = await axiosClient.get(url);
    const format = new GeoJSON();
    return format.readFeatures(response.data) as Feature<Geometry>[];
  } catch (error) {
    console.error("Error fetching WFS features:", error);
    return [];
  }
}

/**
 * Fetch all results for all enabled property types and update the store.
 */
export async function fetchAllResults(mapExtent?: [number, number, number, number] | null): Promise<void> {
  const state = useCREStore.getState();
  const { setIsLoading, clearResults, appendResults } = useCREStore.getState();

  setIsLoading(true);
  clearResults();

  const extent = state.onlyInMapChecked ? mapExtent : null;

  try {
    // Only fetch for visible property types
    const visibleTypes = PROPERTY_TYPES.filter((pt) => state.propertyLayers[pt]?.visible !== false);

    const promises = visibleTypes.map(async (propType) => {
      const cql = buildCqlFilterForType(propType);
      const features = await fetchWfsFeatures(cql, extent);
      if (features.length > 0) {
        appendResults(features);
      }
    });

    await Promise.all(promises);
  } catch (error) {
    console.error("Error fetching all results:", error);
  } finally {
    setIsLoading(false);
  }
}

/**
 * Format a number with commas.
 */
export function numberWithCommas(x: number | string | null | undefined): string {
  if (x === undefined || x === null) return "0";
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
