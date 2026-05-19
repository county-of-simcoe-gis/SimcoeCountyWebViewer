"use client";

import { useEffect, useState, useCallback } from "react";
import { Feature } from "ol";
import { Geometry } from "ol/geom";
import { getCenter } from "ol/extent";
import { useMapStore } from "@/stores/mapStore";
import { usePopupStore } from "@/stores/popupStore";
import { FaTable, FaChevronDown, FaChevronRight, FaMapMarkerAlt } from "react-icons/fa";
import ThemePopupContent from "./ThemePopupContent";
import ResultsPopup, { type Result } from "@/components/ResultsPopup";

interface ToggleLayerConfig {
  displayName: string;
  serverUrl: string;
  layerName: string;
  visible: boolean;
  displayFieldName?: string;
  legendStyleName?: string;
  secured?: boolean;
  moreInfoUrlFieldName?: string;
}

interface ThemeDataListProps {
  layerConfig: ToggleLayerConfig;
  onlyFeaturesWithinMap: boolean;
  isVisible: boolean;
  popupLogoImage?: string;
}

export default function ThemeDataList({ layerConfig, onlyFeaturesWithinMap, isVisible, popupLogoImage }: ThemeDataListProps) {
  const map = useMapStore((state) => state.map);
  const { show: showPopup, hide: hidePopup } = usePopupStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [features, setFeatures] = useState<Feature<Geometry>[]>([]);
  const [legendUrl, setLegendUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchFeatures = useCallback(async () => {
    if (!map || !isVisible) return;

    setIsLoading(true);
    try {
      const serverUrl = layerConfig.serverUrl.endsWith("/") ? layerConfig.serverUrl : layerConfig.serverUrl + "/";

      let wfsUrl = `${serverUrl}wfs?service=wfs&version=2.0.0&request=GetFeature&typeNames=${layerConfig.layerName}&outputFormat=application/json`;

      // Add bbox filter if only showing features within map
      if (onlyFeaturesWithinMap) {
        const extent = map.getView().calculateExtent(map.getSize());
        wfsUrl += `&bbox=${extent.join(",")},EPSG:3857`;
      }

      // Add sort if displayFieldName exists
      if (layerConfig.displayFieldName) {
        wfsUrl += `&sortBy=${layerConfig.displayFieldName}`;
      }

      const response = await fetch(wfsUrl);
      const data = await response.json();

      if (data.features) {
        // Convert GeoJSON features to OL features
        const { GeoJSON } = await import("ol/format");
        const format = new GeoJSON();
        const olFeatures = format.readFeatures(data, {
          featureProjection: "EPSG:3857",
        });
        setFeatures(olFeatures);
      }
    } catch (error) {
      console.error(`Error fetching features for ${layerConfig.layerName}:`, error);
      setFeatures([]);
    } finally {
      setIsLoading(false);
    }
  }, [map, layerConfig, onlyFeaturesWithinMap, isVisible]);

  // Fetch legend image
  useEffect(() => {
    const serverUrl = layerConfig.serverUrl.endsWith("/") ? layerConfig.serverUrl : layerConfig.serverUrl + "/";
    const styleName = layerConfig.legendStyleName || "";
    const url = `${serverUrl}wms?REQUEST=GetLegendGraphic&VERSION=1.1&FORMAT=image/png&WIDTH=20&HEIGHT=20&LAYER=${layerConfig.layerName}&STYLE=${styleName}&transparent=true`;
    setLegendUrl(url);
  }, [layerConfig]);

  // Fetch features on mount and when map moves
  useEffect(() => {
    if (!map || !isVisible) return;

    fetchFeatures();

    const handleMoveEnd = () => {
      if (onlyFeaturesWithinMap) {
        fetchFeatures();
      }
    };

    map.on("moveend", handleMoveEnd);
    return () => {
      map.un("moveend", handleMoveEnd);
    };
  }, [map, fetchFeatures, onlyFeaturesWithinMap, isVisible]);

  // Refetch when onlyFeaturesWithinMap changes
  useEffect(() => {
    fetchFeatures();
  }, [onlyFeaturesWithinMap, fetchFeatures]);

  const handleFeatureClick = (feature: Feature<Geometry>) => {
    if (!map) return;

    const geometry = feature.getGeometry();
    if (!geometry) return;

    const extent = geometry.getExtent();
    const center = getCenter(extent);

    // Zoom to feature
    map.getView().animate({
      center: center,
      zoom: 15,
      duration: 500,
    });

    // Create result for unified popup
    const properties = feature.getProperties();
    const featureId = feature.getId() || String(Date.now());

    const result: Result = {
      id: `theme-${layerConfig.layerName}-${featureId}`,
      type: "layer",
      displayName: properties[layerConfig.displayFieldName || "name"] || layerConfig.displayName,
      renderContent: () => <ThemePopupContent properties={properties} moreInfoUrlFieldName={layerConfig.moreInfoUrlFieldName} popupLogoImage={popupLogoImage} />,
      data: {
        layerName: layerConfig.displayName,
        featureId: String(featureId),
        attributes: properties,
        feature: feature,
      },
    };

    const handleClose = () => {
      hidePopup();
    };

    // Show unified popup after zoom
    showPopup(center, <ResultsPopup results={[result]} onClose={handleClose} />, "Result", layerConfig.displayName);
  };

  if (!isVisible) return null;

  const displayField = layerConfig.displayFieldName || "name";

  return (
    <div className="border border-base-300 rounded-lg overflow-hidden mb-2">
      {/* Header */}
      <div className="flex items-center gap-2 p-2 bg-base-200 cursor-pointer hover:bg-base-300" onClick={() => setIsExpanded(!isExpanded)}>
        <FaTable className="text-base-content/70 w-4 h-4" />
        {legendUrl && <img src={legendUrl} alt="legend" className="w-5 h-5 object-contain" onError={(e) => (e.currentTarget.style.display = "none")} />}
        <span className="flex-1 text-sm font-medium truncate">{layerConfig.displayName}</span>
        <span className="text-xs text-base-content/70">({features.length})</span>
        {isExpanded ? <FaChevronDown className="w-3 h-3" /> : <FaChevronRight className="w-3 h-3" />}
      </div>

      {/* Feature List */}
      {isExpanded && (
        <div className="max-h-48 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-4">
              <span className="loading loading-spinner loading-sm"></span>
            </div>
          ) : features.length === 0 ? (
            <div className="p-2 text-sm text-base-content/70 text-center">No features found</div>
          ) : (
            <div className="divide-y divide-base-200">
              {features.map((feature, index) => (
                <div key={feature.getId() || index} className="flex items-center gap-2 p-2 hover:bg-base-100 cursor-pointer text-sm" onClick={() => handleFeatureClick(feature)}>
                  <FaMapMarkerAlt className="w-3 h-3 text-primary flex-shrink-0" />
                  <span className="truncate">{feature.get(displayField) || `Feature ${index + 1}`}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
