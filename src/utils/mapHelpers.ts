/**
 * Map utility functions for getting scale, extent, center, etc.
 */

import { Map } from "ol";
import { getPointResolution } from "ol/proj";

/**
 * Calculate map scale from OpenLayers map (same approach as old app)
 * @param map - OpenLayers Map instance
 * @returns Map scale as number
 */
export const getMapScale = (map: Map): number => {
  try {
    const DOTS_PER_INCH = 96;
    const INCHES_PER_METER = 39.37;
    const view = map.getView();
    const resolution = view.getResolution();
    const center = view.getCenter();

    if (!resolution || !center) {
      return 1;
    }

    // Get point resolution at the center of the map
    const projection = view.getProjection();
    let pointResolution = (projection?.getMetersPerUnit() || 0) * resolution;
    if (!pointResolution) {
      pointResolution = getPointResolution(view.getProjection(), resolution, center);
    }

    // Calculate scale (using same calculation as old app)
    const scale = Math.round(pointResolution * DOTS_PER_INCH * INCHES_PER_METER);

    return scale;
  } catch (error) {
    console.error("Error calculating map scale:", error);
    return 1;
  }
};

/**
 * Get current map extent
 * @param map - OpenLayers Map instance
 * @returns Map extent as [xmin, ymin, xmax, ymax]
 */
export const getMapExtent = (map: Map): number[] => {
  try {
    const view = map.getView();
    const size = map.getSize();

    if (!size) {
      return [0, 0, 0, 0];
    }

    return view.calculateExtent(size);
  } catch (error) {
    console.error("Error getting map extent:", error);
    return [0, 0, 0, 0];
  }
};

/**
 * Get current map center
 * @param map - OpenLayers Map instance
 * @returns Map center as [x, y]
 */
export const getMapCenter = (map: Map): number[] => {
  try {
    const view = map.getView();
    const center = view.getCenter();

    return center || [0, 0];
  } catch (error) {
    console.error("Error getting map center:", error);
    return [0, 0];
  }
};

/**
 * Build feedback URL with all parameters (like the old app)
 */
export interface FeedbackUrlParams {
  feedbackUrl: string;
  xmin: number;
  xmax: number;
  ymin: number;
  ymax: number;
  centerx: number;
  centery: number;
  scale: number;
  myMapsId?: string;
  featureId?: string;
  mapId?: string;
}

export const buildFeedbackUrl = (params: FeedbackUrlParams): string => {
  const { feedbackUrl, xmin, xmax, ymin, ymax, centerx, centery, scale, myMapsId, featureId, mapId } = params;

  let url = `${feedbackUrl}/?xmin=${xmin}&xmax=${xmax}&ymin=${ymin}&ymax=${ymax}&centerx=${centerx}&centery=${centery}&scale=${scale}&REPORT_PROBLEM=True`;

  if (myMapsId) {
    url += `&MY_MAPS_ID=${myMapsId}`;
  }

  if (featureId) {
    url += `&MY_MAPS_FEATURE_ID=${featureId}`;
  }

  if (mapId && mapId.trim() !== "") {
    url += `&MAP_ID=${mapId}`;
  }

  return url;
};
