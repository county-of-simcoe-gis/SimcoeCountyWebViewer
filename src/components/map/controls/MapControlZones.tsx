import React from "react";
import Map from "ol/Map";
import MapControl, { createMapControl } from "@/components/map/controls/MapControlWrapper";

// Import control components - removed individual imports since they're now configured in MapContainer

// Types for zone configuration
export type ControlZone = "top-left" | "top-right" | "bottom-left" | "bottom-right";

export interface ZoneControlConfig {
  component: React.ComponentType<{ map: Map }>;
  enabled: boolean;
  order?: number; // Optional ordering within zone
}

export interface ZoneComponentProps {
  map: Map;
  controls: Array<{ key: string; config: ZoneControlConfig }>;
}

/**
 * Individual Zone Component - memoized to prevent unnecessary re-renders
 */
const ZoneComponent = React.memo(({ map, controls }: ZoneComponentProps) => {
  // Sort controls by order
  const sortedControls = React.useMemo(
    () =>
      [...controls].sort((a, b) => {
        const orderA = a.config.order ?? 0;
        const orderB = b.config.order ?? 0;
        return orderA - orderB;
      }),
    [controls]
  );

  return (
    <div className="map-control-zone-content">
      {sortedControls.map(({ key, config }) => {
        const Component = config.component;
        return (
          <div key={key} className="map-control-item">
            <Component map={map} />
          </div>
        );
      })}
    </div>
  );
});

ZoneComponent.displayName = "ZoneComponent";

/**
 * Enhanced control configuration interface
 */
export interface ControlConfig {
  component: React.ComponentType<{ map: Map }>;
  zone: ControlZone;
  order: number;
  enabled: boolean;
}

/**
 * Create zone controls from a full control configuration
 * Optimized to prevent unnecessary recreation of control arrays
 */
export function createZoneControlsFromConfig(map: Map | null, controlsConfig: Record<string, ControlConfig>): MapControl[] {
  if (!map) return [];

  // Group controls by zone and filter enabled ones
  const controlsByZone = Object.entries(controlsConfig).reduce((acc, [key, config]) => {
    if (config.enabled) {
      if (!acc[config.zone]) {
        acc[config.zone] = [];
      }
      acc[config.zone].push({
        key,
        config: {
          component: config.component,
          enabled: config.enabled,
          order: config.order,
        },
      });
    }
    return acc;
  }, {} as Record<ControlZone, Array<{ key: string; config: ZoneControlConfig }>>);

  return createZoneControls(controlsByZone);
}

/**
 * Updated createZoneControls to work with grouped controls
 */
function createZoneControls(controlsByZone: Record<ControlZone, Array<{ key: string; config: ZoneControlConfig }>>) {
  const controls: MapControl[] = [];

  // Create a control for each zone that has content
  Object.entries(controlsByZone).forEach(([zone, zoneControls]) => {
    if (zoneControls.length > 0) {
      const zoneControl = createMapControl(
        (map: Map | null) => (map ? <ZoneComponent map={map} controls={zoneControls} /> : <div></div>),
        `ol-unselectable ol-control map-control-zone map-control-zone-${zone}`
      );
      controls.push(zoneControl);
    }
  });

  return controls;
}

/**
 * Utility function to create a custom zone control with arbitrary React components
 * @param zone - The zone position
 * @param components - Array of React components to render in the zone
 * @returns OpenLayers control for the zone
 */
export function createCustomZoneControl(zone: ControlZone, components: React.ComponentType<{ map: Map }>[]): MapControl {
  return createMapControl(
    (map: Map | null) =>
      map ? (
        <div className="map-control-zone-content">
          {components.map((Component, index) => (
            <div key={index} className="map-control-item">
              <Component map={map} />
            </div>
          ))}
        </div>
      ) : (
        <div></div>
      ),
    `ol-unselectable ol-control map-control-zone map-control-zone-${zone}`
  );
}
