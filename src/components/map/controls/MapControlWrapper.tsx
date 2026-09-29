import React from "react";
import { createRoot, Root } from "react-dom/client";
import Control from "ol/control/Control";
import Map from "ol/Map";

/**
 * Generic OpenLayers Control wrapper for React components
 * Converts any React component into an OpenLayers control
 */
export default class MapControl extends Control {
  private root: Root | null = null;
  private componentFactory: (map: Map | null) => React.ReactElement;

  constructor(component: React.ReactElement | ((map: Map | null) => React.ReactElement), options?: Record<string, unknown> & { className?: string }) {
    const element = document.createElement("div");
    const cssClass = options?.className || "ol-unselectable ol-control";
    element.className = cssClass;

    super({
      element: element,
      ...options,
    });

    // Handle both React elements and factory functions
    if (typeof component === "function") {
      this.componentFactory = component;
    } else {
      this.componentFactory = (map: Map | null) => {
        const props = component.props || {};
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return React.cloneElement(component, { ...(props as Record<string, unknown>), map } as any);
      };
    }
  }

  setMap(map: Map | null) {
    // Clean up previous render asynchronously to avoid React 18+ concurrency issues.
    //
    // We use queueMicrotask (not setTimeout) so the inner root unmounts before
    // the outer React tree can destroy the host DOM. The wrapper element lives
    // inside `ol-overlaycontainer-stopevent`, which itself sits inside the map
    // div owned by the outer React tree. On HMR / StrictMode double-mounts, a
    // setTimeout(0) unmount can race with the outer tree being torn down — the
    // inner root then commits deletions against fibers whose host parent has
    // already been removed, throwing "Cannot read properties of null (reading
    // 'removeChild')".
    //
    // The try/catch is defensive: if the host subtree has already been removed
    // by the outer React tree, the unmount is a no-op for cleanup purposes and
    // the error is harmless — but unhandled it surfaces as a runtime error
    // overlay in development.
    if (this.root) {
      const rootToUnmount = this.root;
      this.root = null;
      queueMicrotask(() => {
        try {
          rootToUnmount.unmount();
        } catch {
          // Inner React tree was already torn down by an outer unmount.
        }
      });
    }

    super.setMap(map);

    // Render the React component when added to map
    if (map && this.element) {
      this.root = createRoot(this.element);
      const componentToRender = this.componentFactory(map);
      this.root.render(componentToRender);
    }
  }
}

/**
 * Helper function to create a React control more easily
 */
export function createMapControl(component: React.ReactElement | ((map: Map | null) => React.ReactElement), className?: string, options?: Record<string, unknown>) {
  return new MapControl(component, {
    className: className || "ol-unselectable ol-control",
    ...options,
  });
}
