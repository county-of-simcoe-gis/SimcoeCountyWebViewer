/**
 * Custom OpenLayers interaction for handling right-click context menu
 * This provides control over contextmenu events on the map
 */

import { Interaction } from "ol/interaction";
import { MapBrowserEvent } from "ol";

export interface ContextMenuOptions {
  checkDisableFlags?: () => boolean; // Function to check if context menu should be disabled
  onContextMenu?: (coordinate: number[], pixel: number[], event: MapBrowserEvent<UIEvent>) => void;
}

export class ContextMenuInteraction extends Interaction {
  private checkDisableFlags?: () => boolean;
  private onContextMenu?: (coordinate: number[], pixel: number[], event: MapBrowserEvent<UIEvent>) => void;

  constructor(options: ContextMenuOptions = {}) {
    super();

    this.checkDisableFlags = options.checkDisableFlags;
    this.onContextMenu = options.onContextMenu;
  }

  /**
   * Handle map browser events
   * Override from base Interaction class
   */
  handleEvent(event: MapBrowserEvent<UIEvent>): boolean {
    // Only handle contextmenu events
    if (event.type !== "contextmenu") {
      return true; // Allow event to propagate
    }

    // Prevent default browser context menu
    event.originalEvent.preventDefault();

    // Check disable flags
    if (this.checkDisableFlags && this.checkDisableFlags()) {
      return false; // Stop propagation but don't show menu
    }

    // Trigger context menu callback
    if (this.onContextMenu) {
      this.onContextMenu(event.coordinate, event.pixel, event);
    }

    // Stop event propagation
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
   * Update the context menu callback
   */
  public setContextMenuCallback(callback: (coordinate: number[], pixel: number[], event: MapBrowserEvent<UIEvent>) => void): void {
    this.onContextMenu = callback;
  }

  /**
   * Update the disable flags checker
   */
  public setDisableFlagsChecker(checker: () => boolean): void {
    this.checkDisableFlags = checker;
  }
}
