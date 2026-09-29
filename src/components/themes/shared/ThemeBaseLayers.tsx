"use client";

import { useEffect, useRef, useState } from "react";
import { Layer } from "ol/layer";
import { LayerManager } from "@/utils/openlayers/LayerManager";
import { LayerHelpers, OL_DATA_TYPES } from "@/utils/openlayers";
import { FaChevronDown, FaChevronRight } from "react-icons/fa";
import AppImage from "@/components/shared/AppImage";

interface BaseLayerConfig {
  serverUrl: string;
  layerName: string;
  displayName: string;
  clickable?: boolean;
  moreInfoUrlFieldName?: string;
  secure?: boolean;
  returnLayers?: string[];
  legendStyleName?: string;
}

interface BaseLayersConfig {
  defaultVisibility: boolean;
  opacity: number;
  zIndex: number;
  legendImageName?: string;
  useDynamicLegend?: boolean;
  layers: BaseLayerConfig[];
}

interface ThemeBaseLayersProps {
  config: BaseLayersConfig;
  themeId: string;
  popupLogoImage?: string;
}

// Component to display a single layer's WMS legend
function LayerLegendItem({ layer }: { layer: BaseLayerConfig }) {
  const [legendUrl, setLegendUrl] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const serverUrl = layer.serverUrl.endsWith("/") ? layer.serverUrl : layer.serverUrl + "/";
    const styleName = layer.legendStyleName || "";
    // Request full-size legend image
    const url = `${serverUrl}wms?REQUEST=GetLegendGraphic&VERSION=1.1&FORMAT=image/png&LAYER=${layer.layerName}&STYLE=${styleName}&transparent=true&LEGEND_OPTIONS=forceLabels:on;fontAntiAliasing:true`;
    setLegendUrl(url);
  }, [layer]);

  if (hasError) return null;

  return (
    <div className="mb-3 last:mb-0">
      <div className="text-xs font-semibold text-base-content/80 mb-1">{layer.displayName}</div>
      {legendUrl && <img src={legendUrl} alt={`${layer.displayName} legend`} onError={() => setHasError(true)} />}
    </div>
  );
}

// Component to display all layer legends dynamically
function DynamicLegend({ layers }: { layers: BaseLayerConfig[] }) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="mt-3 border border-base-300 rounded-lg overflow-hidden">
      <button className="flex items-center gap-2 w-full py-2 px-3 text-left bg-base-200 hover:bg-base-300 transition-colors" onClick={() => setIsExpanded(!isExpanded)}>
        {isExpanded ? <FaChevronDown size={12} className="text-base-content/60" /> : <FaChevronRight size={12} className="text-base-content/60" />}
        <span className="text-xs font-semibold">Legend</span>
      </button>

      {isExpanded && (
        <div className="bg-base-100 max-h-96 overflow-y-auto px-3 py-2">
          {layers.map((layer, index) => (
            <LayerLegendItem key={`${layer.layerName}-${index}`} layer={layer} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ThemeBaseLayers({ config, themeId, popupLogoImage }: ThemeBaseLayersProps) {
  const [visible, setVisible] = useState(config.defaultVisibility);
  const [opacity, setOpacity] = useState(config.opacity);
  const layerIdsRef = useRef<string[]>([]);
  const effectIdRef = useRef(0);

  const loadLayers = async (effectId: number) => {
    for (const layerConfig of config.layers) {
      try {
        const serverUrl = layerConfig.serverUrl.endsWith("/") ? layerConfig.serverUrl : layerConfig.serverUrl + "/";

        // Create WMS layer using LayerHelpers
        await new Promise<void>((resolve) => {
          LayerHelpers.getLayer(
            {
              sourceType: OL_DATA_TYPES.ImageWMS,
              url: `${serverUrl}wms?layers=${layerConfig.layerName}`,
              layerName: layerConfig.layerName,
              name: layerConfig.displayName,
              tiled: false,
              secured: layerConfig.secure || false,
            },
            (layer: unknown) => {
              if (layer) {
                const olLayer = layer as Layer;

                // Set WFS URL for popup interactions if clickable
                if (layerConfig.clickable) {
                  const wfsUrl = `${serverUrl}wfs?service=wfs&version=2.0.0&request=GetFeature&typeNames=${layerConfig.layerName}&outputFormat=application/json&cql_filter=`;
                  olLayer.setProperties({
                    wfsUrl: wfsUrl,
                    clickable: true,
                    moreInfoUrlFieldName: layerConfig.moreInfoUrlFieldName,
                  });
                }

                // Add layer via LayerManager - append (default) so base layers are below toggle layers
                const layerId = LayerManager.addLayer(olLayer, "Themes", layerConfig.displayName, {
                  visible: visible,
                  opacity: opacity,
                  clickable: layerConfig.clickable ?? false,
                  metadata: {
                    themeId: themeId,
                    layerType: "base",
                    popupLogoImage: popupLogoImage,
                  },
                });

                if (layerId) {
                  if (effectId !== effectIdRef.current) {
                    // Stale effect — callback fired after a re-mount or unmount; remove immediately
                    LayerManager.removeLayer(layerId);
                  } else {
                    layerIdsRef.current.push(layerId);
                  }
                }
              }
              resolve();
            },
          );
        });
      } catch (error) {
        console.error(`Error loading base layer ${layerConfig.layerName}:`, error);
      }
    }
  };

  useEffect(() => {
    const effectId = ++effectIdRef.current;
    layerIdsRef.current = [];
    loadLayers(effectId);

    return () => {
      // Cleanup on unmount — remove all layers tracked by this effect
      layerIdsRef.current.forEach((id) => LayerManager.removeLayer(id));
      layerIdsRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Update visibility for all layers
    layerIdsRef.current.forEach((id) => {
      LayerManager.setLayerVisibility(id, visible);
    });
  }, [visible]);

  useEffect(() => {
    // Update opacity for all layers
    layerIdsRef.current.forEach((id) => {
      LayerManager.setLayerOpacity(id, opacity);
    });
  }, [opacity]);

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2">
        <input type="checkbox" className="checkbox checkbox-xs mt-1" checked={visible} onChange={(e) => setVisible(e.target.checked)} />
        <span className="text-xs font-semibold whitespace-nowrap mt-1">Show Base Layers</span>
        {visible && (
          <div className="flex items-start gap-1 flex-1 min-w-0">
            <div className="flex flex-col flex-1 min-w-0">
              <input type="range" min="0" max="1" step="0.01" value={opacity} onChange={(e) => setOpacity(parseFloat(e.target.value))} className="range range-xs w-full" />
              <span className="text-xs text-base-content/50 text-center leading-tight">Transparency</span>
            </div>
            <span className="text-xs whitespace-nowrap w-8 text-right mt-0.5">{Math.round(opacity * 100)}%</span>
          </div>
        )}
      </div>

      {visible && (
        <>
          {/* Dynamic legend - shows WMS GetLegendGraphic for each layer */}
          {config.useDynamicLegend !== false && <DynamicLegend layers={config.layers} />}

          {/* Static legend image fallback - only used when useDynamicLegend is explicitly false */}
          {config.useDynamicLegend === false && config.legendImageName && (
            <div className="mt-2">
              {}
              <AppImage src={`/images/${config.legendImageName}`} alt="Legend" className="w-full" />
            </div>
          )}
        </>
      )}
    </div>
  );
}
