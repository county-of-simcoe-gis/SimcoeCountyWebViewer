"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useMapStore } from "@/stores/mapStore";
import { useInteractionManagerStore, type InteractionResult } from "@/stores/interactionManagerStore";
import { LayerManager } from "@/utils/openlayers/LayerManager";
import { five11Config } from "./config";
import type { Five11LayerConfig, MtoCameraProperties } from "./types";
import Five11LayerToggler from "./Five11LayerToggler";
import Five11WazePopupContent from "./Five11WazePopupContent";
import Five11MtoPopupContent from "./Five11MtoPopupContent";
import Five11CameraPopup from "./Five11CameraPopup";
import type Feature from "ol/Feature";
import type { Geometry } from "ol/geom";
import { FaExternalLinkAlt } from "react-icons/fa";

interface Five11ContentProps {
  visible?: boolean;
}

export default function Five11Content({ visible = true }: Five11ContentProps) {
  const map = useMapStore((state) => state.map);
  const { registerHandler, unregisterHandler } = useInteractionManagerStore();

  // State for layer visibility
  const [wazeLayerStates, setWazeLayerStates] = useState<Record<string, boolean>>(() =>
    five11Config.wazeToggleLayers.reduce(
      (acc, layer) => {
        acc[layer.layerName] = layer.visible;
        return acc;
      },
      {} as Record<string, boolean>,
    ),
  );

  const [mtoLayerStates, setMtoLayerStates] = useState<Record<string, boolean>>(() =>
    five11Config.mtoToggleLayers.reduce(
      (acc, layer) => {
        acc[layer.layerName] = layer.visible;
        return acc;
      },
      {} as Record<string, boolean>,
    ),
  );

  // Track layer IDs for click handling
  const layerIdsRef = useRef<Record<string, string | null>>({});

  // Handle visibility changes
  const handleWazeVisibilityChange = useCallback((layerName: string, visible: boolean) => {
    setWazeLayerStates((prev) => ({ ...prev, [layerName]: visible }));
  }, []);

  const handleMtoVisibilityChange = useCallback((layerName: string, visible: boolean) => {
    setMtoLayerStates((prev) => ({ ...prev, [layerName]: visible }));
  }, []);

  // Track layer IDs
  const handleLayerIdChange = useCallback((layerName: string, layerId: string | null) => {
    layerIdsRef.current[layerName] = layerId;
  }, []);

  // Toggle all Waze layers
  const handleToggleAllWaze = useCallback(() => {
    const allVisible = Object.values(wazeLayerStates).every((v) => v);
    setWazeLayerStates((prev) => {
      const newStates = { ...prev };
      Object.keys(newStates).forEach((key) => {
        newStates[key] = !allVisible;
      });
      return newStates;
    });
  }, [wazeLayerStates]);

  // Toggle all MTO layers
  const handleToggleAllMto = useCallback(() => {
    const allVisible = Object.values(mtoLayerStates).every((v) => v);
    setMtoLayerStates((prev) => {
      const newStates = { ...prev };
      Object.keys(newStates).forEach((key) => {
        newStates[key] = !allVisible;
      });
      return newStates;
    });
  }, [mtoLayerStates]);

  // Register map click handler
  useEffect(() => {
    if (!map || !visible) return;

    const handlerId = "511-identify";

    registerHandler({
      id: handlerId,
      eventType: "singleclick",
      priority: 50,
      conditions: {
        checkDisableFlags: () => {
          return useMapStore.getState().isToolActive();
        },
      },
      handler: async (coordinate: number[], pixel: number[]): Promise<InteractionResult[]> => {
        const results: InteractionResult[] = [];
        const seenFeatures = new Set<string>();

        // Find features at click location from 511 layers
        map.forEachFeatureAtPixel(
          pixel,
          (feature, layer) => {
            if (!layer) return;

            const layerName = layer.get("name") as string;
            if (!layerName?.includes("511")) return;

            // Get unique feature identifier
            const featureId = (feature as Feature<Geometry>).getId() || (feature as Feature<Geometry>).get("uuid") || (feature as Feature<Geometry>).get("id") || `${layerName}-${results.length}`;
            const uniqueKey = `${layerName}-${featureId}`;

            // Skip if we've already processed this feature
            if (seenFeatures.has(uniqueKey)) return;
            seenFeatures.add(uniqueKey);

            const displayName = layer.get("tocDisplayName") as string;
            const properties = (feature as Feature<Geometry>).getProperties();

            // Filter out internal OL properties from display attributes
            const filteredAttributes: Record<string, unknown> = {};
            Object.entries(properties).forEach(([key, value]) => {
              if (key !== "geometry" && key !== "bbox" && !key.startsWith("_") && typeof value !== "object") {
                filteredAttributes[key] = value;
              }
            });

            // Determine popup content based on layer type
            let renderContent: () => React.ReactNode;

            if (layerName === "511-mto-cameras") {
              // Camera popup
              renderContent = () => <Five11CameraPopup properties={properties as MtoCameraProperties} />;
            } else if (layerName.includes("waze")) {
              // Waze popup
              renderContent = () => <Five11WazePopupContent properties={properties} layerName={layerName} />;
            } else {
              // MTO event popup
              renderContent = () => <Five11MtoPopupContent properties={properties} />;
            }

            results.push({
              id: uniqueKey,
              type: "layer" as const,
              displayName: displayName || layerName,
              renderContent,
              data: {
                layerName: displayName,
                featureId: String(featureId),
                attributes: filteredAttributes,
                feature: feature as Feature<Geometry>,
              },
            });
          },
          {
            layerFilter: (layer) => {
              const name = layer.get("name") as string;
              return layer.getVisible() && name?.includes("511");
            },
          },
        );

        return results;
      },
    });

    return () => {
      unregisterHandler(handlerId);
    };
  }, [map, visible, registerHandler, unregisterHandler]);

  // Safety-net cleanup: remove any remaining 511 layers when the theme unmounts
  useEffect(() => {
    return () => {
      Object.entries(layerIdsRef.current).forEach(([_layerName, layerId]) => {
        if (layerId) {
          LayerManager.removeLayer(layerId);
        }
      });
      layerIdsRef.current = {};
    };
  }, []);

  // Check if all layers are visible for button text
  const allWazeVisible = Object.values(wazeLayerStates).every((v) => v);
  const allMtoVisible = Object.values(mtoLayerStates).every((v) => v);

  return (
    <div className="p-4 space-y-4">
      {/* Waze Section */}
      <div>
        <h3 className="text-sm font-semibold mb-3 text-primary">WAZE LIVE DATA</h3>
        <div className="space-y-1">
          {five11Config.wazeToggleLayers.map((layer: Five11LayerConfig) => (
            <Five11LayerToggler key={layer.layerName} layer={layer} visible={wazeLayerStates[layer.layerName]} onVisibilityChange={handleWazeVisibilityChange} onLayerIdChange={handleLayerIdChange} />
          ))}
        </div>
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-base-300">
          <button className="btn btn-xs btn-outline" onClick={handleToggleAllWaze}>
            {allWazeVisible ? "Hide All" : "Show All"}
          </button>
          <a href="https://www.waze.com/" target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
            <FaExternalLinkAlt className="text-[10px]" />
            Data Provided by Waze
          </a>
        </div>
      </div>

      <div className="divider my-2"></div>

      {/* MTO Section */}
      <div>
        <h3 className="text-sm font-semibold mb-3 text-primary">MTO LIVE DATA</h3>
        <div className="space-y-1">
          {five11Config.mtoToggleLayers.map((layer: Five11LayerConfig) => (
            <Five11LayerToggler key={layer.layerName} layer={layer} visible={mtoLayerStates[layer.layerName]} onVisibilityChange={handleMtoVisibilityChange} onLayerIdChange={handleLayerIdChange} />
          ))}
        </div>
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-base-300">
          <button className="btn btn-xs btn-outline" onClick={handleToggleAllMto}>
            {allMtoVisible ? "Hide All" : "Show All"}
          </button>
          <span className="text-xs text-base-content/60">Data from multiple agencies</span>
        </div>
      </div>
    </div>
  );
}
