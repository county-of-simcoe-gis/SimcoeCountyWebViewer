/**
 * Custom OpenLayers interaction for handling parcel clicks
 * This provides better control over click events and prevents duplications
 */

import { Interaction } from "ol/interaction";
import { MapBrowserEvent } from "ol";
import VectorLayer from "ol/layer/Vector";
import ImageLayer from "ol/layer/Image";

export interface ParcelClickOptions {
  maxScale?: number; // Maximum scale at which parcel clicks work (default: 20000)
  checkDisableFlags?: () => boolean; // Function to check if parcel click should be disabled
  onParcelClick?: (coordinate: number[], pixel: number[], event: MapBrowserEvent<UIEvent>) => void;
  checkLayerFilters?: (event: MapBrowserEvent<UIEvent>) => boolean; // Check if any layers should disable click
}

export class ParcelClickInteraction extends Interaction {
  private maxScale: number;
  private checkDisableFlags?: () => boolean;
  private onParcelClick?: (coordinate: number[], pixel: number[], event: MapBrowserEvent<UIEvent>) => void;
  private checkLayerFilters?: (event: MapBrowserEvent<UIEvent>) => boolean;
  private lastClickTime: number = 0;

  constructor(options: ParcelClickOptions = {}) {
    super();

    this.maxScale = options.maxScale ?? 20000;
    this.checkDisableFlags = options.checkDisableFlags;
    this.onParcelClick = options.onParcelClick;
    this.checkLayerFilters = options.checkLayerFilters;
  }

  /**
   * Handle map browser events
   * Override from base Interaction class
   */
  handleEvent(event: MapBrowserEvent<UIEvent>): boolean {
    // Only handle single clicks
    if (event.type !== "singleclick") {
      return true; // Allow event to propagate
    }

    // Prevent double clicks
    if (this.shouldCancelDoubleClick(event.originalEvent.timeStamp)) {
      return false; // Stop propagation
    }

    // Check map scale
    if (this.isScaleTooSmall()) {
      return true; // Allow event to propagate
    }

    // Check disable flags
    if (this.checkDisableFlags && this.checkDisableFlags()) {
      return true; // Allow event to propagate
    }

    // Check layer filters (vector and image layers with disableParcelClick)
    if (this.checkLayerFilters && this.checkLayerFilters(event)) {
      return true; // Allow event to propagate
    }

    // Check if shift key is pressed (used for multi-select in some tools)
    if (event.originalEvent.shiftKey) {
      return true; // Allow event to propagate
    }

    // Trigger parcel click callback
    if (this.onParcelClick) {
      this.onParcelClick(event.coordinate, event.pixel, event);
    }

    // Stop event propagation to prevent other click handlers
    return false;
  }

  /**
   * Check if the map scale is too small for parcel clicks
   */
  private isScaleTooSmall(): boolean {
    const map = this.getMap();
    if (!map) return true;

    const view = map.getView();
    const resolution = view.getResolution();
    const units = view.getProjection().getUnits();
    const dpi = 25.4 / 0.28;
    const mpu = units === "degrees" ? 111194.87428468118 : 1;
    const scale = resolution ? resolution * mpu * 39.37 * dpi : 0;

    return scale > this.maxScale;
  }

  /**
   * Prevent double clicks by checking timestamp
   */
  private shouldCancelDoubleClick(timestamp: number): boolean {
    const timeDiff = timestamp - this.lastClickTime;
    if (timeDiff < 300) {
      // Less than 300ms - likely a double click
      return true;
    }
    this.lastClickTime = timestamp;
    return false;
  }

  /**
   * Enable the interaction
   */
  public enable(): void {
    this.setActive(true);
  }

  /**
   * Disable the interaction
   */
  public disable(): void {
    this.setActive(false);
  }

  /**
   * Check if interaction is enabled
   */
  public isEnabled(): boolean {
    return this.getActive();
  }

  /**
   * Update the parcel click callback
   */
  public setParcelClickCallback(callback: (coordinate: number[], pixel: number[], event: MapBrowserEvent<UIEvent>) => void): void {
    this.onParcelClick = callback;
  }

  /**
   * Update the disable flags checker
   */
  public setDisableFlagsChecker(checker: () => boolean): void {
    this.checkDisableFlags = checker;
  }

  /**
   * Update the layer filters checker
   */
  public setLayerFiltersChecker(checker: (event: MapBrowserEvent<UIEvent>) => boolean): void {
    this.checkLayerFilters = checker;
  }

  /**
   * Static helper: Check vector and image layers for disableParcelClick property
   */
  public static checkLayersForDisable(event: MapBrowserEvent<UIEvent>): boolean {
    const map = event.map;
    let shouldDisable = false;

    // Check vector layers
    map.forEachFeatureAtPixel(
      event.pixel,
      (feature, layer) => {
        if (layer && layer.get("disableParcelClick") === true) {
          shouldDisable = true;
          return true; // Stop iteration
        }
      },
      {
        layerFilter: (layer) => {
          return layer.get("disableParcelClick") !== true && layer.getVisible() && layer instanceof VectorLayer;
        },
      }
    );

    if (shouldDisable) return true;

    // Check image layers
    const layers = map.getLayers().getArray();
    for (const layer of layers) {
      if (layer.get("disableParcelClick") && layer.getVisible() && layer instanceof ImageLayer) {
        shouldDisable = true;
        break;
      }
    }

    return shouldDisable;
  }
}
