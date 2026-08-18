"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import PanelComponent from "@/components/PanelComponent";
import { useMapStore } from "@/stores/mapStore";
import { useInteractionManagerStore, type InteractionResult } from "@/stores/interactionManagerStore";
import { LayerManager } from "@/utils/openlayers/LayerManager";
import { LayerHelpers, OL_DATA_TYPES } from "@/utils/openlayers";
import { useCREStore } from "./stores/creStore";
import { PROPERTY_TYPES } from "./creObjects";
import { getPublicPath } from "@/utils/getPublicPath";
import { updateAllLayerFilters, fetchAllResults } from "./creHelpers";
import CRESearch from "./CRESearch";
import CREPopupContent from "./CREPopupContent";
import ThemeLayers from "@/components/themes/shared/ThemeLayers";
import { getAxiosClient } from "@/lib/axiosInstance";
import creConfig from "./config.json";
import type { Image as OlImageLayer } from "ol/layer";
import type { ImageWMS } from "ol/source";
import { GeoJSON } from "ol/format";
import type { Feature } from "ol";
import type { Geometry } from "ol/geom";
import type { EventsKey } from "ol/events";
import { unByKey } from "ol/Observable";
import { getCenter } from "ol/extent";
import { usePopupStore } from "@/stores/popupStore";
import { FaStar, FaChevronDown, FaChevronUp, FaPalette } from "react-icons/fa";

interface CommercialRealEstateProps {
  name?: string;
  helpLink?: string;
  hideHeader?: boolean;
  onClose: () => void;
  onSidebarVisibility?: () => void;
  config?: Record<string, unknown>;
  options?: Record<string, unknown>;
}

export default function CommercialRealEstate({ name = "Commercial Real Estate", helpLink, hideHeader = false, onClose, onSidebarVisibility, config }: CommercialRealEstateProps) {
  const map = useMapStore((s) => s.map);
  const { registerHandler, unregisterHandler } = useInteractionManagerStore();
  const layerIdsRef = useRef<string[]>([]);
  const moveEndKeyRef = useRef<EventsKey | null>(null);
  const allLayerRef = useRef<OlImageLayer<ImageWMS> | null>(null);

  // Merge local config with optional prop config
  const mergedConfig = { ...creConfig, ...config };

  // Initialize property type WMS layers
  useEffect(() => {
    if (!map) return;

    const serverUrl = mergedConfig.geoserverUrl + "wms/";
    const pointLayerName = mergedConfig.pointLayerName;

    // Create a WMS layer per property type
    PROPERTY_TYPES.forEach((propType) => {
      const cqlFilter = `_proptype = '${propType}'`;

      LayerHelpers.getLayer(
        {
          sourceType: OL_DATA_TYPES.ImageWMS,
          url: `${serverUrl}?layers=${pointLayerName}`,
          layerName: pointLayerName,
          name: propType,
          tiled: false,
        },
        (layer: unknown) => {
          if (!layer) return;

          const olLayer = layer as OlImageLayer<ImageWMS>;
          const source = olLayer.getSource() as ImageWMS;

          // Set initial CQL filter
          source.updateParams({ cql_filter: cqlFilter });

          olLayer.setProperties({
            name: propType,
            tocDisplayName: propType,
            disableParcelClick: true,
            queryable: true,
          });

          // Add via LayerManager
          const layerId = LayerManager.addLayer(olLayer, "Themes", `CRE - ${propType}`, {
            visible: true,
            index: 0,
            metadata: {
              themeId: "commercialRealEstate",
              layerType: "theme-data",
            },
          });

          if (layerId) {
            layerIdsRef.current.push(layerId);
            useCREStore.getState().setPropertyLayer(propType, olLayer, layerId);
          }
        },
      );
    });

    // Create a hidden "all types" layer for click identify (GetFeatureInfo)
    LayerHelpers.getLayer(
      {
        sourceType: OL_DATA_TYPES.ImageWMS,
        url: `${serverUrl}?layers=${pointLayerName}`,
        layerName: pointLayerName,
        name: "CRE-All",
        tiled: false,
      },
      (layer: unknown) => {
        if (layer) {
          allLayerRef.current = layer as OlImageLayer<ImageWMS>;
        }
      },
    );

    // Initial fetch of results
    const extent = map.getView().calculateExtent() as [number, number, number, number];
    fetchAllResults(extent);

    return () => {
      // Cleanup all property type layers
      layerIdsRef.current.forEach((id) => LayerManager.removeLayer(id));
      layerIdsRef.current = [];

      // Reset the store property layers
      PROPERTY_TYPES.forEach((pt) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        useCREStore.getState().setPropertyLayer(pt, null as any, "");
      });
    };
  }, [map, mergedConfig.geoserverUrl, mergedConfig.pointLayerName]);

  // Register map click handler for identify
  useEffect(() => {
    if (!map) return;

    const handlerId = "cre-identify";

    registerHandler({
      id: handlerId,
      eventType: "singleclick",
      priority: 50,
      conditions: {
        checkDisableFlags: () => useMapStore.getState().isToolActive(),
      },
      handler: async (coordinate: number[]): Promise<InteractionResult[]> => {
        const results: InteractionResult[] = [];
        const viewResolution = map.getView().getResolution();
        if (!viewResolution) return results;

        // Try GetFeatureInfo on each visible property-type layer
        const state = useCREStore.getState();

        for (const propType of PROPERTY_TYPES) {
          const layerState = state.propertyLayers[propType];
          if (!layerState?.pointLayer || !layerState.visible) continue;

          const source = layerState.pointLayer.getSource() as ImageWMS;
          if (!source?.getFeatureInfoUrl) continue;

          const url = source.getFeatureInfoUrl(coordinate, viewResolution, "EPSG:3857", {
            INFO_FORMAT: "application/json",
          });

          if (!url) continue;

          try {
            const axiosClient = getAxiosClient(url);
            const response = await axiosClient.get(url);
            const json = response.data;

            if (!json.features || json.features.length === 0) continue;

            const format = new GeoJSON();
            const features = format.readFeatures(json) as Feature<Geometry>[];

            features.forEach((feature, idx) => {
              const featureId = feature.getId() || `cre-${propType}-${idx}`;
              const address = feature.get("Address") || "Unknown Address";
              const municipality = feature.get("Municipality") || "";
              const displayName = `${address}${municipality ? `, ${municipality}` : ""}`;

              results.push({
                id: `cre_${propType}_${featureId}`,
                type: "layer" as const,
                displayName,
                renderContent: () => <CREPopupContent feature={feature} />,
                data: {
                  layerName: "Commercial Real Estate",
                  featureId: String(featureId),
                  attributes: feature.getProperties(),
                  feature,
                },
              });
            });
          } catch (error) {
            console.error(`Error getting feature info for ${propType}:`, error);
          }
        }

        return results;
      },
    });

    return () => {
      unregisterHandler(handlerId);
    };
  }, [map, registerHandler, unregisterHandler]);

  // Handle "only in map" — re-fetch on moveend
  const onlyInMapChecked = useCREStore((s) => s.onlyInMapChecked);

  useEffect(() => {
    if (!map) return;

    if (onlyInMapChecked) {
      const handleMoveEnd = () => {
        updateAllLayerFilters();
        const extent = map.getView().calculateExtent() as [number, number, number, number];
        fetchAllResults(extent);
      };

      moveEndKeyRef.current = map.on("moveend", handleMoveEnd);
    }

    return () => {
      if (moveEndKeyRef.current) {
        unByKey(moveEndKeyRef.current);
        moveEndKeyRef.current = null;
      }
    };
  }, [map, onlyInMapChecked]);

  // Incentive thumbnails (simpler alternative to image slider)
  const [incentiveFeatures, setIncentiveFeatures] = useState<Feature<Geometry>[]>([]);

  useEffect(() => {
    const fetchIncentives = async () => {
      try {
        const axiosClient = getAxiosClient(creConfig.incentiveWfsUrl);
        const response = await axiosClient.get(creConfig.incentiveWfsUrl);
        const format = new GeoJSON();
        const features = format.readFeatures(response.data) as Feature<Geometry>[];
        setIncentiveFeatures(features.slice(0, 20)); // Limit to 20 thumbnails
      } catch (error) {
        console.error("Error fetching incentive features:", error);
      }
    };
    fetchIncentives();
  }, []);

  const handleIncentiveClick = useCallback(
    (feature: Feature<Geometry>) => {
      if (!map) return;
      const geometry = feature.getGeometry();
      if (geometry) {
        const extent = geometry.getExtent();
        map.getView().fit(extent, { duration: 500, maxZoom: 18, padding: [50, 50, 50, 50] });
        const coordinates = getCenter(extent);
        const address = feature.get("Address") || "Unknown Address";
        const municipality = feature.get("Municipality") || "";
        const title = `${address}${municipality ? `, ${municipality}` : ""}`;
        usePopupStore.getState().show(coordinates, <CREPopupContent feature={feature} />, title, "Commercial Real Estate");
      }
    },
    [map],
  );

  const [incentiveCollapsed, setIncentiveCollapsed] = useState(false);

  return (
    <PanelComponent icon={<FaPalette size={20} className="text-neutral/70" />} name={name} helpLink={helpLink} hideHeader={hideHeader} onClose={onClose} onSidebarVisibility={onSidebarVisibility}>
      <div className="flex flex-col gap-2 p-2">
        {/* Incentive properties — collapsible */}
        {incentiveFeatures.length > 0 && (
          <div className="rounded-lg border border-warning/30 bg-warning/5 overflow-hidden">
            <button className="flex items-center justify-between w-full px-3 py-2 cursor-pointer hover:bg-warning/10 transition-colors" onClick={() => setIncentiveCollapsed((prev) => !prev)}>
              <span className="text-xs font-semibold text-warning-content flex items-center gap-1.5">
                <FaStar className="w-3.5 h-3.5 text-warning" />
                Incentive Properties
                <span className="badge badge-warning badge-xs font-bold">{incentiveFeatures.length}</span>
              </span>
              {incentiveCollapsed ? <FaChevronDown className="w-3 h-3 text-base-content/70" /> : <FaChevronUp className="w-3 h-3 text-base-content/70" />}
            </button>

            {!incentiveCollapsed && (
              <div className="grid grid-cols-2 gap-1.5 px-2 pb-2 max-h-[200px] overflow-y-auto">
                {incentiveFeatures.map((feature, idx) => {
                  const imageUrl = feature.get("_imageurl") as string;
                  const address = feature.get("Address") as string;
                  const municipality = feature.get("Municipality") as string;
                  return (
                    <button
                      key={`incentive-${idx}`}
                      className="flex flex-col rounded overflow-hidden border border-base-300 hover:border-primary transition-colors bg-base-100"
                      onClick={() => handleIncentiveClick(feature)}
                      title={address}
                    >
                      {}
                      <img
                        src={imageUrl}
                        alt={address}
                        className="w-full h-[70px] object-cover"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = getPublicPath("/images/commercialrealestate/noPhoto.png");
                        }}
                      />
                      <span className="text-[10px] leading-tight px-1 py-0.5 truncate w-full text-left">
                        {address}
                        {municipality ? `, ${municipality}` : ""}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Search / Results tabs */}
        <CRESearch />

        {/* Divider */}
        <div className="divider my-1 text-xs">OVERLAY LAYERS</div>

        {/* Toggle layers via shared ThemeLayers component */}
        <ThemeLayers layers={mergedConfig.toggleLayers} themeId="commercialRealEstate" />
      </div>
    </PanelComponent>
  );
}
